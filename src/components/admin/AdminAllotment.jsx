import { api } from '../../services/api'
import { TIME_SLOTS } from '../../data/constants'
import { useApp } from '../../context/AppContext'

const AdminAllotment = ({ selectedDate }) => {
  const { courts, setCourts: onUpdateCourts, fetchStatus } = useApp()
  const toggleAllotment = async (courtId, hourIdx) => {
    const hourStr = TIME_SLOTS[hourIdx]
    try {
      await api.toggleAllotment(courtId, selectedDate, hourStr)
      if (fetchStatus) fetchStatus(selectedDate)
    } catch (err) {
      console.warn('API toggling not available, using local state.', err)
      onUpdateCourts(prev => prev.map(c => 
        c.id === courtId 
          ? { 
              ...c, 
              allotment: c.allotment.map((a, i) => 
                i === hourIdx ? { ...a, isOpen: !a.isOpen } : a
              ) 
            }
          : c
      ))
    }
  }

  return (
    <div className="flex-col gap-md">
      <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', marginBottom: '24px' }}>Venue Availability Management</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: '24px 32px', minWidth: '150px', fontSize: '1.2rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-primary)' }}>VENUE</th>
              {TIME_SLOTS.map(h => (
                <th key={h} style={{ padding: '16px', minWidth: '100px', textAlign: 'center', fontWeight: '800', fontSize: '0.9rem', color: '#888' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {courts.map(court => (
              <tr key={court.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '24px 32px' }}>
                  <div style={{ fontWeight: '800', fontSize: '1.4rem', color: '#1a1a3a', fontFamily: 'var(--font-heading)' }}>{court.name}</div>
                  <div style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600' }}>{court.type} Venue</div>
                </td>
                {court.allotment.map((slot, idx) => (
                  <td key={idx} style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      {slot.bookedBy ? (
                        <div style={{ 
                          padding: '10px 12px', background: 'var(--accent-court)', color: 'var(--accent-primary)', 
                          borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', width: '110px'
                        }}>
                          👤 {slot.bookedBy}
                        </div>
                      ) : slot.pendingBy ? (
                        <div style={{ 
                          padding: '10px 12px', background: '#fffbeb', color: '#d97706', 
                          borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', width: '110px'
                        }}>
                          ⏳ {slot.pendingBy}
                        </div>
                      ) : (
                        <div 
                          onClick={() => toggleAllotment(court.id, idx)}
                          style={{ 
                            padding: '10px 12px', background: slot.isOpen ? '#f0fdf4' : '#fef2f2', 
                            color: slot.isOpen ? '#16a34a' : '#dc2626', 
                            borderRadius: '12px', fontSize: '0.8rem', fontWeight: '800', width: '110px',
                            border: `1px solid ${slot.isOpen ? '#dcfce7' : '#fee2e2'}`, cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          {slot.isOpen ? 'AVAILABLE' : 'BLOCKED'}
                        </div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminAllotment
