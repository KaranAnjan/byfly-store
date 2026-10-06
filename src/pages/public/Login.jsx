import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Chrome } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { AnimatePresence, motion } from 'framer-motion'
import {
  firebaseAuth,
  sendFirebasePhoneCode,
  signInWithFirebaseGoogle,
} from '../../lib/firebaseClient'

const Login = () => {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('choose')
  const [loading, setLoading] = useState(false)
  const [signupIdToken, setSignupIdToken] = useState('')
  const [signupProvider, setSignupProvider] = useState('phone')
  const [signupName, setSignupName] = useState('')
  const [signupBusiness, setSignupBusiness] = useState('')
  const confirmationRef = useRef(null)
  const verifierRef = useRef(null)
  const otpInputsRef = useRef([])
  const { user: supabaseUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || new URLSearchParams(location.search).get('redirect') || '/'
  const normalizedPhone = normalizeIndianPhone(phone)
  const subtitleText =
    mode === 'details' ? 'Phone verified. Add your business details to finish.'
      : mode === 'code' ? `Enter the SMS code sent to ${normalizedPhone}.`
        : mode === 'choose' ? 'Sign in or create your account using Google or phone.'
          : ''

  const showVerifiedState = async (animateOtp = false) => {
    setMode(animateOtp ? 'merging' : 'success')
    await new Promise((resolve) => window.setTimeout(resolve, animateOtp ? 1800 : 700))
    if (animateOtp) {
      setMode('success')
      await new Promise((resolve) => window.setTimeout(resolve, 700))
    }
  }

  useEffect(() => () => verifierRef.current?.clear(), [])

  const invokeExchange = async (body) => {
    const { data, error } = await supabase.functions.invoke('exchange-firebase-login', { body })
    if (error) {
      let detail = ''
      try {
        const response = await error.context?.json()
        detail = response?.error || response?.message || ''
      } catch { /* Some transport errors have no response body. */ }
      throw new Error(detail || error.message || 'Could not contact the sign-in service')
    }
    if (data?.error) throw new Error(data.error)
    return data
  }

  const finishSession = async (tokenHash) => {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
    if (error) throw error
    toast.success('Signed in to Byfly')
    navigate(from, { replace: true })
  }

  const exchangeFirebaseUser = async (firebaseUser, provider) => {
    const idToken = await firebaseUser.getIdToken(true)
    const result = await invokeExchange({ id_token: idToken })
    if (result.needs_registration) {
      await showVerifiedState(provider === 'phone')
      setSignupIdToken(idToken)
      setSignupProvider(provider)
      setSignupName(firebaseUser.displayName || '')
      setMode('details')
      return
    }
    if (!result.token_hash) throw new Error('Could not finish sign-in. Please try again.')
    await showVerifiedState(provider === 'phone')
    await finishSession(result.token_hash)
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      const result = await signInWithFirebaseGoogle()
      await exchangeFirebaseUser(result.user, 'google')
    } catch (error) {
      toast.error(error.message || 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSendPhoneCode = async (event) => {
    event.preventDefault()
    if (!/^\+91[6-9]\d{9}$/.test(normalizedPhone)) {
      toast.error('Enter a valid 10-digit Indian mobile number.')
      return
    }
    setLoading(true)
    try {
      verifierRef.current?.clear()
      const { confirmation, verifier } = await sendFirebasePhoneCode(normalizedPhone)
      confirmationRef.current = confirmation
      verifierRef.current = verifier
      setMode('code')
      toast.success(`Verification code sent to ${normalizedPhone}`)
    } catch (error) {
      toast.error(error.code === 'auth/operation-not-allowed'
        ? 'SMS is blocked for India in Firebase. Allow India in Authentication → Settings → SMS region policy.'
        : error.message || 'Could not send the verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPhone = async (event) => {
    event.preventDefault()
    if (code.length !== 6) {
      toast.error('Enter the 6-digit verification code.')
      return
    }
    setLoading(true)
    setMode('verifying')
    try {
      const credential = await confirmationRef.current.confirm(code.trim())
      await exchangeFirebaseUser(credential.user, 'phone')
    } catch (error) {
      setMode('code')
      toast.error(error.message || 'Invalid or expired verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAccount = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      const signup = {
        name: signupName.trim(),
        business_name: signupBusiness.trim(),
      }
      const result = await invokeExchange({ id_token: signupIdToken, signup })
      if (!result.token_hash) throw new Error('Could not finish account creation. Please try again.')
      await showVerifiedState()
      await finishSession(result.token_hash)
    } catch (error) {
      toast.error(error.message || 'Could not create the wholesale account')
    } finally {
      setLoading(false)
    }
  }

  const backToMethods = () => {
    setMode('choose')
    setCode('')
    setSignupIdToken('')
  }

  const renderVerification = () => {
    const step = window.matchMedia('(min-width: 640px)').matches ? 60 : 48
    const isMerging = mode === 'merging'
    return (
      <motion.div key="verification" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center py-6" role="status" aria-label="Phone verified">
        <div className="relative flex h-12 w-[280px] items-center justify-center sm:h-14 sm:w-[348px]">
          {isMerging && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 sm:gap-3">
              {Array.from({ length: 6 }, (_, index) => (
                <motion.div
                  key={index}
                  initial={{ x: 0, opacity: 1, scale: 1 }}
                  animate={{ x: (2.5 - index) * step, opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="grid h-12 w-10 place-items-center rounded-xl border-2 border-emerald-500 bg-white text-lg font-bold text-emerald-700 shadow-md sm:h-14 sm:w-12"
                >
                  {code[index] || '•'}
                </motion.div>
              ))}
            </div>
          )}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, backgroundColor: '#ffffff', borderColor: '#10b981', boxShadow: '0 0 0 0 rgba(16,185,129,0), 0 0px 0px rgba(16,185,129,0)' }}
            animate={{ scale: 1, opacity: 1, backgroundColor: '#059669', borderColor: '#059669', boxShadow: '0 0 0 6px rgba(16,185,129,0.14), 0 8px 20px rgba(16,185,129,0.28)' }}
            transition={isMerging
              ? {
                  scale: { delay: 0.3, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
                  opacity: { delay: 0.3, duration: 0.3 },
                  backgroundColor: { delay: 0.85, duration: 0.3 },
                  borderColor: { delay: 0.85, duration: 0.3 },
                  boxShadow: { delay: 0.9, duration: 0.35 },
                }
              : {
                  scale: { type: 'spring', stiffness: 300, damping: 18 },
                  opacity: { duration: 0.2 },
                  backgroundColor: { duration: 0.3 },
                  borderColor: { duration: 0.3 },
                  boxShadow: { duration: 0.4, delay: 0.1 },
                }}
            className="grid h-12 w-10 place-items-center rounded-xl border-2 sm:h-14 sm:w-12"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true">
              <motion.path
                d="M4 12l5.5 5.5L20 6.5"
                stroke="#ffffff"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={isMerging
                  ? { pathLength: { delay: 1.15, duration: 0.3, ease: 'easeOut' }, opacity: { delay: 1.15, duration: 0.08 } }
                  : { pathLength: { delay: 0.2, duration: 0.3, ease: 'easeOut' }, opacity: { delay: 0.2, duration: 0.08 } }}
              />
            </svg>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-7 bg-white p-5 sm:p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <img src="/assets/logo.png" alt="BYFLY logo" className="h-12 w-14 object-contain" />
            <div className="text-left">
              <h1 className="text-xl font-extrabold italic leading-none tracking-[0.12em] text-gray-900">BYFLY</h1>
              <p className="mt-1 whitespace-nowrap text-[9px] uppercase leading-tight tracking-[0.04em] text-emerald-700">WHOLE SALE STORE</p>
            </div>
          </div>
          {subtitleText && <p className="mt-2 text-sm text-gray-600">{subtitleText}</p>}
        </div>

        <div id="recaptcha-container" />

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'choose' && <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
            <button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"><Chrome size={19} />{loading ? 'Please wait…' : 'Continue with Google'}</button>
            <div className="flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" />OR<span className="h-px flex-1 bg-gray-200" /></div>
            <form className="space-y-4" onSubmit={handleSendPhoneCode}>
              <label htmlFor="phone" className="sr-only">Indian mobile number</label>
              <div className="flex overflow-hidden rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-200">
                <span className="flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-600">+91</span>
                <input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" required value={phone} onChange={(event) => setPhone(event.target.value)} className="min-w-0 flex-1 px-3 py-3 text-gray-900 focus:outline-none" placeholder="10-digit mobile number" />
              </div>
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{loading ? 'Sending code…' : 'Continue with phone'}</button>
            </form>
          </motion.div>}

          {(mode === 'code' || mode === 'verifying') && <motion.form key="code" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} className="space-y-5" onSubmit={handleVerifyPhone}>
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={(event) => {
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
              if (pasted) {
                event.preventDefault()
                setCode(pasted)
                otpInputsRef.current[Math.min(pasted.length, 5)]?.focus()
              }
            }}>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="relative h-12 w-10 sm:h-14 sm:w-12">
                {mode === 'verifying' && <svg className="pointer-events-none absolute -inset-1 z-20 h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)]" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                  <rect
                    x="3" y="3" width="94" height="94" rx="18"
                    stroke="#10b981" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray="115 260"
                    style={{ animation: 'otp-sweep 1.15s linear infinite', animationDelay: `${index * 0.08}s` }}
                  />
                </svg>}
                <input ref={(element) => { otpInputsRef.current[index] = element }}
                  aria-label={`OTP digit ${index + 1}`} type="text" inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength={1}
                  disabled={mode !== 'code'}
                  value={code[index] || ''}
                  onChange={(event) => {
                    const digit = event.target.value.replace(/\D/g, '').slice(-1)
                    const next = code.split('')
                    next[index] = digit
                    setCode(next.join('').slice(0, 6))
                    if (digit && index < 5) otpInputsRef.current[index + 1]?.focus()
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && !code[index] && index > 0) {
                      otpInputsRef.current[index - 1]?.focus()
                    }
                  }}
                  className={`relative z-10 h-12 w-10 rounded-xl border bg-white text-center text-xl font-semibold text-gray-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 sm:h-14 sm:w-12 ${mode === 'verifying' ? 'border-emerald-400' : 'border-gray-300'}`} />
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{mode === 'verifying' ? 'Verifying OTP…' : 'Verify OTP'}</button>
            <button type="button" onClick={backToMethods} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-emerald-700"><ArrowLeft size={15} /> Change number</button>
          </motion.form>}

          {(mode === 'merging' || mode === 'success') && renderVerification()}

          {mode === 'details' && <motion.form key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4" onSubmit={handleCreateAccount}>
            <input required autoComplete="name" value={signupName} onChange={(event) => setSignupName(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" placeholder="Contact name" />
            <input required value={signupBusiness} onChange={(event) => setSignupBusiness(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-3 text-gray-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" placeholder="Business name" />
            {signupProvider === 'phone' && <p className="text-xs text-gray-500">Verified phone: {normalizedPhone}</p>}
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{loading ? 'Creating account…' : 'Create account and continue'}</button>
            <button type="button" onClick={backToMethods} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-emerald-700"><ArrowLeft size={15} /> Start over</button>
          </motion.form>}

        </AnimatePresence>

        {supabaseUser && <p className="text-center text-xs text-gray-400">You are already signed in. Sign out first to switch accounts.</p>}
      </div>
    </div>
  )
}

function normalizeIndianPhone(value) {
  const raw = value.trim()
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (raw.startsWith('+')) return `+${digits}`
  return digits ? `+${digits}` : ''
}

export default Login
