import React, { useState } from 'react'
import { Calendar, History, LogOut, Menu, User, Wallet } from 'lucide-react'
import { useApp } from '../hooks/useApp'

export const Header = ({ onViewChange }) => {
  const { user, logout } = useApp()
  const [showMenu, setShowMenu] = useState(false)

  if (!user) return null

  const navigate = (view) => {
    onViewChange(view)
    setShowMenu(false)
  }

  return (
    <header className="header-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div
        className="brand"
        onClick={() => onViewChange('profile')}
        style={{ fontWeight: '800', fontSize: '1.6rem', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <span style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>TENNIS COURT</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setShowMenu((current) => !current)}>
          <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1a1a1a' }}>{user.name}</span>
          <Menu size={28} color="#1a1a1a" />
        </div>

        {showMenu && (
          <div
            className="glass-card flex-col fade-in"
            style={{
              position: 'absolute',
              top: '48px',
              right: 0,
              width: '220px',
              background: '#fff',
              border: '1px solid #eee',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              zIndex: 1001,
              padding: '8px',
            }}
          >
            <button className="secondary-button" style={{ color: '#333', textAlign: 'left', border: 'none' }} onClick={() => navigate('booking')}>
              <Calendar size={16} style={{ marginRight: '8px' }} /> จองสนาม
            </button>
            <button className="secondary-button" style={{ color: '#333', textAlign: 'left', border: 'none' }} onClick={() => navigate('wallet')}>
              <Wallet size={16} style={{ marginRight: '8px' }} /> เติมเงิน
            </button>
            <button className="secondary-button" style={{ color: '#333', textAlign: 'left', border: 'none' }} onClick={() => navigate('history')}>
              <History size={16} style={{ marginRight: '8px' }} /> ประวัติการจอง
            </button>
            <button className="secondary-button" style={{ color: '#333', textAlign: 'left', border: 'none' }} onClick={() => navigate('profile')}>
              <User size={16} style={{ marginRight: '8px' }} /> ข้อมูลส่วนตัว
            </button>
            <div style={{ borderTop: '1px solid #eee', margin: '4px 0' }} />
            <button className="secondary-button" style={{ color: '#333', textAlign: 'left', border: 'none' }} onClick={logout}>
              <LogOut size={16} style={{ marginRight: '8px' }} /> ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
