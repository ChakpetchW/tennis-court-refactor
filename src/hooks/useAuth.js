import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { MOCKED_DB } from '../data/constants'

export const useAuth = () => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('court_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  
  const [adminUser, setAdminUser] = useState(null)

  const login = async (phone, mockDatabase) => {
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
    const existingUser = mockDatabase.find(u => u.phone === phone)
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

  const register = async (payload, mockDatabase, updateUserDB) => {
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
      const newUser = { ...payload, id: mockDatabase.length + 1, isRegistered: true }
      setUser(newUser)
      updateUserDB(prev => [...prev.filter(u => u.phone !== newUser.phone), newUser])
      localStorage.setItem('court_user', JSON.stringify(newUser))
      return newUser
    }
  }

  const logout = () => {
    localStorage.removeItem('court_user')
    setUser(null)
    window.location.reload()
  }

  return { user, setUser, adminUser, setAdminUser, login, register, logout }
}
