import React, { useState, useRef, useEffect } from 'react'
import { User, Mail, Calendar, ArrowRight, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'

function ProfileRegistration({ onComplete }) {
  const [formData, setFormData] = useState({ 
    name: '', 
    nickname: '', 
    email: '', 
    birthday: '', 
    lineId: '',
    location: 'Tennis Court'
  })
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const yearListRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    setTimeout(() => { setIsLoading(false); onComplete(formData) }, 1000)
  }

  const [currentDate, setCurrentDate] = useState(new Date(1995, 0, 1))

  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']

  const currentYear  = new Date().getFullYear()
  const yearsRange   = Array.from({ length: 100 }, (_, i) => currentYear - i) // newest first

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const handleDateSelect = (day) => {
    const formatted = `${String(day).padStart(2,'0')}/${String(currentDate.getMonth()+1).padStart(2,'0')}/${currentDate.getFullYear()}`
    setFormData({ ...formData, birthday: formatted })
    setShowDatePicker(false)
  }

  const handleYearSelect = (year) => {
    setCurrentDate(new Date(year, currentDate.getMonth(), 1))
    setShowYearPicker(false)
  }

  // Scroll selected year into center when opening year picker
  useEffect(() => {
    if (showYearPicker && yearListRef.current) {
      const selectedEl = yearListRef.current.querySelector('[data-selected="true"]')
      if (selectedEl) selectedEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [showYearPicker])

  return (
    <div className="container fade-in" style={{ maxWidth: '600px', paddingTop: '40px' }}>
      <div className="glass-card" style={{ padding: '40px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.2rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)', marginBottom: '12px', letterSpacing: '-0.02em' }}>สมัครสมาชิก</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>ร่วมเป็นส่วนหนึ่งของคอมมูนิตี้เทนนิสระดับพรีเมียมได้แล้ววันนี้</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-lg">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {/* Name */}
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>ชื่อ-นามสกุล</label>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input type="text" placeholder="ชื่อ และ นามสกุล" style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #eee', fontSize: '1.1rem' }}
                  value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Nickname */}
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>ชื่อเล่น</label>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input type="text" placeholder="ชื่อเล่น" style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #eee', fontSize: '1.1rem' }}
                  value={formData.nickname || ''} onChange={(e) => setFormData({...formData, nickname: e.target.value})} />
              </div>
            </div>

            {/* Email */}
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>อีเมล</label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input type="email" placeholder="email@example.com" style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #eee', fontSize: '1rem' }}
                  value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            {/* Line ID */}
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>Line ID (ถ้ามี)</label>
              <div style={{ position: 'relative' }}>
                <MessageCircle size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input type="text" placeholder="@lineid" style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #eee', fontSize: '1.1rem' }}
                  value={formData.lineId} onChange={(e) => setFormData({...formData, lineId: e.target.value})} />
              </div>
            </div>

            {/* Birthday */}
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#888', textTransform: 'uppercase' }}>วันเกิด</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input type="text" readOnly placeholder="01/01/1995"
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #eee', fontSize: '1.1rem', cursor: 'pointer', background: '#fff' }}
                  value={formData.birthday} onClick={() => setShowDatePicker(true)} required />
              </div>
            </div>
          </div>

          {/* Calendar Modal */}
          {showDatePicker && (
            <div className="calendar-modal-overlay" onClick={() => { setShowDatePicker(false); setShowYearPicker(false) }} style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
              <div className="calendar-card fade-in" onClick={e => e.stopPropagation()} style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>

                {/* Year Scroll Picker */}
                {showYearPicker ? (
                  <div className="flex-col gap-sm" style={{ padding: '8px 0' }}>
                    <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '1.2rem', marginBottom: '16px', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>เลือกปี</div>
                    <div ref={yearListRef} style={{
                      maxHeight: '260px', overflowY: 'auto', borderRadius: 'var(--radius-md)',
                      scrollbarWidth: 'none', background: '#f8f9fa', padding: '10px'
                    }}>
                      {yearsRange.map(year => {
                        const isSelected = year === currentDate.getFullYear()
                        return (
                          <div
                            key={year}
                            data-selected={isSelected}
                            onClick={() => handleYearSelect(year)}
                            style={{
                              padding: '12px', cursor: 'pointer', textAlign: 'center',
                              fontWeight: isSelected ? '800' : '400',
                              fontSize: isSelected ? '1.2rem' : '1rem',
                              color: isSelected ? '#fff' : '#333',
                              background: isSelected ? 'var(--accent-primary)' : 'transparent',
                              borderRadius: 'var(--radius-sm)', margin: '4px 0',
                              transition: 'all 0.15s',
                            }}
                          >
                            {year + 543} (ค.ศ. {year})
                          </div>
                        )}
                      )}
                    </div>
                    <button style={{ marginTop: '16px', fontSize: '1rem', color: '#888', fontWeight: '600' }} onClick={() => setShowYearPicker(false)}>ยกเลิก</button>
                  </div>
                ) : (
                  <>
                    <div className="calendar-header" style={{ marginBottom: '20px' }}>
                      <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={{ padding: '8px', color: 'var(--accent-primary)' }}>
                        <ChevronLeft size={24} />
                      </button>
                      <div
                        onClick={() => setShowYearPicker(true)}
                        style={{
                          fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '8px 24px', borderRadius: '30px', background: 'var(--accent-court)',
                          color: 'var(--accent-primary)', fontSize: '1.1rem', transition: 'all 0.2s'
                        }}
                      >
                        {months[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
                        <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>▼</span>
                      </div>
                      <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={{ padding: '8px', color: 'var(--accent-primary)' }}>
                        <ChevronRight size={24} />
                      </button>
                    </div>

                    <div className="calendar-grid" style={{ gap: '12px' }}>
                      {['อา','จ','อ','พ','พฤ','ศ','ส'].map(d => (
                        <div key={d} className="calendar-day-label" style={{ fontWeight: '700', color: '#999', fontSize: '0.8rem', textTransform: 'uppercase' }}>{d}</div>
                      ))}
                      {[...Array(firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth())).keys()].map(i => (
                        <div key={`empty-${i}`} className="calendar-day-btn empty" />
                      ))}
                      {[...Array(getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth())).keys()].map(i => {
                        const d = i + 1
                        const isSelected = formData.birthday === `${String(d).padStart(2,'0')}/${String(currentDate.getMonth()+1).padStart(2,'0')}/${currentDate.getFullYear()}`
                        return (
                          <div key={d} 
                            className={`calendar-day-btn ${isSelected ? 'selected' : ''}`} 
                            onClick={() => handleDateSelect(d)}
                            style={{ 
                              width: '40px', height: '40px', fontSize: '1rem', fontWeight: isSelected ? '800' : '500',
                              background: isSelected ? 'var(--accent-primary)' : 'transparent',
                              color: isSelected ? '#fff' : '#333',
                              borderRadius: '50%'
                            }}
                          >
                            {d}
                          </div>
                        )
                      })}
                    </div>
                    <button type="button" style={{ width: '100%', marginTop: '32px', padding: '16px', fontSize: '1rem', color: 'var(--accent-primary)', fontWeight: '700', border: 'none', background: 'none', cursor: 'pointer' }}
                      onClick={() => setShowDatePicker(false)}>ปิดหน้าต่าง</button>
                  </>
                )}
              </div>
            </div>
          )}

          <button type="submit" className="premium-button" disabled={isLoading} style={{ marginTop: '24px', width: '100%', padding: '20px' }}>
            {isLoading ? 'กำลังสร้างบัญชี...' : 'ถัดไป'} <ArrowRight size={22} style={{ marginLeft: '12px' }} />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileRegistration
