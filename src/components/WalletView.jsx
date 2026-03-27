import React, { useState, useEffect } from 'react'
import { QrCode, CreditCard, CheckCircle2 } from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../context/AppContext'

const PAYMENT_METHODS_WALLET = [
  { id: 'qr',     name: 'PromptPay QR',  icon: <QrCode size={26} />,     desc: 'สแกนจ่ายด้วยแอปธนาคาร' },
  { id: 'credit', name: 'Credit/Debit',  icon: <CreditCard size={26} />, desc: 'Visa / Mastercard' },
]

const WalletView = ({ onBack }) => {
  const { walletBalance: balance, fetchUserBalance: onRefreshBalance } = useApp()
  const QUICK_AMOUNTS = [100, 200, 500, 1000]
  const [step, setStep] = useState('home')      // home | selectAmount | selectMethod | qr | success
  const [selectedAmt, setSelectedAmt] = useState(500)
  const [customAmt, setCustomAmt] = useState('')
  const [method, setMethod] = useState('qr')
  const [timeLeft, setTimeLeft] = useState(900)
  const [processing, setProcessing] = useState(false)
  const [chargeId, setChargeId] = useState(null)
  const [qrUri, setQrUri] = useState(null)
  const [successBalance, setSuccessBalance] = useState(0)

  useEffect(() => {
    if (step !== 'qr') return
    if (timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [step, timeLeft])

  useEffect(() => {
    if (step !== 'qr' || !chargeId) return

    const pollId = setInterval(async () => {
      try {
        const data = await api.checkTopupStatus(chargeId)
        console.log('Topup Poll Status:', data.status)
        const status = (data.status || '').toString().trim()
        const isPaid = ['Paid', 'Confirmed', 'Success', 'successful'].some(s => s.toLowerCase() === status.toLowerCase())
        
        if (isPaid) {
          console.log('Payment confirmed! Transitioning...')
          const newBal = await onRefreshBalance()
          setSuccessBalance(newBal || (balance + finalAmt))
          setStep('success')
          clearInterval(pollId)
        }
      } catch (e) { console.error('Poll error:', e) }
    }, 1500)

    return () => clearInterval(pollId)
  }, [step, chargeId])

  const formatTime = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`
  const finalAmt = customAmt > 0 ? Number(customAmt) : selectedAmt

  const handleConfirmTopUp = async () => {
    if (!localStorage.getItem('court_user')) return alert('กรุณาเข้าสู่ระบบก่อนเติมเงิน')
    const userObj = JSON.parse(localStorage.getItem('court_user'))
    
    setProcessing(true)
    try {
      const data = await api.initiateOmiseTopup(userObj.id, finalAmt, method)
      if (data.success) {
        setChargeId(data.charge_id)
        setQrUri(data.qr_code_uri)
        if (method === 'credit' && data.authorize_uri) {
           window.location.href = data.authorize_uri
           return
        }
        setStep('qr')
      } else {
        alert('เกิดข้อผิดพลาด: ' + (data.error || 'โปรดลองอีกครั้ง'))
      }
    } catch (e) {
      alert('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้')
    } finally {
      setProcessing(false)
    }
  }

  const handlePaymentDone = async () => {
    if (!chargeId) return
    setProcessing(true)
    try {
      const data = await api.checkTopupStatus(chargeId)
      const status = (data.status || '').toString().trim()
      const isPaid = ['Paid', 'Confirmed', 'Success', 'successful'].some(s => s.toLowerCase() === status.toLowerCase())
      
      if (isPaid) {
        const newBal = await onRefreshBalance()
        setSuccessBalance(newBal || (balance + finalAmt))
        setStep('success')
      } else {
        alert('ยังไม่พบยอดชำระเงิน กรุณารอสักครู่ หรือตรวจสอบยอดเงินในแอปธนาคารของท่าน')
      }
    } catch (e) {
      alert('ไม่สามารถตรวจสอบสถานะได้ โปรดลองอีกครั้ง')
    } finally {
      setProcessing(false)
    }
  }

  if (step === 'success') return (
    <div className="container fade-in">
      <div className="glass-card flex-col gap-md" style={{ background: '#fff', padding: '40px 32px', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #00b894, #00cec9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <CheckCircle2 size={40} color="#fff" />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a1a3a' }}>เติมเงินสำเร็จ! 🎉</h2>
        <p style={{ color: '#666' }}>ยอดเงิน wallet ของคุณเพิ่มขึ้น</p>
        <div style={{ background: '#f8fffe', borderRadius: '12px', padding: '20px', border: '1px solid #e0f2f1' }}>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: '#00b894' }}>+฿{finalAmt.toLocaleString()}</div>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>ยอดคงเหลือใหม่: ฿{Math.floor(successBalance || balance).toLocaleString('th-TH')}</div>
        </div>
        <button className="premium-button" style={{ width: '100%', marginTop: '12px' }} onClick={onBack}>กลับหน้าหลัก</button>
      </div>
    </div>
  )

  if (step === 'qr') return (
    <div className="container fade-in" style={{ maxWidth: '500px' }}>
      <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden', border: '1px solid #eee' }}>
        <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '700', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <QrCode size={20} /> สแกนจ่ายเพื่อเติมเงิน
           </span>
           <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '700' }}>
             {formatTime(timeLeft)}
           </span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', background: '#fff' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '24px', border: '1px solid #eee' }}>
            <div style={{ background: '#00467f', color: '#fff', padding: '8px', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay_logo.svg" alt="PromptPay" style={{ height: '18px', filter: 'brightness(0) invert(1)' }} />
              <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>THAI QR PAYMENT</span>
            </div>
            <img src={qrUri} alt="QR" style={{ width: '250px', height: '250px', display: 'block' }} />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a1a3a', marginBottom: '8px' }}>฿{finalAmt.toLocaleString()}</div>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>สแกน QR เพื่อชำระ — เงินจะเข้า Wallet ทันที</p>
          
          <div style={{ marginBottom: '24px', padding: '12px', background: '#f0fff4', borderRadius: '8px', border: '1px solid #c6f6d5' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#48bb78', animation: 'pulse 1.5s infinite' }}></div>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2f855a' }}>กำลังตรวจสอบยอดเงินอัตโนมัติ...</span>
            </div>
          </div>

          <button className="premium-button" style={{ width: '100%', background: '#1a1a3a' }} onClick={handlePaymentDone} disabled={processing}>
             {processing ? 'กำลังตรวจสอบ...' : 'ฉันชำระเงินเรียบร้อยแล้ว'}
          </button>
          <button onClick={() => setStep('home')} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#666', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fade-in" style={{ paddingBottom: '100px', paddingTop: '20px' }}>
      <div className="container-wide">
        <div className="booking-layout-grid">
           {/* Left Column: Balance & Amount Selection */}
           <div className="flex-col gap-lg">
              {/* Header Card (Balance) */}
              <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden' }}>
                 <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '700', fontSize: '1.1rem' }}>กระเป๋าเงินของคุณ</div>
                 <div style={{ padding: '40px 32px', textAlign: 'center', background: '#fff' }}>
                    <div style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>ยอดเงินคงเหลือปัจจุบัน</div>
                    <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
                      ฿{Math.floor(balance).toLocaleString()}
                    </div>
                 </div>
              </div>

              {/* Amount Selection Card */}
              <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden' }}>
                 <div style={{ padding: '20px 24px', background: '#f8f9fa', borderBottom: '1px solid #eee', fontWeight: '700', fontSize: '1rem' }}>ระบุจำนวนเงินที่ต้องการเติม</div>
                 <div style={{ padding: '32px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                       {QUICK_AMOUNTS.map(amt => (
                          <button key={amt} onClick={() => { setSelectedAmt(amt); setCustomAmt('') }}
                            style={{ 
                               padding: '20px 8px', borderRadius: '12px', border: `2px solid ${selectedAmt === amt && !customAmt ? 'var(--accent-primary)' : '#eee'}`,
                               background: selectedAmt === amt && !customAmt ? 'var(--accent-court)' : '#fff',
                               color: selectedAmt === amt && !customAmt ? 'var(--accent-primary)' : '#333',
                               fontWeight: '700', fontSize: '1.2rem', transition: 'all 0.15s'
                            }}>
                             ฿{amt.toLocaleString()}
                          </button>
                       ))}
                    </div>
                    <div className="flex-col gap-xs">
                       <label style={{ fontSize: '0.85rem', color: '#999', fontWeight: '600', textTransform: 'uppercase' }}>หรือระบุจำนวนเงินเอง</label>
                       <input type="number" placeholder="เช่น 300" value={customAmt}
                         onChange={e => setCustomAmt(e.target.value)} 
                         style={{ width: '100%', padding: '16px', fontSize: '1.2rem', fontWeight: '700', border: customAmt ? '2px solid var(--accent-primary)' : '1px solid #ddd' }} />
                    </div>
                 </div>
              </div>
           </div>

           {/* Right Column: Payment Method & Summary (Sticky) */}
           <div style={{ position: 'sticky', top: '100px', height: 'fit-content' }}>
              <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden' }}>
                 <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '700', fontSize: '1.1rem' }}>วิธีการชำระเงิน</div>
                 <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {PAYMENT_METHODS_WALLET.map(m => (
                       <div key={m.id} onClick={() => setMethod(m.id)} style={{
                          padding: '16px 20px', border: `2px solid ${method === m.id ? 'var(--accent-primary)' : '#eee'}`,
                          borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px',
                          background: method === m.id ? 'var(--accent-court)' : '#fff', transition: 'all 0.15s'
                       }}>
                          <div style={{ color: method === m.id ? 'var(--accent-primary)' : '#999' }}>{m.icon}</div>
                          <div style={{ flex: 1 }}>
                             <div style={{ fontWeight: '700', fontSize: '1rem' }}>{m.name}</div>
                             <div style={{ fontSize: '0.8rem', color: '#888' }}>{m.desc}</div>
                          </div>
                          <input type="radio" checked={method === m.id} readOnly style={{ width: '18px', height: '18px' }} />
                       </div>
                    ))}

                    <div style={{ borderTop: '2px dashed #eee', margin: '16px 0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <span style={{ color: '#666', fontWeight: '600' }}>ยอดเติมเงินรวม</span>
                       <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-primary)' }}>฿{finalAmt.toLocaleString()}</span>
                    </div>

                    <button className="premium-button" style={{ width: '100%', padding: '20px' }} onClick={handleConfirmTopUp} disabled={processing}>
                       {processing ? 'กำลังดำเนินการ...' : 'ยืนยันการเติมเงิน'}
                    </button>
                    <button onClick={onBack} style={{ width: '100%', marginTop: '12px', background: 'none', border: 'none', color: '#666', fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem' }}>
                       ย้อนกลับ
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {processing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
           <div className="loading-spinner" style={{ width: '50px', height: '50px', border: '4px solid #eee', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
           <p style={{ fontWeight: '700', color: '#333' }}>กำลังเตรียมการชำระเงิน...</p>
        </div>
      )}
    </div>
  )
}

export default WalletView
