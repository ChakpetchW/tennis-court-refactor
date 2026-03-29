import React, { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const parseIsoDate = (isoDate) => {
  const [year, month, day] = (isoDate || '').split('-').map(Number)
  if (!year || !month || !day) {
    return new Date()
  }
  return new Date(year, month - 1, day)
}

const formatIsoDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDisplayDate = (isoDate) => {
  const date = parseIsoDate(isoDate)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const getMonthLabel = (date) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(date)

const buildCalendarDays = (viewDate, selectedDate) => {
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const startOffset = firstDayOfMonth.getDay()
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(firstDayOfMonth.getDate() - startOffset)

  const selectedIso = selectedDate
  const todayIso = formatIsoDate(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + index)
    const iso = formatIsoDate(day)

    return {
      iso,
      label: day.getDate(),
      isCurrentMonth: day.getMonth() === viewDate.getMonth(),
      isSelected: iso === selectedIso,
      isToday: iso === todayIso,
    }
  })
}

const AdminDatePicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const selected = parseIsoDate(value)
    return new Date(selected.getFullYear(), selected.getMonth(), 1)
  })
  const rootRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const moveMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  const toggleCalendar = () => {
    if (!isOpen) {
      const selected = parseIsoDate(value)
      setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1))
    }

    setIsOpen((current) => !current)
  }

  const selectDate = (isoDate) => {
    onChange(isoDate)
    setIsOpen(false)
  }

  const calendarDays = buildCalendarDays(viewDate, value)

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggleCalendar}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '230px',
          background: 'rgba(255,255,255,0.12)',
          padding: '10px 18px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.22)',
          cursor: 'pointer',
          color: '#fff',
          boxShadow: isOpen ? '0 14px 32px rgba(9, 38, 18, 0.28)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(255,255,255,0.14)',
        }}>
          <Calendar size={18} color="#fff" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
          <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75 }}>Selected date</span>
          <strong style={{ fontSize: '1rem', letterSpacing: '0.02em' }}>{formatDisplayDate(value)}</strong>
        </div>
      </button>

      {isOpen ? (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          right: 0,
          width: '320px',
          padding: '18px',
          borderRadius: '22px',
          background: '#ffffff',
          border: '1px solid #dfe8dc',
          boxShadow: '0 22px 50px rgba(13, 43, 20, 0.22)',
          zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#1b4d24' }}>{getMonthLabel(viewDate)}</strong>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '12px',
                  border: '1px solid #d8e5d4',
                  background: '#f6fbf5',
                  color: '#1b4d24',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '12px',
                  border: '1px solid #d8e5d4',
                  background: '#f6fbf5',
                  color: '#1b4d24',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '10px' }}>
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                style={{
                  textAlign: 'center',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: '#7b8b7d',
                  textTransform: 'uppercase',
                  padding: '4px 0',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {calendarDays.map((day) => (
              <button
                key={day.iso}
                type="button"
                onClick={() => selectDate(day.iso)}
                style={{
                  aspectRatio: '1 / 1',
                  borderRadius: '14px',
                  border: day.isSelected ? '1px solid #1f6b2d' : '1px solid transparent',
                  background: day.isSelected
                    ? 'linear-gradient(135deg, #1f6b2d 0%, #2f7e3d 100%)'
                    : day.isToday
                      ? '#edf7ee'
                      : 'transparent',
                  color: day.isSelected ? '#fff' : day.isCurrentMonth ? '#253a27' : '#b2bbb3',
                  fontWeight: day.isSelected || day.isToday ? '800' : '600',
                  cursor: 'pointer',
                }}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', gap: '10px' }}>
            <button
              type="button"
              onClick={() => selectDate(formatIsoDate(new Date()))}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '14px',
                border: '1px solid #d8e5d4',
                background: '#f6fbf5',
                color: '#1b4d24',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '14px',
                border: '1px solid #e4e7e5',
                background: '#fff',
                color: '#516152',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminDatePicker
