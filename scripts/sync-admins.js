import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const parseEnv = (contents) => Object.fromEntries(
  contents.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (!match || match[1].startsWith('#')) return []
    return [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]]
  })
)

try {
  const fileEnv = parseEnv(await readFile('.env', 'utf8'))
  const env = { ...fileEnv, ...process.env }
  const url = env.VITE_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  const emails = (env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (!url || !serviceKey) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env first.')
  }
  if (!emails.length) {
    throw new Error('VITE_ADMIN_EMAILS is empty; no admins were synced.')
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profiles, error: listError } = await supabase
    .from('users')
    .select('id,email,is_admin')
  if (listError) throw listError

  const matchingProfiles = profiles.filter(({ email }) =>
    emails.includes((email || '').trim().toLowerCase())
  )
  const missingEmails = emails.filter((email) =>
    !matchingProfiles.some((profile) => (profile.email || '').trim().toLowerCase() === email)
  )
  if (missingEmails.length) {
    throw new Error(`Create/sign up these user profile(s) before granting admin access: ${missingEmails.join(', ')}`)
  }

  const updates = profiles.filter(({ email, is_admin }) => {
    const shouldBeAdmin = emails.includes((email || '').trim().toLowerCase())
    return is_admin !== shouldBeAdmin
  })
  for (const profile of updates) {
    const shouldBeAdmin = emails.includes((profile.email || '').trim().toLowerCase())
    const { error } = await supabase
      .from('users')
      .update({ is_admin: shouldBeAdmin })
      .eq('id', profile.id)
    if (error) throw error
  }

  console.log(`Synced ${emails.length} admin email(s) to Supabase.`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
