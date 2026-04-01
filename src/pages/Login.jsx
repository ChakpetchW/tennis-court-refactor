import React, { useEffect, useState } from 'react'
import { ArrowRight, Lock, Smartphone } from 'lucide-react'
import { otpService } from '../services/otpService'
import { useConfig } from '../context/ConfigContext'

const OTP_RESEND_SECONDS = 300

function Login({ onLoginSuccess }) {
  const { config: dynamicConfig } = useConfig()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState('phone')
  const [timer, setTimer] = useState(OTP_RESEND_SECONDS)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (step !== 'otp' || timer <= 0) return undefined

    const intervalId = window.setInterval(() => {
      setTimer((current) => current - 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [step, timer])

  const moveToOtpStep = () => {
    setIsLoading(false)
    setErrorMessage('')
    setStep('otp')
    setTimer(OTP_RESEND_SECONDS)
  }

  const handleRequestOTP = async (event) => {
    if (event) event.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    try {
      await otpService.requestOTP(phone, 'recaptcha-container', dynamicConfig)
      // Small delay for smooth UI transition
      window.setTimeout(moveToOtpStep, 600)
    } catch (error) {
      console.warn('OTP request failed.', error)
      setIsLoading(false)
      setErrorMessage(error.message || 'ไม่สามารถส่ง OTP ได้ กรุณาตรวจสอบเบอร์โทรศัพท์')
    }
  }

  const handleVerifyOTP = async (event) => {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await otpService.verifyOTP(otp, phone)
      if (result.success) {
        setIsLoading(false)
        // For Firebase, we use the normalized phone from the user object if available
        onLoginSuccess(result.phone || phone)
      } else {
        throw new Error(result.error || 'OTP ไม่ถูกต้อง')
      }
    } catch (error) {
      setIsLoading(false)
      setErrorMessage(error.message || 'OTP ไม่ถูกต้องหรือหมดอายุ')
    }
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

        {errorMessage ? (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #fed7d7',
              color: '#c53030',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: '600',
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {step === 'phone' ? (
          <form onSubmit={handleRequestOTP} className="flex-col gap-md">
            <div style={{ position: 'relative' }}>
              <Smartphone
                size={20}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
              <input
                type="tel"
                placeholder="เบอร์โทรศัพท์ (08x-xxx-xxxx)"
                style={{ width: '100%', paddingLeft: '48px' }}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="checkbox" required style={{ width: 'auto' }} />
              ยอมรับ <span style={{ color: 'var(--accent-primary)' }}>ข้อกำหนดและนโยบายความเป็นส่วนตัว</span>
            </label>

            {/* Firebase reCAPTCHA anchor */}
            <div id="recaptcha-container"></div>

            <button type="submit" className="premium-button" disabled={isLoading}>
              {isLoading ? 'กำลังประมวลผล...' : 'ขอรับรหัส OTP'} <ArrowRight size={18} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex-col gap-md">
            <div style={{ position: 'relative' }}>
              <Lock
                size={20}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                }}
              />
              <input
                type="text"
                placeholder="รหัส OTP 6 หลัก"
                maxLength={6}
                style={{ width: '100%', paddingLeft: '48px', textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                required
              />
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              {timer > 0 ? (
                <span style={{ color: 'var(--text-secondary)' }}>ส่งรหัสใหม่ได้ใน {timer} วินาที</span>
              ) : (
                <button type="button" onClick={() => void handleRequestOTP()} style={{ color: 'var(--accent-primary)' }}>
                  ส่งรหัสอีกครั้ง
                </button>
              )}
            </div>

            <button type="submit" className="premium-button" disabled={isLoading || otp.length < 4}>
              {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtp('')
                setErrorMessage('')
              }}
              style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}
            >
              เปลี่ยนเบอร์โทรศัพท์
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
