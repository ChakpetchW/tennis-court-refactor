import React, { useState, useEffect } from 'react'
import { 
  ChevronLeft, Calendar, DollarSign, List, ShieldCheck, ClipboardList, Users, Clock
} from 'lucide-react'
import { api } from '../services/api'

// Context
import { useApp } from '../context/AppContext'

// Sub-components
import AdminAllotment from '../components/admin/AdminAllotment'
import AdminBookings from '../components/admin/AdminBookings'
import AdminUsers from '../components/admin/AdminUsers'
import AdminPricing from '../components/admin/AdminPricing'
import AdminAuditLog from '../components/admin/AdminAuditLog'
import AdminTransactions from '../components/admin/AdminTransactions'
import AdminSettings from '../components/admin/AdminSettings'

const Admin = ({ onBack, onLogout }) => {
  const { 
    courts, setCourts, fetchStatus, 
    adminBookings, fetchAdminBookings,
    mockDatabase, updateUserDB, 
    apiSettings, setApiSettings
  } = useApp()

  const [activeTab, setActiveTab] = useState('allotment')
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [userFilter, setUserFilter] = useState('')
  const [rates, setRates] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [walletTransactions, setWalletTransactions] = useState([])

  // 1. Data Refresh logic
  const fetchRates = async () => {
    try {
      const data = await api.getCourts()
      if (Array.isArray(data)) setRates(data)
    } catch (err) { console.error('Fetch rates error:', err) }
  }

  const fetchAuditLogs = async () => {
    try {
      console.log('Fetching audit logs...');
      const data = await api.getAuditLogs();
      console.log('Audit logs received:', data);
      if (Array.isArray(data)) setAuditLogs(data);
    } catch (err) { console.error('Fetch logs error:', err); }
  }

  const fetchWalletTransactions = async () => {
    try {
      console.log('Fetching wallet tx...');
      const data = await api.getWalletTransactions();
      console.log('Wallet tx received:', data);
      if (Array.isArray(data)) setWalletTransactions(data);
    } catch (err) { console.error('Fetch wallet tx error:', err); }
  }

  useEffect(() => {
    if (fetchStatus) fetchStatus(selectedDate)
    if (fetchAdminBookings) fetchAdminBookings(selectedDate)
    if (activeTab === 'pricing') fetchRates()
    if (activeTab === 'transactions') {
      fetchAuditLogs()
      fetchWalletTransactions()
    }
  }, [selectedDate, activeTab])

  // 2. Tab Configuration
  const tabs = [
    { id: 'allotment', label: 'Availability', icon: <Calendar size={18} /> },
    { id: 'bookings', label: 'Reservations', icon: <ClipboardList size={18} /> },
    { id: 'users', label: 'Members', icon: <Users size={18} /> },
    { id: 'pricing', label: 'Rates', icon: <DollarSign size={18} /> },
    { id: 'transactions', label: 'Audit Log', icon: <List size={18} /> },
    { id: 'apiSettings', label: 'System', icon: <ShieldCheck size={18} /> },
  ]

  return (
    <div className="fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div className="glass-card flex-col" style={{ padding: '0', background: '#fff', border: 'none' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 32px', borderBottom: '1px solid #eee', background: 'var(--accent-primary)', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><ChevronLeft size={24} /></button>
            <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-heading)', margin: 0, letterSpacing: '-0.02em' }}>MANAGEMENT CONSOLE</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Calendar size={20} color="#fff" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '1rem', fontWeight: '700', color: '#fff', cursor: 'pointer' }}
              />
            </div>
            <button 
              onClick={() => {
                fetchStatus(selectedDate);
                fetchAdminBookings(selectedDate);
                if (activeTab === 'transactions') { fetchAuditLogs(); fetchWalletTransactions(); }
              }}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 16px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', fontSize: '0.9rem', fontWeight: '600' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <Clock size={16} /> Refresh
            </button>
            <button 
              onClick={onLogout}
              style={{ background: 'none', border: '2px solid rgba(255,255,255,0.3)', color: '#fff', padding: '10px 24px', borderRadius: '30px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', background: '#fcfcfc', padding: '12px 32px', borderBottom: '1px solid #eee', overflowX: 'auto', gap: '8px' }}>
           {tabs.map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)} 
               style={{ 
                 padding: '12px 24px', 
                 color: activeTab === tab.id ? 'var(--accent-primary)' : '#888', 
                 background: activeTab === tab.id ? 'var(--accent-court)' : 'transparent', 
                 borderRadius: '30px', border: 'none', cursor: 'pointer',
                 display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '700', fontSize: '0.95rem',
                 transition: 'all 0.2s'
               }}>
               {tab.icon} {tab.label}
             </button>
           ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'allotment' && <AdminAllotment selectedDate={selectedDate} />}
          {activeTab === 'bookings' && <AdminBookings selectedDate={selectedDate} onActiveUserFilter={(name) => { setUserFilter(name); setActiveTab('users'); }} />}
          {activeTab === 'users' && <AdminUsers initialFilter={userFilter} />}
          {activeTab === 'pricing' && <AdminPricing rates={rates} setRates={setRates} />}
          {activeTab === 'transactions' && (
            <div className="flex-col gap-xl">
              <AdminTransactions transactions={walletTransactions} />
              <div style={{ padding: '24px 0', borderTop: '2px dashed #eee', marginTop: '20px' }}></div>
              <AdminAuditLog auditLogs={auditLogs} />
            </div>
          )}
          {activeTab === 'apiSettings' && <AdminSettings />}
        {/* Footer Version Info */}
        <div style={{ padding: '16px 32px', textAlign: 'right', fontSize: '0.75rem', color: '#ccc' }}>
          Build: CAbgyMVa | API: api/main_api.php (v2.9.3)
        </div>
      </div>
    </div>
  </div>
);
}

export default Admin;
