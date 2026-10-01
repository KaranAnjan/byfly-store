import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5'

const PROJECT_ID = 'byfly-store'
const firebaseKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)

  let idToken: string
  let signup: { name?: string; business_name?: string; email?: string } | undefined
  try {
    const body = await request.json()
    idToken = body.id_token
    signup = body.signup
  } catch { return respond({ error: 'Invalid request' }, 400) }
  if (!idToken) return respond({ error: 'Missing Firebase token' }, 400)

  let identity
  try {
    const verified = await jwtVerify(idToken, firebaseKeys, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
      algorithms: ['RS256'],
    })
    identity = verified.payload
  } catch {
    return respond({ error: 'Firebase sign-in could not be verified' }, 401)
  }

  const verifiedEmail = identity.email_verified === true ? String(identity.email || '').toLowerCase() : ''
  const verifiedPhone = String(identity.phone_number || '')
  if (!verifiedEmail && !verifiedPhone) return respond({ error: 'Use a verified email or phone number' }, 401)

  const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let emailProfile: any = null
  let phoneProfile: any = null
  if (verifiedEmail) {
    const { data, error } = await service.from('users')
      .select('id,email,phone,name,is_active')
      .ilike('email', verifiedEmail).maybeSingle()
    if (error) return respond({ error: 'Could not verify the Byfly account' }, 500)
    emailProfile = data
  }
  if (verifiedPhone) {
    const { data, error } = await service.from('users')
      .select('id,email,phone,name,is_active')
      .eq('phone', verifiedPhone).maybeSingle()
    if (error) return respond({ error: 'Could not verify the Byfly account' }, 500)
    phoneProfile = data
  }
  if (emailProfile && phoneProfile && emailProfile.id !== phoneProfile.id) {
    return respond({ error: 'Your email and phone are linked to different Byfly accounts. Contact the store admin.' }, 403)
  }

  let profile = emailProfile || phoneProfile
  if (!profile && !signup) return respond({ needs_registration: true })

  if (!profile && signup) {
    const name = signup.name?.trim()
    const businessName = signup.business_name?.trim()
    const suppliedEmail = signup.email?.trim().toLowerCase()
    // Supabase Auth needs an email identity for the magic-link session bridge.
    // For phone-only accounts use a reserved, non-deliverable internal address;
    // the verified Firebase phone remains the customer's actual login identity.
    const phoneAlias = verifiedPhone
      ? `phone-${verifiedPhone.replace(/\D/g, '')}@phone.byfly.invalid`
      : ''
    const email = verifiedEmail || suppliedEmail || phoneAlias
    if (!name || !businessName || !email || (!verifiedPhone && !verifiedEmail)) {
      return respond({ error: 'Name and business name are required. Sign up with a verified Google account or verified phone.' }, 400)
    }
    if (verifiedEmail && suppliedEmail && verifiedEmail !== suppliedEmail) {
      return respond({ error: 'The signup email must match the verified Google account.' }, 400)
    }
    const { data: existingEmail, error: existingEmailError } = await service.from('users')
      .select('id').ilike('email', email).maybeSingle()
    if (existingEmailError) return respond({ error: 'Could not check existing customer accounts' }, 500)
    if (existingEmail) {
      return respond({ error: 'This email already belongs to a Byfly account. Sign in with its linked phone or ask the admin to link this number.' }, 409)
    }

    const authAttributes: Record<string, unknown> = {
      email,
      email_confirm: true,
      user_metadata: {
        name,
        business_name: businessName,
        ...(verifiedPhone ? { phone: verifiedPhone } : {}),
        byfly_wholesale_application: 'true',
      },
    }
    // Firebase is the phone identity provider. Supabase Auth only holds the
    // internal email alias used to establish a Supabase session; the verified
    // phone is stored on public.users by the profile upsert below.
    const { data: created, error: createError } = await service.auth.admin.createUser(authAttributes as any)
    if (createError || !created.user) {
      console.error('Byfly wholesale Auth user creation failed', createError?.message)
      return respond({ error: createError?.message || 'Could not create the Byfly account' }, 400)
    }
    const profilePayload: Record<string, unknown> = {
      id: created.user.id,
      name,
      email,
      is_active: true,
    }
    if (verifiedPhone) profilePayload.phone = verifiedPhone
    const { error: profileSaveError } = await service.from('users').upsert(profilePayload, { onConflict: 'id' })
    if (profileSaveError) {
      console.error('Byfly wholesale profile upsert failed', profileSaveError)
      await service.auth.admin.deleteUser(created.user.id)
      return respond({ error: `Could not save the customer profile: ${profileSaveError.message}` }, 500)
    }
    const { error: accountSaveError } = await service.from('wholesale_accounts').upsert({
      user_id: created.user.id,
      business_name: businessName,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (accountSaveError) {
      console.error('Byfly wholesale account upsert failed', accountSaveError)
      await service.auth.admin.deleteUser(created.user.id)
      return respond({ error: `Could not create the wholesale account: ${accountSaveError.message}` }, 500)
    }
    profile = { id: created.user.id, name, email, phone: verifiedPhone || null, is_active: true }
  }

  if (profile && !profile.email && verifiedPhone) {
    const phoneAlias = `phone-${verifiedPhone.replace(/\D/g, '')}@phone.byfly.invalid`
    const { error: authUpdateError } = await service.auth.admin.updateUserById(profile.id, {
      email: phoneAlias,
      email_confirm: true,
    })
    if (authUpdateError) return respond({ error: 'Could not prepare this phone account for sign-in' }, 500)
    const { error: profileUpdateError } = await service.from('users').update({ email: phoneAlias }).eq('id', profile.id)
    if (profileUpdateError) return respond({ error: 'Could not update the phone account profile' }, 500)
    profile.email = phoneAlias
  }
  if (!profile || profile.is_active === false || !profile.email) {
    return respond({ error: 'This Byfly account is inactive or missing a verified login method.' }, 403)
  }
  const { data: wholesaleAccount, error: accountError } = await service.from('wholesale_accounts')
    .select('is_active').eq('user_id', profile.id).maybeSingle()
  if (accountError) return respond({ error: 'Could not verify the wholesale account' }, 500)
  if (wholesaleAccount?.is_active === false) {
    return respond({ error: 'Wholesale access for this account is paused. Contact the store admin.' }, 403)
  }
  if (!wholesaleAccount) {
    const { error: createAccountError } = await service.from('wholesale_accounts').insert({
      user_id: profile.id,
      business_name: identity.business_name || '',
      is_active: true,
    })
    if (createAccountError) return respond({ error: 'Could not create the wholesale account' }, 500)
  }

  const provider = String((identity.firebase as Record<string, unknown> | undefined)?.sign_in_provider || (verifiedEmail ? 'email' : 'phone'))
  const { error: loginEventError } = await service.from('wholesale_login_events').insert({
    user_id: profile.id,
    auth_method: provider,
  })
  if (loginEventError) return respond({ error: 'Could not record this wholesale sign-in' }, 500)

  const { data, error } = await service.auth.admin.generateLink({ type: 'magiclink', email: profile.email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) return respond({ error: 'Could not create a Byfly session. Contact the store admin.' }, 500)
  return respond({ token_hash: tokenHash, email: profile.email })
})
