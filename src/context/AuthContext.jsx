import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { AuthContext } from './auth-context'
import { auth } from '../services/firebase'

const USER_STORAGE_KEY = 'court_user'
const WALLET_STORAGE_KEY = 'court_wallet'

const clearUserPersistence = () => {
  sessionStorage.removeItem(USER_STORAGE_KEY)
  sessionStorage.removeItem(WALLET_STORAGE_KEY)
  localStorage.removeItem(USER_STORAGE_KEY)
  localStorage.removeItem(WALLET_STORAGE_KEY)
}

const readPersistedValue = (key) => {
  const localValue = localStorage.getItem(key)
  if (localValue) {
    sessionStorage.setItem(key, localValue)
    return localValue
  }

  const sessionValue = sessionStorage.getItem(key)
  if (sessionValue) {
    localStorage.setItem(key, sessionValue)
    return sessionValue
  }

  return null
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = readPersistedValue(USER_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [adminUser, setAdminUser] = useState(null)
  const [isAdminBootstrapping, setIsAdminBootstrapping] = useState(true)

  // Sync user state with localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
    } else if (user === null) {
      clearUserPersistence()
    }
  }, [user])

  useEffect(() => {
    let isMounted = true

    const bootstrapAdminSession = async () => {
      try {
        const data = await api.getAdminSession()
        if (isMounted) {
          setAdminUser(data?.success ? data.user : null)
        }
      } catch {
        if (isMounted) {
          setAdminUser(null)
        }
      } finally {
        if (isMounted) {
          setIsAdminBootstrapping(false)
        }
      }
    }

    void bootstrapAdminSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (phone) => {
    const data = await api.login(phone)
    if (data && data.id) {
      const loggedIn = { ...data, isRegistered: true }
      setUser(loggedIn)
      return { success: true, user: loggedIn, isRegistered: true, wallet_balance: data.wallet_balance }
    }

    const newUser = { phone, isRegistered: false }
    setUser(newUser)
    return { success: true, user: newUser, isRegistered: false }
  }

  const register = async (payload) => {
    const resData = await api.register(payload)
    if (!resData?.id) {
      throw new Error(resData?.error || 'Registration failed')
    }

    const newUser = { ...resData, isRegistered: true, wallet_balance: Number(resData.wallet_balance || 0) }
    setUser(newUser)
    return newUser
  }

  const adminLogin = async (email, password) => {
    try {
      const data = await api.adminLogin(email, password)
      if (data.success) {
        setAdminUser(data.user)
      }
      return data
    } catch (error) {
      return { success: false, error: error.message || 'Invalid email or password' }
    }
  }

  const adminLogout = async () => {
    try {
      await api.adminLogout()
    } catch (error) {
      console.warn('Admin logout request failed, clearing local state anyway.', error)
    } finally {
      setAdminUser(null)
    }
  }

  const logout = async () => {
    try {
      if (auth) {
        await auth.signOut()
      }
    } catch (error) {
      console.warn('Firebase signout failed:', error)
    }

    clearUserPersistence()
    setUser(null)
    window.location.reload()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        adminUser,
        setAdminUser,
        isAdminBootstrapping,
        login,
        register,
        logout,
        adminLogin,
        adminLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
