import React, { useState } from 'react'
import { Save, Check } from 'lucide-react'
import { api } from '../../services/api'

const AdminPricing = ({ rates, setRates }) => {
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)

  const updateRate = async (id, rate) => {
    setSavingId(id)
    try {
      await api.updateCourtRate(id, rate)
      setSavingId(null)
      setSavedId(id)
      setTimeout(() => setSavedId(null), 2000)
    } catch (err) { 
      console.error('Update rate error:', err)
      setSavingId(null) 
    }
  }

  return (
    <div className="flex-col gap-md">
      <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', marginBottom: '24px' }}>Venue Rate Configuration</h3>
      {rates.map(court => (
        <div key={court.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 32px', background: '#f8f9fa', borderRadius: '16px', border: '1px solid #eee', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent-court)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                {court.type === 'Tennis' ? '🎾' : '🏸'}
             </div>
             <div>
                <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1a1a3a' }}>{court.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{court.type} Court</div>
             </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <input 
               type="number" 
               value={Math.floor(Number(court.rate) || 0)} 
               onChange={(e) => setRates(prev => prev.map(r => r.id === court.id ? { ...r, rate: e.target.value } : r))}
               style={{ width: '100px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', textAlign: 'right', fontWeight: '700', fontSize: '1.1rem' }} 
             />
             <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>THB / HR</span>
             <button 
               onClick={() => updateRate(court.id, court.rate)}
               disabled={savingId === court.id}
               style={{ 
                 background: savedId === court.id ? '#00b894' : 'var(--accent-primary)', 
                 color: '#fff', 
                 border: 'none', 
                 borderRadius: '8px', 
                 padding: '10px 16px', 
                 cursor: 'pointer', 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: '8px', 
                 fontSize: '0.9rem', 
                 fontWeight: '700',
                 transition: 'all 0.2s',
                 width: '120px',
                 justifyContent: 'center'
               }}
             >
               {savingId === court.id ? 'Saving...' : savedId === court.id ? <><Check size={16} /> Saved!</> : <><Save size={16} /> Save</>}
             </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default AdminPricing
