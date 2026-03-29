/**
 * API Service Layer for Court Booking System
 * Centralizes all fetch calls to the PHP backend.
 */

const BASE_URL = 'api/main_api.php';
const OMISE_TOPUP_URL = import.meta.env.VITE_OMISE_TOPUP_URL || 'api/omise_topup.php';
const OMISE_CHARGE_URL = import.meta.env.VITE_OMISE_CHARGE_URL || 'api/omise_charge.php';

const handleResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
};

export const api = {
  // --- Auth & Profile ---
  login: async (phone) => {
    const res = await fetch(BASE_URL + '?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    return handleResponse(res);
  },

  loginById: async (userId) => {
    const res = await fetch(`${BASE_URL}?action=login_by_id&id=${userId}&t=${Date.now()}`);
    return handleResponse(res);
  },

  register: async (userData) => {
    const res = await fetch(BASE_URL + '?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  getProfile: async (userId) => {
    const res = await fetch(`${BASE_URL}?action=get_profile&user_id=${userId}&t=${Date.now()}`);
    return handleResponse(res);
  },

  // --- Wallet ---
  getWalletBalance: async (userId, phone) => {
    const res = await fetch(BASE_URL + '?action=get_wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, phone })
    });
    return handleResponse(res);
  },

  topupWallet: async (userId, phone, amount) => {
    const res = await fetch(BASE_URL + '?action=topup_wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, phone, amount })
    });
    return handleResponse(res);
  },

  checkTopupStatus: async (chargeId) => {
    const res = await fetch(`${BASE_URL}?action=check_topup_status&charge_id=${chargeId}&t=${Date.now()}`);
    return handleResponse(res);
  },
  
  initiateOmiseTopup: async (userId, amount, type, card = null) => {
    const res = await fetch(OMISE_TOPUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, amount, type, card })
    });
    return handleResponse(res);
  },

  // --- Court & Booking ---
  getCourts: async () => {
    const res = await fetch(`${BASE_URL}?action=get_rates&t=${Date.now()}`);
    return handleResponse(res);
  },

  getAllStatus: async (date) => {
    const res = await fetch(`${BASE_URL}?action=get_all_status&date=${date}&t=${Date.now()}`);
    return handleResponse(res);
  },

  setPending: async (userId, courtId, date, hour, price) => {
    const res = await fetch(BASE_URL + '?action=set_pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, court_id: courtId, date, hour, price })
    });
    return handleResponse(res);
  },

  clearPending: async (courtId, date, hour) => {
    const res = await fetch(BASE_URL + '?action=clear_pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ court_id: courtId, date, hour })
    });
    return handleResponse(res);
  },

  confirmBooking: async (bookingData) => {
    const res = await fetch(BASE_URL + '?action=confirm_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });
    return handleResponse(res);
  },

  toggleAllotment: async (courtId, date, hour) => {
    const res = await fetch(BASE_URL + '?action=toggle_allotment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ court_id: courtId, date, hour })
    });
    return handleResponse(res);
  },

  processWalletPayment: async (paymentData) => {
    const res = await fetch(BASE_URL + '?action=process_payment_wallet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
  },

  // --- History ---
  getUserHistory: async (userId) => {
    const res = await fetch(`${BASE_URL}?action=get_user_history&user_id=${userId}&t=${Date.now()}`);
    return handleResponse(res);
  },

  deleteBooking: async (id) => {
    const res = await fetch(`${BASE_URL}?action=delete_booking&id=${id}`);
    return handleResponse(res);
  },

  // --- Admin ---
  adminLogin: async (email, password) => {
    const res = await fetch(BASE_URL + '?action=admin_login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
  },

  getAdminBookings: async (date) => {
    const res = await fetch(`${BASE_URL}?action=get_admin_bookings&date=${date}`);
    return handleResponse(res);
  },

  updateCourtRate: async (id, rate) => {
    const res = await fetch(BASE_URL + '?action=update_rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rate })
    });
    return handleResponse(res);
  },

  adminDeleteBooking: async (bookingId, password, adminName) => {
    const res = await fetch(BASE_URL + '?action=admin_delete_booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, password, admin_name: adminName })
    });
    return handleResponse(res);
  },

  getAuditLogs: async (date) => {
    // Add cache buster and ensure date is clean
    const t = Date.now();
    const url = date ? `${BASE_URL}?action=get_audit_logs&date=${date}&t=${t}` : `${BASE_URL}?action=get_audit_logs&t=${t}`;
    const res = await fetch(url);
    return handleResponse(res);
  },
  getWalletTransactions: async (date) => {
    const t = Date.now();
    const url = date ? `${BASE_URL}?action=get_wallet_transactions&date=${date}&t=${t}` : `${BASE_URL}?action=get_wallet_transactions&t=${t}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  requestOTP: async (phone, apiSettings) => {
    if (!apiSettings?.otpWebhookUrl) return { success: true, simulated: true };
    
    const res = await fetch(`${apiSettings.otpWebhookUrl}?phone=${encodeURIComponent(phone)}`, { 
      method: apiSettings.otpMethod,
      headers: {
        'X-API-Key': apiSettings.otpApiKey,
        'X-API-Secret': apiSettings.otpApiSecret
      }
    });
    // Webhooks might not return standard JSON or might have CORS issues, 
    // but we try to handle it gracefully for the service pattern.
    return res.ok ? { success: true } : { success: false };
  },

  checkPaymentStatus: async (bookingId, chargeId) => {
    const res = await fetch(`${BASE_URL}?action=check_payment_status&id=${bookingId}&ref=${chargeId}&t=${Date.now()}`);
    return handleResponse(res);
  },

  createOmiseCharge: async (paymentData) => {
    const res = await fetch(OMISE_CHARGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentData)
    });
    return handleResponse(res);
  },
  getVersion: async () => {
    const res = await fetch(`${BASE_URL}?action=version&t=${Date.now()}`);
    return handleResponse(res);
  }
};
