import React, { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const AdminSettings = () => {
  const { apiSettings, setApiSettings: onUpdateSettings } = useApp()
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false)
  const [adminPassAttempt, setAdminPassAttempt] = useState('')

  if (!isSettingsUnlocked) {
    return (
      <div className="flex-col gap-md" style={{ textAlign: 'center', padding: '40px' }}>
        <ShieldCheck size={48} style={{ margin: '0 auto', color: 'var(--accent-primary)' }} />
        <h3>ระบุรหัสผ่านเพื่อแก้ไขการตั้งค่า</h3>
        <input 
          type="password" 
          placeholder="ป้อนรหัสผ่าน..." 
          value={adminPassAttempt}
          onChange={(e) => setAdminPassAttempt(e.target.value)}
          style={{ textAlign: 'center', margin: '0 auto', width: '300px' }}
        />
        <button 
          className="premium-button"
          style={{ margin: '0 auto', width: '300px' }}
          onClick={() => {
            if (adminPassAttempt === apiSettings.adminPassword) {
              setIsSettingsUnlocked(true)
            } else {
              alert('รหัสผ่านไม่ถูกต้อง')
            }
          }}
        >
          ตรวจสอบรหัสผ่าน
        </button>
      </div>
    )
  }

  return (
    <div className="flex-col gap-md" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div className="flex-col gap-lg">
        <div style={{ padding: '12px', background: '#e1f5fe', color: '#0288d1', borderRadius: '8px', fontSize: '0.85rem' }}>
          <strong>OTP Login Setting</strong>
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>Your Webhook Callback URL (ให้ผู้ให้บริการ SMS เรียกมาที่นี่)</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              readOnly
              value={`https://api.tenniscourt-booking.com/v1/webhook/otp/callback`}
              style={{ flex: 1, background: '#f0f0f0', color: '#666', border: '1px dashed #ccc' }}
            />
            <button 
              className="premium-button" 
              style={{ width: '80px', padding: '8px', fontSize: '0.8rem' }}
              onClick={() => {
                navigator.clipboard.writeText(`https://api.tenniscourt-booking.com/v1/webhook/otp/callback`);
                alert('คัดลอกลิงก์แล้ว');
              }}
            >
              Copy
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#666' }}>* นำลิงก์นี้ไปใส่ในหน้าตั้งค่า Webhook ของฝั่งผู้ให้บริการ SMS ของคุณ</p>
        </div>
        
        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Webhook URL 
            <div 
              title="ช่องทาง SMS สามารถใช้ได้เพียง Method GET ช่องทาง Email สามารถใช้ได้ Method GET หรือ POST ได้"
              style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#e3f2fd', color: '#1e88e5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', fontSize: '0.75rem' }}
            >?</div>
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="ระบุ URL"
              value={apiSettings.otpWebhookUrl}
              onChange={(e) => onUpdateSettings({ ...apiSettings, otpWebhookUrl: e.target.value })}
              style={{ flex: 1 }}
            />
            <select 
              value={apiSettings.otpMethod}
              onChange={(e) => onUpdateSettings({ ...apiSettings, otpMethod: e.target.value })}
              style={{ width: '120px' }}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
          </div>
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>API Key</label>
          <input 
            type="text" 
            placeholder="ระบุ API Key"
            value={apiSettings.otpApiKey}
            onChange={(e) => onUpdateSettings({ ...apiSettings, otpApiKey: e.target.value })}
          />
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>API Secret</label>
          <input 
            type="password" 
            placeholder="ระบุ API Secret"
            value={apiSettings.otpApiSecret}
            onChange={(e) => onUpdateSettings({ ...apiSettings, otpApiSecret: e.target.value })}
          />
        </div>

        <div style={{ padding: '12px', background: '#fff3e0', color: '#ef6c00', borderRadius: '8px', fontSize: '0.85rem', marginTop: '20px' }}>
          <strong>💳 Payment API (Omise)</strong>
          <p style={{ marginTop: '4px', fontSize: '0.75rem' }}>สมัครที่ dashboard.omise.co เพื่อรับ keys</p>
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>Omise Public Key <span style={{ color: '#aaa', fontSize: '0.75rem' }}>(pkey_...)</span></label>
          <input type="text" placeholder="pkey_test_xxxxxxxxxxxxxxxx" value={apiSettings.omisePublicKey || ''} onChange={(e) => onUpdateSettings({ ...apiSettings, omisePublicKey: e.target.value })} />
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>Omise Secret Key <span style={{ color: '#aaa', fontSize: '0.75rem' }}>(skey_...)</span></label>
          <input type="password" placeholder="skey_test_xxxxxxxxxxxxxxxx" value={apiSettings.omiseSecretKey || ''} onChange={(e) => onUpdateSettings({ ...apiSettings, omiseSecretKey: e.target.value })} />
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>Omise Webhook Secret</label>
          <input type="password" placeholder="whsec_xxxxxxxxxxxxxxxx" value={apiSettings.omiseWebhookSecret || ''} onChange={(e) => onUpdateSettings({ ...apiSettings, omiseWebhookSecret: e.target.value })} />
          <p style={{ fontSize: '0.75rem', color: '#666' }}>Webhook URL ของระบบ: <code>https://scaleup.co.th/court/api/webhook.php</code></p>
        </div>

        <div style={{ padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', fontSize: '0.85rem', marginTop: '4px' }}>
          <strong>📱 SMS (Thaibulksms)</strong>
          <p style={{ marginTop: '4px', fontSize: '0.75rem' }}>สมัครที่ thaibulksms.com — 0.15 บาท/ข้อความ</p>
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>SMS API Key</label>
          <input type="text" placeholder="YOUR_SMS_KEY" value={apiSettings.smsApiKey || ''} onChange={(e) => onUpdateSettings({ ...apiSettings, smsApiKey: e.target.value })} />
        </div>

        <div className="flex-col gap-sm">
          <label style={{ fontSize: '0.9rem', color: '#333' }}>SMS API Secret</label>
          <input type="password" placeholder="YOUR_SMS_SECRET" value={apiSettings.smsApiSecret || ''} onChange={(e) => onUpdateSettings({ ...apiSettings, smsApiSecret: e.target.value })} />
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px', marginTop: '20px' }}>
          <label style={{ fontSize: '0.9rem', color: '#333' }}>Change Setting Password</label>
          <input type="text" value={apiSettings.adminPassword} onChange={(e) => onUpdateSettings({ ...apiSettings, adminPassword: e.target.value })} style={{ width: '100%', marginTop: '8px' }} />
        </div>

        <button className="premium-button" onClick={() => setIsSettingsUnlocked(false)}>ล็อคการเข้าถึง</button>
      </div>
    </div>
  )
}

export default AdminSettings
