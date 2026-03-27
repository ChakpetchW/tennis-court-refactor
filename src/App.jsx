import React, { useState, useEffect } from 'react'
import './App.css'

// Services & Data
import { api } from './services/api'
import { INITIAL_COURTS } from './data/constants'

// Context
import { useApp } from './context/AppContext'

// Components
import Header from './components/Header'
import HistoryView from './components/HistoryView'
import WalletView from './components/WalletView'

// Pages
import Login from './pages/Login'
import ProfileRegistration from './pages/ProfileRegistration'
import ProfileDashboard from './pages/Profile'
import Booking from './pages/Booking'
import Checkout from './pages/Checkout'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'

function App() {
  // 1. Pull State from Global Context
  const { 
    user, adminUser, setAdminUser, login, register,
    walletBalance, setWalletBalance, fetchUserBalance, updateWallet,
    courts, fetchStatus, fetchUserHistory,
    mockDatabase, updateUserDB, apiSettings
  } = useApp()

  // 2. Local State for UI Routing & Checkout
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem('court_user')
      return saved ? 'profile' : 'login'
    } catch { return 'login' }
  })
  const [currentBooking, setCurrentBooking] = useState(null)

  // 3. Effects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      alert('ชำระเงินสำเร็จแล้ว! ระบบกำลังบันทึกข้อมูลการจองของคุณครับ')
      window.history.replaceState({}, document.title, window.location.pathname)
      if (user?.id) fetchUserHistory(user.id)
      setView('history')
    }
  }, [user?.id])

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin/login') setView('adminLogin')
      else if (window.location.hash === '#admin' && adminUser) setView('admin')
    }
    window.addEventListener('hashchange', handleHash)
    if (window.location.hash === '#admin/login') setView('adminLogin')
    return () => window.removeEventListener('hashchange', handleHash)
  }, [adminUser])

  // 4. Handlers
  const handleLoginSuccess = async (phone) => {
    const res = await login(phone, mockDatabase)
    if (res.isRegistered) {
      if (res.wallet_balance !== undefined) setWalletBalance(Number(res.wallet_balance))
      setView('profile')
    } else {
      setView('registration')
    }
  }

  const handleRegistrationComplete = async (fields) => {
    const newUser = await register(fields, mockDatabase, updateUserDB)
    if (newUser) setView('profile')
  }

  const handleBookingConfirm = async (bookingData) => {
    const courtRef = INITIAL_COURTS.find(c => c.name === (bookingData.court?.name || bookingData.court))
    try {
      const result = await api.setPending(user.id, courtRef?.id, bookingData.date, bookingData.time, bookingData.price)
      if (result.success && result.booking_id) {
        setCurrentBooking({ ...bookingData, id: result.booking_id })
        setView('checkout')
      } else {
        alert('ไม่สามารถเตรียมการจองได้ในขณะนี้: ' + (result.error || 'Unknown error'))
      }
    } catch(err) { alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์') }
  }

  const handleCancelBooking = async () => {
    if (currentBooking) {
      const courtRef = INITIAL_COURTS.find(c => c.name === (currentBooking.court?.name || currentBooking.court))
      try {
        await api.clearPending(courtRef?.id, currentBooking.date, currentBooking.time)
      } catch(err) { console.error('API Error:', err) }
    }
    setView('booking')
    setCurrentBooking(null)
  }

  const handlePaymentComplete = async () => {
    if (currentBooking) {
      const courtRef = INITIAL_COURTS.find(c => c.name === (currentBooking.court?.name || currentBooking.court))
      try {
        await api.confirmBooking({ 
          user_id: user.id || 1, user_name: user.name, court_id: courtRef?.id, 
          date: currentBooking.date, hour: currentBooking.time, price: currentBooking.price || 500,
          payment_provider: currentBooking.paymentMethod || 'omise', booking_id: currentBooking.id
        })
      } catch(err) { console.error('Confirm Booking API Error:', err) }
      
      if (user?.id) fetchUserHistory(user.id)
      fetchStatus(currentBooking.date)
    }
    setCurrentBooking(null)
    setView('profile')
  }

  // 5. Render
  return (
    <div className="app-shell" style={{ background: view === 'login' || view === 'registration' ? 'var(--bg-dark)' : '#f4f7f6', color: '#333' }}>
      <Header onViewChange={setView} />
      
      {view === 'login' && <Login onLoginSuccess={handleLoginSuccess} apiSettings={apiSettings} />}
      {view === 'registration' && <ProfileRegistration onComplete={handleRegistrationComplete} />}
      
      {view === 'profile' && (
        <ProfileDashboard user={user} walletBalance={walletBalance} onStartBooking={() => setView('booking')} onAdmin={() => setView('admin')} />
      )}
      
      {view === 'history' && <HistoryView onBack={() => setView('profile')} />}
      {view === 'wallet' && <WalletView onBack={() => setView('profile')} />}
      
      {view === 'booking' && (
        <Booking onBack={() => setView('profile')} onCheckout={handleBookingConfirm} />
      )}
      
      {view === 'checkout' && (
        <Checkout booking={currentBooking} onBack={handleCancelBooking} onComplete={handlePaymentComplete} />
      )}
      
      {view === 'admin' && (
        <Admin 
          onBack={() => { setView('profile'); window.location.hash = ''; }} 
          onLogout={() => { setAdminUser(null); setView('login'); window.location.hash = ''; }}
        />
      )}
      
      {view === 'adminLogin' && (
        <AdminLogin 
          onLoginSuccess={(data) => { setAdminUser(data); setView('admin'); window.location.hash = '#admin'; }}
          onBack={() => { setView('login'); window.location.hash = ''; }}
        />
      )}
    </div>
  )
}

export default App
