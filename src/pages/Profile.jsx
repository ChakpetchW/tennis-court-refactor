import React from 'react'
import { Calendar, UserCheck } from 'lucide-react'

function ProfileDashboard({ user, walletBalance, onStartBooking }) {
  const formatBirthday = (value) => {
    if (!value) return '-'

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (match) {
      const [, year, month, day] = match
      return `${day}/${month}/${year}`
    }

    return value
  }

  const infoItems = [
    { label: 'ชื่อ-นามสกุล', value: user?.name || '-' },
    { label: 'ชื่อเล่น', value: user?.nickname || '-' },
    { label: 'เบอร์โทรศัพท์', value: user?.phone || '-' },
    { label: 'Line ID', value: user?.line_id || '-' },
    { label: 'อีเมล', value: user?.email || '-' },
    { label: 'วันเกิด', value: formatBirthday(user?.birthday) },
    { label: 'ยอดเงิน wallet', value: `฿${Math.floor(Number(walletBalance || 0)).toLocaleString('th-TH')}` },
    { label: 'สถานที่', value: user?.location || 'Tennis Court' },
  ]

  return (
    <div className="container-wide fade-in" style={{ padding: '32px 20px' }}>
      <div className="flex-col gap-xl">
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '24px 32px', background: 'var(--accent-primary)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-heading)', margin: 0 }}>ข้อมูลสมาชิก</h2>
          </div>

          <div style={{ padding: '32px', position: 'relative' }}>
            <div className="profile-info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '32px' }}>
              {infoItems.map((item, index) => (
                <div key={index} className="profile-info-item" style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '12px', minWidth: 0 }}>
                  <span className="profile-info-label" style={{ color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'block' }}>
                    {item.label}
                  </span>
                  <span
                    className="profile-info-value"
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: '700',
                      color: '#1a1a1a',
                      display: 'block',
                      minWidth: 0,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      lineHeight: 1.45,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ position: 'absolute', right: '40px', bottom: '40px', opacity: 0.03, pointerEvents: 'none' }}>
              <UserCheck size={200} color="var(--accent-primary)" />
            </div>
          </div>
        </div>

        <div className="flex-col gap-lg">
          <h3 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-heading)', color: '#1a1a1a', marginTop: '40px' }}>เมนูลัด</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            <div
              className="booking-option-card-premium"
              onClick={onStartBooking}
              style={{
                background: '#fff',
                padding: '32px',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                border: '1px solid #eee',
                boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--accent-court)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={32} />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#1a1a3a' }}>จองสนาม</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>ตรวจสอบสถานะว่างและจองได้ทันที</div>
              </div>
            </div>

            <div
              style={{
                background: '#fafafa',
                padding: '32px',
                borderRadius: 'var(--radius-lg)',
                opacity: 0.6,
                border: '1px dashed #ddd',
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
              }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: '#eee', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={32} />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#888' }}>หาผู้ช่วยสอน (เร็วๆ นี้)</div>
                <div style={{ fontSize: '0.9rem', color: '#999' }}>คอร์สสอนเทนนิสมืออาชีพ</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileDashboard
