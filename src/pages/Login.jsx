import React, { useState, useEffect } from 'react'
import { Smartphone, Lock, ArrowRight } from 'lucide-react'
import { api } from '../services/api'

function Login({ onLoginSuccess }) {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone') // 'phone' or 'otp'
  const [timer, setTimer] = useState(60)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let interval
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000)
    }
    return () => clearInterval(interval)
  }, [step, timer])

  const handleRequestOTP = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await api.requestOTP(phone, apiSettings)
    } catch (err) {
      console.warn('OTP Request failed or CORS issue:', err)
    }

    setTimeout(() => {
      setIsLoading(false)
      setStep('otp')
      setTimer(60)
    }, 1000)
  }

  const handleVerifyOTP = (e) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API verification
    setTimeout(() => {
      setIsLoading(false)
      onLoginSuccess(phone)
    }, 1000)
  }

  return (
    <div className="container fade-in">
      <div className="glass-card flex-col gap-lg" style={{ padding: '32px' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Tennis Court</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {step === 'phone' ? 'เข้าสู่ระบบด้วยเบอร์โทรศัพท์' : 'กรอกรหัส OTP ที่ได้รับ'}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={handleRequestOTP} className="flex-col gap-md">
            <div style={{ position: 'relative' }}>
              <Smartphone size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="tel"
                placeholder="เบอร์โทรศัพท์ (08x-xxx-xxxx)"
                style={{ width: '100%', paddingLeft: '48px' }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="checkbox" required style={{ width: 'auto' }} />
              ยอมรับ <span style={{ color: 'var(--accent-primary)' }}>ข้อกำหนดและนโยบายความเป็นส่วนตัว</span>
            </label>
            <button type="submit" className="premium-button" disabled={isLoading}>
              {isLoading ? 'กำลังประมวลผล...' : 'ขอรับรหัส OTP'} <ArrowRight size={18} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex-col gap-md">
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="รหัส OTP 6 หลัก"
                maxLength={6}
                style={{ width: '100%', paddingLeft: '48px', textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              {timer > 0 ? (
                <span style={{ color: 'var(--text-secondary)' }}>ส่งรหัสใหม่ได้ใน {timer} วินาที</span>
              ) : (
                <button type="button" onClick={() => setTimer(60)} style={{ color: 'var(--accent-primary)' }}>ส่งรหัสอีกครั้ง</button>
              )}
            </div>
            <button type="submit" className="premium-button" disabled={isLoading || otp.length < 6}>
              {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </button>
            <button type="button" onClick={() => setStep('phone')} style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              เปลี่ยนเบอร์โทรศัพท์
            </button>
          </form>
        )}

      </div>
    </div>
  )
}

export default Login
