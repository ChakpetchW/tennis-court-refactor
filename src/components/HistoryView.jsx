import React, { useState, useEffect } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

const HistoryView = ({ onBack }) => {
  const { userHistory } = useApp()
  const [currentPage, setCurrentPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const months = [
    { value: 'all', label: 'ทุกเดือน' },
    { value: '01', label: 'มกราคม' },
    { value: '02', label: 'กุมภาพันธ์' },
    { value: '03', label: 'มีนาคม' },
    { value: '04', label: 'เมษายน' },
    { value: '05', label: 'พฤษภาคม' },
    { value: '06', label: 'มิถุนายน' },
    { value: '07', label: 'กรกฎาคม' },
    { value: '08', label: 'สิงหาคม' },
    { value: '09', label: 'กันยายน' },
    { value: '10', label: 'ตุลาคม' },
    { value: '11', label: 'พฤศจิกายน' },
    { value: '12', label: 'ธันวาคม' }
  ];

  // Filtering
  const filteredRecords = (userHistory || []).filter(b => {
    const bDate = b.booking_date || b.date;
    if (!bDate) return true;
    const [y, m] = bDate.split('-');
    
    const matchesMonth = monthFilter === 'all' || m === monthFilter;
    const matchesYear = y === yearFilter.toString();
    
    return matchesMonth && matchesYear;
  });

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const currentRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 if filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [monthFilter, yearFilter]);

  return (
    <div className="container fade-in" style={{ maxWidth: '700px', paddingBottom: '100px' }}>
      <div className="glass-card flex-col gap-md" style={{ background: '#fff', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#1a5928', fontFamily: 'var(--font-heading)', margin: 0 }}>ประวัติการจอง</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select 
              value={monthFilter} 
              onChange={(e) => setMonthFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem' }}
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select 
              value={yearFilter} 
              onChange={(e) => setYearFilter(Number(e.target.value))}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #eee', fontSize: '0.85rem' }}
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {currentRecords.length === 0 ? (
          <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '0.9rem', flexDirection: 'column', gap: '8px', background: '#f9f9f9', borderRadius: '16px' }}>
            <span style={{ fontSize: '3rem' }}>📋</span>
            ไม่พบประวัติการจองในช่วงเวลานี้
          </div>
        ) : (
          <>
            <div className="flex-col gap-md">
              {currentRecords.map((b, i) => (
                <div key={i} className="glass-card" style={{ background: '#f8fffe', border: '1px solid #e0f2f1', padding: '20px', borderRadius: '16px', transition: 'transform 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="flex-col gap-xs">
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1a1a3a' }}>{b.court_name || b.court}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: '600' }}>{b.venue_name || 'Tennis Court'}</div>
                      <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} /> {b.booking_date || b.date} · {b.booking_time || b.time}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> ชำระเมื่อ: {b.created_at ? new Date(b.created_at).toLocaleString('th-TH') : (b.paidAt || '-')}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px', fontFamily: 'monospace' }}>#{b.transaction_ref ? b.transaction_ref.substring(0, 12) : (b.bookingNo || b.id)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ 
                        background: b.status === 'Paid' ? '#e6fffa' : (b.status === 'Cancelled' ? '#fff5f5' : '#fffbea'), 
                        color: b.status === 'Paid' ? '#2c7a7b' : (b.status === 'Cancelled' ? '#c53030' : '#b7791f'), 
                        padding: '6px 14px', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: '800' 
                      }}>
                        {b.status === 'Paid' ? 'ชำระแล้ว' : (b.status === 'Cancelled' ? 'ยกเลิกแล้ว' : 'รอชำระเงิน')}
                      </span>
                      <div style={{ marginTop: '12px', fontWeight: '900', color: b.status === 'Paid' ? '#00b894' : '#555', fontSize: '1.2rem' }}>฿{Math.floor(Number(b.price || 500)).toLocaleString('th-TH')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  style={{ background: 'none', border: 'none', cursor: currentPage === 1 ? 'default' : 'pointer', color: currentPage === 1 ? '#ccc' : '#1a5928' }}
                >
                  <ChevronLeft size={24} />
                </button>
                <div style={{ fontSize: '1rem', fontWeight: '700', color: '#1a5928' }}>
                  หน้า {currentPage} จาก {totalPages}
                </div>
                <button 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  style={{ background: 'none', border: 'none', cursor: currentPage === totalPages ? 'default' : 'pointer', color: currentPage === totalPages ? '#ccc' : '#1a5928' }}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        )}
        
        <button onClick={onBack} className="premium-button" style={{ marginTop: '20px', background: '#1a5928' }}>กลับหน้าหลัก</button>
      </div>
    </div>
  );
}

export default HistoryView
