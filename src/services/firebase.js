import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

// Global instances that will be updated
export let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
export let auth = getAuth(app)
export let analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : null

/**
 * Re-initialize Firebase with dynamic configuration by replacing the [DEFAULT] app.
 */
export const initFirebase = async (dynamicConfig) => {
  if (!dynamicConfig || !dynamicConfig.VITE_FIREBASE_API_KEY) {
    console.log('[Firebase] No dynamic config or invalid API Key. Using build-time defaults.')
    return
  }

  const mergedConfig = {
    apiKey: dynamicConfig.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
    authDomain: dynamicConfig.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
    projectId: dynamicConfig.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    storageBucket: dynamicConfig.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
    messagingSenderId: dynamicConfig.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
    appId: dynamicConfig.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
    measurementId: dynamicConfig.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
  }

  console.log('[Firebase] Replacing [DEFAULT] app with server config:', mergedConfig.projectId)

  try {
    // 1. Find and delete the existing [DEFAULT] app to avoid conflicts
    const currentApp = getApps().find(a => a.name === '[DEFAULT]')
    if (currentApp) {
      await deleteApp(currentApp)
    }

    // 2. Re-initialize as the NEW [DEFAULT] app
    app = initializeApp(mergedConfig)
    auth = getAuth(app)
    
    try {
      if (typeof window !== 'undefined' && mergedConfig.measurementId) {
        analytics = getAnalytics(app)
      }
    } catch (e) {
      console.warn('[Firebase] Analytics update skipped:', e.message)
    }

    console.log('[Firebase] Default App replaced SUCCESSFULLY.')
  } catch (error) {
    console.error('[Firebase] Failed to replace Default App:', error)
  }
}
