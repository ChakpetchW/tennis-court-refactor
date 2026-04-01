import React, { useState, useEffect } from 'react'
import { QrCode, CreditCard, CheckCircle2, ChevronLeft, Wallet } from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../hooks/useApp'

const OMISE_PUBLIC_KEY = import.meta.env.VITE_OMISE_PUBLIC_KEY || ''

const PAYMENT_METHODS_WALLET = [
  { id: 'qr',     name: 'Thai QR PromptPay',  icon: <QrCode size={26} />,     desc: 'Scan & Pay' },
  { id: 'credit', name: 'Credit / Debit Card',  icon: <CreditCard size={26} />, desc: 'Visa / Mastercard' },
]

const isSuccessfulTopupStatus = (status) => {
  const normalized = (status || '').toString().trim().toLowerCase()
  return ['paid', 'confirmed', 'success', 'successful', 'captured', 'complete', 'completed'].includes(normalized)
}

const WalletView = ({ onBack }) => {
  const { user, walletBalance, fetchUserBalance: onRefreshBalance } = useApp()
  const balance = Number(walletBalance) || 0
  const QUICK_AMOUNTS = [100, 200, 500, 1000]
  const [step, setStep] = useState('home')      // home | selectAmount | selectMethod | qr | success
  const [selectedAmt, setSelectedAmt] = useState(500)
  const [customAmt, setCustomAmt] = useState('')
  const [method, setMethod] = useState('qr')
  const [timeLeft, setTimeLeft] = useState(900)
  const [processing, setProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [chargeId, setChargeId] = useState(null)
  const [qrUri, setQrUri] = useState(null)
  const [successBalance, setSuccessBalance] = useState(0)

  // Card Info State
  const [cardInfo, setCardInfoInputs] = useState({ number: '', name: user?.name || '', expiry: '', cvc: '' })

  const formatCardNumber = (val) => {
    const v = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(' ') : v
  }

  const formatExpiry = (val) => {
    const v = val.replace(/\D/g, '').substring(0, 4)
    if (v.length > 2) return v.substring(0, 2) + '/' + v.substring(2)
    return v
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('topup') === 'success') {
      const amt = Number(params.get('amt')) || 0
      if (amt > 0) {
        setSelectedAmt(amt)
        setCustomAmt('')
      }
      setStep('success')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (step !== 'qr') return
    if (timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [step, timeLeft])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (step === 'success') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step])

  const formatTime = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`
  const finalAmt = customAmt > 0 ? Number(customAmt) : selectedAmt

  const finalizeTopupSuccess = async (confirmedBalance = null) => {
    if (typeof confirmedBalance === 'number' && !Number.isNaN(confirmedBalance)) {
      setSuccessBalance(confirmedBalance)
      setStep('success')
      return
    }

    try {
      const newBal = await onRefreshBalance()
      if (typeof newBal === 'number' && !Number.isNaN(newBal)) {
        setSuccessBalance(newBal)
        setStep('success')
        return
      }
    } catch (error) {
      console.error('Refresh balance after top-up failed:', error)
    }

    setSuccessBalance(balance + finalAmt)
    setStep('success')
  }

  useEffect(() => {
    if (step !== 'qr' || !chargeId) return

    let isCancelled = false

    const pollStatus = async () => {
      try {
        const data = await api.checkTopupStatus(chargeId)
        if (isCancelled) return

        if (isSuccessfulTopupStatus(data.status)) {
          const confirmedBalance = Number(data.wallet_balance_after)
          if (!Number.isNaN(confirmedBalance)) {
            setSuccessBalance(confirmedBalance)
            setStep('success')
            return
          }

          try {
            const newBal = await onRefreshBalance()
            if (!isCancelled && typeof newBal === 'number' && !Number.isNaN(newBal)) {
              setSuccessBalance(newBal)
              setStep('success')
              return
            }
          } catch (error) {
            if (!isCancelled) {
              console.error('Refresh balance after top-up failed:', error)
            }
          }

          if (!isCancelled) {
            setSuccessBalance(balance + finalAmt)
            setStep('success')
          }
        }
      } catch (e) {
        if (!isCancelled) {
          console.error('Poll error:', e)
        }
      }
    }

    void pollStatus()
    const pollId = setInterval(pollStatus, 2000)

    return () => {
      isCancelled = true
      clearInterval(pollId)
    }
  }, [balance, chargeId, finalAmt, onRefreshBalance, step])

  const handleConfirmTopUp = async () => {
    if (!user?.id) return alert('กรุณาเข้าสู่ระบบก่อนเติมเงิน')
    const userObj = user
    
    setProcessing(true)
    setStatusMsg('กำลังเตรียมการชำระเงิน...')
    
    try {
      let cardToken = null

      if (method === 'credit') {
        if (!cardInfo.number || !cardInfo.name || !cardInfo.expiry || !cardInfo.cvc) {
          alert('กรุณากรอกข้อมูลบัตรให้ครบถ้วน')
          setProcessing(false)
          return
        }
        const [expMonth, expYear] = cardInfo.expiry.split('/')
        
        setStatusMsg('กำลังเข้ารหัสข้อมูลบัตรอย่างปลอดภัย...')
        cardToken = await new Promise((resolve, reject) => {
          if (!window.Omise) return reject(new Error('ระบบชำระเงินไม่พร้อมใช้งาน (Omise SDK not loaded) กรุณาปิด Ad-blocker หรือตรวจสอบเน็ตแล้วลองใหม่'))
          if (!OMISE_PUBLIC_KEY) return reject(new Error('ไม่ได้ตั้งค่ากุญแจสาธารณะ (Omise public key not configured)'))
          window.Omise.setPublicKey(OMISE_PUBLIC_KEY)
          const params = {
            name: cardInfo.name,
            number: cardInfo.number.replace(/\s/g, ''),
            expiration_month: parseInt(expMonth),
            expiration_year: 2000 + parseInt(expYear),
            security_code: cardInfo.cvc
          }
          window.Omise.createToken('card', params, (status, response) => {
            if (status === 200) resolve(response.id)
            else reject(new Error(response.message || 'การตรวจสอบบัตรล้มเหลว'))
          })
        })
      }

      setStatusMsg('กำลังประมวลผลการเติมเงิน...')
      const data = await api.initiateOmiseTopup(userObj.id, finalAmt, method, cardToken)
      
      if (data.success) {
        setChargeId(data.charge_id)
        if (method === 'credit') {
          if (data.authorize_uri) {
            window.location.href = data.authorize_uri
          } else if (data.status === 'successful') {
            const confirmedBalance = Number(data.wallet_balance_after)
            await finalizeTopupSuccess(Number.isNaN(confirmedBalance) ? null : confirmedBalance)
          } else {
            setStep('qr') 
            setQrUri(null) 
          }
        } else {
          setQrUri(data.qr_code_uri)
          setStep('qr')
        }
      } else {
        alert('เกิดข้อผิดพลาด: ' + (data.error || 'โปรดลองอีกครั้ง'))
      }
    } catch (e) {
      alert('เกิดข้อผิดพลาด: ' + (e.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'))
    } finally {
      setProcessing(false)
    }
  }

  const handlePaymentDone = async () => {
    if (!chargeId) return
    setProcessing(true)
    try {
      const data = await api.checkTopupStatus(chargeId)
      const isPaid = isSuccessfulTopupStatus(data.status)
      
      if (isPaid) {
        const confirmedBalance = Number(data.wallet_balance_after)
        await finalizeTopupSuccess(Number.isNaN(confirmedBalance) ? null : confirmedBalance)
      } else {
        alert('ยังไม่พบยอดชำระเงิน กรุณารอสักครู่')
      }
    } catch {
      alert('ไม่สามารถตรวจสอบสถานะได้ โปรดลองอีกครั้ง')
    } finally {
      setProcessing(false)
    }
  }

  const renderCardFields = (compact = false) => (
    <div
      className="glass-card flex-col fade-in"
      style={{ background: 'var(--bg-primary)', overflow: 'hidden', border: compact ? '2px solid var(--accent-primary)' : undefined }}
    >
      <div style={{ padding: 'var(--space-md) var(--space-lg)', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <CreditCard size={18} /> ข้อมูลบัตรสำหรับเติมเงิน
        </div>
        <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>SECURE CARD ENTRY</span>
      </div>
      <div style={{ padding: compact ? 'var(--space-md)' : 'var(--space-lg)' }} className="flex-col gap-md">
        <div className="flex-col gap-xs">
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>หมายเลขบัตร (Card Number)</label>
          <input
            type="text"
            placeholder="0000 0000 0000 0000"
            value={cardInfo.number}
            onChange={(e) => setCardInfoInputs({ ...cardInfo, number: formatCardNumber(e.target.value) })}
            style={{ width: '100%', padding: 'var(--space-md)', fontSize: 'var(--text-lg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', letterSpacing: '0.05em' }}
          />
        </div>
        <div className="flex-col gap-xs">
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ชื่อผู้ถือบัตร (Cardholder Name)</label>
          <input
            type="text"
            placeholder="ENGLISH NAME SURNAME"
            value={cardInfo.name}
            onChange={(e) => setCardInfoInputs({ ...cardInfo, name: e.target.value.toUpperCase() })}
            style={{ width: '100%', padding: 'var(--space-md)', fontSize: 'var(--text-lg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="flex-col gap-xs">
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>EXP (MM/YY)</label>
            <input
              type="text"
              placeholder="MM/YY"
              value={cardInfo.expiry}
              onChange={(e) => setCardInfoInputs({ ...cardInfo, expiry: formatExpiry(e.target.value) })}
              style={{ width: '100%', padding: 'var(--space-md)', fontSize: 'var(--text-lg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
          <div className="flex-col gap-xs">
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CVV</label>
            <input
              type="password"
              placeholder="***"
              maxLength={4}
              value={cardInfo.cvc}
              onChange={(e) => setCardInfoInputs({ ...cardInfo, cvc: e.target.value.replace(/\D/g, '') })}
              style={{ width: '100%', padding: 'var(--space-md)', fontSize: 'var(--text-lg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderMethodCards = (compact = false) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
      {PAYMENT_METHODS_WALLET.map((m) => (
        <div
          key={m.id}
          onClick={() => setMethod(m.id)}
          style={{
            padding: compact ? 'var(--space-md)' : 'var(--space-md) var(--space-lg)',
            border: `2px solid ${method === m.id ? 'var(--accent-primary)' : 'var(--bg-secondary)'}`,
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            background: method === m.id ? 'var(--accent-court)' : 'var(--bg-primary)',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ color: method === m.id ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{m.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', fontSize: 'var(--text-lg)' }}>{m.name}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{m.desc}</div>
          </div>
          <input type="radio" checked={method === m.id} readOnly style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }} />
        </div>
      ))}
    </div>
  )

  const renderHome = (compact = false) => (
    <div className="glass-card flex-col" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex-col">
          <span>จำนวนเงินที่ต้องการเติม</span>
          <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>SELECT TOP-UP AMOUNT</span>
        </div>
        <Wallet size={20} opacity={0.8} />
      </div>
      <div style={{ padding: compact ? 'var(--space-md)' : 'var(--space-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(100px, 1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => {
                setSelectedAmt(amt)
                setCustomAmt('')
              }}
              style={{
                padding: compact ? 'var(--space-md) var(--space-2xs)' : 'var(--space-md) var(--space-2xs)',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${selectedAmt === amt && !customAmt ? 'var(--accent-primary)' : 'var(--bg-secondary)'}`,
                background: selectedAmt === amt && !customAmt ? 'var(--accent-court)' : 'var(--bg-primary)',
                color: selectedAmt === amt && !customAmt ? 'var(--accent-primary)' : 'var(--text-primary)',
                fontWeight: '900',
                fontSize: compact ? 'var(--text-base)' : 'var(--text-lg)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: selectedAmt === amt && !customAmt ? 'translateY(-2px)' : 'none'
              }}
            >
              ฿{amt.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="flex-col gap-xs">
          <div className="flex-col">
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: '800' }}>หรือระบุจำนวนเงินเอง</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2xs)' }}>OR ENTER CUSTOM AMOUNT</span>
          </div>
          <input
            type="number"
            placeholder="เช่น 300"
            value={customAmt}
            onChange={(e) => setCustomAmt(e.target.value)}
            style={{ width: '100%', padding: 'var(--space-md)', fontSize: 'var(--text-2xl)', fontWeight: '800', border: customAmt ? '2px solid var(--accent-primary)' : '1px solid var(--glass-border)', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}
          />
        </div>
      </div>
    </div>
  )

  if (step === 'success') return (
    <div className="booking-success-overlay">
      <div className="glass-card fade-in booking-success-modal">
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'var(--status-success)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)',
        }}>
          <CheckCircle2 size={40} color="#fff" />
        </div>
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>เติมเงินสำเร็จ! 🎉</h2>
        <p style={{ color: 'var(--status-success)', fontSize: 'var(--text-sm)', fontWeight: '700', marginBottom: 'var(--space-lg)' }}>TOP-UP SUCCESSFUL</p>
        
        <div style={{ background: 'var(--status-success-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', textAlign: 'left', fontSize: 'var(--text-sm)', lineHeight: '2.2', border: '1px solid var(--status-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
            <span style={{ color: 'var(--status-success)', opacity: 0.8 }}>ช่องทางการชำระ (METHOD)</span>
            <strong style={{ textAlign: 'right', color: 'var(--text-primary)' }}>{method === 'qr' ? 'Thai QR PromptPay' : 'Credit / Debit Card'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
            <span style={{ color: 'var(--status-success)', opacity: 0.8 }}>ยอดเติมเงิน (AMOUNT)</span>
            <strong style={{ color: 'var(--status-success)', fontSize: 'var(--text-lg)' }}>+฿{finalAmt.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', marginTop: 'var(--space-xs)', borderTop: '1px dashed var(--status-success)', paddingTop: 'var(--space-xs)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>ยอดคงเหลือใหม่ (BALANCE)</span>
            <strong style={{ fontSize: 'var(--text-xl)', color: 'var(--accent-primary)' }}>฿{Math.floor(successBalance || balance).toLocaleString('th-TH')}</strong>
          </div>
        </div>
        <button className="premium-button" style={{ width: '100%', padding: '18px', fontWeight: '800' }} onClick={onBack}>ตกลง (Done)</button>
      </div>
    </div>
  )

  if (step === 'qr') return (
    <div className="container fade-in" style={{ maxWidth: '500px', paddingTop: '40px' }}>
      <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden', border: '1px solid #eee' }}>
        <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div className="flex-col">
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                {method === 'qr' ? <QrCode size={20} /> : <CreditCard size={20} />} 
                {method === 'qr' ? 'ชำระด้วย PromptPay' : 'ตรวจสอบการชำระเงิน'}
              </span>
              <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: '28px' }}>{method === 'qr' ? 'SECURE QR TOP-UP' : 'PROCESSING CARD...'}</span>
           </div>
           <span 
              aria-live="polite"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '800' }}
            >
              {formatTime(timeLeft)}
           </span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff' }}>
          {method === 'qr' ? (
            <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #eee' }}>
              {qrUri ? (
                <img src={qrUri} alt="QR" style={{ width: '250px', height: '250px', display: 'block' }} />
              ) : (
                <div style={{ width: '250px', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', borderRadius: '8px' }}>
                  <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid #eee', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '40px 0' }}>
               <div className="loading-spinner" style={{ width: '60px', height: '60px', border: '5px solid #eee', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
               <h3 style={{ fontWeight: '800', color: '#1a1a3a', margin: 0 }}>เรากำลังตรวจสอบการชำระเงิน</h3>
               <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>โดยปกติจะใช้เวลาไม่เกิน 1-2 นาที</p>
            </div>
          )}
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-primary)', marginBottom: '4px', fontFamily: 'var(--font-heading)' }}>฿{finalAmt.toLocaleString()}</div>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '32px', fontWeight: '600' }}>
            {method === 'qr' ? 'สแกน QR เพื่อเติมเงิน — ยอดเงินเข้าทันที' : 'ระบบกำลังตรวจสอบความปลอดภัยของบัตร'}
          </p>
          <button className="premium-button" style={{ width: '100%', background: '#1a1a3a', padding: '18px', fontWeight: '800' }} onClick={handlePaymentDone} disabled={processing}>
             {processing ? 'กำลังตรวจสอบ (Checking...)' : 'ฉันชำระเงินเรียบร้อยแล้ว (Done)'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fade-in" style={{ paddingBottom: '100px', paddingTop: '20px' }}>
      <div className="container-wide">
        <div className="wallet-desktop-layout booking-layout-grid">
           <div className="flex-col gap-lg">
              <div className="glass-card flex-col" style={{ background: 'var(--bg-primary)', position: 'relative', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                 <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div className="flex-col">
                     <span style={{ fontSize: 'var(--text-lg)' }}>วอลเล็ต (Wallet)</span>
                     <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8, fontWeight: '600', letterSpacing: '0.05em' }}>PERSONAL BALANCE</span>
                   </div>
                   <Wallet size={20} opacity={0.8} />
                 </div>
                 <div style={{ padding: '32px 24px', textAlign: 'center', background: 'var(--bg-primary)' }}>
                    <div className="flex-col" style={{ gap: 'var(--space-2xs)' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-md)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800' }}>ยอดเงินคงเหลือปัจจุบัน</span>
                    </div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', marginTop: 'var(--space-sm)', letterSpacing: '-0.02em' }}>
                      ฿{balance.toLocaleString()}
                    </div>
                 </div>
              </div>

              {method === 'credit' && renderCardFields(false)}

              {renderHome(false)}
           </div>

           <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
              <div className="glass-card flex-col" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
                 <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', fontSize: 'var(--text-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <span>วิธีการชำระเงิน</span>
                   <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8 }}>PAYMENT METHODS</span>
                 </div>
                 <div style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {renderMethodCards(false)}

                    <div style={{ borderTop: '2px dashed var(--glass-border)', margin: 'var(--space-lg) 0', paddingTop: 'var(--space-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div className="flex-col">
                         <span style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: 'var(--text-lg)' }}>ยอดเติมเงินรวม</span>
                         <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>TOTAL TOP-UP</span>
                       </div>
                       <span style={{ fontSize: 'var(--text-2xl)', fontWeight: '900', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>฿{finalAmt.toLocaleString()}</span>
                    </div>

                    <button className="premium-button" style={{ width: '100%', padding: 'var(--space-lg)', fontWeight: '800' }} onClick={handleConfirmTopUp} disabled={processing}>
                       {processing ? (statusMsg || 'กำลังดำเนินการ...') : 'ยืนยันการเติมเงิน (Secure Top-up)'}
                    </button>
                    <button onClick={onBack} style={{ width: '100%', marginTop: 'var(--space-md)', background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                       ย้อนกลับ (Back)
                    </button>
                 </div>
              </div>
           </div>
        </div>

        <div className="wallet-mobile-layout flex-col gap-lg">
          <div className="glass-card flex-col" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', fontSize: 'var(--text-lg)' }}>
              วอลเล็ต (Wallet)
            </div>
            <div style={{ padding: 'var(--space-lg) var(--space-md)', textAlign: 'center', background: 'var(--bg-primary)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textTransform: 'uppercase', fontWeight: '700' }}>ยอดเงินคงเหลือ (Balance)</div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: '900', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
                ฿{balance.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="glass-card flex-col" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-md)' }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: '800', marginBottom: 'var(--space-sm)' }}>วิธีการเติมเงิน (Methods)</div>
              {renderMethodCards(true)}
            </div>
          </div>

          {method === 'credit' ? renderCardFields(true) : null}

          {renderHome(true)}

          <div className="glass-card flex-col" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-md)' }}>
              <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 'var(--space-sm)', marginBottom: 'var(--space-sm)', display: 'flex', justifyContent: 'space-between', gap: 'var(--space-md)', fontSize: 'var(--text-sm)' }}>
                <div className="flex-col">
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>ช่องทางการชำระ</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.6 }}>METHOD</span>
                </div>
                <strong style={{ color: 'var(--text-primary)' }}>{method === 'qr' ? 'PromptPay' : 'Credit / Debit Card'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <div className="flex-col">
                  <span style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: 'var(--text-lg)' }}>ยอดเติมเงินรวม</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>TOTAL</span>
                </div>
                <span style={{ fontSize: 'var(--text-2xl)', fontWeight: '900', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>฿{finalAmt.toLocaleString()}</span>
              </div>
              <button className="premium-button" style={{ width: '100%', padding: 'var(--space-md)', fontWeight: '800' }} onClick={handleConfirmTopUp} disabled={processing}>
                {processing ? 'กำลังดำเนินการ...' : 'เติมเงินเดี๋ยวนี้ (Top-up)'}
              </button>
              <button onClick={onBack} style={{ width: '100%', marginTop: 'var(--space-md)', background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: '700', cursor: 'pointer', fontSize: 'var(--text-sm)' }}>
                ย้อนกลับ (Back)
              </button>
            </div>
          </div>
        </div>
      </div>

      {processing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
           <div className="loading-spinner" style={{ width: '50px', height: '50px', border: '4px solid var(--bg-secondary)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 'var(--space-md)' }} />
           <p style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{statusMsg || 'กำลังเตรียมการชำระเงิน...'}</p>
        </div>
      )}
    </div>
  )
}

export default WalletView
