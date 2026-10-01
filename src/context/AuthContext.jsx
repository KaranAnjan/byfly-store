import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { signOutFirebase } from '../lib/firebaseClient'
import { isInternalAuthEmail, visibleAccountEmail } from '../lib/accountIdentity'

const AuthContext = createContext({})

// Comma-separated frontend admin allowlist from the Vite environment.
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const cacheBasicUser = (user) => {
  if (!user?.id) return
  try {
    localStorage.setItem(`monimala_user_${user.id}`, JSON.stringify({
      id: user.id,
      name: user.user_metadata?.name || '',
      email: visibleAccountEmail(user),
    }))
  } catch (error) {
    console.warn('Unable to cache user details in this browser.', error)
  }
}

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileSummary, setProfileSummary] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null
      cacheBasicUser(sessionUser)
      setUser(sessionUser)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user ?? null
        cacheBasicUser(sessionUser)
        setUser(sessionUser)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setProfileSummary(null)
      setProfileLoading(false)
      return
    }

    let cancelled = false
    setProfileLoading(true)
    const cacheKey = `monimala_user_${user.id}`
    let cached = {}
    try {
      cached = JSON.parse(localStorage.getItem(cacheKey) || '{}')
    } catch {
      cached = {}
    }

    const summary = {
      id: user.id,
      email: visibleAccountEmail(user) || (isInternalAuthEmail(cached.email) ? '' : cached.email) || '',
      name: user.user_metadata?.name || cached.name || '',
      is_wholesaler: false,
      wholesale_enabled: false,
      is_admin: false,
      business_name: '',
    }
    setProfileSummary(summary)
    cacheBasicUser({ ...user, user_metadata: { ...user.user_metadata, name: summary.name } })

    {
      Promise.all([
        supabase.from('users').select('name,email,is_active,is_admin').eq('id', user.id).maybeSingle(),
        supabase.from('wholesale_accounts').select('business_name,is_active').eq('user_id', user.id).maybeSingle(),
      ])
        .then(([{ data, error }, { data: wholesale, error: wholesaleError }]) => {
          if (error) throw error
          if (wholesaleError) throw wholesaleError
          if (cancelled) return
          const hydrated = {
            ...summary,
            ...(data || {}),
            name: data?.name || summary.name,
            email: (isInternalAuthEmail(data?.email) ? '' : data?.email) || summary.email,
            is_admin: data?.is_admin === true,
            is_wholesaler: Boolean(wholesale),
            wholesale_enabled: Boolean(wholesale?.is_active),
            business_name: wholesale?.business_name || '',
          }
          setProfileSummary(hydrated)
          try {
            localStorage.setItem(cacheKey, JSON.stringify(hydrated))
          } catch (cacheError) {
            console.warn('Unable to cache user details in this browser.', cacheError)
          }
        })
        .catch((error) => console.warn('Unable to load the account profile.', error))
        .finally(() => { if (!cancelled) setProfileLoading(false) })
    }

    return () => { cancelled = true }
  }, [user?.id])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const sendLoginOtp = async (identifier) => {
    const isEmail = identifier.includes('@')
    const { data, error } = await supabase.auth.signInWithOtp(isEmail
      ? { email: identifier.toLowerCase(), options: { shouldCreateUser: false } }
      : { phone: identifier, options: { shouldCreateUser: false } })
    if (error) throw error
    return data
  }

  const verifyLoginOtp = async (identifier, token) => {
    const isEmail = identifier.includes('@')
    const { data, error } = await supabase.auth.verifyOtp(isEmail
      ? { email: identifier.toLowerCase(), token, type: 'email' }
      : { phone: identifier, token, type: 'sms' })
    if (error) throw error
    if (data.user) {
      cacheBasicUser(data.user)
      setUser(data.user)
    }
    return data
  }

  const signUp = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await signOutFirebase()
  }

  const isAdmin = Boolean(profileSummary?.is_admin) ||
    Boolean(visibleAccountEmail(user) && ADMIN_EMAILS.includes(visibleAccountEmail(user).toLowerCase()))

  return (
    <AuthContext.Provider value={{ user, loading: loading || profileLoading, profileSummary, signIn, sendLoginOtp, verifyLoginOtp, signUp, signOut, isAdmin, ADMIN_EMAILS }}>
      {children}
    </AuthContext.Provider>
  )
}
