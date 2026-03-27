import React, { useState } from 'react'
import { Menu, User, Wallet, History, LogOut, Calendar, CircleDot } from 'lucide-react'
import { useApp } from '../context/AppContext'

export const Header = ({ onViewChange }) => {
  const { user } = useApp()
  const [showMenu, setShowMenu] = useState(false)

  if (!user) return null

  const navigate = (view) => {
    onViewChange(view)
    setShowMenu(false)
  }

  return (
    <header className="header-nav">
      <div
        className="brand"
        onClick={() => onViewChange('profile')}
        style={{ fontWeight: '800', fontSize: '1.3rem', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <div style={{ background: 'var(--accent-secondary)', color: 'var(--accent-primary)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
          <CircleDot size={20} strokeWidth={3} />
        </div>
        <span style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>TENNIS COURT</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowMenu(!showMenu)}>
          <span style={{ fontSize: '0.9rem', color: '#333' }}>{user.name}</span>
          <Menu size={20} color="#333" />
        </div>

        {showMenu && (
          <div className="glass-card flex-col fade-in" style={{
            position: 'absolute', top: '48px', right: 0, width: '220px',
            background: '#fff', border: '1px solid #eee', boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            zIndex: 1001, padding: '8px'
          }}>
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
            <button className="secondary-button" style={{ color: '#333', textAlign: 'left', border: 'none' }} onClick={() => {
              localStorage.removeItem('court_user')
              window.location.reload()
            }}>
              <LogOut size={16} style={{ marginRight: '8px' }} /> ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
