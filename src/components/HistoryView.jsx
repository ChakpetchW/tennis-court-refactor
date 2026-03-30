import React, { useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
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

const getBookingStatusPresentation = (booking) => {
  const status = (booking.status || '').toString().trim().toLowerCase()
  const refundStatus = (booking.refund_status || '').toString().trim().toLowerCase()

  if (status === 'cancelled' || status === 'ยกเลิก') {
    if (refundStatus === 'refunded') {
      return {
        label: 'คืนเงินแล้ว',
        subLabel: 'REFUNDED',
        bg: '#eaf4fb',
        color: '#3498db',
        amountColor: '#888',
      }
    }
    if (refundStatus === 'refund pending') {
      return {
        label: 'รอคืนเงิน',
        subLabel: 'REFUND PENDING',
        bg: '#fff4e6',
        color: '#c76b00',
        amountColor: '#888',
      }
    }
    return {
      label: 'ยกเลิกแล้ว',
      subLabel: 'CANCELLED',
      bg: '#fbeaea',
      color: '#e74c3c',
      amountColor: '#888',
    }
  }

  if (status === 'paid' || status === 'ชำระแล้ว' || status === 'successful') {
    return {
      label: 'ชำระแล้ว',
      subLabel: 'PAID',
      bg: '#e6faf5',
      color: '#00b894',
      amountColor: '#00b894',
    }
  }

  return {
    label: 'รอชำระ',
    subLabel: 'PENDING',
    bg: '#fef5e7',
    color: '#f39c12',
    amountColor: '#555',
  }
}

const HistoryView = ({ onBack }) => {
  const { userHistory } = useApp()
  const [currentPage, setCurrentPage] = useState(1)
  const [monthFilter, setMonthFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())

  // Scroll to top on page change (UX for mobile)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage, monthFilter, yearFilter])

  const filteredRecords = useMemo(
    () =>
      (userHistory || []).filter((booking) => {
        const bookingDate = booking.booking_date || booking.date
        if (!bookingDate) return true

        const [year, month] = bookingDate.split('-')
        const matchesMonth = monthFilter === 'all' || month === monthFilter
        const matchesYear = year === yearFilter.toString()
        return matchesMonth && matchesYear
      }),
    [monthFilter, userHistory, yearFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const currentRecords = filteredRecords.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)

  return (
    <div className="container fade-in" style={{ maxWidth: '700px', paddingBottom: '100px' }}>
      <div className="glass-card flex-col gap-md" style={{ background: '#fff', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
          <div className="flex-col">
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>ประวัติการจอง</h2>
            <p style={{ fontSize: '0.9rem', color: '#888', margin: 0 }}>Booking History</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
              {[2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentRecords.length === 0 ? (
          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem', flexDirection: 'column', gap: '8px', background: '#f9f9f9', borderRadius: '16px' }}>
            <Calendar size={48} color="#ddd" style={{ marginBottom: '16px' }} />
            <h3 style={{ color: '#888', margin: '0 0 4px' }}>ไม่พบประวัติการจอง</h3>
            <p style={{ color: '#bbb', margin: 0, fontSize: '0.9rem' }}>You have no booking history yet.</p>
          </div>
        ) : (
          <>
            <div className="flex-col gap-md">
              {currentRecords.map((booking, index) => {
                const statusPresentation = getBookingStatusPresentation(booking)

                return (
                  <div key={booking.id || index} className="glass-card" style={{ background: '#fff', border: '1px solid #f0f0f0', padding: '20px', borderRadius: '16px', transition: 'transform 0.2s' }}>
                    <div className="history-record-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                      <div className="flex-col gap-xs history-record-main" style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1a1a3a' }}>{booking.court_name || booking.court}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '700' }}>{booking.venue_name || 'Tennis Court'}</div>
                        <div style={{ marginTop: '12px', fontSize: '0.95rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                          <Calendar size={16} color="var(--accent-primary)" /> {booking.booking_date || booking.date}
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                          <Clock size={16} color="var(--accent-primary)" /> เวลา {booking.booking_time || booking.time}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '12px', fontFamily: 'monospace', overflowWrap: 'anywhere', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#ccc' }}>ID:</span> #{booking.transaction_ref ? booking.transaction_ref.substring(0, 12) : booking.bookingNo || booking.id}
                        </div>
                      </div>
                      <div className="history-record-side" style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div
                          style={{
                            background: statusPresentation.bg,
                            color: statusPresentation.color,
                            padding: '6px 14px',
                            borderRadius: '12px',
                            textAlign: 'center',
                            minWidth: '100px',
                          }}
                        >
                          <div style={{ fontSize: '0.85rem', fontWeight: '800' }}>{statusPresentation.label}</div>
                          <div style={{ fontSize: '0.65rem', fontWeight: '700', opacity: 0.8, marginTop: '2px', letterSpacing: '0.05em' }}>{statusPresentation.subLabel}</div>
                        </div>
                        
                        <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600', textTransform: 'uppercase' }}>ยอดเงิน (Amount)</div>
                          <div style={{ fontWeight: '900', color: statusPresentation.amountColor, fontSize: '1.4rem', fontFamily: 'var(--font-heading)' }}>
                            ฿{Math.floor(Number(booking.price || 500)).toLocaleString('th-TH')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  style={{ background: 'none', border: 'none', cursor: safePage === 1 ? 'default' : 'pointer', color: safePage === 1 ? '#ccc' : 'var(--accent-primary)' }}
                >
                  <ChevronLeft size={24} />
                </button>
                <div style={{ fontSize: '1rem', fontWeight: '800', color: '#333' }}>
                  หน้า (Page) {safePage} / {totalPages}
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
