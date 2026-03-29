import React, { useCallback, useEffect, useState } from 'react'
import { Calendar, ClipboardList, DollarSign, List, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { api } from '../services/api'
import { useApp } from '../hooks/useApp'

import AdminAllotment from '../components/admin/AdminAllotment'
import AdminAuditLog from '../components/admin/AdminAuditLog'
import AdminBookings from '../components/admin/AdminBookings'
import AdminDatePicker from '../components/admin/AdminDatePicker'
import AdminPricing from '../components/admin/AdminPricing'
import AdminSettings from '../components/admin/AdminSettings'
import AdminTransactions from '../components/admin/AdminTransactions'
import AdminUsers from '../components/admin/AdminUsers'

const TABS = [
  { id: 'allotment', label: 'Availability', icon: <Calendar size={18} /> },
  { id: 'bookings', label: 'Reservations', icon: <ClipboardList size={18} /> },
  { id: 'users', label: 'Members', icon: <Users size={18} /> },
  { id: 'pricing', label: 'Rates', icon: <DollarSign size={18} /> },
  { id: 'transactions', label: 'Audit Log', icon: <List size={18} /> },
  { id: 'settings', label: 'Ops', icon: <ShieldCheck size={18} /> },
]

const buildId = Date.now().toString(36).toUpperCase()

const Admin = () => {
  const { fetchStatus, fetchAdminBookings } = useApp()
  const [activeTab, setActiveTab] = useState('allotment')
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [userFilter, setUserFilter] = useState('')
  const [rates, setRates] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [walletTransactions, setWalletTransactions] = useState([])
  const [apiVersion, setApiVersion] = useState('Checking...')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchRates = useCallback(async () => {
    try {
      const data = await api.getCourts()
      if (Array.isArray(data)) {
        setRates(data)
      }
    } catch (error) {
      console.error('Fetch rates error:', error)
    }
  }, [])

  const fetchVersion = useCallback(async () => {
    try {
      const data = await api.getVersion()
      if (data.version) {
        setApiVersion(data.version)
      }
    } catch {
      setApiVersion('Unknown')
    }
  }, [])

  const fetchAuditLogs = useCallback(async (date) => {
    try {
      const data = await api.getAuditLogs(date)
      if (Array.isArray(data)) {
        setAuditLogs(data)
      }
    } catch (error) {
      console.error('Fetch logs error:', error)
    }
  }, [])

  const fetchWalletTransactions = useCallback(async (date) => {
    try {
      const data = await api.getWalletTransactions(date)
      if (Array.isArray(data)) {
        setWalletTransactions(data)
      }
    } catch (error) {
      console.error('Fetch wallet tx error:', error)
    }
  }, [])

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchStatus(selectedDate),
        fetchAdminBookings(selectedDate),
        fetchRates(),
        fetchAuditLogs(selectedDate),
        fetchWalletTransactions(selectedDate),
        fetchVersion(),
      ])
    } catch (error) {
      console.error('Refresh error:', error)
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 500)
    }
  }, [fetchAdminBookings, fetchAuditLogs, fetchRates, fetchStatus, fetchVersion, fetchWalletTransactions, selectedDate])

  useEffect(() => {
    void fetchStatus(selectedDate)
    void fetchAdminBookings(selectedDate)
    void fetchVersion()

    if (activeTab === 'pricing') {
      void fetchRates()
    }

    if (activeTab === 'transactions') {
      void fetchAuditLogs(selectedDate)
      void fetchWalletTransactions(selectedDate)
    }
  }, [
    activeTab,
    fetchAdminBookings,
    fetchAuditLogs,
    fetchRates,
    fetchStatus,
    fetchVersion,
    fetchWalletTransactions,
    selectedDate,
  ])

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div className="glass-card flex-col" style={{ padding: '0', background: '#fff', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid #eee', background: 'var(--accent-primary)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', margin: 0, letterSpacing: '-0.02em' }}>MANAGEMENT CONSOLE</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <AdminDatePicker value={selectedDate} onChange={setSelectedDate} />
            <button
              onClick={() => void refreshDashboard()}
              disabled={isRefreshing}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: '600', opacity: isRefreshing ? 0.7 : 1 }}
              onMouseOver={(event) => {
                event.currentTarget.style.background = 'rgba(255,255,255,0.2)'
              }}
              onMouseOut={(event) => {
                event.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              }}
            >
              <RefreshCw size={16} className={isRefreshing ? 'spin-animation' : ''} /> {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', background: '#fcfcfc', padding: '12px 32px', borderBottom: '1px solid #eee', overflowX: 'auto', gap: '8px' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                color: activeTab === tab.id ? 'var(--accent-primary)' : '#888',
                background: activeTab === tab.id ? 'var(--accent-court)' : 'transparent',
                borderRadius: '30px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontWeight: '700',
                fontSize: '0.95rem',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '24px' }}>
          {activeTab === 'allotment' && <AdminAllotment selectedDate={selectedDate} />}
          {activeTab === 'bookings' && <AdminBookings selectedDate={selectedDate} onActiveUserFilter={(name) => { setUserFilter(name); setActiveTab('users') }} />}
          {activeTab === 'users' && <AdminUsers initialFilter={userFilter} />}
          {activeTab === 'pricing' && <AdminPricing rates={rates} setRates={setRates} />}
          {activeTab === 'transactions' && (
            <div className="flex-col gap-xl">
              <AdminTransactions transactions={walletTransactions} />
              <div style={{ padding: '24px 0', borderTop: '2px dashed #eee', marginTop: '20px' }} />
              <AdminAuditLog auditLogs={auditLogs} />
            </div>
          )}
          {activeTab === 'settings' && <AdminSettings />}
        </div>

        <div style={{ padding: '16px 32px', textAlign: 'right', fontSize: '0.75rem', color: '#ccc' }}>
          Build: {buildId} | API: {apiVersion}
        </div>
      </div>
    </div>
  )
}

export default Admin
