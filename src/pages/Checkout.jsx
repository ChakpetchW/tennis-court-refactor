import React, { useState, useEffect, useRef } from 'react'
import { QrCode, Wallet, CreditCard, Landmark, CheckCircle2, ChevronLeft } from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../context/AppContext'
import { INITIAL_COURTS } from '../data/constants'

const PAYMENT_METHODS = [
  { id: 'qr',      name: 'QR Code',        icon: <QrCode size={26} />,       description: 'PromptPay' },
  { id: 'wallet',  name: 'Wallet',          icon: <Wallet size={26} />,       description: 'Balance' },
  { id: 'credit',  name: 'Credit/Debit',   icon: <CreditCard size={26} />,   description: 'Visa/Master' },
]

function Checkout({ booking, onBack, onComplete }) {
  const { user, walletBalance, updateWallet, apiSettings } = useApp()
  const price = Number(booking?.price || booking?.court?.price_per_hour || booking?.court?.rate || 500)
  const [timeLeft, setTimeLeft]             = useState(900)
  const [selectedMethod, setSelectedMethod] = useState('qr')
  const [isProcessing, setIsProcessing]     = useState(false)
  const [showPaymentFlow, setShowPaymentFlow] = useState(false)
  const [agreed, setAgreed]                 = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [chargeInfo, setChargeInfo]         = useState(() => {
    try {
      const saved = localStorage.getItem(`charge_${booking.id}`)
      return saved ? JSON.parse(saved) : null
    } catch (e) { return null }
  })

  // Persistence: Update localStorage whenever chargeInfo changes
  useEffect(() => {
    if (chargeInfo) {
      localStorage.setItem(`charge_${booking.id}`, JSON.stringify(chargeInfo))
      // If we have chargeInfo, we should probably be in the payment flow
      if (chargeInfo.qr_code_uri) {
        setShowPaymentFlow(true)
        setPaymentStep('qr')
      }
    }
  }, [chargeInfo, booking.id])

  const [paymentStep, setPaymentStep]       = useState(() => {
    try {
      const saved = localStorage.getItem(`charge_${booking.id}`)
      return saved ? 'qr' : 'idle'
    } catch (e) { return 'idle' }
  }) // idle | processing | qr | success
  const [payStatus, setPayStatus]           = useState('')
  const [isPollingError, setIsPollingError] = useState(false)
  const [cardInfo, setCardInfoInputs]       = useState({ number: '', name: user.name, expiry: '', cvc: '' })

  const formatCardNumber = (val) => {
    const v = val.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) return parts.join(' ')
    return v
  }

  const formatExpiry = (val) => {
    const v = val.replace(/\D/g, '').substring(0, 4)
    if (v.length > 2) return v.substring(0, 2) + '/' + v.substring(2)
    return v
  }

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  // Polling for payment status
  useEffect(() => {
    // We need both the payment flow to be visible and have a valid charge reference
    const activeChargeId = chargeInfo?.charge_id || chargeInfo?.id;
    if (!showPaymentFlow || !activeChargeId || paymentSuccess) return
    
    const poll = setInterval(async () => {
      try {
        const data = await api.checkPaymentStatus(booking.id, activeChargeId)
        
        setIsPollingError(false)
        if (data.error) return

        const isPaid = ['Paid', 'Confirmed', 'Success', 'successful'].includes(data.status);
        if (isPaid) {
          clearInterval(poll)
          setPaymentSuccess(true)
          setPaymentStep('success')
        }
      } catch (e) { 
        setIsPollingError(true)
      }
    }, 2000)

    return () => clearInterval(poll)
  }, [showPaymentFlow, chargeInfo, paymentSuccess, booking.id])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleConfirmCardPayment = async () => {
    if (!cardInfo.number || !cardInfo.name || !cardInfo.expiry || !cardInfo.cvc) {
      alert('กรุณากรอกข้อมูลบัตรให้ครบถ้วนครับ');
      return;
    }
    const [expMonth, expYear] = cardInfo.expiry.split('/')
    if (!expMonth || !expYear || expYear.length !== 2) {
      alert('กรุณากรอกวันที่หมดอายุให้ถูกต้อง (MM/YY)');
      return;
    }

    setIsProcessing(true);
    setPayStatus('กำลังเข้ารหัสข้อมูลบัตรอย่างปลอดภัย...');

    try {
      const cardToken = await new Promise((resolve, reject) => {
        if (!window.Omise) { reject(new Error('Omise.js not loaded')); return }
        window.Omise.setPublicKey('pkey_test_6756z7gvq2rmken4hpu');
        const params = {
          name: cardInfo.name,
          number: cardInfo.number.replace(/\s/g, ''),
          expiration_month: parseInt(expMonth),
          expiration_year: 2000 + parseInt(expYear),
          security_code: cardInfo.cvc
        };
        window.Omise.createToken('card', params, (status, response) => {
          if (status === 200) resolve(response.id);
          else reject(new Error(response.message || 'Tokenization failed'));
        });
      });

      setPayStatus('กำลังประมวลผลการชำระเงิน...');
      const courtRef = INITIAL_COURTS.find(c => c.name === (booking.court?.name || booking.court))
      const data = await api.createOmiseCharge({
        type: 'credit',
        card: cardToken,
        amount: Math.round(price * 100),
        booking_id: booking.id,
        court_id: courtRef?.id,
        customer_name: user.name,
        phone: user.phone,
        date: booking.date,
        hour: booking.time
      });
      
      if (data.success) {
        setChargeInfo(data);
        if (data.authorize_uri) {
          window.location.href = data.authorize_uri;
        } else {
          setPaymentSuccess(true);
          setPaymentStep('success');
        }
      } else {
        alert(data.error || 'ชำระเงินไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }

  const handlePay = async () => {
    if (!agreed) { alert('กรุณายอมรับข้อตกลงในการใช้บริการ'); return }
    
    if (selectedMethod === 'credit') {
      handleConfirmCardPayment()
      return
    }

    if (selectedMethod === 'wallet') {
      setIsProcessing(true)
      const balance = Number(walletBalance || 0)
      if (balance < price) {
        alert('ยอดเงินใน Wallet ไม่เพียงพอ กรุณาเติมเงินก่อนครับ')
        setIsProcessing(false)
        return
      }
      try {
        setPayStatus('กำลังหักเงินจาก Wallet...')
        await updateWallet(prev => prev - price)
        setPaymentSuccess(true)
        setPaymentStep('success')
        // No overlay for wallet, just success modal
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการหักเงินจาก Wallet')
      }
      setIsProcessing(false)
      return
    }

    // QR PromptPay
    setIsProcessing(true)
    setPayStatus('กำลังสร้าง QR Code...')
    try {
      const courtRef = INITIAL_COURTS.find(c => c.name === (booking.court?.name || booking.court))
      const data = await api.createOmiseCharge({
        type: 'promptpay',
        amount: Math.round(price * 100),
        booking_id: booking.id,
        court_id: courtRef?.id,
        customer_name: user.name,
        phone: user.phone,
        date: booking.date,
        hour: booking.time
      })
      if (data.success) {
        setChargeInfo(data)
        setPaymentStep('qr')
        setShowPaymentFlow(true)
      } else {
        alert(data.error || 'ไม่สามารถสร้าง QR Code ได้')
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmManual = async () => {
    const activeChargeId = chargeInfo?.charge_id || chargeInfo?.id;
    if (!activeChargeId) {
      alert('ไม่พบข้อมูลการชำระเงิน กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setIsProcessing(true)
    setPayStatus('กำลังตรวจสอบยอดเงิน...')
    try {
      const data = await api.checkPaymentStatus(booking.id, activeChargeId)
      
      const isPaid = ['Paid', 'Confirmed', 'Success'].includes(data.status);
      if (isPaid) {
        setPaymentSuccess(true)
        setPaymentStep('success')
        alert('ตรวจสอบสถานะ: ชำระสำเร็จแล้วครับ!')
      } else {
        const statusMsg = data.status || 'รอดำเนินการ';
        alert(`ระบบยังไม่ได้รับยอดเงินของคุณ กรุณารอสักครู่\n(สถานะปัจจุบัน: ${statusMsg})`)
      }
    } catch (e) {
      alert('ไม่สามารถตรวจสอบสถานะได้ในขณะนี้ กรุณาลองใหม่ภายหลัง');
    } finally {
      setIsProcessing(false)
    }
  }

  const BookingHeader = () => {
    const infoItems = [
      { label: 'ชื่อ-นามสกุล', value: user?.name || '-' },
      { label: 'ชื่อเล่น', value: user?.nickname || '-' },
      { label: 'เบอร์โทรศัพท์', value: user?.phone || '-' },
      { label: 'Line ID', value: user?.line_id || '-' },
      { label: 'อีเมล', value: user?.email || '-' },
      { label: 'วันเกิด', value: user?.birthday || '-' },
      { label: 'ยอดเงิน wallet', value: `฿${Math.floor(Number(walletBalance || 0)).toLocaleString('th-TH')}` },
      { label: 'สถานที่', value: 'Tennis Court' },
    ]

    return (
      <div className="flex-col gap-lg" style={{ marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '700', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ background: 'var(--accent-secondary)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.9rem' }}>#{booking?.id || '...'}</span>
              <span>ยืนยันการจองสนาม</span>
            </div>
            <span style={{ fontSize: '0.85rem', opacity: 0.9, letterSpacing: '0.05em' }}>รายการจองชั่วคราว</span>
          </div>
          
          <div style={{ padding: '32px', background: '#fff' }}>
             <div className="profile-info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                {infoItems.map((item, idx) => (
                   <div key={idx} className="profile-info-item" style={{ borderBottom: '1px solid #f8f8f8', paddingBottom: '8px' }}>
                    <span className="profile-info-label" style={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>{item.label}</span>
                    <span className="profile-info-value" style={{ fontSize: '1.1rem', fontWeight: '700', color: '#333' }}>{item.value}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '100px', paddingTop: '20px' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        <BookingHeader />

        {!showPaymentFlow ? (
          <div className="booking-layout-grid">
            <div className="flex-col gap-lg">
              <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden', border: '1px solid #eee' }}>
                <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '700', fontSize: '1.1rem' }}>ช่องทางการชำระเงิน</div>
                <div style={{ padding: '24px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {PAYMENT_METHODS.map(m => (
                    <div key={m.id} className="flex-col gap-sm">
                      <div onClick={() => setSelectedMethod(m.id)} style={{
                        padding: '20px 24px', border: `2px solid ${selectedMethod === m.id ? 'var(--accent-primary)' : '#eee'}`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', transition: 'all 0.2s',
                        background: selectedMethod === m.id ? 'var(--accent-court)' : '#fff', color: '#333',
                      }}>
                        <div style={{ color: selectedMethod === m.id ? 'var(--accent-primary)' : '#999' }}>{m.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>{m.id === 'qr' ? 'PromptPay QR' : m.id === 'wallet' ? 'วอลเล็ต' : 'บัตรเครดิต/เดบิต'}</div>
                          <div style={{ fontSize: '0.85rem', color: '#666' }}>
                            {m.id === 'qr' ? 'สแกนจ่ายด้วยแอปธนาคาร' : 
                            m.id === 'wallet' ? (
                              <span style={{ color: 'var(--accent-primary)', fontWeight: '800' }}>
                                หักจากยอดเงินคงเหลือ (฿{Number(walletBalance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })})
                              </span>
                            ) : 
                            'Visa / Mastercard / JCB'}
                          </div>
                        </div>
                        <input type="radio" checked={selectedMethod === m.id} readOnly style={{ width: '20px', height: '20px' }} />
                      </div>

                      {/* Inline Card Entry */}
                      {selectedMethod === 'credit' && m.id === 'credit' && (
                        <div className="fade-in" style={{ padding: '24px', background: '#fcfcfc', border: '2px solid var(--accent-primary)', borderRadius: '12px', marginTop: '12px' }}>
                           <div className="flex-col gap-md">
                              <div className="flex-col gap-xs">
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>หมายเลขบัตร</label>
                                <input 
                                  type="text" 
                                  placeholder="0000 0000 0000 0000"
                                  value={cardInfo.number}
                                  onChange={(e) => setCardInfoInputs({ ...cardInfo, number: formatCardNumber(e.target.value) })}
                                  style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1.1rem', width: '100%', letterSpacing: '0.05em' }}
                                />
                              </div>
                              <div className="flex-col gap-xs">
                                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>ชื่อคุณ (ภาษาอังกฤษ)</label>
                                <input 
                                  type="text" 
                                  placeholder="NAME SURNAME"
                                  value={cardInfo.name}
                                  onChange={(e) => setCardInfoInputs({ ...cardInfo, name: e.target.value.toUpperCase() })}
                                  style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
                                />
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                 <div className="flex-col gap-xs">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>EXP (MM/YY)</label>
                                    <input 
                                      type="text" 
                                      placeholder="MM/YY"
                                      value={cardInfo.expiry}
                                      onChange={(e) => setCardInfoInputs({ ...cardInfo, expiry: formatExpiry(e.target.value) })}
                                      style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
                                    />
                                 </div>
                                 <div className="flex-col gap-xs">
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>CVV</label>
                                    <input 
                                      type="password" 
                                      placeholder="***"
                                      maxLength={4}
                                      value={cardInfo.cvc}
                                      onChange={(e) => setCardInfoInputs({ ...cardInfo, cvc: e.target.value.replace(/\D/g, '') })}
                                      style={{ padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ padding: '24px', background: '#fcfcfc', borderTop: '1px solid #eee' }}>
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input type="checkbox" id="agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent-primary)' }} />
                    <label htmlFor="agree" style={{ fontSize: '0.9rem', color: '#444', fontWeight: '600', cursor: 'pointer' }}>
                      ฉันยอมรับเงื่อนไขการให้บริการและนโยบายความเป็นส่วนตัว
                      <p style={{ fontWeight: '400', color: '#888', marginTop: '4px', fontSize: '0.8rem' }}>กรุณาชำระเงินภายใน 15 นาที เพื่อรักษาสิทธิ์การจองของคุณ</p>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ position: 'sticky', top: '100px', height: 'fit-content', minWidth: '350px' }}>
              <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontWeight: '700', fontSize: '1.1rem' }}>สรุปรายการ</div>
                <div style={{ padding: '24px', background: '#fff', color: '#333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1rem' }}>
                    <span style={{ color: '#666' }}>ค่าจองสนาม</span><span style={{ fontWeight: '700' }}>฿{Math.floor(price).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1rem' }}>
                    <span style={{ color: '#666' }}>ช่องทางการชำระ</span><span style={{ fontWeight: '700' }}>{selectedMethod === 'qr' ? 'PromptPay' : selectedMethod === 'wallet' ? 'Wallet' : 'Credit Card'}</span>
                  </div>
                  <div style={{ borderTop: '2px dashed #eee', margin: '20px 0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.4rem' }}>
                    <span>ยอดชำระสุทธิ</span><span style={{ color: 'var(--accent-primary)' }}>฿{Math.floor(price).toLocaleString()}</span>
                  </div>
                  <button className="premium-button" style={{ width: '100%', padding: '20px' }} onClick={handlePay} disabled={isProcessing}>
                    {isProcessing ? (payStatus || 'กำลังประมวลผล...') : 'ชำระเงินทันที'}
                  </button>
                  <button onClick={onBack} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#666', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
                    ย้อนกลับ
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card flex-col fade-in" style={{ background: '#fff', overflow: 'hidden', maxWidth: '500px', margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <QrCode size={20} /> สแกนจ่าย PromptPay
              </span>
              <button onClick={() => setShowPaymentFlow(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <ChevronLeft size={20} />
              </button>
            </div>

            <div style={{ padding: '32px', background: '#fff' }}>
              {paymentStep === 'qr' && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '16px' }}>
                      หมดอายุภายใน {formatTime(timeLeft)}
                    </div>
                    <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
                        {chargeInfo?.qr_code_uri ? (
                        <img src={chargeInfo.qr_code_uri} alt="PromptPay QR" style={{ width: '280px', height: '280px', display: 'block', border: '1px solid #eee' }} />
                        ) : (
                        <div style={{ width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee', background: '#eee' }}>กำลังโหลด...</div>
                        )}
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '24px' }}>สแกน QR Code เพื่อชำระเงิน ระบบจะยืนยันผลโดยอัตโนมัติ</p>
                    
                    <div style={{ marginBottom: '24px', padding: '12px', background: isPollingError ? '#fff5f5' : '#f0fff4', borderRadius: '8px', border: `1px solid ${isPollingError ? '#feb2b2' : '#c6f6d5'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '12px', height: '12px', borderRadius: '50%', 
                          background: isPollingError ? '#f56565' : '#48bb78',
                          animation: 'pulse 1.5s infinite' 
                        }}></div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isPollingError ? '#c53030' : '#2f855a' }}>
                          {isPollingError ? 'ระบบกำลังรอการเชื่อมต่ออินเทอร์เน็ตของคุณ...' : 'ระบบกำลังตรวจสอบยอดเงินอัตโนมัติ...'}
                        </span>
                      </div>
                    </div>

                    <button className="premium-button" style={{ width: '100%', background: '#1a1a3a' }} onClick={handleConfirmManual}>ฉันชำระเงินแล้ว (เช็คสถานะทันที)</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ Premium Payment Success Modal (Popup) */}
      {paymentSuccess && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px',
        }}>
          <div className="glass-card fade-in" style={{
            background: '#fff', borderRadius: '20px', padding: '40px 32px', maxWidth: '420px',
            width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #00b894, #00cec9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <CheckCircle2 size={40} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1a1a3a', marginBottom: '8px' }}>จองสำเร็จ! 🎉</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>ระบบยืนยันการจองและรับชำระเงินเรียบร้อยแล้ว</p>
            <div style={{ background: '#f8fffe', borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'left', fontSize: '0.9rem', lineHeight: '2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>สนาม</span><strong>{booking?.court?.name || booking?.court}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>วันที่</span><strong>{booking?.date}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>เวลา</span><strong>{booking?.time}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>ชื่อผู้จอง</span><strong style={{ maxWidth: '45%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>ยอดชำระ</span><strong style={{ color: '#00b894' }}>฿{price.toFixed(2)}</strong></div>
            </div>
            <button
              className="premium-button"
              style={{ width: '100%', background: '#1a1a3a', padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: '700' }}
              onClick={() => {
                localStorage.removeItem(`charge_${booking.id}`)
                onComplete()
              }}
            >
              กลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isProcessing && paymentStep !== 'qr' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
           <div className="loading-spinner" style={{ width: '50px', height: '50px', border: '4px solid #eee', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
           <p style={{ fontWeight: '700', color: '#333' }}>{payStatus || 'กำลังประมวลผล...'}</p>
        </div>
      )}
    </div>
  )
}

export default Checkout
