import React, { useMemo, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useApp } from '../hooks/useApp'

const MONTHS = [
  { value: 'all', label: 'ทุกเดือน' },
  { value: '01', label: 'มกราคม' },
  { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' },
  { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' },
  { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' },
  { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
]

const ITEMS_PER_PAGE = 10

const HistoryView = ({ onBack }) => {
  const { userHistory } = useApp()
  const [currentPage, setCurrentPage] = useState(1)
  const [monthFilter, setMonthFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear())

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
          <h2 style={{ fontSize: '1.4rem', color: '#1a5928', fontFamily: 'var(--font-heading)', margin: 0 }}>ประวัติการจอง</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={monthFilter}
              onChange={(event) => {
                setMonthFilter(event.target.value)
                setCurrentPage(1)
              }}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem' }}
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
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem' }}
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
            <span style={{ fontSize: '3rem' }}>📋</span>
            ไม่พบประวัติการจองในช่วงเวลานี้
          </div>
        ) : (
          <>
            <div className="flex-col gap-md">
              {currentRecords.map((booking, index) => (
                <div key={booking.id || index} className="glass-card" style={{ background: '#f8fffe', border: '1px solid #e0f2f1', padding: '20px', borderRadius: '16px', transition: 'transform 0.2s' }}>
                  <div className="history-record-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div className="flex-col gap-xs history-record-main" style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1a1a3a' }}>{booking.court_name || booking.court}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '600' }}>{booking.venue_name || 'Tennis Court'}</div>
                      <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> {booking.booking_date || booking.date} เวลา {booking.booking_time || booking.time}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> ชำระเมื่อ: {booking.created_at ? new Date(booking.created_at).toLocaleString('th-TH') : booking.paidAt || '-'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px', fontFamily: 'monospace', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        #{booking.transaction_ref ? booking.transaction_ref.substring(0, 12) : booking.bookingNo || booking.id}
                      </div>
                    </div>
                    <div className="history-record-side" style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span
                        className="history-status-badge"
                        style={{
                          background: booking.status === 'Paid' ? '#e6fffa' : booking.status === 'Cancelled' ? '#fff5f5' : '#fffbea',
                          color: booking.status === 'Paid' ? '#2c7a7b' : booking.status === 'Cancelled' ? '#c53030' : '#b7791f',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {booking.status === 'Paid' ? 'ชำระแล้ว' : booking.status === 'Cancelled' ? 'ยกเลิกแล้ว' : 'รอชำระเงิน'}
                      </span>
                      <div style={{ marginTop: '12px', fontWeight: '900', color: booking.status === 'Paid' ? '#00b894' : '#555', fontSize: '1.2rem' }}>
                        ฿{Math.floor(Number(booking.price || 500)).toLocaleString('th-TH')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                <button
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  style={{ background: 'none', border: 'none', cursor: safePage === 1 ? 'default' : 'pointer', color: safePage === 1 ? '#ccc' : '#1a5928' }}
                >
                  <ChevronLeft size={24} />
                </button>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1a5928' }}>
                  หน้า {safePage} จาก {totalPages}
                </div>
                <button
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  style={{ background: 'none', border: 'none', cursor: safePage === totalPages ? 'default' : 'pointer', color: safePage === totalPages ? '#ccc' : '#1a5928' }}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        )}

        <button onClick={onBack} className="premium-button" style={{ marginTop: '20px', background: '#1a5928' }}>
          กลับหน้าหลัก
        </button>
      </div>
    </div>
  )
}

export default HistoryView
