import React, { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
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

const BOOKING_RETURN_STORAGE_KEY = 'court_booking_return'

const readStoredBookingReturn = () => {
  try {
    const raw = localStorage.getItem(BOOKING_RETURN_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const getInitialView = () => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('payment') === 'success') {
    return readStoredBookingReturn() ? 'profile' : 'history'
  }
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
    fetchCourtsMetadata,
    fetchStatus,
    fetchUserHistory,
    mockDatabase,
    updateUserDB,
  } = useApp()

  const [view, setView] = useState(getInitialView)
  const [currentBooking, setCurrentBooking] = useState(null)
  const [returnedPaymentSuccess, setReturnedPaymentSuccess] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('payment') === 'success' ? readStoredBookingReturn() : null
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentSuccess = params.get('payment') === 'success'
    const topupSuccess = params.get('topup') === 'success'

    if (!paymentSuccess && !topupSuccess) return

    window.history.replaceState({}, document.title, window.location.pathname)

    if (paymentSuccess && user?.id) {
      void fetchUserHistory(user.id)
    }

    if (paymentSuccess) {
      const returnedBooking = readStoredBookingReturn()

      if (returnedBooking) {
        setReturnedPaymentSuccess(returnedBooking)
        setView('profile')

        if (returnedBooking.bookingId && returnedBooking.chargeId) {
          void api.checkPaymentStatus(returnedBooking.bookingId, returnedBooking.chargeId)
            .then(() => {
              if (user?.id) {
                return fetchUserHistory(user.id)
              }

              return null
            })
            .catch((error) => {
              console.error('Reconcile returned card payment failed:', error)
            })
        }

        if (returnedBooking.date) {
          void fetchStatus(returnedBooking.date)
        }
      }
    }

    if (topupSuccess) {
      void fetchUserBalance()
    }
  }, [fetchUserBalance, fetchStatus, fetchUserHistory, user?.id])

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

  const handleStartBooking = async () => {
    await fetchCourtsMetadata()
    setView('booking')
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

  const handleDismissReturnedPaymentSuccess = () => {
    localStorage.removeItem(BOOKING_RETURN_STORAGE_KEY)
    setReturnedPaymentSuccess(null)
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
        <ProfileDashboard user={user} walletBalance={walletBalance} onStartBooking={handleStartBooking} />
      )}

      {view === 'history' && <HistoryView onBack={() => setView('profile')} />}
      {view === 'wallet' && <WalletView onBack={() => setView('profile')} />}

      {view === 'booking' && <Booking onBack={() => setView('profile')} onCheckout={handleBookingConfirm} />}

      {view === 'checkout' && (
        <Checkout booking={currentBooking} onBack={handleCancelBooking} onComplete={handlePaymentComplete} />
      )}

      {returnedPaymentSuccess && (
        <div className="booking-success-overlay">
          <div className="glass-card fade-in booking-success-modal">
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00b894, #00cec9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle2 size={40} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1a1a3a', marginBottom: '8px' }}>จองสำเร็จ!</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
              ระบบยืนยันการชำระเงินผ่านบัตรเรียบร้อยแล้ว
            </p>
            <div style={{ background: '#f8fffe', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left', fontSize: '0.9rem', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: '#666' }}>สนาม</span><strong>{returnedPaymentSuccess.court}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: '#666' }}>วันที่</span><strong>{returnedPaymentSuccess.date}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: '#666' }}>เวลา</span><strong>{returnedPaymentSuccess.time}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: '#666' }}>ผู้จอง</span><strong>{returnedPaymentSuccess.customerName}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: '#666' }}>ช่องทางชำระ</span><strong>{returnedPaymentSuccess.paymentMethod === 'card' ? 'Credit / Debit Card' : returnedPaymentSuccess.paymentMethod}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}><span style={{ color: '#666' }}>ยอดชำระ</span><strong style={{ color: '#00b894' }}>฿{Number(returnedPaymentSuccess.price || 0).toFixed(2)}</strong></div>
            </div>
            <button
              className="premium-button"
              style={{ width: '100%', background: '#1a1a3a', padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: '700' }}
              onClick={handleDismissReturnedPaymentSuccess}
            >
              กลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
