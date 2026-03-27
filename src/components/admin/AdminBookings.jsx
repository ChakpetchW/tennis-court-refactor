import React from 'react'
import { useApp } from '../../context/AppContext'

const AdminBookings = ({ selectedDate, onActiveUserFilter }) => {
  const { bookingHistory } = useApp()
  const allBookings = bookingHistory.filter(b => b.date === selectedDate)

  if (allBookings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#ccc', background: '#fcfcfc', borderRadius: '16px', border: '2px dashed #eee' }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>📋</div>
        <p style={{ fontSize: '1.1rem', fontWeight: '600' }}>No reservations found for this date.</p>
      </div>
    )
  }

  return (
    <div className="flex-col gap-md">
      <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>Reservations for {selectedDate}</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '0.95rem' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px 24px', textAlign: 'left', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Customer</th>
              <th style={{ padding: '16px 24px', textAlign: 'left', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Location</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Schedule</th>
              <th style={{ padding: '16px 24px', textAlign: 'right', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Price</th>
              <th style={{ padding: '16px 24px', textAlign: 'center', color: '#888', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.8rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {allBookings.map((b, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td 
                  style={{ padding: '14px 16px', color: 'var(--accent-primary)', fontWeight: '600', cursor: 'pointer' }}
                  onClick={() => onActiveUserFilter(b.user?.name || b.name)}
                >
                  {b.user?.name || b.name}
                </td>
                <td style={{ padding: '14px 16px' }}>{b.court}</td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>{b.hour} - {(parseInt(b.hour) + 1).toString().padStart(2, '0')}:00</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700' }}>฿{parseFloat(b.price || 0).toLocaleString()}</td>
                <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                  <span style={{ 
                    background: b.status === 'pending' ? '#fff9db' : '#e6fffa', 
                    color: b.status === 'pending' ? '#f59f00' : '#2c7a7b', 
                    padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' 
                  }}>
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminBookings
