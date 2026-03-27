import React, { useState } from 'react'
import { Mail, Lock, ShieldCheck, ChevronLeft } from 'lucide-react'
import { api } from '../services/api'

function AdminLogin({ onLoginSuccess, onBack }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const data = await api.adminLogin(email, password)
      
      if (data.success) {
        onLoginSuccess(data.user)
      } else {
        setError(data.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง')
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex-center fade-in" style={{ 
      minHeight: '100vh', 
      padding: '40px 20px',
      background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="glass-card flex-col items-center gap-lg" style={{ 
        maxWidth: '500px', 
        width: '100%', 
        padding: '50px', 
        background: '#fff',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        borderRadius: '24px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: 'var(--accent-primary)', 
            borderRadius: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 10px 20px rgba(0,184,148,0.3)'
          }}>
            <ShieldCheck size={40} color="#fff" />
          </div>
          <h2 style={{ color: '#1a1a3a', fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>Staff Portal</h2>
          <p style={{ color: '#666', fontSize: '1rem' }}>เข้าสู่ระบบสำหรับเจ้าหน้าที่จัดการสนาม</p>
        </div>

        {error && (
          <div style={{ 
            color: '#d63031', 
            fontSize: '0.9rem', 
            background: '#fff1f0', 
            padding: '12px', 
            borderRadius: '8px', 
            width: '100%', 
            textAlign: 'center',
            border: '1px solid #fab1a0'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-col gap-md" style={{ width: '100%' }}>
          <div className="flex-col gap-sm">
            <label style={{ fontSize: '0.9rem', color: '#1a1a3a', fontWeight: '700' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tenniscourt.com" 
                className="premium-input" 
                style={{ 
                  padding: '16px 16px 16px 48px', 
                  background: '#f8f9fa', 
                  color: '#000', 
                  border: '2px solid #eee',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
          </div>

          <div className="flex-col gap-sm">
            <label style={{ fontSize: '0.9rem', color: '#1a1a3a', fontWeight: '700' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input 
                type="password" 
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="premium-input" 
                style={{ 
                  padding: '16px 16px 16px 48px', 
                  background: '#f8f9fa', 
                  color: '#000', 
                  border: '2px solid #eee',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="premium-button" 
            style={{ 
              background: '#1a1a3a', 
              color: '#fff', 
              marginTop: '10px',
              padding: '18px',
              fontSize: '1.1rem',
              fontWeight: '700',
              borderRadius: '12px'
            }}
            disabled={isLoading}
          >
             {isLoading ? 'กำลังตรวจสอบ...' : 'Login to Dashboard'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginTop: '10px' }}>
          <button 
            onClick={onBack}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px', 
              color: '#666', 
              fontSize: '1rem', 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer',
              padding: '10px'
            }}
          >
            <ChevronLeft size={18} /> กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
