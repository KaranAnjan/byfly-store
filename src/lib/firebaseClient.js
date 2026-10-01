import { initializeApp } from 'firebase/app'
import {
  getAuth,
  RecaptchaVerifier,
  signInWithEmailLink,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signOut,
} from 'firebase/auth'

// Firebase web config is public client configuration. Keep Analytics out of the
// wholesale auth path; only Firebase Authentication is needed here.
const firebaseConfig = {
  apiKey: 'AIzaSyAjBZl_AE1hDjBlm1Cev2hFlFrlVqasZpI',
  authDomain: 'byfly-store.firebaseapp.com',
  projectId: 'byfly-store',
  storageBucket: 'byfly-store.firebasestorage.app',
  messagingSenderId: '1040993424108',
  appId: '1:1040993424108:web:8506cc44ce0eb8e3f64bc9',
  measurementId: 'G-E7C2S1YV2M',
}

export const firebaseApp = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
// Local Firebase test-phone numbers can bypass the widget; production always
// keeps Firebase's app verification enabled.
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_TEST_MODE === 'true') {
  firebaseAuth.settings.appVerificationDisabledForTesting = true
}
export const signInWithFirebaseGoogle = () => signInWithPopup(firebaseAuth, new GoogleAuthProvider())

export const sendFirebasePhoneCode = async (phone, containerId = 'recaptcha-container') => {
  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, { size: 'invisible' })
  try {
    const confirmation = await signInWithPhoneNumber(firebaseAuth, phone, verifier)
    return { confirmation, verifier }
  } catch (error) {
    verifier.clear()
    throw error
  }
}

export const sendFirebaseEmailLink = async (email) => {
  await sendSignInLinkToEmail(firebaseAuth, email, {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  })
}

export const isFirebaseEmailLink = () => isSignInWithEmailLink(firebaseAuth, window.location.href)
export const completeFirebaseEmailLink = (email) => signInWithEmailLink(firebaseAuth, email, window.location.href)
export const signOutFirebase = () => signOut(firebaseAuth)
