import React from 'react'

const AdminAuditLog = ({ auditLogs }) => {
  return (
    <div className="flex-col gap-md">
      <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', marginBottom: '24px' }}>Management Audit Log</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Time</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Admin</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Action</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '48px', textAlign: 'center', color: '#ccc' }}>
                  No administrative actions logged yet.
                </td>
              </tr>
            ) : (
              auditLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: '#666' }}>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                  <td style={{ padding: '16px', fontWeight: '700', color: '#1a1a3a' }}>{log.admin_name}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '16px', color: '#555' }}>{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminAuditLog
