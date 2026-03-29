import React, { useState } from 'react'
import { Users, Plus, Pencil, Trash2, X, Check } from 'lucide-react'
import { useApp } from '../../hooks/useApp'

const AdminUsers = ({ initialFilter = '' }) => {
  const { mockDatabase: users, updateUserDB: onUpdateUsers } = useApp()
  const [userFilter, setUserFilter] = useState(initialFilter)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ phone: '', name: '', nickname: '', email: '', birthday: '' })

  const filtered = users.filter(u => 
    !userFilter || 
    u.name.toLowerCase().includes(userFilter.toLowerCase()) || 
    u.phone.includes(userFilter)
  )

  return (
    <div className="flex-col gap-md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>Member Management ({users.length} registered)</h3>
        <button
          className="premium-button"
          style={{ padding: '12px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}
          onClick={() => { setShowAddUser(true); setNewUser({ phone: '', name: '', nickname: '', email: '', birthday: '' }) }}
        >
          <Plus size={18} /> Add New Member
        </button>
      </div>

      {showAddUser && (
        <div style={{ background: '#f0fff4', border: '1px solid #b2f5ea', borderRadius: '16px', padding: '32px', marginBottom: '24px' }}>
          <div style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>Registration: New Member</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {[
              { key: 'phone', label: 'Phone Number *', type: 'tel', placeholder: '0812345678' },
              { key: 'name', label: 'Full Name *', type: 'text', placeholder: 'John Doe' },
              { key: 'nickname', label: 'Nickname', type: 'text', placeholder: 'Johnny' },
              { key: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com' },
              { key: 'birthday', label: 'Date of Birth', type: 'text', placeholder: 'DD/MM/YYYY' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#666', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={newUser[f.key]} onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="premium-button" style={{ padding: '12px 32px', fontSize: '0.95rem' }} onClick={() => {
              if (!newUser.phone || !newUser.name) { alert('Please enter phone and name'); return }
              const u = { ...newUser, id: Date.now(), isRegistered: true }
              onUpdateUsers(prev => [...prev.filter(x => x.phone !== u.phone), u])
              setShowAddUser(false)
            }}>Create Member</button>
            <button className="secondary-button" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={() => setShowAddUser(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', background: '#fcfcfc', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
        <Users size={20} color="#888" />
        <input 
          type="text" 
          placeholder="Search members by name or phone..." 
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
        />
        {userFilter && (
          <button 
            onClick={() => setUserFilter('')}
            style={{ padding: '12px 24px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700' }}
          >
            Clear
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f0f2f5' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>#</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ชื่อ-นามสกุล</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>เบอร์โทรศัพท์</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>ชื่อเล่น</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #ddd', minWidth: '110px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>ไม่พบสมาชิกที่ค้นหา</td></tr>
            ) : (
              filtered.map((u, i) => (
                <tr key={u.id || i} style={{ borderBottom: '1px solid #eee', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                {editingUserId === (u.id || u.phone) ? (
                  <>
                    <td style={{ padding: '10px 16px', color: '#999' }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px' }}><input value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', minWidth: '160px' }} /></td>
                    <td style={{ padding: '8px 12px' }}><input value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} style={{ width: '100%', minWidth: '130px' }} /></td>
                    <td style={{ padding: '8px 12px' }}><input value={editForm.email || ''} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', minWidth: '160px' }} /></td>
                    <td style={{ padding: '8px 12px' }}><input value={editForm.nickname || ''} onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))} style={{ width: '100%', minWidth: '100px' }} /></td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button title="บันทึก" style={{ padding: '6px 10px', background: '#e6fffa', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#2c7a7b' }}
                          onClick={() => {
                            onUpdateUsers(prev => prev.map(x => (x.id || x.phone) === (u.id || u.phone) ? { ...x, ...editForm } : x))
                            setEditingUserId(null)
                          }}><Check size={14} /></button>
                        <button title="ยกเลิก" style={{ padding: '6px 10px', background: '#fff5f5', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#e53e3e' }}
                          onClick={() => setEditingUserId(null)}><X size={14} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td style={{ padding: '12px 16px', color: '#999' }}>{i + 1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1a1a3a' }}>{u.name}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{u.phone}</td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{u.email || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#555' }}>{u.nickname || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button title="แก้ไข" style={{ padding: '6px 10px', background: '#ebf8ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#2b6cb0' }}
                          onClick={() => { setEditingUserId(u.id || u.phone); setEditForm({ name: u.name, phone: u.phone, email: u.email || '', nickname: u.nickname || '' }) }}>
                          <Pencil size={13} />
                        </button>
                        <button title="ลบ" style={{ padding: '6px 10px', background: '#fff5f5', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#e53e3e' }}
                          onClick={() => { if (window.confirm(`ลบ ${u.name}?`)) onUpdateUsers(prev => prev.filter(x => (x.id || x.phone) !== (u.id || u.phone))) }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
  )
}

export default AdminUsers
