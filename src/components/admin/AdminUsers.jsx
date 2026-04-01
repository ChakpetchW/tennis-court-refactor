import React, { useEffect, useMemo, useState } from 'react'
import { Users, Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react'
import { api } from '../../services/api'

const EMPTY_USER = {
  phone: '',
  name: '',
  nickname: '',
  email: '',
  birthday: '',
  line_id: '',
  location: 'Tennis Court',
}

const FORM_FIELDS = [
  { key: 'phone', label: 'เบอร์โทรศัพท์ *', type: 'tel', placeholder: '0812345678' },
  { key: 'name', label: 'ชื่อ-นามสกุล *', type: 'text', placeholder: 'John Doe' },
  { key: 'nickname', label: 'ชื่อเล่น', type: 'text', placeholder: 'Johnny' },
  { key: 'email', label: 'อีเมล', type: 'email', placeholder: 'john@example.com' },
  { key: 'birthday', label: 'วันเกิด', type: 'text', placeholder: 'YYYY-MM-DD หรือ DD/MM/YYYY' },
  { key: 'line_id', label: 'LINE ID', type: 'text', placeholder: '@lineid' },
  { key: 'location', label: 'สถานที่', type: 'text', placeholder: 'Tennis Court' },
]

const normalizeFormUser = (user = EMPTY_USER) => ({
  phone: user.phone || '',
  name: user.name || '',
  nickname: user.nickname || '',
  email: user.email || '',
  birthday: user.birthday || '',
  line_id: user.line_id || '',
  location: user.location || 'Tennis Court',
})

const formatBirthday = (value) => {
  if (!value) return '-'

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match) {
    const [, year, month, day] = match
    return `${day}/${month}/${year}`
  }

  return value
}

const panelStyle = {
  background: '#f7fbf7',
  border: '1px solid #d6ead8',
  borderRadius: '16px',
  padding: '32px',
  marginBottom: '24px',
}

const textInputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #ddd',
}

const AdminUsers = ({ initialFilter = '' }) => {
  const [users, setUsers] = useState([])
  const [userFilter, setUserFilter] = useState(initialFilter)
  const [activeFormMode, setActiveFormMode] = useState(null)
  const [editUserId, setEditUserId] = useState(null)
  const [formData, setFormData] = useState(EMPTY_USER)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeletePasswordVisible, setIsDeletePasswordVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setUserFilter(initialFilter)
  }, [initialFilter])

  const loadUsers = async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await api.getAdminUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Fetch admin users failed:', error)
      setErrorMessage(error.message || 'ไม่สามารถโหลดรายชื่อสมาชิกได้')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const filteredUsers = useMemo(() => users.filter((user) => {
    if (!userFilter) return true

    const keyword = userFilter.toLowerCase()
    return (
      (user.name || '').toLowerCase().includes(keyword) ||
      (user.phone || '').includes(userFilter)
    )
  }), [userFilter, users])

  const openCreateForm = () => {
    setActiveFormMode('create')
    setEditUserId(null)
    setFormData(EMPTY_USER)
  }

  const openEditForm = (user) => {
    setActiveFormMode('edit')
    setEditUserId(user.id)
    setFormData(normalizeFormUser(user))
  }

  const closeForm = () => {
    setActiveFormMode(null)
    setEditUserId(null)
    setFormData(EMPTY_USER)
  }

  const openDeleteModal = (user) => {
    setDeleteTarget(user)
    setDeletePassword('')
    setIsDeletePasswordVisible(false)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setDeletePassword('')
    setIsDeletePasswordVisible(false)
  }

  const handleSubmitForm = async () => {
    if (!formData.phone || !formData.name) {
      window.alert('กรุณากรอกชื่อและเบอร์โทรศัพท์')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      if (activeFormMode === 'create') {
        const response = await api.adminCreateUser(formData)
        if (response?.user) {
          setUsers((prev) => [response.user, ...prev])
        } else {
          await loadUsers()
        }
      }

      if (activeFormMode === 'edit' && editUserId) {
        const response = await api.adminUpdateUser({ id: editUserId, ...formData })
        if (response?.user) {
          setUsers((prev) => prev.map((user) => (user.id === editUserId ? response.user : user)))
        } else {
          await loadUsers()
        }
      }

      closeForm()
    } catch (error) {
      console.error('Save member failed:', error)
      window.alert(error.message || 'ไม่สามารถบันทึกข้อมูลสมาชิกได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteTarget) return

    if (!deletePassword) {
      window.alert('กรุณากรอกรหัสผ่านแอดมินเพื่อยืนยันการลบ')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await api.adminDeleteUser(deleteTarget.id, deletePassword)
      setUsers((prev) => prev.filter((entry) => entry.id !== deleteTarget.id))
      closeDeleteModal()

      const deletedBookings = Number(response?.deleted_bookings || 0)
      const deletedWalletTransactions = Number(response?.deleted_wallet_transactions || 0)
      window.alert(`ลบสมาชิกเรียบร้อย\nลบประวัติการจอง ${deletedBookings} รายการ\nลบรายการ wallet ${deletedWalletTransactions} รายการ`)
    } catch (error) {
      console.error('Delete member failed:', error)
      window.alert(error.message || 'ไม่สามารถลบสมาชิกได้')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex-col gap-md">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)', margin: 0 }}>
          Member Management ({users.length} registered)
        </h3>
        <button
          className="premium-button"
          style={{ padding: '12px 24px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}
          onClick={openCreateForm}
          disabled={isSubmitting}
        >
          <Plus size={18} /> Add New Member
        </button>
      </div>

      {activeFormMode ? (
        <div style={panelStyle}>
          <div style={{ fontWeight: '800', fontSize: '1.2rem', marginBottom: '20px', color: 'var(--accent-primary)', fontFamily: 'var(--font-heading)' }}>
            {activeFormMode === 'create' ? 'เพิ่มสมาชิกใหม่' : 'แก้ไขข้อมูลสมาชิก'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {FORM_FIELDS.map((field) => (
              <div key={field.key}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#666', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  value={formData[field.key]}
                  onChange={(event) => setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  style={textInputStyle}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="premium-button" style={{ padding: '12px 32px', fontSize: '0.95rem' }} onClick={() => void handleSubmitForm()} disabled={isSubmitting}>
              {isSubmitting ? 'กำลังบันทึก...' : activeFormMode === 'create' ? 'สร้างสมาชิก' : 'บันทึกการแก้ไข'}
            </button>
            <button className="secondary-button" style={{ padding: '12px 24px', fontSize: '0.95rem' }} onClick={closeForm} disabled={isSubmitting}>
              ยกเลิก
            </button>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div
          onClick={closeDeleteModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <form
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              void handleDeleteUser()
            }}
            style={{
              width: 'min(480px, 100%)',
              background: '#fff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 24px 70px rgba(15, 23, 42, 0.18)',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#14532d', fontFamily: 'var(--font-heading)' }}>ยืนยันการลบสมาชิก</h4>
              <button type="button" onClick={closeDeleteModal} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0 0 12px', color: '#374151', lineHeight: 1.65 }}>
              คุณกำลังจะลบสมาชิก <strong>{deleteTarget.name}</strong> และลบข้อมูลที่เกี่ยวข้องทั้งหมดออกจากฐานข้อมูล
            </p>
            <p style={{ margin: '0 0 20px', color: '#b91c1c', fontSize: '0.95rem', lineHeight: 1.65 }}>
              รายการที่ถูกลบจะรวมถึงประวัติการจอง รายการ wallet และ allotments ที่เกี่ยวข้อง การกระทำนี้ย้อนกลับไม่ได้
            </p>

            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#666', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
              รหัสผ่านแอดมิน
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '12px',
                padding: '4px 6px 4px 0',
                background: '#fff',
              }}
            >
              <input
                type={isDeletePasswordVisible ? 'text' : 'password'}
                placeholder="กรอกรหัสผ่านแอดมิน"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                autoFocus
                autoComplete="current-password"
                spellCheck={false}
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  minWidth: 0,
                }}
              />
              <button
                type="button"
                onClick={() => setIsDeletePasswordVisible((prev) => !prev)}
                aria-label={isDeletePasswordVisible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: 'none',
                  background: '#f0fdf4',
                  color: '#166534',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  whiteSpace: 'nowrap',
                }}
              >
                {isDeletePasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                {isDeletePasswordVisible ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
            <p style={{ margin: '0 0 18px', color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.6 }}>
              ถ้าพิมพ์แล้วรหัสดูแปลก ให้กดปุ่มแสดงเพื่อตรวจสอบว่าคีย์บอร์ดอยู่ภาษาไทยหรืออังกฤษ
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <button type="button" onClick={closeDeleteModal} className="secondary-button" style={{ padding: '10px 18px' }} disabled={isSubmitting}>
                ยกเลิก
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 18px',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#b91c1c',
                  color: '#fff',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'กำลังลบ...' : 'ลบสมาชิก'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {errorMessage ? (
        <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', color: '#c53030', padding: '12px 14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600' }}>
          {errorMessage}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', background: '#fcfcfc', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
        <Users size={20} color="#888" />
        <input
          type="text"
          placeholder="ค้นหาสมาชิกด้วยชื่อหรือเบอร์โทร"
          value={userFilter}
          onChange={(event) => setUserFilter(event.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
        />
        {userFilter ? (
          <button
            onClick={() => setUserFilter('')}
            style={{ padding: '12px 24px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700' }}
          >
            ล้าง
          </button>
        ) : null}
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
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>LINE ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>วันเกิด</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>สถานที่</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '2px solid #ddd', minWidth: '110px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>กำลังโหลดรายชื่อสมาชิก...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>ไม่พบสมาชิกที่ค้นหา</td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id || index} style={{ borderBottom: '1px solid #eee', background: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '12px 16px', color: '#999' }}>{index + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1a1a3a' }}>{user.name}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{user.phone}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{user.email || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{user.nickname || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{user.line_id || '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{formatBirthday(user.birthday)}</td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>{user.location || '-'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        title="แก้ไข"
                        style={{ padding: '6px 10px', background: '#ebf8ff', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#2b6cb0' }}
                        onClick={() => openEditForm(user)}
                        disabled={isSubmitting}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        title="ลบ"
                        style={{
                          padding: '6px 10px',
                          background: '#fff5f5',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#e53e3e',
                        }}
                        onClick={() => openDeleteModal(user)}
                        disabled={isSubmitting}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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

export default AdminUsers
