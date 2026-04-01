import { auth } from './firebase'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { api } from './api'

/**
 * OTP Service Abstraction Layer
 * Supports switching between Firebase Phone Auth and ThaiBulkSMS via Environment Variables.
 */

const DEFAULT_PROVIDER = (import.meta.env.VITE_OTP_PROVIDER || 'firebase').toLowerCase()
console.log(`[OTP Service] Build-time Default Provider: ${DEFAULT_PROVIDER.toUpperCase()}`)

let confirmationResultStore = null // To store Firebase confirmation result
let recaptchaVerifierStore = null // To store Firebase recaptcha verifier
let lastUsedProvider = DEFAULT_PROVIDER // To track which provider was used for the current session

export const otpService = {
  /**
   * Request an OTP to be sent to the phone number.
   */
  requestOTP: async (phone, recaptchaId = 'recaptcha-container', dynamicConfig = null) => {
    // Prioritize dynamic config from server
    const currentProvider = (dynamicConfig?.VITE_OTP_PROVIDER || DEFAULT_PROVIDER).toLowerCase()
    lastUsedProvider = currentProvider
    
    console.log(`[OTP Service] Using provider: ${currentProvider.toUpperCase()}`)

    if (currentProvider === 'firebase') {
      try {
        const formattedPhone = phone.startsWith('+')
          ? phone
          : phone.startsWith('0')
            ? `+66${phone.substring(1)}`
            : `+${phone}`

        // 1. Reset/Clean the container for reCAPTCHA to prevent "reCAPTCHA Timeout"
        const container = document.getElementById(recaptchaId)
        if (container) {
          container.innerHTML = '' // Ensure it's empty
        }

        // 2. Clear existing verifier if any to force a fresh render
        if (recaptchaVerifierStore) {
          try {
            recaptchaVerifierStore.clear()
          } catch (e) {
            console.warn('[Firebase] Clear verifier failed:', e)
          }
        }
        // Ensure we clear any old instances or leftovers
        const existingContainer = document.getElementById(recaptchaId)
        if (existingContainer) {
          existingContainer.innerHTML = ''
        }

        console.log('[Firebase] Initializing invisible reCAPTCHA with project:', auth.config.apiKey.substring(0, 5) + '...')
        
        recaptchaVerifierStore = new RecaptchaVerifier(auth, recaptchaId, {
          size: 'invisible',
          callback: (response) => {
            console.log('[Firebase] reCAPTCHA solved successfully.')
          },
          'expired-callback': () => {
            console.log('[Firebase] reCAPTCHA expired, resetting...')
            if (recaptchaVerifierStore) recaptchaVerifierStore.clear()
          },
        })

        // 4. Send SMS
        console.log('[Firebase] Sending SMS to:', formattedPhone)
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierStore)
        
        // 4. Success! Save the confirmation result
        confirmationResultStore = confirmationResult
        lastUsedProvider = 'firebase'
        console.log('[Firebase] OTP Sent Successfully.')
        return true

      } catch (error) {
        console.error('[Firebase] requestOTP Error:', error.code, error.message)
        
        // As per Firebase Docs: Reset reCAPTCHA on error so user can try again
        if (recaptchaVerifierStore) {
          try {
            recaptchaVerifierStore.clear()
            console.log('[Firebase] reCAPTCHA cleared after error.')
          } catch (e) {
            console.warn('[Firebase] Failed to clear reCAPTCHA:', e.message)
          }
          recaptchaVerifierStore = null
        }
        
        // Throw a user-friendly error or the original one for UI handling
        throw error
      }
    }

    // Default to ThaiBulkSMS (via backend)
    console.log('[ThaiBulkSMS] Requesting OTP via API...')
    return api.requestOTP(phone)
  },

  /**
   * Verify the OTP pin provided by the user.
   */
  verifyOTP: async (pin, phone) => {
    const PROVIDER = lastUsedProvider || 'firebase'
    console.log('[OTP] Verifying OTP using provider:', PROVIDER)

    if (PROVIDER === 'firebase') {
      if (!confirmationResultStore) {
        throw new Error('No pending Firebase confirmation found. Please request OTP again.')
      }

      try {
        console.log('[Firebase] Verifying OTP...')
        const result = await confirmationResultStore.confirm(pin)
        console.log('[Firebase] OTP Verified Successfully. User:', result.user.uid)
        
        return { 
          success: true, 
          provider: 'firebase', 
          phone: result.user.phoneNumber, 
          uid: result.user.uid 
        }
      } catch (error) {
        console.error('[Firebase] verifyOTP Error:', error.code, error.message)
        throw new Error('รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')
      }
    } else {
      // Default to ThaiBulkSMS (via backend API)
      console.log('[ThaiBulkSMS] Verifying OTP via API...')
      const result = await api.verifyOTP(phone, pin)
      return { 
        ...result, 
        provider: 'thaibulksms', 
        phone 
      }
    }
  },
}
