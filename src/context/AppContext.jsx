import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { useWallet } from './WalletContext'
import { useBooking as useCourts } from './BookingContext'
import { useBooking as useAllotments } from './BookingContext'
import { api } from '../services/api'
import { MOCKED_DB } from '../data/constants'

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  // 1. Core State Hooks
  const { user, setUser, adminUser, setAdminUser, login, register } = useAuth()
  const { walletBalance, setWalletBalance, fetchUserBalance, updateWallet } = useWallet(user, setUser)
  const { courts, setCourts, fetchCourtsMetadata } = useCourts()
  const { fetchStatus } = useAllotments(setCourts)

  // 3. Shared Meta State
  const [mockDatabase, setMockDatabase] = useState(() => {
    try {
      const saved = localStorage.getItem('court_users_db')
      return saved ? JSON.parse(saved) : MOCKED_DB
    } catch { return MOCKED_DB }
  })
  
  const [apiSettings, setApiSettings] = useState({
    otpWebhookUrl: '', otpMethod: 'GET', otpApiKey: '', otpApiSecret: '',
    paymentWebhookUrl: '', paymentMethod: 'POST',
    adminPassword: 'admin' // default fallback
  })

  const [userHistory, setUserHistory] = useState([])
  const [adminBookings, setAdminBookings] = useState([])

  // 4. Shared Actions
  const fetchUserHistory = async (userId) => {
    if (!userId) return
    try {
      const data = await api.getUserHistory(userId)
      if (Array.isArray(data)) setUserHistory(data)
    } catch (err) { console.error('Fetch history error:', err) }
  }

  const fetchAdminBookings = async (dateArg) => {
    const date = dateArg || new Date().toLocaleDateString('sv-SE')
    try {
      const data = await api.getAdminBookings(date)
      if (Array.isArray(data)) {
        setAdminBookings(data.map(b => ({
          ...b, 
          court: b.court_name, 
          hour: b.booking_time, // Fix for NaN:00
          date: b.booking_date,
          status: b.status,
          user: { name: b.user_name, phone: b.user_phone }
        })))
      }
    } catch (err) { console.error('Fetch admin bookings error:', err) }
  }

  const updateUserDB = (updater) => {
    setMockDatabase(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('court_users_db', JSON.stringify(next))
      return next
    })
  }

  // 5. Coordinated Background Polling
  useEffect(() => {
    fetchStatus()
    fetchCourtsMetadata()
    if (user?.id) {
      fetchUserHistory(user.id)
    }

    const interval = setInterval(() => {
      fetchStatus()
    }, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

  const value = {
    user, setUser, adminUser, setAdminUser, login, register,
    walletBalance, setWalletBalance, fetchUserBalance, updateWallet,
    courts, setCourts, fetchCourtsMetadata, fetchStatus,
    userHistory, setUserHistory, adminBookings, setAdminBookings,
    fetchUserHistory, fetchAdminBookings,
    mockDatabase, setMockDatabase, updateUserDB,
    apiSettings, setApiSettings
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within an AppProvider')
  return context
}
