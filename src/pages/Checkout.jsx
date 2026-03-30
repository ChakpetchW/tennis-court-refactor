import React, { useState, useEffect } from 'react'
import { QrCode, Wallet, CreditCard, Landmark, CheckCircle2, ChevronLeft } from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../hooks/useApp'
import { INITIAL_COURTS } from '../data/constants'

const OMISE_PUBLIC_KEY = import.meta.env.VITE_OMISE_PUBLIC_KEY || ''
const BOOKING_RETURN_STORAGE_KEY = 'court_booking_return'

const PAYMENT_METHODS = [
  { id: 'qr',      name: 'Thai QR PromptPay',        icon: <QrCode size={26} />,       description: 'Scan & Pay' },
  { id: 'wallet',  name: 'My Wallet (วอลเล็ต)',          icon: <Wallet size={26} />,       description: 'Balance' },
  { id: 'credit',  name: 'Credit / Debit Card',   icon: <CreditCard size={26} />,   description: 'Visa/Master' },
]

function Checkout({ booking, onBack, onComplete }) {
  const { user, walletBalance, fetchUserBalance } = useApp()
  const price = Number(booking?.price || booking?.court?.price_per_hour || booking?.court?.rate || 500)
  const [timeLeft, setTimeLeft]             = useState(900)
  const [selectedMethod, setSelectedMethod] = useState('qr')
  const [isProcessing, setIsProcessing]     = useState(false)
  const [showPaymentFlow, setShowPaymentFlow] = useState(false)
  const [agreed, setAgreed]                 = useState(false)
  const [paymentStep, setPaymentStep]       = useState(() => {
    try {
      const saved = localStorage.getItem(`charge_${booking.id}`)
      return saved ? 'qr' : 'idle'
    } catch { return 'idle' }
  }) // idle | processing | qr | success

  // Scroll to top on view change (UX for mobile)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [showPaymentFlow, paymentStep])
  const [payStatus, setPayStatus]           = useState('')
  const [isPollingError, setIsPollingError] = useState(false)
  const [cardInfo, setCardInfoInputs]       = useState({ number: '', name: user.name, expiry: '', cvc: '' })
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [chargeInfo, setChargeInfo]         = useState(() => {
    try {
      const saved = localStorage.getItem(`charge_${booking.id}`)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  // Persistence: Update localStorage whenever chargeInfo changes
  useEffect(() => {
    if (chargeInfo) {
      localStorage.setItem(`charge_${booking.id}`, JSON.stringify(chargeInfo))
      if (chargeInfo.qr_code_uri) {
        setShowPaymentFlow(true)
        setPaymentStep('qr')
      }
    }
  }, [chargeInfo, booking.id])

  const persistBookingReturnState = (chargeData, paymentMethod) => {
    try {
      localStorage.setItem(
        BOOKING_RETURN_STORAGE_KEY,
        JSON.stringify({
          bookingId: booking?.id ?? null,
          chargeId: chargeData?.charge_id || chargeData?.id || null,
          court: booking?.court?.name || booking?.court || '-',
          date: booking?.date || '-',
          time: booking?.time || '-',
          price,
          customerName: user?.name || '-',
          paymentMethod,
        }),
      )
    } catch (error) {
      console.warn('Unable to persist booking return state:', error)
    }
  }

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [paymentSuccess])

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
      } catch { 
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
        if (!window.Omise) { 
          reject(new Error('ระบบชำระเงินไม่พร้อมใช้งาน (Omise SDK not loaded). กรุณาปิด Ad-blocker หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง')); 
          return 
        }
        if (!OMISE_PUBLIC_KEY) { 
          reject(new Error('ไม่ได้ตั้งค่ากุญแจสาธารณะ (Missing Omise Public Key)')); 
          return 
        }
        window.Omise.setPublicKey(OMISE_PUBLIC_KEY);
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
          persistBookingReturnState(data, 'card')
          window.location.href = data.authorize_uri;
        } else {
          setPaymentSuccess(true);
          setPaymentStep('success');
        }
      } else {
        alert(data.error || 'ชำระเงินไม่สำเร็จ');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
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
        const courtRef = INITIAL_COURTS.find(c => c.name === (booking.court?.name || booking.court))
        const paymentResult = await api.processWalletPayment({
          user_id: user.id,
          amount: price,
          booking_id: booking.id,
          court_id: courtRef?.id,
          date: booking.date,
          hour: booking.time,
          user_name: user.name
        })
        if (!paymentResult.success) {
          throw new Error(paymentResult.error || 'Wallet payment failed')
        }
        await fetchUserBalance()
        setPaymentSuccess(true)
        setPaymentStep('success')
        // No overlay for wallet, just success modal
      } catch (error) {
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
    } catch (error) {
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
    } catch {
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
              <span style={{ background: 'var(--accent-secondary)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '800' }}>#{booking?.id || '...'}</span>
              <div className="flex-col">
                <span style={{ fontSize: '1.2rem', fontWeight: '800' }}>ยืนยันการจองสนาม</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>BOOKING CONFIRMATION</span>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', opacity: 0.9, letterSpacing: '0.05em', fontWeight: '600' }}>รายการจองชั่วคราว</span>
          </div>
          
          <div style={{ padding: 'var(--space-lg)', background: 'var(--bg-primary)' }}>
             <div className="profile-info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)' }}>
                {infoItems.map((item, idx) => (
                   <div key={idx} className="profile-info-item" style={{ borderBottom: '1px solid var(--bg-secondary)', paddingBottom: 'var(--space-xs)', minWidth: 0 }}>
                    <span className="profile-info-label" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2xs)', display: 'block' }}>{item.label}</span>
                    <span
                      className="profile-info-value"
                      style={{
                        fontSize: 'var(--text-base)',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        display: 'block',
                        minWidth: 0,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        lineHeight: 1.45,
                      }}
                    >
                      {item.value}
                    </span>
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
                <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ช่องทางการชำระเงิน</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>PAYMENT METHODS</span>
                </div>
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
                          <div style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-heading)' }}>{m.name}</div>
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
                <div style={{ padding: '20px 24px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontWeight: '800', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ยอดสรุป</span>
                  <span style={{ fontSize: '0.75rem', color: '#999' }}>SUMMARY</span>
                </div>
                <div style={{ padding: '24px', background: '#fff', color: '#333' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1rem' }}>
                    <div className="flex-col">
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>ค่าจองสนาม</span>
                      <span style={{ fontSize: '0.7rem', color: '#bbb' }}>COURT FEE</span>
                    </div>
                    <span style={{ fontWeight: '700' }}>฿{Math.floor(price).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1rem' }}>
                    <div className="flex-col">
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>ช่องทางการชำระ</span>
                      <span style={{ fontSize: '0.7rem', color: '#bbb' }}>PAYMENT METHOD</span>
                    </div>
                    <span style={{ fontWeight: '700' }}>{selectedMethod === 'qr' ? 'PromptPay' : selectedMethod === 'wallet' ? 'My Wallet' : 'Credit Card'}</span>
                  </div>
                  <div style={{ borderTop: '2px dashed #eee', margin: '20px 0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '1.4rem' }}>
                    <div className="flex-col">
                      <span>ยอดชำระสุทธิ</span>
                      <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '400' }}>TOTAL AMOUNT</span>
                    </div>
                    <span style={{ color: 'var(--accent-primary)', fontSize: '1.8rem', fontFamily: 'var(--font-heading)' }}>฿{Math.floor(price).toLocaleString()}</span>
                  </div>
                  <button className="premium-button" style={{ width: '100%', padding: '20px', fontWeight: '800' }} onClick={handlePay} disabled={isProcessing}>
                    {isProcessing ? (payStatus || 'กำลังประมวลผล...') : 'ชำระเงินทันที (Pay Now)'}
                  </button>
                  <button onClick={onBack} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#888', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem' }}>
                    ย้อนกลับ (Back)
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card flex-col fade-in" style={{ background: '#fff', overflow: 'hidden', maxWidth: '500px', margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
            <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="flex-col">
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <QrCode size={20} /> ชำระด้วย PromptPay
                </span>
                <span style={{ fontSize: '0.7rem', opacity: 0.8, marginLeft: '28px' }}>SECURE QR PAYMENT</span>
              </div>
              <button onClick={() => setShowPaymentFlow(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <ChevronLeft size={20} />
              </button>
            </div>

            <div style={{ padding: '32px', background: '#fff' }}>
              {paymentStep === 'qr' && (
                <div style={{ textAlign: 'center' }}>
                    <div 
                      aria-live="polite"
                      style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '16px' }}
                    >
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
        <div className="booking-success-overlay">
            <div className="glass-card fade-in booking-success-modal">
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--status-success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)',
            }}>
              <CheckCircle2 size={40} color="#fff" />
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: '900', color: 'var(--text-primary)', marginBottom: 'var(--space-2xs)' }}>การจองสำเร็จเแล้ว! 🎉</h2>
            <p style={{ color: 'var(--status-success)', fontSize: 'var(--text-sm)', fontWeight: '700', marginBottom: 'var(--space-lg)' }}>BOOKING CONFIRMED</p>
            
            <div style={{ background: 'var(--status-success-bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', textAlign: 'left', fontSize: 'var(--text-sm)', lineHeight: '2.2', border: '1px solid var(--status-success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--status-success)', opacity: 0.8 }}>สนาม (COURT)</span>
                <strong style={{ color: 'var(--text-primary)' }}>{booking?.court?.name || booking?.court}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--status-success)', opacity: 0.8 }}>วันที่ (DATE)</span>
                <strong style={{ color: 'var(--text-primary)' }}>{booking?.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--status-success)', opacity: 0.8 }}>เวลา (TIME)</span>
                <strong style={{ color: 'var(--text-primary)' }}>{booking?.time}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--status-success)', opacity: 0.8 }}>ผู้จอง (CUSTOMER)</span>
                <strong style={{ maxWidth: '45%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{user?.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-xs)', borderTop: '1px dashed var(--status-success)', paddingTop: 'var(--space-xs)' }}>
                <span style={{ color: 'var(--status-success)', fontWeight: '700' }}>ยอดชำระ (TOTAL)</span>
                <strong style={{ color: 'var(--status-success)', fontSize: 'var(--text-lg)' }}>฿{price.toFixed(2)}</strong>
              </div>
            </div>
            <button
              className="premium-button"
              style={{ width: '100%', background: '#1a1a3a', padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: '700' }}
              onClick={() => {
                localStorage.removeItem(`charge_${booking.id}`)
                localStorage.removeItem(BOOKING_RETURN_STORAGE_KEY)
                const completedPaymentMethod = selectedMethod === 'credit'
                  ? 'card'
                  : selectedMethod === 'qr'
                    ? 'promptpay'
                    : selectedMethod
                onComplete(completedPaymentMethod)
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
