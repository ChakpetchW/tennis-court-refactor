import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../services/api'
import { MOCKED_DB } from '../data/constants'
import { useAuth } from '../hooks/useAuth'
import { useWallet } from '../hooks/useWallet'
import { useCourts } from '../hooks/useCourts'
import { useAllotments } from '../hooks/useAllotments'
import { AppContext } from './app-context'

export const AppProvider = ({ children }) => {
  const {
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
  } = useAuth()
  const { walletBalance, setWalletBalance, fetchUserBalance, updateWallet } = useWallet()
  const { courts, setCourts, fetchCourtsMetadata } = useCourts()
  const { fetchStatus } = useAllotments()

  const [mockDatabase, setMockDatabase] = useState(() => {
    try {
      const saved = localStorage.getItem('court_users_db')
      return saved ? JSON.parse(saved) : MOCKED_DB
    } catch {
      return MOCKED_DB
    }
  })
  const [userHistory, setUserHistory] = useState([])
  const [adminBookings, setAdminBookings] = useState([])

  const fetchUserHistory = useCallback(async (userId) => {
    if (!userId) return
    try {
      const data = await api.getUserHistory(userId)
      if (Array.isArray(data)) {
        setUserHistory(
          data.filter((booking) =>
            ['paid', 'successful', 'success', 'confirmed'].includes(
              (booking.status || '').toString().trim().toLowerCase(),
            ),
          ),
        )
      }
    } catch (error) {
      console.error('Fetch history error:', error)
    }
  }, [])

  const fetchAdminBookings = useCallback(async (dateArg) => {
    const date = dateArg || new Date().toLocaleDateString('sv-SE')
    try {
      const data = await api.getAdminBookings(date)
      if (Array.isArray(data)) {
        setAdminBookings(
          data.map((booking) => ({
            ...booking,
            court: booking.court_name,
            hour: booking.booking_time,
            date: booking.booking_date,
            status: booking.status,
            user: { name: booking.user_name, phone: booking.user_phone },
          })),
        )
      }
    } catch (error) {
      console.error('Fetch admin bookings error:', error)
    }
  }, [])

  const updateUserDB = useCallback((updater) => {
    setMockDatabase((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('court_users_db', JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    void fetchCourtsMetadata()
    void fetchStatus()

    const intervalId = window.setInterval(() => {
      void fetchStatus()
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [fetchCourtsMetadata, fetchStatus])

  useEffect(() => {
    if (!user?.id) return

    const syncUserData = async () => {
      await fetchUserBalance()
      await fetchUserHistory(user.id)
    }

    void syncUserData()
  }, [fetchUserBalance, fetchUserHistory, user?.id])

  return (
    <AppContext.Provider
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
        walletBalance,
        setWalletBalance,
        fetchUserBalance,
        updateWallet,
        courts,
        setCourts,
        fetchCourtsMetadata,
        fetchStatus,
        userHistory,
        setUserHistory,
        adminBookings,
        setAdminBookings,
        fetchUserHistory,
        fetchAdminBookings,
        mockDatabase,
        setMockDatabase,
        updateUserDB,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export default AppProvider
