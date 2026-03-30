/**
 * API Service Layer for Court Booking System
 * Centralizes all fetch calls to the PHP backend.
 */

const BASE_URL = 'api/main_api.php'
const OMISE_TOPUP_URL = import.meta.env.VITE_OMISE_TOPUP_URL || 'api/omise_topup.php'
const OMISE_CHARGE_URL = import.meta.env.VITE_OMISE_CHARGE_URL || 'api/omise_charge.php'

const request = (url, options = {}) =>
  fetch(url, {
    credentials: 'same-origin',
    ...options,
  })

const handleResponse = async (response) => {
  let data = null

  try {
    data = await response.json()
  } catch {
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `API Error: ${response.statusText}`)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

const postJson = (url, payload) =>
  request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

export const api = {
  login: async (phone) => handleResponse(await postJson(`${BASE_URL}?action=login`, { phone })),

  loginById: async (userId) =>
    handleResponse(await request(`${BASE_URL}?action=login_by_id&id=${userId}&t=${Date.now()}`)),

  register: async (userData) =>
    handleResponse(await postJson(`${BASE_URL}?action=register`, userData)),

  getProfile: async (userId) =>
    handleResponse(await request(`${BASE_URL}?action=get_profile&user_id=${userId}&t=${Date.now()}`)),

  getWalletBalance: async (userId, phone) =>
    handleResponse(await postJson(`${BASE_URL}?action=get_wallet`, { user_id: userId, phone })),

  topupWallet: async (userId, phone, amount) =>
    handleResponse(await postJson(`${BASE_URL}?action=topup_wallet`, { user_id: userId, phone, amount })),

  checkTopupStatus: async (chargeId) =>
    handleResponse(await request(`${BASE_URL}?action=check_topup_status&charge_id=${chargeId}&t=${Date.now()}`)),

  initiateOmiseTopup: async (userId, amount, type, card = null) =>
    handleResponse(
      await postJson(OMISE_TOPUP_URL, { user_id: userId, amount, type, card }),
    ),

  getCourts: async () => handleResponse(await request(`${BASE_URL}?action=get_rates&t=${Date.now()}`)),

  getAllStatus: async (date) =>
    handleResponse(await request(`${BASE_URL}?action=get_all_status&date=${date}&t=${Date.now()}`)),

  setPending: async (userId, courtId, date, hour, price) =>
    handleResponse(
      await postJson(`${BASE_URL}?action=set_pending`, { user_id: userId, court_id: courtId, date, hour, price }),
    ),

  clearPending: async (courtId, date, hour) =>
    handleResponse(await postJson(`${BASE_URL}?action=clear_pending`, { court_id: courtId, date, hour })),

  confirmBooking: async (bookingData) =>
    handleResponse(await postJson(`${BASE_URL}?action=confirm_booking`, bookingData)),

  toggleAllotment: async (courtId, date, hour) =>
    handleResponse(await postJson(`${BASE_URL}?action=toggle_allotment`, { court_id: courtId, date, hour })),

  processWalletPayment: async (paymentData) =>
    handleResponse(await postJson(`${BASE_URL}?action=process_payment_wallet`, paymentData)),

  getUserHistory: async (userId) =>
    handleResponse(await request(`${BASE_URL}?action=get_user_history&user_id=${userId}&t=${Date.now()}`)),

  deleteBooking: async (id) =>
    handleResponse(await request(`${BASE_URL}?action=delete_booking&id=${id}`)),

  adminLogin: async (email, password) =>
    handleResponse(await postJson(`${BASE_URL}?action=admin_login`, { email, password })),

  getAdminSession: async () =>
    handleResponse(await request(`${BASE_URL}?action=admin_session&t=${Date.now()}`)),

  adminLogout: async () =>
    handleResponse(await postJson(`${BASE_URL}?action=admin_logout`, {})),

  clearOpcache: async () =>
    handleResponse(await postJson(`${BASE_URL}?action=clear_opcache`, {})),

  getMailLogs: async () =>
    handleResponse(await request(`${BASE_URL}?action=get_mail_logs&t=${Date.now()}`)),

  getAdminBookings: async (date) =>
    handleResponse(await request(`${BASE_URL}?action=get_admin_bookings&date=${date}&t=${Date.now()}`)),

  updateCourtRate: async (id, rate) =>
    handleResponse(await postJson(`${BASE_URL}?action=update_rate`, { id, rate })),

  adminDeleteBooking: async (bookingId) =>
    handleResponse(await postJson(`${BASE_URL}?action=admin_delete_booking`, { booking_id: bookingId })),

  adminCancelBooking: async (bookingId, reason) =>
    handleResponse(await postJson(`${BASE_URL}?action=admin_cancel_booking`, { booking_id: bookingId, reason })),

  getAuditLogs: async (date) => {
    const timestamp = Date.now()
    const url = date
      ? `${BASE_URL}?action=get_audit_logs&date=${date}&t=${timestamp}`
      : `${BASE_URL}?action=get_audit_logs&t=${timestamp}`
    return handleResponse(await request(url))
  },

  getWalletTransactions: async (date) => {
    const timestamp = Date.now()
    const url = date
      ? `${BASE_URL}?action=get_wallet_transactions&date=${date}&t=${timestamp}`
      : `${BASE_URL}?action=get_wallet_transactions&t=${timestamp}`
    return handleResponse(await request(url))
  },

  getSalesReport: async ({ period = 'current_month', month = '' } = {}) => {
    const params = new URLSearchParams({
      action: 'get_sales_report',
      period,
      t: String(Date.now()),
    })

    if (month) {
      params.set('month', month)
    }

    return handleResponse(await request(`${BASE_URL}?${params.toString()}`))
  },

  requestOTP: async (phone) =>
    handleResponse(await postJson(`${BASE_URL}?action=request_otp`, { phone })),

  verifyOTP: async (phone, pin) =>
    handleResponse(await postJson(`${BASE_URL}?action=verify_otp`, { phone, pin })),

  checkPaymentStatus: async (bookingId, chargeId) =>
    handleResponse(await request(`${BASE_URL}?action=check_payment_status&id=${bookingId}&ref=${chargeId}&t=${Date.now()}`)),

  createOmiseCharge: async (paymentData) =>
    handleResponse(await postJson(OMISE_CHARGE_URL, paymentData)),

  getVersion: async () =>
    handleResponse(await request(`${BASE_URL}?action=version&t=${Date.now()}`)),
}
