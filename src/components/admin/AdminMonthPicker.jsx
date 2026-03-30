import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const parseMonthValue = (value) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '')
  if (!match) {
    const now = new Date()
    return { year: now.getFullYear(), monthIndex: now.getMonth() }
  }

  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
  }
}

const formatMonthValue = ({ year, monthIndex }) =>
  `${year}-${String(monthIndex + 1).padStart(2, '0')}`

const getDisplayLabel = (value) => {
  const { year, monthIndex } = parseMonthValue(value)
  return `${MONTH_LABELS[monthIndex]} ${year}`
}

const AdminMonthPicker = ({ value, onChange }) => {
  const rootRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => parseMonthValue(value).year)

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

  useEffect(() => {
    setViewYear(parseMonthValue(value).year)
  }, [value])

  const selected = useMemo(() => parseMonthValue(value), [value])

  const handleSelectMonth = (monthIndex) => {
    onChange(formatMonthValue({ year: viewYear, monthIndex }))
    setIsOpen(false)
  }

  const jumpToCurrentMonth = () => {
    const now = new Date()
    onChange(formatMonthValue({ year: now.getFullYear(), monthIndex: now.getMonth() }))
    setViewYear(now.getFullYear())
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        style={{
          minWidth: '220px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          padding: '12px 16px',
          borderRadius: '18px',
          border: '1px solid #dbe6de',
          background: '#fff',
          color: '#1d2c20',
          boxShadow: isOpen ? '0 18px 40px rgba(14, 41, 22, 0.14)' : '0 8px 18px rgba(14, 41, 22, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #edf8ef 0%, #eef4ff 100%)',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--accent-primary)',
              flexShrink: 0,
            }}
          >
            <CalendarRange size={18} />
          </div>
          <div style={{ minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7f8d84', fontWeight: '800' }}>
              Report Month
            </div>
            <div style={{ marginTop: '2px', fontSize: '1rem', fontWeight: '800', color: '#1a1a3a' }}>{getDisplayLabel(value)}</div>
          </div>
        </div>
        <div style={{ color: '#6d7b71', fontWeight: '700', fontSize: '0.8rem' }}>{isOpen ? 'Close' : 'Select'}</div>
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 12px)',
            left: 0,
            width: '320px',
            padding: '18px',
            borderRadius: '24px',
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
            border: '1px solid #dde7e0',
            boxShadow: '0 28px 60px rgba(13, 43, 20, 0.18)',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => setViewYear((year) => year - 1)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '14px',
                border: '1px solid #d8e4d9',
                background: '#f6faf7',
                color: '#20552d',
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#829089', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '800' }}>Year</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '900', color: '#1a1a3a', marginTop: '2px' }}>{viewYear}</div>
            </div>
            <button
              type="button"
              onClick={() => setViewYear((year) => year + 1)}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '14px',
                border: '1px solid #d8e4d9',
                background: '#f6faf7',
                color: '#20552d',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
            {MONTH_LABELS.map((label, monthIndex) => {
              const isSelected = selected.year === viewYear && selected.monthIndex === monthIndex

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSelectMonth(monthIndex)}
                  style={{
                    padding: '14px 0',
                    borderRadius: '16px',
                    border: isSelected ? '1px solid #1f6b2d' : '1px solid #edf1f0',
                    background: isSelected ? 'linear-gradient(135deg, #1f6b2d 0%, #2d7f3c 100%)' : '#fff',
                    color: isSelected ? '#fff' : '#26402d',
                    fontWeight: isSelected ? '800' : '700',
                    boxShadow: isSelected ? '0 14px 24px rgba(31, 107, 45, 0.22)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={jumpToCurrentMonth}
              style={{
                flex: 1,
                padding: '11px 12px',
                borderRadius: '14px',
                border: '1px solid #d8e4d9',
                background: '#f4faf5',
                color: '#1f6b2d',
                fontWeight: '800',
              }}
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '11px 12px',
                borderRadius: '14px',
                border: '1px solid #e7ebea',
                background: '#fff',
                color: '#68766d',
                fontWeight: '800',
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

export default AdminMonthPicker
