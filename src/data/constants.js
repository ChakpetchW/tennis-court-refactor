/**
 * Constants and Initial State for Court Booking System
 */

export const INITIAL_COURTS = [
  { id: 1, name: 'North-1', type: 'Badminton', orientation: 'v', pos: { x: 80, y: 15 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, pendingBy: null })) },
  { id: 2, name: 'North-2', type: 'Badminton', orientation: 'v', pos: { x: 50, y: 15 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, pendingBy: null })) },
  { id: 3, name: 'North-3', type: 'Badminton', orientation: 'v', pos: { x: 20, y: 15 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, pendingBy: null })) },
  { id: 4, name: 'Center-1', type: 'Badminton', orientation: 'v', pos: { x: 80, y: 48 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, pendingBy: null })) },
  { id: 5, name: 'Center-2', type: 'Tennis', orientation: 'h', pos: { x: 35, y: 48 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, pendingBy: null })) },
  { id: 6, name: 'South-1', type: 'Badminton', orientation: 'v', pos: { x: 80, y: 80 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, MapPin: null })) },
  { id: 7, name: 'South-2', type: 'Badminton', orientation: 'v', pos: { x: 50, y: 80 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, MapPin: null })) },
  { id: 8, name: 'South-3', type: 'Badminton', orientation: 'v', pos: { x: 20, y: 80 }, allotment: Array(18).fill(null).map(() => ({ isOpen: true, bookedBy: null, MapPin: null })) },
];

export const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

export const MOCKED_DB = [
  { id: 1, phone: '081-234-5678', name: 'จักรเพชร วิวัฒน์ชาติสุคนธ์', nickname: 'Aof', email: 'test@booking.co.th', birthday: '1995-01-01', isRegistered: true }
];
