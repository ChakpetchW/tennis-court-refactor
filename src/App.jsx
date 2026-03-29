import React, { useEffect, useState } from 'react'
import './App.css'

import { api } from './services/api'
import { INITIAL_COURTS } from './data/constants'
import { useApp } from './hooks/useApp'

import Header from './components/Header'
import HistoryView from './components/HistoryView'
import WalletView from './components/WalletView'

import Login from './pages/Login'
import ProfileRegistration from './pages/ProfileRegistration'
import ProfileDashboard from './pages/Profile'
import Booking from './pages/Booking'
import Checkout from './pages/Checkout'

const getInitialView = () => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('payment') === 'success') return 'history'
  if (params.get('topup') === 'success') return 'wallet'

  try {
    const saved = localStorage.getItem('court_user')
    return saved ? 'profile' : 'login'
  } catch {
    return 'login'
  }
}

const resolveCourtId = (bookingData) => {
  const courtName = bookingData?.court?.name || bookingData?.court
  return INITIAL_COURTS.find((court) => court.name === courtName)?.id
}

function App() {
  const {
    user,
    login,
    register,
    walletBalance,
    setWalletBalance,
    fetchUserBalance,
    fetchStatus,
    fetchUserHistory,
    mockDatabase,
    updateUserDB,
  } = useApp()

  const [view, setView] = useState(getInitialView)
  const [currentBooking, setCurrentBooking] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentSuccess = params.get('payment') === 'success'
    const topupSuccess = params.get('topup') === 'success'

    if (!paymentSuccess && !topupSuccess) return

    window.history.replaceState({}, document.title, window.location.pathname)

    if (paymentSuccess && user?.id) {
      void fetchUserHistory(user.id)
    }

    if (topupSuccess) {
      void fetchUserBalance()
    }
  }, [fetchUserBalance, fetchUserHistory, user?.id])

  const handleLoginSuccess = async (phone) => {
    const result = await login(phone, mockDatabase)
    if (result.isRegistered) {
      if (result.wallet_balance !== undefined) {
        setWalletBalance(Number(result.wallet_balance))
      }
      setView('profile')
      return
    }

    setView('registration')
  }

  const handleRegistrationComplete = async (fields) => {
    const newUser = await register(fields, mockDatabase, updateUserDB)
    if (newUser) {
      setView('profile')
    }
  }

  const handleBookingConfirm = async (bookingData) => {
    try {
      const result = await api.setPending(
        user.id,
        resolveCourtId(bookingData),
        bookingData.date,
        bookingData.time,
        bookingData.price,
      )

      if (result.success && result.booking_id) {
        setCurrentBooking({ ...bookingData, id: result.booking_id })
        setView('checkout')
        return
      }

      alert(`ไม่สามารถเตรียมการจองได้ในขณะนี้: ${result.error || 'Unknown error'}`)
    } catch (error) {
      console.error('Create pending booking failed:', error)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    }
  }

  const handleCancelBooking = async () => {
    if (currentBooking) {
      try {
        await api.clearPending(resolveCourtId(currentBooking), currentBooking.date, currentBooking.time)
      } catch (error) {
        console.error('Clear pending booking failed:', error)
      }
    }

    setCurrentBooking(null)
    setView('booking')
  }

  const handlePaymentComplete = async (paymentProvider = null) => {
    if (currentBooking) {
      try {
        await api.confirmBooking({
          user_id: user.id || 1,
          user_name: user.name,
          court_id: resolveCourtId(currentBooking),
          date: currentBooking.date,
          hour: currentBooking.time,
          price: currentBooking.price || 500,
          payment_provider: paymentProvider || currentBooking.paymentMethod || 'omise',
          booking_id: currentBooking.id,
        })
      } catch (error) {
        console.error('Confirm booking API error:', error)
      }

      if (user?.id) {
        await fetchUserHistory(user.id)
      }
      await fetchStatus(currentBooking.date)
    }

    setCurrentBooking(null)
    setView('profile')
  }

  return (
    <div
      className="app-shell"
      style={{
        background: view === 'login' || view === 'registration' ? 'var(--bg-dark)' : '#f4f7f6',
        color: '#333',
      }}
    >
      <Header onViewChange={setView} />

      {view === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
      {view === 'registration' && <ProfileRegistration onComplete={handleRegistrationComplete} />}

      {view === 'profile' && (
        <ProfileDashboard user={user} walletBalance={walletBalance} onStartBooking={() => setView('booking')} />
      )}

      {view === 'history' && <HistoryView onBack={() => setView('profile')} />}
      {view === 'wallet' && <WalletView onBack={() => setView('profile')} />}

      {view === 'booking' && <Booking onBack={() => setView('profile')} onCheckout={handleBookingConfirm} />}

      {view === 'checkout' && (
        <Checkout booking={currentBooking} onBack={handleCancelBooking} onComplete={handlePaymentComplete} />
      )}
    </div>
  )
}

export default App
