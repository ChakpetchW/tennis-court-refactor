import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'
import { MOCKED_DB } from '../data/constants'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('court_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const saved = localStorage.getItem('court_admin_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  // Persistence for both User and Admin
  useEffect(() => {
    if (user) localStorage.setItem('court_user', JSON.stringify(user))
    else localStorage.removeItem('court_user')
  }, [user])

  useEffect(() => {
    if (adminUser) localStorage.setItem('court_admin_user', JSON.stringify(adminUser))
    else localStorage.removeItem('court_admin_user')
  }, [adminUser])

  const login = async (phone, mockDatabase = MOCKED_DB) => {
    // 1. Check localStorage first
    try {
      const saved = localStorage.getItem('court_user')
      if (saved) {
        const savedUser = JSON.parse(saved)
        if (savedUser.phone === phone) {
          setUser(savedUser)
          return { success: true, user: savedUser, isRegistered: true }
        }
      }
    } catch {}

    // 2. Try the real API
    try {
      const data = await api.login(phone)
      if (data && data.id) {
        const loggedIn = { ...data, isRegistered: true }
        setUser(loggedIn)
        localStorage.setItem('court_user', JSON.stringify(loggedIn))
        return { success: true, user: loggedIn, isRegistered: true, wallet_balance: data.wallet_balance }
      }
    } catch (err) {
      console.warn('API not reachable, using local fallback.')
    }

    // 3. Fallback to Mock DB
    const db = mockDatabase || MOCKED_DB
    const existingUser = db.find(u => u.phone === phone)
    if (existingUser) {
      setUser(existingUser)
      localStorage.setItem('court_user', JSON.stringify(existingUser))
      return { success: true, user: existingUser, isRegistered: true }
    } else {
      const newUser = { phone, isRegistered: false }
      setUser(newUser)
      return { success: true, user: newUser, isRegistered: false }
    }
  }

  const register = async (payload, mockDatabase = MOCKED_DB, updateUserDB = () => {}) => {
     try {
      const resData = await api.register(payload)
      if (resData && resData.id) {
        const newUser = { ...payload, id: resData.id, isRegistered: true, wallet_balance: 0 }
        setUser(newUser)
        updateUserDB(prev => [...prev.filter(u => u.phone !== newUser.phone), newUser])
        localStorage.setItem('court_user', JSON.stringify(newUser))
        return newUser
      } else {
        throw new Error(resData?.error || 'Registration failed')
      }
    } catch (err) {
      console.warn('API Error, mock fallback:', err.message)
      const db = mockDatabase || MOCKED_DB
      const newUser = { ...payload, id: db.length + 1, isRegistered: true }
      setUser(newUser)
      updateUserDB(prev => [...prev.filter(u => u.phone !== newUser.phone), newUser])
      localStorage.setItem('court_user', JSON.stringify(newUser))
      return newUser
    }
  }

  const logout = () => {
    localStorage.removeItem('court_user')
    localStorage.removeItem('court_admin_user')
    setUser(null)
    setAdminUser(null)
    window.location.reload()
  }

  const value = {
    user, setUser, adminUser, setAdminUser, login, register, logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
