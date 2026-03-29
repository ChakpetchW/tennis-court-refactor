import React from 'react'
import { ArrowLeft, LogOut } from 'lucide-react'
import AdminLogin from './pages/AdminLogin'
import Admin from './pages/Admin'
import { useApp } from './hooks/useApp'

const adminShellStyle = {
  padding: '16px 32px',
  background: '#fff',
  borderBottom: '1px solid #eee',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'sticky',
  top: 0,
  zIndex: 100,
}

function AdminApp() {
  const { adminUser, isAdminBootstrapping, adminLogout } = useApp()

  if (isAdminBootstrapping) {
    return (
      <div className="admin-outer-container" style={{ minHeight: '100vh', background: '#f8f9fa', padding: '40px' }}>
        <div className="glass-card" style={{ background: '#fff', padding: '24px', maxWidth: '480px', margin: '80px auto' }}>
          กำลังตรวจสอบเซสชันผู้ดูแลระบบ...
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return (
      <div className="admin-outer-container" style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ padding: '20px' }}>
          <a
            href="./index.html"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600' }}
          >
            <ArrowLeft size={18} /> กลับสู่หน้าเว็บจอง
          </a>
        </div>
        <AdminLogin />
      </div>
    )
  }

  return (
    <div className="admin-outer-container">
      <div style={adminShellStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'var(--accent-primary)',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
            }}
          >
            A
          </div>
          <h1 style={{ fontSize: '1.2rem', margin: 0 }}>System Administration</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '0.9rem', color: '#666' }}>
            สวัสดี, <strong>{adminUser.name}</strong>
          </span>
          <button
            onClick={() => void adminLogout()}
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
              transition: 'all 0.2s',
            }}
            onMouseOver={(event) => {
              event.currentTarget.style.background = '#fff0f0'
            }}
            onMouseOut={(event) => {
              event.currentTarget.style.background = 'none'
            }}
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
