import React, { useState } from 'react'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import { useApp } from './context/AppContext'
import { LogOut, ArrowLeft } from 'lucide-react'

function AdminApp() {
  const { adminUser, setAdminUser } = useApp()

  const handleLogout = () => {
    setAdminUser(null)
  }

  // If not logged in as admin, show login
  if (!adminUser) {
    return (
      <div className="admin-outer-container" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ padding: '20px' }}>
          <a href="./index.html" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}>
            <ArrowLeft size={18} /> กลับสู่หน้าเว็บจอง
          </a>
        </div>
        <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />
      </div>
    )
  }

  // Admin Dashboard with Logout
  return (
    <div className="admin-outer-container">
      <div style={{ 
        padding: '16px 32px', 
        background: '#fff', 
        borderBottom: '1px solid #eee', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--accent-primary)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</div>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>System Administration</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>สวัสดี, <strong>{adminUser.name}</strong></span>
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'none', 
              border: '1px solid #ddd', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              color: '#d63031',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#fff0f0'}
            onMouseOut={(e) => e.target.style.background = 'none'}
          >
            <LogOut size={16} /> ออกจากระบบ
          </button>
        </div>
      </div>
      <Admin />
    </div>
  )
}

export default AdminApp
