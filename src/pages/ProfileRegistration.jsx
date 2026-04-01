import React, { useEffect, useMemo, useState } from 'react'
import { User, Mail, Calendar, ArrowRight, MessageCircle, MapPin, Smartphone } from 'lucide-react'

const MINIMUM_AGE = 7

const createMaxEligibleDate = () => {
  const today = new Date()
  return new Date(today.getFullYear() - MINIMUM_AGE, today.getMonth(), today.getDate())
}

const formatDateForInput = (date) => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const parseBirthday = (value) => {
  if (!value) return null

  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const dashMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dashMatch) {
    const [, year, month, day] = dashMatch
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return null
}

const clampDay = (year, monthIndex, day) => {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  return Math.min(day, daysInMonth)
}

const monthLabels = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

function ProfileRegistration({ onComplete, initialPhone = '' }) {
  const maxEligibleDate = useMemo(createMaxEligibleDate, [])
  const [formData, setFormData] = useState({
    phone: initialPhone,
    name: '',
    nickname: '',
    email: '',
    birthday: '',
    line_id: '',
    location: 'Tennis Court',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedYear, setSelectedYear] = useState(maxEligibleDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(maxEligibleDate.getMonth())
  const [selectedDay, setSelectedDay] = useState(maxEligibleDate.getDate())

  useEffect(() => {
    setFormData((prev) => ({ ...prev, phone: initialPhone }))
  }, [initialPhone])

  useEffect(() => {
    const parsed = parseBirthday(formData.birthday)
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return
    }

    setSelectedYear(parsed.getFullYear())
    setSelectedMonth(parsed.getMonth())
    setSelectedDay(parsed.getDate())
  }, [formData.birthday])

  const years = useMemo(() => {
    const latestYear = maxEligibleDate.getFullYear()
    return Array.from({ length: 100 }, (_, index) => latestYear - index)
  }, [maxEligibleDate])

  const daysInSelectedMonth = useMemo(
    () => new Date(selectedYear, selectedMonth + 1, 0).getDate(),
    [selectedMonth, selectedYear],
  )

  const days = useMemo(
    () => Array.from({ length: daysInSelectedMonth }, (_, index) => index + 1),
    [daysInSelectedMonth],
  )

  useEffect(() => {
    const nextDay = clampDay(selectedYear, selectedMonth, selectedDay)
    if (nextDay !== selectedDay) {
      setSelectedDay(nextDay)
    }
  }, [selectedDay, selectedMonth, selectedYear])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      await onComplete(formData)
    } finally {
      setIsLoading(false)
    }
  }

  const openDatePicker = () => {
    const parsed = parseBirthday(formData.birthday) || maxEligibleDate
    const safeDate = parsed > maxEligibleDate ? maxEligibleDate : parsed

    setSelectedYear(safeDate.getFullYear())
    setSelectedMonth(safeDate.getMonth())
    setSelectedDay(safeDate.getDate())
    setShowDatePicker(true)
  }

  const confirmDateSelection = () => {
    const pickedDate = new Date(selectedYear, selectedMonth, selectedDay)
    const finalDate = pickedDate > maxEligibleDate ? maxEligibleDate : pickedDate

    setFormData((prev) => ({
      ...prev,
      birthday: formatDateForInput(finalDate),
    }))
    setShowDatePicker(false)
  }

  return (
    <div className="container fade-in" style={{ maxWidth: '760px', paddingTop: '40px' }}>
      <div className="glass-card" style={{ padding: '40px', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h1 style={{ fontSize: '2.1rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)', marginBottom: '10px', letterSpacing: '-0.02em' }}>
            สมัครสมาชิก
          </h1>
          <p style={{ color: '#5f6b66', fontSize: '1rem', lineHeight: 1.7 }}>
            กรอกข้อมูลสมาชิกให้ครบถ้วนเพื่อเริ่มใช้งานระบบจองสนาม
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-lg">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5f6b66', textTransform: 'uppercase' }}>เบอร์โทรศัพท์</label>
              <div style={{ position: 'relative' }}>
                <Smartphone size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input
                  type="tel"
                  value={formData.phone}
                  readOnly
                  required
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #dbe7de', fontSize: '1.05rem', background: '#f8fbf8', color: '#1f2d28' }}
                />
              </div>
            </div>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5f6b66', textTransform: 'uppercase' }}>ชื่อ-นามสกุล</label>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input
                  type="text"
                  placeholder="ชื่อ และ นามสกุล"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                  required
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #e6efea', fontSize: '1.05rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5f6b66', textTransform: 'uppercase' }}>ชื่อเล่น</label>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input
                  type="text"
                  placeholder="ชื่อเล่น"
                  value={formData.nickname}
                  onChange={(event) => setFormData((prev) => ({ ...prev, nickname: event.target.value }))}
                  required
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #e6efea', fontSize: '1.05rem' }}
                />
              </div>
            </div>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5f6b66', textTransform: 'uppercase' }}>อีเมล</label>
              <div style={{ position: 'relative' }}>
                <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  required
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #e6efea', fontSize: '1rem' }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5f6b66', textTransform: 'uppercase' }}>วันเกิด</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input
                  type="text"
                  placeholder="วัน/เดือน/ปี"
                  value={formData.birthday}
                  onClick={openDatePicker}
                  readOnly
                  required
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #e6efea', fontSize: '1.05rem', cursor: 'pointer', background: '#fff' }}
                />
              </div>
              <span style={{ fontSize: '0.82rem', color: '#6d7f76' }}>สมัครได้ตั้งแต่อายุ 7 ปีขึ้นไป</span>
            </div>

            <div className="flex-col gap-sm">
              <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5f6b66', textTransform: 'uppercase' }}>Line ID (ถ้ามี)</label>
              <div style={{ position: 'relative' }}>
                <MessageCircle size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
                <input
                  type="text"
                  placeholder="@lineid"
                  value={formData.line_id}
                  onChange={(event) => setFormData((prev) => ({ ...prev, line_id: event.target.value }))}
                  style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #e6efea', fontSize: '1.05rem' }}
                />
              </div>
            </div>
          </div>

          <div className="flex-col gap-sm">
            <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#5f6b66', textTransform: 'uppercase' }}>สถานที่</label>
            <div style={{ position: 'relative' }}>
              <MapPin size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-primary)' }} />
              <input
                type="text"
                value={formData.location}
                readOnly
                required
                style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: 'var(--radius-md)', border: '2px solid #dbe7de', fontSize: '1.05rem', background: '#f8fbf8', color: '#1f2d28' }}
              />
            </div>
          </div>

          {showDatePicker ? (
            <div
              className="calendar-modal-overlay"
              onClick={() => setShowDatePicker(false)}
              style={{ background: 'rgba(17, 38, 28, 0.28)', backdropFilter: 'blur(10px)' }}
            >
              <div
                className="fade-in"
                onClick={(event) => event.stopPropagation()}
                style={{
                  width: 'min(720px, calc(100vw - 32px))',
                  background: '#ffffff',
                  borderRadius: '28px',
                  padding: '28px',
                  boxShadow: '0 30px 80px rgba(24, 58, 40, 0.18)',
                  border: '1px solid rgba(32, 89, 54, 0.08)',
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: '22px' }}>
                  <div style={{ fontSize: '0.82rem', color: '#6c7c74', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    เลือกวันเกิด
                  </div>
                  <div style={{ fontSize: '1.7rem', color: 'var(--accent-primary)', fontWeight: '800', marginTop: '6px' }}>
                    วัน / เดือน / ปี
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.2fr 1fr',
                    gap: '14px',
                    alignItems: 'stretch',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ background: '#f6faf7', borderRadius: '22px', padding: '12px', border: '1px solid #e3eee6' }}>
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#69806f', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase' }}>วัน</div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                      {days.map((day) => {
                        const isActive = day === selectedDay
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(day)}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: isActive ? 'var(--accent-primary)' : 'transparent',
                              color: isActive ? '#fff' : '#345241',
                              borderRadius: '16px',
                              padding: '12px 10px',
                              marginBottom: '8px',
                              fontSize: isActive ? '1.05rem' : '0.98rem',
                              fontWeight: isActive ? '800' : '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {String(day).padStart(2, '0')}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ background: '#f6faf7', borderRadius: '22px', padding: '12px', border: '1px solid #e3eee6' }}>
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#69806f', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase' }}>เดือน</div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                      {monthLabels.map((monthLabel, index) => {
                        const isActive = index === selectedMonth
                        return (
                          <button
                            key={monthLabel}
                            type="button"
                            onClick={() => setSelectedMonth(index)}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: isActive ? 'var(--accent-primary)' : 'transparent',
                              color: isActive ? '#fff' : '#345241',
                              borderRadius: '16px',
                              padding: '12px 10px',
                              marginBottom: '8px',
                              fontSize: isActive ? '1rem' : '0.96rem',
                              fontWeight: isActive ? '800' : '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {monthLabel}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ background: '#f6faf7', borderRadius: '22px', padding: '12px', border: '1px solid #e3eee6' }}>
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#69806f', fontWeight: '700', marginBottom: '10px', textTransform: 'uppercase' }}>ปี</div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '4px' }}>
                      {years.map((year) => {
                        const isActive = year === selectedYear
                        return (
                          <button
                            key={year}
                            type="button"
                            onClick={() => setSelectedYear(year)}
                            style={{
                              width: '100%',
                              border: 'none',
                              background: isActive ? 'var(--accent-primary)' : 'transparent',
                              color: isActive ? '#fff' : '#345241',
                              borderRadius: '16px',
                              padding: '12px 10px',
                              marginBottom: '8px',
                              fontSize: isActive ? '1.05rem' : '0.98rem',
                              fontWeight: isActive ? '800' : '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {year}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(false)}
                    style={{
                      minWidth: '120px',
                      padding: '12px 18px',
                      borderRadius: '999px',
                      border: '1px solid #d9e7de',
                      background: '#fff',
                      color: '#456052',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={confirmDateSelection}
                    style={{
                      minWidth: '120px',
                      padding: '12px 18px',
                      borderRadius: '999px',
                      border: 'none',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <button type="submit" className="premium-button" disabled={isLoading} style={{ marginTop: '18px', width: '100%', padding: '18px' }}>
            {isLoading ? 'กำลังสร้างบัญชี...' : 'ถัดไป'} <ArrowRight size={22} style={{ marginLeft: '12px' }} />
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProfileRegistration
