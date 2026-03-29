import React, { useState } from 'react'
import { Mail, RotateCcw, ShieldCheck } from 'lucide-react'
import { api } from '../../services/api'

const AdminSettings = () => {
  const [isClearingOpcache, setIsClearingOpcache] = useState(false)
  const [opcacheMessage, setOpcacheMessage] = useState('')
  const [opcacheError, setOpcacheError] = useState('')
  const [isLoadingMailLogs, setIsLoadingMailLogs] = useState(false)
  const [mailLogError, setMailLogError] = useState('')
  const [mailLogs, setMailLogs] = useState([])

  const handleClearOpcache = async () => {
    setIsClearingOpcache(true)
    setOpcacheMessage('')
    setOpcacheError('')

    try {
      const response = await api.clearOpcache()
      setOpcacheMessage(response.message || 'PHP OPcache cleared successfully')
    } catch (error) {
      setOpcacheError(error.message || 'Unable to clear PHP OPcache')
    } finally {
      setIsClearingOpcache(false)
    }
  }

  const handleLoadMailLogs = async () => {
    setIsLoadingMailLogs(true)
    setMailLogError('')

    try {
      const response = await api.getMailLogs()
      setMailLogs(response.entries || [])
    } catch (error) {
      setMailLogError(error.message || 'Unable to load mail logs')
    } finally {
      setIsLoadingMailLogs(false)
    }
  }

  return (
    <div className="flex-col gap-lg" style={{ maxWidth: '860px', margin: '0 auto', width: '100%' }}>
      <div style={{ padding: '20px 24px', background: '#eef6ff', color: '#0f4c81', borderRadius: '16px', border: '1px solid #d5e7ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <ShieldCheck size={22} />
          <strong>Operations</strong>
        </div>
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
          เครื่องมือนี้มีไว้สำหรับงานดูแลระบบที่ต้องใช้จริงหลัง deploy เท่านั้น
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px' }}>PHP OPcache</div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a3a', wordBreak: 'break-word' }}>Clear cached PHP bytecode on the server</div>
            <p style={{ margin: '10px 0 0', color: '#666', fontSize: '0.85rem', lineHeight: 1.6 }}>
              ใช้หลังอัปไฟล์ PHP ใหม่เพื่อให้เซิร์ฟเวอร์โหลดเวอร์ชันล่าสุดทันที Action นี้ต้อง login เป็น admin และจะถูกบันทึกลง audit log
            </p>
            {opcacheMessage ? (
              <p style={{ margin: '12px 0 0', color: '#157347', fontSize: '0.85rem', fontWeight: '700' }}>{opcacheMessage}</p>
            ) : null}
            {opcacheError ? (
              <p style={{ margin: '12px 0 0', color: '#b02a37', fontSize: '0.85rem', fontWeight: '700' }}>{opcacheError}</p>
            ) : null}
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void handleClearOpcache()}
            disabled={isClearingOpcache}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '10px 14px' }}
          >
            <RotateCcw size={16} /> {isClearingOpcache ? 'Clearing...' : 'Clear OPcache'}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px' }}>Mail Logs</div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a3a', wordBreak: 'break-word' }}>Check SMTP delivery logs for booking confirmation emails</div>
            <p style={{ margin: '10px 0 0', color: '#666', fontSize: '0.85rem', lineHeight: 1.6 }}>
              ใช้ดูว่าเมลไม่ออกเพราะ config ไม่ครบ, ต่อ SMTP ไม่ได้, login ไม่ผ่าน หรือผู้รับถูก reject โดยระบบจะไม่แสดงรหัสผ่านใน log
            </p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => void handleLoadMailLogs()}
            disabled={isLoadingMailLogs}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'auto', padding: '10px 14px' }}
          >
            <Mail size={16} /> {isLoadingMailLogs ? 'Loading...' : 'Load Mail Logs'}
          </button>
        </div>

        {mailLogError ? (
          <p style={{ margin: '0 0 16px', color: '#b02a37', fontSize: '0.85rem', fontWeight: '700' }}>{mailLogError}</p>
        ) : null}

        {!mailLogs.length && !mailLogError ? (
          <div style={{ borderRadius: '14px', background: '#fafafa', border: '1px dashed #ddd', padding: '16px', color: '#666', fontSize: '0.9rem' }}>
            ยังไม่มี mail log แสดงอยู่ กดปุ่มด้านบนเพื่อโหลดรายการล่าสุดจาก server
          </div>
        ) : null}

        {mailLogs.length ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {mailLogs.map((entry, index) => {
              const isSuccess = entry.level === 'SUCCESS'
              const isError = entry.level === 'ERROR'

              return (
                <div
                  key={`${entry.timestamp || 'log'}-${index}`}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    background: isError ? '#fff5f5' : isSuccess ? '#f3fff8' : '#fafcff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#1a1a3a' }}>{entry.message || 'Mail log'}</strong>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '4px 8px',
                      borderRadius: '999px',
                      background: isError ? '#f8d7da' : isSuccess ? '#d1e7dd' : '#e7f1ff',
                      color: isError ? '#842029' : isSuccess ? '#0f5132' : '#0a58ca',
                    }}>
                      {entry.level || 'INFO'}
                    </span>
                  </div>

                  <div style={{ color: '#666', fontSize: '0.8rem', marginBottom: '8px' }}>{entry.timestamp || '-'}</div>

                  {entry.context ? (
                    <pre style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      lineHeight: 1.5,
                      background: 'rgba(255,255,255,0.8)',
                      borderRadius: '10px',
                      padding: '12px',
                      overflowX: 'auto',
                      color: '#334',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {JSON.stringify(entry.context, null, 2)}
                    </pre>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminSettings
