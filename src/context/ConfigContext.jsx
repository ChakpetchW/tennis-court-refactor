import React, { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../services/api'
import { initFirebase } from '../services/firebase'

export const ConfigContext = createContext(null)

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchConfig = async () => {
      try {
        const data = await api.getDynamicConfig()
        if (isMounted && data?.success) {
          console.log('[Config] Dynamic configuration loaded from server.')
          setConfig(data.config)

          // Re-initialize Firebase with server-side config
          initFirebase(data.config)
        }
      } catch (error) {
        console.warn('[Config] Failed to fetch dynamic config, using build-time fallbacks.', error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void fetchConfig()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <ConfigContext.Provider value={{ config, isLoading }}>
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}
