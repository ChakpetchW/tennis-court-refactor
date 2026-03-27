import React, { useState, useEffect } from 'react'
import { ChevronLeft, Calendar, DollarSign, List, ShieldCheck, ClipboardList, Users } from 'lucide-react'
import { api } from '../services/api'

// Context
import { useApp } from '../context/AppContext'

// Sub-components
import AdminAllotment from '../components/admin/AdminAllotment'
import AdminBookings from '../components/admin/AdminBookings'
import AdminUsers from '../components/admin/AdminUsers'
import AdminPricing from '../components/admin/AdminPricing'
import AdminAuditLog from '../components/admin/AdminAuditLog'
import AdminSettings from '../components/admin/AdminSettings'

const Admin = ({ onBack, onLogout }) => {
  const { 
    courts, setCourts, fetchStatus, 
    bookingHistory, fetchAdminBookings,
    mockDatabase, updateUserDB, 
    apiSettings, setApiSettings
  } = useApp()

  const [activeTab, setActiveTab] = useState('allotment')
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [userFilter, setUserFilter] = useState('')
  const [rates, setRates] = useState([])
  const [auditLogs, setAuditLogs] = useState([])

  // 1. Data Refresh logic
  const fetchRates = async () => {
    try {
      const data = await api.getCourts()
      if (Array.isArray(data)) setRates(data)
    } catch (err) { console.error('Fetch rates error:', err) }
  }

  const fetchAuditLogs = async () => {
    try {
      const data = await api.getAuditLogs()
      if (Array.isArray(data)) setAuditLogs(data)
    } catch (err) { console.error('Fetch logs error:', err) }
  }

  useEffect(() => {
    if (fetchStatus) fetchStatus(selectedDate)
    if (fetchAdminBookings) fetchAdminBookings(selectedDate)
    if (activeTab === 'pricing') fetchRates()
    if (activeTab === 'transactions') fetchAuditLogs()
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
    <div className="container fade-in" style={{ maxWidth: '1200px' }}>
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
          {activeTab === 'transactions' && <AdminAuditLog auditLogs={auditLogs} />}
          {activeTab === 'apiSettings' && <AdminSettings />}
        </div>
      </div>
    </div>
  )
}

export default Admin
