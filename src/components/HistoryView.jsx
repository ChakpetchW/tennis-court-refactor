import React, { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock, CreditCard } from 'lucide-react'
import { useApp } from '../hooks/useApp'

const MONTHS = [
  { value: 'all', label: 'ทุกเดือน (All Months)' },
  { value: '01', label: 'มกราคม (Jan)' },
  { value: '02', label: 'กุมภาพันธ์ (Feb)' },
  { value: '03', label: 'มีนาคม (Mar)' },
  { value: '04', label: 'เมษายน (Apr)' },
  { value: '05', label: 'พฤษภาคม (May)' },
  { value: '06', label: 'มิถุนายน (Jun)' },
  { value: '07', label: 'กรกฎาคม (Jul)' },
  { value: '08', label: 'สิงหาคม (Aug)' },
  { value: '09', label: 'กันยายน (Sep)' },
  { value: '10', label: 'ตุลาคม (Oct)' },
  { value: '11', label: 'พฤศจิกายน (Nov)' },
  { value: '12', label: 'ธันวาคม (Dec)' },
]

const ITEMS_PER_PAGE = 10

const formatBookingStatus = (booking) => {
  const status = (booking.status || '').toString().trim().toLowerCase()
  const refundStatus = (booking.refund_status || '').toString().trim().toLowerCase()

  if (status === 'cancelled' || status === 'ยกเลิก') {
    if (refundStatus === 'refunded') {
      return {
        label: 'คืนเงินแล้ว',
        subLabel: 'REFUNDED',
        bg: '#eaf4fb',
        color: '#2475b8',
        amountColor: '#6b7280',
      }
    }

    if (refundStatus === 'refund pending') {
      return {
        label: 'รอคืนเงิน',
        subLabel: 'REFUND PENDING',
        bg: '#fff4e6',
        color: '#c76b00',
        amountColor: '#6b7280',
      }
    }

    return {
      label: 'ยกเลิกแล้ว',
      subLabel: 'CANCELLED',
      bg: '#fbeaea',
      color: '#d64545',
      amountColor: '#6b7280',
    }
  }

  if (status === 'paid' || status === 'successful' || status === 'success' || status === 'confirmed') {
    return {
      label: 'ชำระแล้ว',
      subLabel: 'PAID',
      bg: '#e6faf5',
      color: '#00a67e',
      amountColor: '#00a67e',
    }
  }

  return {
    label: 'รอชำระ',
    subLabel: 'PENDING',
    bg: '#fef5e7',
    color: '#d68910',
    amountColor: '#4b5563',
  }
}

const formatPaymentMethodLabel = (provider) => {
  const normalized = (provider || '').toString().trim().toLowerCase()

  if (normalized === 'wallet') return 'Wallet'
  if (normalized === 'card' || normalized === 'credit') return 'Credit / Debit Card'
  if (normalized === 'promptpay' || normalized === 'qr') return 'PromptPay QR'
  if (normalized === 'omise') return 'Omise'
  if (normalized === 'manual') return 'Manual'
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Pending'
}

const formatDateDisplay = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

const formatTimeDisplay = (value) => {
  if (!value) return '-'
  const [hour = '00', minute = '00'] = String(value).split(':')
  return `${hour}:${minute}`
}

const formatDateTimeDisplay = (value) => {
  if (!value) return 'ยังไม่ชำระ'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const HistoryView = ({ onBack }) => {
  const { userHistory } = useApp()
  const [currentPage, setCurrentPage] = useState(1)
  const [monthFilter, setMonthFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage, monthFilter, yearFilter])

  const yearOptions = useMemo(() => {
    const years = new Set([new Date().getFullYear()])

    ;(userHistory || []).forEach((booking) => {
      const bookingDate = booking.booking_date || booking.date
      if (!bookingDate) return
      const [year] = String(bookingDate).split('-')
      if (year) years.add(Number(year))
    })

    return Array.from(years).filter(Boolean).sort((a, b) => b - a)
  }, [userHistory])

  const filteredRecords = useMemo(
    () =>
      (userHistory || []).filter((booking) => {
        const status = (booking.status || '').toString().trim().toLowerCase()
        const isSuccessful = ['paid', 'successful', 'success', 'confirmed'].includes(status)
        if (!isSuccessful) return false

        const bookingDate = booking.booking_date || booking.date
        if (!bookingDate) return true

        const [year, month] = String(bookingDate).split('-')
        const matchesMonth = monthFilter === 'all' || month === monthFilter
        const matchesYear = year === String(yearFilter)
        return matchesMonth && matchesYear
      }),
    [monthFilter, userHistory, yearFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const currentRecords = filteredRecords.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  return (
    <div className="container fade-in" style={{ maxWidth: '760px', paddingBottom: '100px' }}>
      <div className="glass-card flex-col gap-md" style={{ background: '#fff', padding: '32px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div className="flex-col">
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>ประวัติการจอง</h2>
            <p style={{ fontSize: '0.9rem', color: '#888', margin: 0 }}>Booking History</p>
          </div>

          <div className="history-filter-row">
            <select
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(event.target.value)
                setCurrentPage(1)
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem', fontWeight: '600' }}
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(event) => {
                setYearFilter(Number(event.target.value))
                setCurrentPage(1)
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem', fontWeight: '600' }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentRecords.length === 0 ? (
          <div
            style={{
              minHeight: '300px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '0.9rem',
              flexDirection: 'column',
              gap: '8px',
              background: '#f9f9f9',
              borderRadius: '16px',
            }}
          >
            <Calendar size={48} color="#ddd" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#888', margin: '0 0 4px' }}>ไม่พบประวัติการจอง</h3>
            <p style={{ color: '#bbb', margin: 0, fontSize: '0.9rem' }}>You have no booking history yet.</p>
          </div>
        ) : (
          <>
            <div className="flex-col gap-md">
              {currentRecords.map((booking, index) => {
                const statusPresentation = formatBookingStatus(booking)
                const paymentTimestamp = booking.paid_at || booking.created_at || null
                const paymentRef = booking.transaction_ref || '-'

                return (
                  <div
                    key={booking.id || index}
                    className="glass-card history-record-card"
                    style={{ background: '#fff', border: '1px solid #f0f0f0', padding: '20px', borderRadius: '18px' }}
                  >
                    <div className="history-record-header">
                      <div className="history-record-main">
                        <div style={{ fontSize: '1.22rem', fontWeight: '800', color: '#1a1a3a' }}>
                          {booking.court_name || booking.court || '-'}
                        </div>
                        <div style={{ fontSize: '0.88rem', color: 'var(--accent-primary)', fontWeight: '700' }}>
                          {booking.venue_name || 'Tennis Court'}
                        </div>
                      </div>

                      <div
                        className="history-status-badge"
                        style={{
                          background: statusPresentation.bg,
                          color: statusPresentation.color,
                          padding: '8px 14px',
                          borderRadius: '14px',
                          textAlign: 'center',
                          minWidth: '112px',
                        }}
                      >
                        <div style={{ fontSize: '0.88rem', fontWeight: '800' }}>{statusPresentation.label}</div>
                        <div style={{ fontSize: '0.67rem', fontWeight: '700', opacity: 0.85, marginTop: '2px', letterSpacing: '0.05em' }}>
                          {statusPresentation.subLabel}
                        </div>
                      </div>
                    </div>

                    <div className="history-record-grid">
                      <div className="history-detail-item">
                        <div className="history-detail-label">
                          <Calendar size={15} />
                          วันที่จอง
                        </div>
                        <div className="history-detail-value">{formatDateDisplay(booking.booking_date || booking.date)}</div>
                      </div>

                      <div className="history-detail-item">
                        <div className="history-detail-label">
                          <Clock size={15} />
                          เวลาเล่น
                        </div>
                        <div className="history-detail-value">{formatTimeDisplay(booking.booking_time || booking.time)}</div>
                      </div>

                      <div className="history-detail-item">
                        <div className="history-detail-label">
                          <CreditCard size={15} />
                          ช่องทางชำระ
                        </div>
                        <div className="history-detail-value">{formatPaymentMethodLabel(booking.payment_provider)}</div>
                      </div>

                      <div className="history-detail-item">
                        <div className="history-detail-label">
                          <Clock size={15} />
                          เวลาชำระ
                        </div>
                        <div className="history-detail-value">{formatDateTimeDisplay(paymentTimestamp)}</div>
                      </div>
                    </div>

                    <div className="history-record-ids">
                      <div className="history-id-item">
                        <span className="history-id-label">Booking ID</span>
                        <strong className="history-id-value">#{booking.bookingNo || booking.id || '-'}</strong>
                      </div>
                      <div className="history-id-item">
                        <span className="history-id-label">Payment Ref</span>
                        <strong className="history-id-value">{paymentRef}</strong>
                      </div>
                    </div>

                    <div className="history-record-footer">
                      <div className="history-amount-block">
                        <div className="history-amount-label">ยอดชำระ (Amount)</div>
                        <div className="history-amount-value" style={{ color: statusPresentation.amountColor }}>
                          ฿{Math.floor(Number(booking.price || 0)).toLocaleString('th-TH')}
                        </div>
                      </div>

                      {(booking.refund_amount || 0) > 0 ? (
                        <div className="history-refund-note">
                          Refund: ฿{Number(booking.refund_amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="history-pagination">
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  style={{ background: 'none', border: 'none', cursor: safePage === 1 ? 'default' : 'pointer', color: safePage === 1 ? '#ccc' : 'var(--accent-primary)' }}
                >
                  <ChevronLeft size={24} />
                </button>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#333' }}>
                  หน้า {safePage} / {totalPages}
                </div>
                <button
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  style={{ background: 'none', border: 'none', cursor: safePage === totalPages ? 'default' : 'pointer', color: safePage === totalPages ? '#ccc' : 'var(--accent-primary)' }}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        )}

        <button onClick={onBack} className="premium-button" style={{ marginTop: '32px', padding: '18px', fontWeight: '800' }}>
          กลับหน้าหลัก (Go Back)
        </button>
      </div>
    </div>
  )
}

export default HistoryView
