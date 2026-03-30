import React from 'react'

const renderTypeBadge = (type) => {
  const normalized = (type || 'qr').toString().trim().toLowerCase()

  if (normalized === 'refund') {
    return {
      label: 'Refund (คืนเงินวอลเล็ต)',
      background: '#fff0f6',
      color: '#a61e4d',
    }
  }

  if (normalized === 'credit' || normalized === 'card') {
    return {
      label: 'Card',
      background: '#eef4ff',
      color: '#2457c5',
    }
  }

  return {
    label: 'PromptPay',
    background: '#fff4e6',
    color: '#c76b00',
  }
}

const renderStatusBadge = (status) => ({
  background: status === 'Paid' ? '#e6fffa' : status === 'Cancelled' ? '#fff5f5' : '#fff9db',
  color: status === 'Paid' ? '#2c7a7b' : status === 'Cancelled' ? '#c53030' : '#f59f00',
  label: status === 'Paid' ? 'Success' : status,
})

const TransactionTable = ({ transactions, emptyMessage, accent = '#888', rowBorder = '#eee', amountColor = '#00b894' }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
      <thead>
        <tr style={{ background: '#f8f9fa', borderBottom: `2px solid ${rowBorder}` }}>
          <th style={{ padding: '16px', textAlign: 'left', color: accent, fontSize: '0.8rem', textTransform: 'uppercase' }}>Time</th>
          <th style={{ padding: '16px', textAlign: 'left', color: accent, fontSize: '0.8rem', textTransform: 'uppercase' }}>Customer</th>
          <th style={{ padding: '16px', textAlign: 'center', color: accent, fontSize: '0.8rem', textTransform: 'uppercase' }}>Type</th>
          <th style={{ padding: '16px', textAlign: 'right', color: accent, fontSize: '0.8rem', textTransform: 'uppercase' }}>Amount</th>
          <th style={{ padding: '16px', textAlign: 'center', color: accent, fontSize: '0.8rem', textTransform: 'uppercase' }}>Status</th>
          <th style={{ padding: '16px', textAlign: 'left', color: accent, fontSize: '0.8rem', textTransform: 'uppercase' }}>Ref</th>
        </tr>
      </thead>
      <tbody>
        {transactions.length === 0 ? (
          <tr>
            <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#ccc' }}>
              {emptyMessage}
            </td>
          </tr>
        ) : (
          transactions.map((tx) => {
            const typeBadge = renderTypeBadge(tx.payment_type)
            const statusBadge = renderStatusBadge(tx.status)

            return (
              <tr key={tx.id} style={{ borderBottom: `1px solid ${rowBorder}` }}>
                <td style={{ padding: '16px', fontSize: '0.85rem', color: '#666' }}>
                  {new Date(tx.created_at).toLocaleString('th-TH')}
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: '700', color: '#1a1a3a' }}>{tx.user_name || 'Unknown User'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{tx.user_phone || `ID: ${tx.user_id}`}</div>
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{ background: typeBadge.background, color: typeBadge.color, padding: '4px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                    {typeBadge.label}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '800', color: amountColor }}>
                  ฿{parseFloat(tx.amount).toLocaleString()}
                </td>
                <td style={{ padding: '16px', textAlign: 'center' }}>
                  <span style={{ background: statusBadge.background, color: statusBadge.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800' }}>
                    {statusBadge.label}
                  </span>
                </td>
                <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#999', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  {tx.charge_id || '-'}
                </td>
              </tr>
            )
          })
        )}
      </tbody>
    </table>
  </div>
)

const AdminTransactions = ({ transactions }) => {
  const refundTransactions = (transactions || []).filter(
    (tx) => (tx.payment_type || '').toString().trim().toLowerCase() === 'refund',
  )

  const topupTransactions = (transactions || []).filter(
    (tx) => (tx.payment_type || '').toString().trim().toLowerCase() !== 'refund',
  )

  return (
    <div className="flex-col gap-md">
      <div className="flex-col gap-xs">
        <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', marginBottom: '4px' }}>Wallet Transaction History</h3>
        <p style={{ margin: 0, color: '#7a7a7a', fontSize: '0.9rem', fontWeight: '600' }}>
          รวมรายการเติมเงินและเครดิตคืนเงินเข้ากระเป๋า Wallet
        </p>
      </div>

      <div className="glass-card" style={{ background: '#fffaf3', border: '1px solid #ffe8cc', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#9c5700', fontFamily: 'var(--font-heading)' }}>Refund History</h4>
            <p style={{ margin: '4px 0 0', color: '#a06a1a', fontSize: '0.85rem', fontWeight: '600' }}>
              รายการคืนเงินจากการยกเลิกการจองที่เครดิตกลับเข้า Wallet
            </p>
          </div>
          <span style={{ background: '#fff', color: '#9c5700', borderRadius: '999px', padding: '8px 12px', fontSize: '0.8rem', fontWeight: '800' }}>
            {refundTransactions.length} refund item{refundTransactions.length === 1 ? '' : 's'}
          </span>
        </div>

        <TransactionTable
          transactions={refundTransactions}
          emptyMessage="No refund transactions found."
          accent="#9c5700"
          rowBorder="#ffe8cc"
          amountColor="#a61e4d"
        />
      </div>

      <TransactionTable
        transactions={topupTransactions}
        emptyMessage="No wallet top-up transactions found."
      />
    </div>
  )
}

export default AdminTransactions
