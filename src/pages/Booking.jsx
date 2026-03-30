import React, { useCallback, useEffect, useMemo, useState } from 'react'
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

  const getSlotStateFromStatus = useCallback((statusRows, courtId, time) => {
    const match = Array.isArray(statusRows)
      ? statusRows.find(
          (allotment) =>
            Number.parseInt(allotment.court_id, 10) === Number(courtId) &&
            allotment.hour === time,
        )
      : null

    if (!match) {
      return { isOpen: true, bookedBy: null }
    }

    return {
      isOpen: match.is_open === null ? true : Boolean(Number.parseInt(match.is_open, 10)),
      bookedBy: match.booked_by,
    }
  }, [])

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

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

  const refreshSelectedDateAvailability = useCallback(() => {
    if (!fetchStatus) return Promise.resolve([])
    return fetchStatus(selectedDate)
  }, [fetchStatus, selectedDate])

  useEffect(() => {
    void refreshSelectedDateAvailability()

    const syncAvailability = () => {
      void refreshSelectedDateAvailability()
    }

    const intervalId = window.setInterval(syncAvailability, 15000)
    window.addEventListener('focus', syncAvailability)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAvailability()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', syncAvailability)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshSelectedDateAvailability])

  const ensureSelectedSlotIsAvailable = useCallback(async () => {
    if (!selectedCourtId || !selectedTime) return false

    const latestStatus = await refreshSelectedDateAvailability()
    const slotState = getSlotStateFromStatus(latestStatus, selectedCourtId, selectedTime)
    const isUnavailable = !slotState.isOpen || Boolean(slotState.bookedBy)

    if (isUnavailable) {
      setSelectedTime(null)
      alert('ช่วงเวลานี้ถูกปิดหรือมีผู้จองไปแล้ว กรุณาเลือกเวลาใหม่')
      return false
    }

    return true
  }, [getSlotStateFromStatus, refreshSelectedDateAvailability, selectedCourtId, selectedTime])

  const handleNextStep = async () => {
    if (step === 1 && selectedCourt && selectedTime) {
      const isStillAvailable = await ensureSelectedSlotIsAvailable()
      if (!isStillAvailable) return
      setStep(2)
    } else if (step === 2) {
      const isStillAvailable = await ensureSelectedSlotIsAvailable()
      if (!isStillAvailable) {
        setStep(1)
        return
      }
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
      <div className="step-indicator-bar" style={{ background: 'var(--accent-primary)', color: '#fff', fontSize: '1rem', fontWeight: '800', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <span style={{ opacity: 0.8 }}>ความคืบหน้า (Step) {step}/2 —</span>
        <span>{step === 1 ? 'เลือกวันและเวลาที่จอง' : 'ยืนยันข้อมูลการจอง'}</span>
      </div>

      <div className="container-wide" style={{ marginTop: 'var(--space-lg)' }}>
        {step === 1 && (
          <div className="flex-col gap-lg">
            <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                <CalendarIcon size={22} color="var(--accent-primary)" />
                <div className="flex-col">
                  <h3 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>เลือกวันที่</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>Select Booking Date</p>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => scrollScrollbar(-200)}
                  style={{ position: 'absolute', left: '-15px', zIndex: 10, background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', cursor: 'pointer' }}
                >
                  <ChevronLeft size={18} />
                </button>

                <div
                  ref={scrollRef}
                  style={{ display: 'flex', gap: 'var(--space-sm)', overflowX: 'auto', paddingBottom: 'var(--space-sm)', scrollbarWidth: 'none', msOverflowStyle: 'none', width: '100%', scrollBehavior: 'smooth' }}
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
                        minWidth: '80px',
                        padding: 'var(--space-md) var(--space-xs)',
                        borderRadius: 'var(--radius-md)',
                        background: selectedDate === d.full ? 'var(--accent-primary)' : 'var(--bg-primary)',
                        color: selectedDate === d.full ? '#fff' : 'var(--text-primary)',
                        border: `2px solid ${selectedDate === d.full ? 'var(--accent-primary)' : 'var(--bg-secondary)'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 'var(--space-2xs)',
                        boxShadow: selectedDate === d.full ? '0 10px 20px rgba(27,94,32,0.15)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600', opacity: selectedDate === d.full ? 0.9 : 0.5, textTransform: 'uppercase' }}>{d.day}</span>
                      <span style={{ fontSize: 'var(--text-xl)', fontWeight: '800' }}>{d.date}</span>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: '600', opacity: selectedDate === d.full ? 0.9 : 0.5 }}>{d.month}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => scrollScrollbar(200)}
                  style={{ position: 'absolute', right: '-15px', zIndex: 10, background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)', cursor: 'pointer' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="booking-layout-grid" style={{ gap: 'var(--space-xl)' }}>
              <div className="flex-col gap-lg">
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden', background: '#005859', color: '#fff' }}>
                  <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="flex-col">
                      <h3 style={{ fontSize: 'var(--text-lg)', color: '#fff', margin: 0 }}>เลือกสนาม</h3>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Select Court</p>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={16} /> Tennis Court
                    </div>
                  </div>

                  <div style={{ padding: 'var(--space-lg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 'var(--space-md)' }}>
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
                                padding: 'var(--space-md)',
                                background: selectedCourtId === court.id ? 'var(--gradient-brand)' : 'rgba(255,255,255,0.05)',
                                border: `2px solid ${selectedCourtId === court.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                width: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: selectedCourtId === court.id ? 'translateY(-2px)' : 'none',
                                overflow: 'hidden',
                                zIndex: selectedCourtId === court.id ? 1 : 0
                              }}
                            >
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', inset: 0, background: 'var(--gradient-mesh)', opacity: 0.4, pointerEvents: 'none' }} />
                              )}
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                <img src={courtH} style={{ width: '80px', display: 'block', flex: '0 0 auto', filter: 'brightness(1.2)' }} alt="" />
                              </div>
                              <div style={{ width: '100%', fontWeight: '600', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{court.name}</div>
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent-secondary)' }}>
                                  <CheckCircle2 size={18} />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

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
                                padding: 'var(--space-md)',
                                background: selectedCourtId === court.id ? 'var(--gradient-brand)' : 'rgba(255,255,255,0.05)',
                                border: `2px solid ${selectedCourtId === court.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                width: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: selectedCourtId === court.id ? 'translateY(-2px)' : 'none',
                                overflow: 'hidden',
                                zIndex: selectedCourtId === court.id ? 1 : 0
                              }}
                            >
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', inset: 0, background: 'var(--gradient-mesh)', opacity: 0.4, pointerEvents: 'none' }} />
                              )}
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                <img src={courtH} style={{ width: '80px', display: 'block', flex: '0 0 auto', filter: 'brightness(1.2)' }} alt="" />
                              </div>
                              <div style={{ width: '100%', fontWeight: '600', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{court.name}</div>
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', top: '8px', right: '8px', color: 'var(--accent-secondary)' }}>
                                  <CheckCircle2 size={18} />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}

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
                                padding: 'var(--space-md)',
                                background: selectedCourtId === court.id ? 'var(--gradient-brand)' : 'rgba(255,255,255,0.05)',
                                border: `2px solid ${selectedCourtId === court.id ? 'var(--accent-secondary)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative',
                                width: '100%',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: selectedCourtId === court.id ? 'translateY(-2px)' : 'none',
                                overflow: 'hidden',
                                zIndex: selectedCourtId === court.id ? 1 : 0
                              }}
                            >
                              {selectedCourtId === court.id && (
                                <div style={{ position: 'absolute', inset: 0, background: 'var(--gradient-mesh)', opacity: 0.4, pointerEvents: 'none' }} />
                              )}
                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                                <img src={courtH} style={{ width: '80px', display: 'block', flex: '0 0 auto', filter: 'brightness(1.2)' }} alt="" />
                              </div>
                              <div style={{ width: '100%', fontWeight: '600', fontSize: 'var(--text-sm)', textAlign: 'center' }}>{court.name}</div>
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

                    <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)' }}>
                      <h2 style={{ fontSize: 'var(--text-3xl)', fontWeight: '800', opacity: 0.9, letterSpacing: '2px', textTransform: 'uppercase' }}>Tennis Court</h2>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-col gap-lg" style={{ minWidth: '350px' }}>
                <div className="glass-card" style={{ padding: 'var(--space-lg)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'var(--space-lg)' }}>
                    <Clock size={22} color="var(--accent-primary)" />
                    <div className="flex-col">
                      <h3 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>เลือกเวลา</h3>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', margin: 0 }}>Select Time (1 Hour)</p>
                    </div>
                  </div>

                  <div className="time-slot-grid" style={{ marginBottom: 'var(--space-xl)' }}>
                    {TIME_SLOTS.map((time, idx) => {
                      const slot = selectedCourt?.allotment[idx]
                      const isUnavailable = slot && (!slot.isOpen || slot.bookedBy)
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
                            padding: 'var(--space-md) var(--space-2xs)',
                            fontSize: 'var(--text-lg)',
                            fontWeight: '800',
                            borderRadius: 'var(--radius-sm)',
                            background: isActive ? 'var(--gradient-brand)' : 'var(--bg-primary)',
                            color: isActive ? '#fff' : 'var(--text-primary)',
                            border: `2px solid ${isActive ? 'var(--accent-secondary)' : 'var(--bg-secondary)'}`,
                            opacity: isDisabled ? 0.3 : 1,
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isActive ? 'translateY(-2px)' : 'none',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          {isActive && <div style={{ position: 'absolute', inset: 0, background: 'var(--gradient-mesh)', opacity: 0.2, pointerEvents: 'none' }} />}
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
                    ดำเนินการต่อ (Next)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-col gap-lg fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="glass-card flex-col" style={{ background: 'var(--bg-primary)', overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: 'var(--accent-primary)', color: '#fff', fontWeight: '800', fontSize: 'var(--text-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                สรุปรายการจอง
                <span style={{ fontSize: 'var(--text-xs)', opacity: 0.8, letterSpacing: '1px' }}>BOOKING SUMMARY</span>
              </div>
              <div style={{ padding: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: 'var(--space-md)' }}>
                    <div className="flex-col">
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textTransform: 'uppercase' }}>สนาม</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.6 }}>COURT</span>
                    </div>
                    <strong style={{ fontSize: 'var(--text-base)', textAlign: 'right', color: 'var(--text-primary)' }}>{selectedCourt?.name} ({selectedCourt?.type})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: 'var(--space-md)' }}>
                    <div className="flex-col">
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textTransform: 'uppercase' }}>วันที่</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.6 }}>DATE</span>
                    </div>
                    <strong style={{ fontSize: 'var(--text-base)', textAlign: 'right', color: 'var(--text-primary)' }}>{selectedDate}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--bg-secondary)', paddingBottom: 'var(--space-md)' }}>
                    <div className="flex-col">
                      <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textTransform: 'uppercase' }}>เวลา</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', opacity: 0.6 }}>TIME</span>
                    </div>
                    <strong style={{ fontSize: 'var(--text-base)', textAlign: 'right', color: 'var(--text-primary)' }}>{selectedTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-sm)' }}>
                    <div className="flex-col">
                      <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)', fontWeight: '800' }}>ราคาสุทธิ</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>TOTAL AMOUNT</span>
                    </div>
                    <strong style={{ fontSize: 'var(--text-3xl)', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>฿{Math.floor(Number(selectedCourt?.price_per_hour || selectedCourt?.rate || 0)).toLocaleString('th-TH')}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <button className="secondary-button" style={{ flex: 1, padding: 'var(--space-md)', fontWeight: '700' }} onClick={() => setStep(1)}>แก้ไข (Modify)</button>
              <button className="premium-button" style={{ flex: 2, fontWeight: '800' }} onClick={handleNextStep}>ยืนยันและชำระเงิน (Secure Checkout)</button>
            </div>
          </div>
        )}
      </div>

      {step === 1 && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 'var(--space-lg)', background: 'var(--bg-primary)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'center', zIndex: 100, boxShadow: '0 -10px 30px rgba(0,0,0,0.05)' }}>
          <button className="secondary-button" onClick={onBack} style={{ maxWidth: '400px', width: '100%', padding: 'var(--space-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-sm)', fontWeight: '700' }}>
            <ChevronLeft size={20} /> กลับไปหน้าหลัก (Go Back)
          </button>
        </div>
      )}
    </div>
  )
}

export default Booking
