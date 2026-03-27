import React from 'react'

const AdminTransactions = ({ transactions }) => {
  return (
    <div className="flex-col gap-md">
      <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', marginBottom: '24px' }}>Wallet Transactions</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Time</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Customer</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Type</th>
              <th style={{ padding: '16px', textAlign: 'right', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ padding: '16px', textAlign: 'center', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '16px', textAlign: 'left', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase' }}>Ref</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#ccc' }}>
                  No wallet transactions found.
                </td>
              </tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '16px', fontSize: '0.85rem', color: '#666' }}>
                    {new Date(tx.created_at).toLocaleString('th-TH')}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '700', color: '#1a1a3a' }}>{tx.user_name || 'Unknown User'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>{tx.user_phone || `ID: ${tx.user_id}`}</div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#666', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>
                      {tx.payment_type || 'qr'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800', color: '#00b894' }}>
                    ฿{parseFloat(tx.amount).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{ 
                      background: tx.status === 'Paid' ? '#e6fffa' : (tx.status === 'Cancelled' ? '#fff5f5' : '#fff9db'), 
                      color: tx.status === 'Paid' ? '#2c7a7b' : (tx.status === 'Cancelled' ? '#c53030' : '#f59f00'), 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' 
                    }}>
                      {tx.status === 'Paid' ? 'Success' : tx.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#999' }}>
                    {tx.charge_id ? tx.charge_id.substring(0, 16) : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminTransactions
