import React, { useState } from 'react'
import { useApp } from '../../hooks/useApp'
import { api } from '../../services/api'

const formatDisplayDate = (isoDate) => {
  const [year, month, day] = (isoDate || '').split('-')
  if (!year || !month || !day) {
    return isoDate || '-'
  }

  return `${day}/${month}/${year}`
}

const getPaymentBadge = (booking) => {
  const provider = (booking.payment_provider || '').toString().trim().toLowerCase()

  if (provider === 'wallet') {
    return { label: 'Wallet', background: '#eefaf3', color: '#1f7a45' }
  }

  if (provider === 'card' || provider === 'credit') {
    return { label: 'Card', background: '#eef4ff', color: '#2457c5' }
  }

  if (provider === 'promptpay' || provider === 'qr') {
    return { label: 'PromptPay', background: '#fff4e6', color: '#c76b00' }
  }

  if (provider === 'omise') {
    return { label: 'Omise', background: '#f3f0ff', color: '#5f3dc4' }
  }

  return { label: 'Unknown', background: '#f1f3f5', color: '#6c757d' }
}

const getStatusBadge = (booking) => {
  const status = (booking.status || '').toString().trim().toLowerCase()

  if (status === 'cancelled') {
    return { label: 'Cancelled', background: '#fff5f5', color: '#c53030' }
  }

  if (status === 'pending') {
    return { label: 'Pending (รอชำระ)', background: '#fff9db', color: '#f59f00' }
  }

  return { label: 'Paid (ชำระแล้ว)', background: '#e6fffa', color: '#2c7a7b' }
}

const AdminBookings = ({ selectedDate, onActiveUserFilter }) => {
  const { adminBookings, fetchAdminBookings } = useApp()
  const [courtFilter, setCourtFilter] = useState('All')
  const [timeFilter, setTimeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [cancellingBookingId, setCancellingBookingId] = useState(null)

  const baseBookings = (adminBookings || []).filter((booking) => {
    const normalizedStatus = (booking.status || '').toString().trim().toLowerCase()
    return booking.date === selectedDate && ['paid', 'cancelled'].includes(normalizedStatus)
  })

  const uniqueCourts = [...new Set(baseBookings.map((booking) => booking.court).filter(Boolean))].sort()
  const uniqueTimes = [...new Set(baseBookings.map((booking) => booking.hour).filter(Boolean))].sort()

  const filteredBookings = baseBookings.filter((booking) => {
    const matchCourt = courtFilter === 'All' || booking.court === courtFilter
    const matchTime = timeFilter === 'All' || booking.hour === timeFilter
    const matchStatus = statusFilter === 'All' || (booking.status || '').toString().trim().toLowerCase() === statusFilter.toLowerCase()
    return matchCourt && matchTime && matchStatus
  })

  const handleCancelBooking = async (booking) => {
    const reason = window.prompt(`ยกเลิกการจอง #${booking.id}\nกรุณาระบุเหตุผลสำหรับลูกค้าและ audit log`, 'ลูกค้าจองผิด ต้องการยกเลิก')

    if (reason === null) {
      return
    }

    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      window.alert('กรุณาระบุเหตุผลก่อนยืนยันการยกเลิก')
      return
    }

    const confirmed = window.confirm(`ยืนยันยกเลิกการจอง #${booking.id} ของ ${booking.user?.name || booking.name} ?`)
    if (!confirmed) {
      return
    }

    try {
      setCancellingBookingId(booking.id)
      const result = await api.adminCancelBooking(booking.id, trimmedReason)
      await fetchAdminBookings(selectedDate)

      const refundSummary = result.refund_status
        ? `\nสถานะคืนเงิน: ${result.refund_status}${result.refund_amount ? ` (฿${Number(result.refund_amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})` : ''}`
        : ''

      window.alert(`${result.message || 'ยกเลิกการจองเรียบร้อยแล้ว'}${refundSummary}`)
    } catch (error) {
      window.alert(error.message || 'ไม่สามารถยกเลิกการจองได้')
    } finally {
      setCancellingBookingId(null)
    }
  }

  if (baseBookings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ccc', background: '#fcfcfc', borderRadius: '16px', border: '2px dashed #eee' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📋</div>
        <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>No bookings found for the selected date.</p>
      </div>
    )
  }

  return (
    <div className="flex-col gap-md">
      <div className="flex-row items-center justify-between wrap gap-md">
        <div className="flex-col gap-xs">
          <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>
            Booking Log for {formatDisplayDate(selectedDate)}
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#7a7a7a', fontWeight: '600' }}>
            ยกเลิกการจองที่ชำระแล้วจะคืนเงินเข้า Wallet ของสมาชิกอัตโนมัติ
          </p>
        </div>

        <div className="flex-row items-center gap-sm">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>COURT:</span>
            <select
              value={courtFilter}
              onChange={(event) => setCourtFilter(event.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent-primary)', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Courts</option>
              {uniqueCourts.map((court) => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>TIME:</span>
            <select
              value={timeFilter}
              onChange={(event) => setTimeFilter(event.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent-primary)', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Times</option>
              {uniqueTimes.map((time) => (
                <option key={time} value={time}>{time}:00</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 'bold' }}>STATUS:</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent-primary)', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All</option>
              <option value="Paid">Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="admin-bookings-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="admin-bookings-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '0.95rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px 20px', textAlign: 'left', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>ID</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Customer</th>
              <th className="admin-bookings-sticky-col" style={{ padding: '16px 24px', textAlign: 'left', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Court (สนาม)</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Time (เวลา)</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Price</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Payment</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Status</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length > 0 ? filteredBookings.map((booking, index) => {
              const paymentBadge = getPaymentBadge(booking)
              const statusBadge = getStatusBadge(booking)

              return (
                <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '14px 16px', color: '#667085', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    #{booking.id}
                  </td>
                  <td
                    style={{ padding: '14px 16px', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer' }}
                    onClick={() => onActiveUserFilter(booking.user?.name || booking.name)}
                  >
                    {booking.user?.name || booking.name}
                  </td>
                  <td className="admin-bookings-sticky-col" style={{ padding: '14px 16px', fontWeight: '700' }}>{booking.court}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {booking.hour || '00:00'} - {(parseInt(booking.hour || 0, 10) + 1).toString().padStart(2, '0')}:00
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700' }}>฿{parseFloat(booking.price || 0).toLocaleString()}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      background: paymentBadge.background,
                      color: paymentBadge.color,
                      padding: '5px 12px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                    }}>
                      {paymentBadge.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <span style={{
                      background: statusBadge.background,
                      color: statusBadge.color,
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {(booking.status || '').toString().trim().toLowerCase() === 'cancelled' ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        borderRadius: '999px',
                        background: '#f8f9fa',
                        color: '#6c757d',
                        fontSize: '0.76rem',
                        fontWeight: '800',
                        border: '1px solid #e9ecef',
                        whiteSpace: 'nowrap',
                      }}>
                        {booking.refund_status === 'Refunded' ? 'Refunded (คืนคุณวอลเล็ตแล้ว)' : 'Cancelled'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        disabled={cancellingBookingId === booking.id}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '999px',
                          background: cancellingBookingId === booking.id ? '#f1f3f5' : '#fff5f5',
                          color: cancellingBookingId === booking.id ? '#868e96' : '#c92a2a',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          border: '1px solid #ffd8d8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cancellingBookingId === booking.id ? 'Refunding...' : 'Cancel & Refund to Wallet'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
                  No matches for these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminBookings
