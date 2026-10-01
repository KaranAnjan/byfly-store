import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ArrowLeft, Check, Chrome, LogIn } from 'lucide-react'
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

  const showVerifiedState = async (animateOtp = false) => {
    setMode(animateOtp ? 'merging' : 'success')
    await new Promise((resolve) => window.setTimeout(resolve, animateOtp ? 2600 : 700))
    if (animateOtp) setMode('success')
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-green-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-7 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4"><LogIn className="h-6 w-6 text-emerald-700" /></div>
          <h1 className="text-3xl font-extrabold text-gray-900">Byfly Wholesale</h1>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'details' ? 'Phone verified. Add your business details to finish.' : mode === 'code' ? `Enter the SMS code sent to ${normalizedPhone}.` : mode === 'verifying' ? 'Verifying OTP…' : mode === 'merging' ? 'OTP matched. Completing sign in…' : mode === 'success' ? 'Verification complete. Signing you in…' : 'Sign in or create your account using Google or phone.'}
          </p>
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
            <p className="text-center text-xs text-gray-500">Existing accounts sign in automatically. New accounts are created after verification.</p>
          </motion.div>}

          {(mode === 'code' || mode === 'verifying') && <motion.form key="code" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} className="space-y-5" onSubmit={handleVerifyPhone}>
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={(event) => {
              const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
              if (pasted) {
                event.preventDefault()
                setCode(pasted)
                otpInputsRef.current[Math.min(pasted.length, 5)]?.focus()
              }
            }}>
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="relative h-12 w-11 sm:h-14 sm:w-12">
                {mode === 'verifying' && <svg className="pointer-events-none absolute -inset-1 z-20 h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)]" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                  <motion.rect
                    x="3" y="3" width="94" height="94" rx="18"
                    stroke="#10b981" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray="115 260"
                    animate={{ strokeDashoffset: -375 }}
                    transition={{ duration: 1.15, repeat: Infinity, ease: 'linear', delay: index * 0.08 }}
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
                  className={`relative z-10 h-12 w-11 rounded-xl border bg-white text-center text-xl font-semibold text-gray-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 sm:h-14 sm:w-12 ${mode === 'verifying' ? 'border-emerald-400' : 'border-gray-300'}`} />
                </div>
              ))}
            </div>
            <button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{mode === 'verifying' ? 'Verifying OTP…' : 'Verify OTP'}</button>
            <button type="button" onClick={backToMethods} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-emerald-700"><ArrowLeft size={15} /> Change number</button>
          </motion.form>}

          {(mode === 'merging' || mode === 'success') && <motion.div key="verification" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-8" role="status" aria-live="polite">
            <div className={`relative flex items-center justify-center transition-all duration-300 ${mode === 'success' ? 'h-20 w-20' : 'h-20 w-full max-w-xs'}`}>
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'success' ? (
                  <motion.div key="merged-check" initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="grid h-20 w-20 place-items-center rounded-full border-4 border-emerald-600 bg-emerald-600 text-white shadow-lg">
                    <Check className="h-10 w-10" strokeWidth={3} />
                  </motion.div>
                ) : mode === 'verifying' ? (
                  <motion.div key="checking-digits" className="flex gap-2 sm:gap-3">
                    {Array.from({ length: 6 }, (_, index) => (
                      <div key={index} className="relative h-12 w-11 sm:h-14 sm:w-12">
                        <div className="absolute inset-0 rounded-xl border-2 border-emerald-400 border-t-transparent animate-spin" style={{ animationDuration: `${1.1 + index * 0.08}s` }} />
                        <div className="absolute inset-[2px] grid place-items-center rounded-[10px] bg-white text-lg font-bold text-emerald-700 shadow-md">
                          {code[index] || '•'}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="merging-digits" className="absolute inset-0">
                    {Array.from({ length: 6 }, (_, index) => (
                      <motion.div
                        key={index}
                        initial={{ left: `${10 + index * 16}%`, opacity: 1, scale: 1 }}
                        animate={{ left: '50%', opacity: 0, scale: 0.2, rotate: index % 2 ? 12 : -12 }}
                        transition={{ duration: 1.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-1/2 grid h-12 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-2 border-emerald-500 bg-white text-lg font-bold text-emerald-700 shadow-md sm:h-14 sm:w-12"
                      >
                        {code[index] || '•'}
                      </motion.div>
                    ))}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.35 }}
                      animate={{ opacity: 1, scale: [0.35, 1.15, 1] }}
                      transition={{ delay: 1.34, type: 'spring', stiffness: 180, damping: 16 }}
                      className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-emerald-500 bg-emerald-600 text-white shadow-[0_0_0_8px_rgba(16,185,129,0.14),0_10px_25px_rgba(16,185,129,0.3)]"
                    >
                      <Check className="h-10 w-10" strokeWidth={3.5} />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <p className={`font-medium ${mode === 'success' ? 'text-emerald-800' : 'text-slate-600'}`}>
              {mode === 'success' ? 'Verified' : mode === 'merging' ? 'OTP matched' : <>Verifying OTP<motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity }}>…</motion.span></>}
            </p>
          </motion.div>}

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
