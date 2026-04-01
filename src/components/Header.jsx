import React, { useEffect, useRef, useState } from 'react'
import { Calendar, History, LogOut, Menu, User, Wallet } from 'lucide-react'
import { useApp } from '../hooks/useApp'

export const Header = ({ onViewChange }) => {
  const { user, logout } = useApp()
  const [showMenu, setShowMenu] = useState(false)
  const menuContainerRef = useRef(null)

  const navigate = (view) => {
    onViewChange(view)
    setShowMenu(false)
  }

  const handleLogout = async () => {
    setShowMenu(false)
    await logout()
  }

  useEffect(() => {
    if (!user || !showMenu) return undefined

    const handlePointerDownOutside = (event) => {
      if (!menuContainerRef.current?.contains(event.target)) {
        setShowMenu(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDownOutside)
    document.addEventListener('touchstart', handlePointerDownOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside)
      document.removeEventListener('touchstart', handlePointerDownOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showMenu, user])

  if (!user) return null

  return (
    <header className="header-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <button
        className="brand"
        onClick={() => onViewChange('profile')}
        aria-label="หน้าหลัก (Back to Home)"
        style={{ fontWeight: '800', fontSize: '1.6rem', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', padding: 0 }}
      >
        <span style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>TENNIS COURT</span>
      </button>
      <div ref={menuContainerRef} style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', border: 'none', background: 'none', padding: '4px 8px', borderRadius: '8px' }}
          onClick={() => setShowMenu((current) => !current)}
          aria-label={`เมนูผู้ใช้: ${user.name} (User Menu)`}
          aria-expanded={showMenu}
          aria-haspopup="true"
        >
          <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1a1a1a' }}>{user.name}</span>
          <Menu size={28} color="#1a1a1a" aria-hidden="true" />
        </button>

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
            <button className="secondary-button" style={{ color: '#333', textAlign: 'left', border: 'none' }} onClick={() => void handleLogout()}>
              <LogOut size={16} style={{ marginRight: '8px' }} /> ออกจากระบบ
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
