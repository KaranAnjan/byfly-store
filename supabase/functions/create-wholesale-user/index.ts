import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = request.headers.get('Authorization') || ''
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user: adminUser }, error: authError } = await caller.auth.getUser()
  if (authError || !adminUser) return respond({ error: 'Sign in as an admin first' }, 401)

  const service = createClient(url, serviceKey)
  const { data: adminProfile, error: profileError } = await service
    .from('users').select('is_admin').eq('id', adminUser.id).maybeSingle()
  if (profileError || !adminProfile?.is_admin) return respond({ error: 'Admin access required' }, 403)

  let input: { email?: string; name?: string; business_name?: string; phone?: string }
  try { input = await request.json() } catch { return respond({ error: 'Invalid request body' }, 400) }
  const email = input.email?.trim().toLowerCase()
  const name = input.name?.trim()
  const businessName = input.business_name?.trim()
  const phone = input.phone?.trim()
  if (!email || !name || !businessName) return respond({ error: 'Name, business name, and email are required' }, 400)
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) return respond({ error: 'Use phone format with country code, such as +919876543210' }, 400)

  const invite = await service.auth.admin.inviteUserByEmail(email, {
    data: { name, business_name: businessName },
  })
  let targetUser = invite.data.user
  let invitationSent = Boolean(targetUser)
  if (invite.error) {
    // Reuse an existing retail Auth identity where the email already exists.
    let page = 1
    while (!targetUser && page <= 20) {
      const { data: usersPage, error: listError } = await service.auth.admin.listUsers({ page, perPage: 1000 })
      if (listError) return respond({ error: listError.message }, 500)
      targetUser = usersPage.users.find((candidate) => candidate.email?.toLowerCase() === email)
      if (usersPage.users.length < 1000) break
      page += 1
    }
    if (!targetUser) return respond({ error: invite.error.message }, 400)
    const { data: updated, error: updateError } = await service.auth.admin.updateUserById(targetUser.id, {
      user_metadata: { ...targetUser.user_metadata, name, business_name: businessName },
    })
    if (updateError) return respond({ error: updateError.message }, 500)
    targetUser = updated.user
  }

  if (phone) {
    const { data: updated, error: phoneError } = await service.auth.admin.updateUserById(targetUser.id, { phone })
    if (phoneError) return respond({ error: `Could not attach this phone to the account: ${phoneError.message}` }, 400)
    targetUser = updated.user
  }

  const profile: Record<string, unknown> = {
    id: targetUser.id,
    email,
    name,
    is_active: true,
  }
  if (phone) profile.phone = phone
  const { error: saveError } = await service.from('users').upsert(profile, { onConflict: 'id' })
  if (saveError) return respond({ error: saveError.message }, 500)
  const { error: accountError } = await service.from('wholesale_accounts').upsert({
    user_id: targetUser.id,
    business_name: businessName,
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (accountError) return respond({ error: accountError.message }, 500)
  return respond({ user_id: targetUser.id, email, invitation_sent: invitationSent,
    message: invitationSent ? 'Invitation sent' : 'Existing account enabled for wholesale access' })
})
