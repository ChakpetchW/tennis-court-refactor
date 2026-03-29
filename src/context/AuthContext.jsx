import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { MOCKED_DB } from '../data/constants'
import { AuthContext } from './auth-context'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('court_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [adminUser, setAdminUser] = useState(null)
  const [isAdminBootstrapping, setIsAdminBootstrapping] = useState(true)

  useEffect(() => {
    if (user) {
      localStorage.setItem('court_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('court_user')
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

  const login = async (phone, mockDatabase = MOCKED_DB) => {
    try {
      const saved = localStorage.getItem('court_user')
      if (saved) {
        const savedUser = JSON.parse(saved)
        if (savedUser.phone === phone) {
          setUser(savedUser)
          return { success: true, user: savedUser, isRegistered: true }
        }
      }
    } catch (error) {
      console.warn('Stored user payload is invalid. Falling back to API login.', error)
    }

    try {
      const data = await api.login(phone)
      if (data && data.id) {
        const loggedIn = { ...data, isRegistered: true }
        setUser(loggedIn)
        return { success: true, user: loggedIn, isRegistered: true, wallet_balance: data.wallet_balance }
      }
    } catch {
      console.warn('API not reachable, using local fallback.')
    }

    const db = mockDatabase || MOCKED_DB
    const existingUser = db.find((entry) => entry.phone === phone)
    if (existingUser) {
      setUser(existingUser)
      return { success: true, user: existingUser, isRegistered: true }
    }

    const newUser = { phone, isRegistered: false }
    setUser(newUser)
    return { success: true, user: newUser, isRegistered: false }
  }

  const register = async (payload, mockDatabase = MOCKED_DB, updateUserDB = () => {}) => {
    try {
      const resData = await api.register(payload)
      if (!resData?.id) {
        throw new Error(resData?.error || 'Registration failed')
      }

      const newUser = { ...payload, id: resData.id, isRegistered: true, wallet_balance: 0 }
      setUser(newUser)
      updateUserDB((prev) => [...prev.filter((entry) => entry.phone !== newUser.phone), newUser])
      return newUser
    } catch (error) {
      console.warn('API Error, mock fallback:', error.message)
      const db = mockDatabase || MOCKED_DB
      const newUser = { ...payload, id: db.length + 1, isRegistered: true }
      setUser(newUser)
      updateUserDB((prev) => [...prev.filter((entry) => entry.phone !== newUser.phone), newUser])
      return newUser
    }
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

  const logout = () => {
    localStorage.removeItem('court_user')
    localStorage.removeItem('court_wallet')
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
