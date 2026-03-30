import React, { useEffect, useMemo, useState } from 'react'
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import courtH from '../assets/court_h.png'
import { TIME_SLOTS } from '../data/constants'
import { useApp } from '../hooks/useApp'

function Booking({ onBack, onCheckout }) {
  const { courts, fetchStatus, fetchCourtsMetadata } = useApp()
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [selectedCourtId, setSelectedCourtId] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const scrollRef = React.useRef(null)

  const scrollScrollbar = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  // Derived selected court from the prop (ensures we always have the latest allotments)
  const selectedCourt = courts.find(c => c.id === selectedCourtId)

  const dates = useMemo(() => {
    const nextDates = []
    for (let i = 0; i < 15; i += 1) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      const fullDate = date.toLocaleDateString('sv-SE')
      nextDates.push({
        full: fullDate,
        day: date.toLocaleDateString('th-TH', { weekday: 'short' }),
        date: date.getDate(),
        month: date.toLocaleDateString('th-TH', { month: 'short' }),
        year: date.getFullYear()
      })
    }
    return nextDates
  }, [])

  // Refresh rates when entering booking and while the page stays open,
  // so admin price changes propagate without a full browser refresh.
  useEffect(() => {
    void fetchCourtsMetadata()

    const syncLatestRates = () => {
      void fetchCourtsMetadata()
    }

    const intervalId = window.setInterval(syncLatestRates, 60000)
    window.addEventListener('focus', syncLatestRates)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncLatestRates()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', syncLatestRates)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchCourtsMetadata])

  // Fetch status whenever date changes
  useEffect(() => {
    if (fetchStatus) fetchStatus(selectedDate)
  }, [selectedDate, fetchStatus])

  const handleNextStep = () => {
    if (step === 1 && selectedCourt && selectedTime) {
      setStep(2)
    } else if (step === 2) {
      confirmBooking()
    }
  }

  const confirmBooking = async () => {
    const bookingId = Math.floor(Math.random() * 90000) + 10000
    const now = new Date()
    const stamp = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0')
    const bookingNo = `SPORTS-${stamp}`
    const latestRates = await fetchCourtsMetadata()
    const latestRate = Array.isArray(latestRates)
      ? latestRates.find((court) => Number(court.id) === Number(selectedCourtId))
      : null
    const price = Number(latestRate?.rate || latestRate?.price_per_hour || selectedCourt?.price_per_hour || selectedCourt?.rate || 0)

    onCheckout({
      id: bookingId,
      bookingNo,
      court: selectedCourt ? { ...selectedCourt, price_per_hour: price, rate: price } : selectedCourt,
      date: selectedDate,
      time: selectedTime,
      price,
    })
  }

  return (
    <div className="fade-in" style={{ paddingBottom: '120px' }}>
      {/* Step Indicator */}
      <div className="step-indicator-bar" style={{ background: 'var(--accent-primary)', color: '#fff' }}>
        ขั้นตอน {step}/2 — {step === 1 ? 'เลือกวันและเวลา' : 'ยืนยันการจอง'}
      </div>

      <div className="container-wide" style={{ marginTop: '32px' }}>
        {step === 1 && (
          <div className="flex-col gap-lg">
            {/* Date Selector */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <CalendarIcon size={22} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.4rem' }}>เลือกวันที่</h3>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => scrollScrollbar(-200)}
                  style={{ position: 'absolute', left: '-15px', zIndex: 10, background: '#fff', border: '1px solid #eee', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                >
                  <ChevronLeft size={18} />
                </button>

                <div
                  ref={scrollRef}
                  style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none', msOverflowStyle: 'none', width: '100%', scrollBehavior: 'smooth' }}
                  className="hide-scrollbar"
                >
                  {dates.map((d) => (
                    <button
                      key={d.full}
                      onClick={() => {
                        setSelectedDate(d.full)
                        setSelectedTime(null)
                      }}
                      style={{
                        minWidth: '85px',
                        padding: '20px 10px',
                        borderRadius: 'var(--radius-md)',
                        background: selectedDate === d.full ? 'var(--accent-primary)' : '#fff',
                        color: selectedDate === d.full ? '#fff' : '#333',
                        border: `2px solid ${selectedDate === d.full ? 'var(--accent-primary)' : '#eee'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: selectedDate === d.full ? '0 10px 20px rgba(27,94,32,0.15)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', fontWeight: '600', opacity: selectedDate === d.full ? 0.9 : 0.5, textTransform: 'uppercase' }}>{d.day}</span>
                      <span style={{ fontSize: '1.6rem', fontWeight: '800' }}>{d.date}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '600', opacity: selectedDate === d.full ? 0.9 : 0.5 }}>{d.month}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => scrollScrollbar(200)}
                  style={{ position: 'absolute', right: '-15px', zIndex: 10, background: '#fff', border: '1px solid #eee', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="booking-layout-grid" style={{ gap: '32px' }}>
              {/* Left Column: Court Selection */}
              <div className="flex-col gap-lg">
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: '#005859', color: '#fff' }}>
                  <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Select Court</h3>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} /> Tennis Court
                    </div>
                  </div>

                  <div style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>
                      {/* Row 1: North */}
                      {[3, 2, 1].map(id => {
                        const court = courts.find(c => c.id === id)
                        if (!court) return null
                        return (
                          <div
                            key={court.id}
                            style={{ gridColumn: 'span 4' }}
                            onClick={() => {
                              setSelectedCourtId(court.id)
                              setSelectedTime(null)
                            }}
                          >
                            <div className={`court-image-box ${selectedCourtId === court.id ? 'selected' : ''}`}
                              style={{
                                padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: `2px solid ${selectedCourtId === court.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '12px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                                width: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                                <img src={courtH} style={{ width: '80px', display: 'block', flex: '0 0 auto', filter: 'brightness(1.2)' }} alt="" />
                              </div>
                              <div style={{ width: '100%', fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>{court.name}</div>
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent-secondary)' }}>
                                  <CheckCircle2 size={18} />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {/* Row 2: Center */}
                      {[5, 4].map(id => {
                        const court = courts.find(c => c.id === id)
                        if (!court) return null
                        const span = id === 5 ? 8 : 4
                        return (
                          <div
                            key={court.id}
                            style={{ gridColumn: `span ${span}` }}
                            onClick={() => {
                              setSelectedCourtId(court.id)
                              setSelectedTime(null)
                            }}
                          >
                            <div className={`court-image-box ${selectedCourtId === court.id ? 'selected' : ''}`}
                              style={{
                                padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: `2px solid ${selectedCourtId === court.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '12px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                                width: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                                <img
                                  src={courtH}
                                  style={{
                                    width: '80px',
                                    display: 'block',
                                    flex: '0 0 auto',
                                    filter: 'brightness(1.2)'
                                  }}
                                  alt=""
                                />
                              </div>
                              <div style={{ width: '100%', fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>{court.name}</div>
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent-secondary)' }}>
                                  <CheckCircle2 size={18} />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {/* Row 3: South */}
                      {[8, 7, 6].map(id => {
                        const court = courts.find(c => c.id === id)
                        if (!court) return null
                        return (
                          <div
                            key={court.id}
                            style={{ gridColumn: 'span 4' }}
                            onClick={() => {
                              setSelectedCourtId(court.id)
                              setSelectedTime(null)
                            }}
                          >
                            <div className={`court-image-box ${selectedCourtId === court.id ? 'selected' : ''}`}
                              style={{
                                padding: '16px',
                                background: 'rgba(255,255,255,0.05)',
                                border: `2px solid ${selectedCourtId === court.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '12px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                                width: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '8px' }}>
                                <img src={courtH} style={{ width: '80px', display: 'block', flex: '0 0 auto', filter: 'brightness(1.2)' }} alt="" />
                              </div>
                              <div style={{ width: '100%', fontWeight: '600', fontSize: '0.9rem', textAlign: 'center' }}>{court.name}</div>
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent-secondary)' }}>
                                  <CheckCircle2 size={18} />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '32px' }}>
                      <h2 style={{ fontSize: '2rem', fontWeight: '800', opacity: 0.9, letterSpacing: '2px', textTransform: 'uppercase' }}>Tennis Court</h2>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Time Selection */}
              <div className="flex-col gap-lg" style={{ minWidth: '350px' }}>
                <div className="glass-card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <Clock size={22} color="var(--accent-primary)" />
                    <h3 style={{ fontSize: '1.4rem' }}>เลือกเวลา</h3>
                  </div>

                  <div className="time-slot-grid" style={{ marginBottom: '32px' }}>
                    {TIME_SLOTS.map((time, idx) => {
                      const slot = selectedCourt?.allotment[idx]
                      const isUnavailable = slot && (!slot.isOpen || slot.bookedBy)

                      // Check if time is in the past (for today)
                      const isPast = (() => {
                        const today = new Date().toLocaleDateString('sv-SE')
                        if (selectedDate !== today) return false
                        const [hours] = time.split(':').map(Number)
                        const currentHour = new Date().getHours()
                        return hours <= currentHour
                      })()

                      const isDisabled = isUnavailable || isPast
                      const isActive = selectedTime === time

                      return (
                        <button
                          key={time}
                          disabled={isDisabled}
                          onClick={() => setSelectedTime(time)}
                          style={{
                            padding: '16px 8px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            borderRadius: 'var(--radius-sm)',
                            background: isActive ? 'var(--accent-primary)' : '#fff',
                            color: isActive ? '#fff' : '#333',
                            border: `2px solid ${isActive ? 'var(--accent-primary)' : '#eee'}`,
                            opacity: isDisabled ? 0.3 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {slot?.bookedBy ? 'เต็ม' : (isPast && selectedDate === new Date().toLocaleDateString('sv-SE') ? 'เลยเวลา' : time)}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    className="premium-button"
                    disabled={!selectedCourt || !selectedTime}
                    onClick={handleNextStep}
                    style={{ width: '100%', marginTop: 'auto' }}
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-col gap-lg fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="glass-card flex-col" style={{ background: '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '700', fontSize: '1.2rem' }}>
                สรุปรายการจอง
              </div>
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                    <span style={{ color: '#666' }}>สนาม</span>
                    <strong style={{ fontSize: '1.1rem' }}>{selectedCourt?.name} ({selectedCourt?.type})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                    <span style={{ color: '#666' }}>วันที่</span>
                    <strong style={{ fontSize: '1.1rem' }}>{selectedDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                    <span style={{ color: '#666' }}>เวลา</span>
                    <strong style={{ fontSize: '1.1rem' }}>{selectedTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px' }}>
                    <span style={{ color: '#666' }}>ราคาสุทธิ</span>
                    <strong style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>฿{Math.floor(Number(selectedCourt?.price_per_hour || selectedCourt?.rate || 0)).toLocaleString('th-TH')}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button className="secondary-button" style={{ flex: 1, padding: '18px' }} onClick={() => setStep(1)}>แก้ไขการจอง</button>
              <button className="premium-button" style={{ flex: 2 }} onClick={handleNextStep}>ยืนยันและชำระเงิน</button>
            </div>
          </div>
        )}
      </div>

      {step === 1 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '24px', background: '#fff', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center', zIndex: 100, boxShadow: '0 -10px 30px rgba(0,0,0,0.05)' }}>
          <button className="secondary-button" onClick={onBack} style={{ maxWidth: '400px', width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <ChevronLeft size={20} /> กลับไปหน้าหลัก
          </button>
        </div>
      )}
    </div>
  )
}

export default Booking
