import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, FileSpreadsheet, PieChart, RefreshCw, TrendingUp, Wallet } from 'lucide-react'
import { api } from '../../services/api'
import AdminMonthPicker from './AdminMonthPicker'

const getCurrentMonthValue = () => new Date().toLocaleDateString('sv-SE').slice(0, 7)

const COURT_CHART_COLORS = ['#1f6b2d', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6', '#ec4899', '#0f766e']

const FALLBACK_CHART_COLORS = ['#1f6b2d', '#2563eb', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6']
const ITEMS_PER_PAGE = 15

const formatMoney = (value) =>
  `฿${Number(value || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatPaymentLabel = (provider) => {
  const normalized = (provider || '').toString().trim().toLowerCase()

  if (normalized === 'wallet') return 'Wallet'
  if (normalized === 'card' || normalized === 'credit') return 'Card'
  if (normalized === 'promptpay' || normalized === 'qr') return 'PromptPay'
  if (normalized === 'omise') return 'Omise'
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Unknown'
}

const formatCourtLabel = (courtName) => {
  const normalized = (courtName || '').toString().trim()
  return normalized || 'Unknown Court'
}

const getStatusTone = (booking) => {
  const status = (booking.status || '').toString().trim().toLowerCase()

  if (status === 'cancelled') {
    return { label: 'Cancelled', background: '#fff5f5', color: '#c53030' }
  }

  if (status === 'pending') {
    return { label: 'Pending', background: '#fff9db', color: '#b7791f' }
  }

  return { label: 'Paid', background: '#e6fffa', color: '#2c7a7b' }
}

const getWalletTopupStatusTone = (status) => {
  const normalized = (status || '').toString().trim().toLowerCase()

  if (normalized === 'cancelled') {
    return { label: 'Cancelled', background: '#fff5f5', color: '#c53030' }
  }

  if (normalized === 'pending') {
    return { label: 'Pending', background: '#fff9db', color: '#b7791f' }
  }

  return { label: 'Success', background: '#e6fffa', color: '#2c7a7b' }
}

const escapeCsv = (value) => {
  const stringValue = String(value ?? '')
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

const describePieSlice = (centerX, centerY, radius, startAngle, endAngle) => {
  const adjustedEndAngle = endAngle - 0.0001
  const start = polarToCartesian(centerX, centerY, radius, adjustedEndAngle)
  const end = polarToCartesian(centerX, centerY, radius, startAngle)
  const largeArcFlag = adjustedEndAngle - startAngle <= 180 ? '0' : '1'

  return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`
}

const ReportPagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null

  return (
    <div className="admin-report-pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Previous
      </button>
      <span>
        Page {page} / {totalPages}
      </span>
      <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  )
}

const CourtPerformancePieChart = ({ data }) => {
  const [activeCourt, setActiveCourt] = useState(null)
  const [hoverTooltip, setHoverTooltip] = useState(null)
  const totalRevenue = data.reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
  const totalBookings = data.reduce((sum, item) => sum + Number(item.booking_count || 0), 0)

  const segments = useMemo(() => {
    let currentPercentage = 0

    return data
      .map((item, index) => {
        const amount = Number(item.total_amount || 0)
        const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
        const segment = {
          ...item,
          court_name: formatCourtLabel(item.court_name),
          color: COURT_CHART_COLORS[index % COURT_CHART_COLORS.length],
          percentage,
          start: currentPercentage,
          end: currentPercentage + percentage,
          startAngle: (currentPercentage / 100) * 360,
          endAngle: ((currentPercentage + percentage) / 100) * 360,
        }
        currentPercentage += percentage
        return segment
      })
      .filter((segment) => segment.percentage > 0)
  }, [data, totalRevenue])

  const highlighted = activeCourt || segments[0] || null
  const handleSliceMove = (event, segment) => {
    const svg = event.currentTarget.ownerSVGElement
    const rect = svg?.getBoundingClientRect()

    if (!rect) return

    setActiveCourt(segment)
    setHoverTooltip({
      segment,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  return (
    <div className="admin-report-donut-layout">
      <div className="admin-report-donut-canvas">
        <div className="admin-report-pie-shell">
          <div className="admin-report-pie-surface">
            <div className="admin-report-pie-art">
              <svg
                viewBox="0 0 320 320"
                className="admin-report-pie-svg"
                onMouseLeave={() => {
                  setHoverTooltip(null)
                  setActiveCourt(null)
                }}
              >
                <defs>
                  <filter id="pieShadow">
                    <feDropShadow dx="0" dy="18" stdDeviation="14" floodOpacity="0.16" />
                  </filter>
                </defs>

                <circle cx="160" cy="160" r="132" fill="#eef5ef" />

                {segments.length === 1 ? (
                  <circle
                    cx="160"
                    cy="160"
                    r="132"
                    fill={segments[0].color}
                    filter="url(#pieShadow)"
                    onMouseEnter={(event) => handleSliceMove(event, segments[0])}
                    onMouseMove={(event) => handleSliceMove(event, segments[0])}
                  />
                ) : (
                  segments.map((segment) => {
                    const isActive = activeCourt?.court_name === segment.court_name
                    const midAngle = (segment.startAngle + segment.endAngle) / 2
                    const offset = isActive ? polarToCartesian(0, 0, 6, midAngle) : { x: 0, y: 0 }

                    return (
                      <path
                        key={segment.court_name}
                        d={describePieSlice(160, 160, 132, segment.startAngle, segment.endAngle)}
                        fill={segment.color}
                        filter="url(#pieShadow)"
                        transform={`translate(${offset.x} ${offset.y})`}
                        style={{ cursor: 'pointer', transition: 'transform 0.16s ease, opacity 0.16s ease' }}
                        opacity={activeCourt && !isActive ? 0.88 : 1}
                        onMouseEnter={(event) => handleSliceMove(event, segment)}
                        onMouseMove={(event) => handleSliceMove(event, segment)}
                      />
                    )
                  })
                )}

                <circle cx="160" cy="160" r="24" fill="rgba(255,255,255,0.35)" pointerEvents="none" />
              </svg>

              <div className="admin-report-pie-sheen" />
            </div>

            {hoverTooltip?.segment ? (
              <div
                className="admin-report-floating-tooltip"
                style={{
                  left: `${hoverTooltip.x}px`,
                  top: `${hoverTooltip.y}px`,
                }}
              >
                <div className="admin-report-tooltip-title">{hoverTooltip.segment.court_name}</div>
                <div className="admin-report-tooltip-row">
                  <span>Revenue</span>
                  <strong>{formatMoney(hoverTooltip.segment.total_amount)}</strong>
                </div>
                <div className="admin-report-tooltip-row">
                  <span>Bookings</span>
                  <strong>{Number(hoverTooltip.segment.booking_count || 0).toLocaleString('th-TH')}</strong>
                </div>
                <div className="admin-report-tooltip-row">
                  <span>Share</span>
                  <strong>{hoverTooltip.segment.percentage.toFixed(1)}%</strong>
                </div>
              </div>
            ) : null}
          </div>

          <div className="admin-report-tooltip-card admin-report-pie-summary">
            <div className="admin-report-tooltip-title">Revenue by Court (สัดส่วนรายได้)</div>
            <div className="admin-report-tooltip-row">
              <span>Total Paid (ยอดรวมชำระเงิน)</span>
              <strong>{formatMoney(totalRevenue)}</strong>
            </div>
            <div className="admin-report-tooltip-row">
              <span>Paid Bookings</span>
              <strong>{Number(totalBookings || 0).toLocaleString('th-TH')} ครั้ง</strong>
            </div>
            <div className="admin-report-tooltip-row">
              <span>Basis</span>
              <strong>Distribution of total court earnings.</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-report-legend">
        {segments.length > 0 ? (
          segments.map((segment) => (
            <button
              key={segment.court_name}
              type="button"
              className={`admin-report-legend-item${activeCourt?.court_name === segment.court_name ? ' active' : ''}`}
              onMouseEnter={() => setActiveCourt(segment)}
              onMouseLeave={() => setActiveCourt(null)}
            >
              <span
                className="admin-report-legend-dot"
                style={{ background: segment.color, boxShadow: `0 0 0 5px ${segment.color}18` }}
              />
              <div className="admin-report-legend-copy">
                <div className="admin-report-legend-title">{segment.court_name}</div>
                <div className="admin-report-subtle">
                  {Number(segment.booking_count || 0).toLocaleString('th-TH')} bookings
                </div>
              </div>
              <div className="admin-report-legend-metric">
                <div className="admin-report-legend-value">{formatMoney(segment.total_amount)}</div>
                <div className="admin-report-subtle">{segment.percentage.toFixed(1)}%</div>
              </div>
            </button>
          ))
        ) : (
          <div className="admin-report-empty">No paid court bookings for this month.</div>
        )}

        {highlighted ? (
          <div className="admin-report-tooltip-card">
            <div className="admin-report-tooltip-title">{highlighted.court_name}</div>
            <div className="admin-report-tooltip-row">
              <span>Revenue</span>
              <strong>{formatMoney(highlighted.total_amount)}</strong>
            </div>
            <div className="admin-report-tooltip-row">
              <span>Bookings</span>
              <strong>{Number(highlighted.booking_count || 0).toLocaleString('th-TH')}</strong>
            </div>
            <div className="admin-report-tooltip-row">
              <span>Share</span>
              <strong>{highlighted.percentage.toFixed(1)}%</strong>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const DailyRevenueChart = ({ data, metric, onMetricChange }) => {
  const [activeDayKey, setActiveDayKey] = useState(null)

  const bars = useMemo(
    () =>
      data.map((item, index) => {
        let value = Number(item.net_revenue || 0)
        if (metric === 'bookings') value = Number(item.paid_bookings || 0)
        if (metric === 'wallet') value = Number(item.wallet_topup_total || 0)
        return {
          ...item,
          color: FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length],
          value,
        }
      }),
    [data, metric],
  )

  const maxValue = Math.max(...bars.map((item) => item.value), 0)
  const activeBar = bars.find((item) => item.day_key === activeDayKey) || bars[bars.length - 1] || null

  return (
    <div className="admin-report-chart-wrap">
      <div className="admin-report-chart-head">
        <div className="admin-report-metric-toggle">
          <button
            type="button"
            className={metric === 'revenue' ? 'active' : ''}
            onClick={() => onMetricChange('revenue')}
          >
            Revenue
          </button>
          <button
            type="button"
            className={metric === 'bookings' ? 'active' : ''}
            onClick={() => onMetricChange('bookings')}
          >
            Bookings
          </button>
          <button
            type="button"
            className={metric === 'wallet' ? 'active' : ''}
            onClick={() => onMetricChange('wallet')}
          >
            Wallet
          </button>
        </div>

        {activeBar ? (
          <div className="admin-report-tooltip-card compact">
            <div className="admin-report-tooltip-title">{activeBar.day_label}</div>
            <div className="admin-report-tooltip-row">
              <span>{metric === 'bookings' ? 'Bookings' : metric === 'wallet' ? 'Wallet Top-up' : 'Net Revenue'}</span>
              <strong>{metric === 'bookings' ? Number(activeBar.value).toLocaleString('th-TH') : formatMoney(activeBar.value)}</strong>
            </div>
            {metric === 'wallet' ? (
              <div className="admin-report-tooltip-row">
                <span>Transactions</span>
                <strong>{Number(activeBar.wallet_topup_count || 0).toLocaleString('th-TH')}</strong>
              </div>
            ) : (
              <div className="admin-report-tooltip-row">
                <span>Gross</span>
                <strong>{formatMoney(activeBar.gross_revenue)}</strong>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="admin-report-bar-scroll">
        <div
          className="admin-report-bar-grid"
          style={{ gridTemplateColumns: `repeat(${Math.max(bars.length, 1)}, minmax(34px, 1fr))` }}
        >
          {bars.length > 0 ? (
            bars.map((item) => {
              const heightPercent = maxValue > 0 ? (item.value / maxValue) * 100 : 0

              return (
                <button
                  key={item.day_key}
                  type="button"
                  className={`admin-report-bar-column${activeDayKey === item.day_key ? ' active' : ''}`}
                  onMouseEnter={() => setActiveDayKey(item.day_key)}
                  onMouseLeave={() => setActiveDayKey(null)}
                >
                  <div className="admin-report-bar-value">
                    {item.value > 0
                      ? metric === 'bookings'
                        ? Number(item.value).toLocaleString('th-TH')
                        : `฿${Math.round(item.value).toLocaleString('th-TH')}`
                      : ''}
                  </div>
                  <div className="admin-report-bar-track">
                    <div
                      className="admin-report-bar-fill"
                      style={{
                        height: `${Math.max(heightPercent, item.value > 0 ? 10 : 0)}%`,
                        minHeight: item.value > 0 ? '10px' : '2px',
                        background: `linear-gradient(180deg, ${item.color} 0%, color-mix(in srgb, ${item.color} 78%, #ffffff 22%) 100%)`,
                        boxShadow: `0 16px 24px ${item.color}2a`,
                      }}
                    />
                  </div>
                  <div className="admin-report-bar-label">{item.day_label}</div>
                </button>
              )
            })
          ) : (
            <div className="admin-report-empty" style={{ gridColumn: '1 / -1', paddingTop: '90px' }}>
              No daily sales data for this month.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const AdminSalesReport = () => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue)
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dailyMetric, setDailyMetric] = useState('revenue')
  const [walletTopupPage, setWalletTopupPage] = useState(1)
  const [bookingPage, setBookingPage] = useState(1)

  const loadReport = async (monthValue, allowOpcacheRecovery = true) => {
    setIsLoading(true)
    try {
      const data = await api.getSalesReport({ period: 'month', month: monthValue })
      setReport(data)
    } catch (error) {
      const message = (error?.message || '').toString()

      if (allowOpcacheRecovery && message.includes('Invalid action: get_sales_report')) {
        try {
          await api.clearOpcache()
          const retried = await api.getSalesReport({ period: 'month', month: monthValue })
          setReport(retried)
          return
        } catch (retryError) {
          console.error('Sales report retry after OPcache clear failed:', retryError)
          window.alert(retryError.message || 'Unable to load sales report after clearing OPcache')
          return
        }
      }

      console.error('Fetch sales report error:', error)
      window.alert(error.message || 'Unable to load sales report')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadReport(selectedMonth)
  }, [selectedMonth])

  useEffect(() => {
    setWalletTopupPage(1)
    setBookingPage(1)
  }, [selectedMonth])

  const summaryCards = useMemo(() => {
    const summary = report?.summary || {}
    const walletSummary = report?.wallet_topup_summary || {}

    return [
      {
        label: 'Gross Revenue (รายได้รวมการจอง)',
        value: formatMoney(summary.gross_revenue),
        tone: { background: '#eefaf3', color: '#1f7a45' },
      },
      {
        label: 'Net Revenue (รายได้สุทธิ)',
        value: formatMoney(summary.net_revenue),
        tone: { background: '#eef4ff', color: '#2457c5' },
      },
      {
        label: 'Refunded (ยอดคืนเงิน)',
        value: formatMoney(summary.refunded_total),
        tone: { background: '#fff5f5', color: '#c53030' },
      },
      {
        label: 'Completed Bookings (จองสำเร็จ)',
        value: `${Number(summary.paid_bookings || 0).toLocaleString('th-TH')} ครั้ง`,
        tone: { background: '#fff9db', color: '#946200' },
      },
      {
        label: 'Wallet Top-ups (ยอดเติมเงิน)',
        value: formatMoney(walletSummary.total_topups),
        tone: { background: '#eef7ff', color: '#2457c5' },
      },
    ]
  }, [report])

  const chartData = useMemo(() => {
    const bookings = Array.isArray(report?.bookings) ? report.bookings : []
    const walletTopups = Array.isArray(report?.wallet_topups) ? report.wallet_topups : []
    const fallbackCourt = new Map()
    const fallbackDaily = new Map()
    const fallbackWalletDaily = new Map()

    bookings.forEach((booking) => {
      const status = (booking.status || '').toString().trim().toLowerCase()

      if (status === 'paid') {
        const courtName = formatCourtLabel(booking.court_name || (booking.court_id ? `Court ${booking.court_id}` : 'Unknown Court'))
        const currentCourt = fallbackCourt.get(courtName) || {
          court_name: courtName,
          total_amount: 0,
          booking_count: 0,
        }
        currentCourt.total_amount += Number(booking.price || 0)
        currentCourt.booking_count += 1
        fallbackCourt.set(courtName, currentCourt)
      }

      const dayKey = booking.booking_date || ''
      if (!dayKey) return

      const currentDaily = fallbackDaily.get(dayKey) || {
        day_key: dayKey,
        day_label: new Date(dayKey).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        gross_revenue: 0,
        refunded_total: 0,
        net_revenue: 0,
        paid_bookings: 0,
      }

      if (status === 'paid') {
        currentDaily.gross_revenue += Number(booking.price || 0)
        currentDaily.paid_bookings += 1
      }

      if (status === 'cancelled' && (booking.refund_status || '').toString().trim().toLowerCase() === 'refunded') {
        currentDaily.refunded_total += Number(booking.refund_amount || 0)
      }

      currentDaily.net_revenue = currentDaily.gross_revenue - currentDaily.refunded_total
      fallbackDaily.set(dayKey, currentDaily)
    })

    walletTopups.forEach((topup) => {
      const status = (topup.status || '').toString().trim().toLowerCase()
      const dayKey = (topup.created_at || '').toString().slice(0, 10)

      if (status !== 'paid' || !dayKey) return

      const currentWalletDaily = fallbackWalletDaily.get(dayKey) || {
        day_key: dayKey,
        day_label: new Date(dayKey).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        total_amount: 0,
        transaction_count: 0,
      }

      currentWalletDaily.total_amount += Number(topup.amount || 0)
      currentWalletDaily.transaction_count += 1
      fallbackWalletDaily.set(dayKey, currentWalletDaily)
    })

    const courtBreakdown = Array.from(fallbackCourt.values()).sort(
      (a, b) => Number(b.total_amount || 0) - Number(a.total_amount || 0),
    )

    const bookingDailyBreakdown =
      Array.isArray(report?.daily_breakdown) && report.daily_breakdown.length > 0
        ? report.daily_breakdown
        : Array.from(fallbackDaily.values()).sort((a, b) => a.day_key.localeCompare(b.day_key))

    const walletDailyBreakdown =
      Array.isArray(report?.wallet_topup_daily_breakdown) && report.wallet_topup_daily_breakdown.length > 0
        ? report.wallet_topup_daily_breakdown
        : Array.from(fallbackWalletDaily.values()).sort((a, b) => a.day_key.localeCompare(b.day_key))

    const mergedDaily = new Map()

    bookingDailyBreakdown.forEach((row) => {
      mergedDaily.set(row.day_key, {
        day_key: row.day_key,
        day_label: row.day_label,
        gross_revenue: Number(row.gross_revenue || 0),
        refunded_total: Number(row.refunded_total || 0),
        net_revenue: Number(row.net_revenue || 0),
        paid_bookings: Number(row.paid_bookings || 0),
        wallet_topup_total: 0,
        wallet_topup_count: 0,
      })
    })

    walletDailyBreakdown.forEach((row) => {
      const current = mergedDaily.get(row.day_key) || {
        day_key: row.day_key,
        day_label: row.day_label,
        gross_revenue: 0,
        refunded_total: 0,
        net_revenue: 0,
        paid_bookings: 0,
        wallet_topup_total: 0,
        wallet_topup_count: 0,
      }
      current.wallet_topup_total = Number(row.total_amount || 0)
      current.wallet_topup_count = Number(row.transaction_count || 0)
      mergedDaily.set(row.day_key, current)
    })

    return {
      courtBreakdown,
      dailyBreakdown: Array.from(mergedDaily.values()).sort((a, b) => a.day_key.localeCompare(b.day_key)),
    }
  }, [report])

  const walletTopups = Array.isArray(report?.wallet_topups) ? report.wallet_topups : []
  const bookings = Array.isArray(report?.bookings) ? report.bookings : []
  const walletTopupTotalPages = Math.max(1, Math.ceil(walletTopups.length / ITEMS_PER_PAGE))
  const bookingTotalPages = Math.max(1, Math.ceil(bookings.length / ITEMS_PER_PAGE))

  const paginatedWalletTopups = useMemo(
    () => walletTopups.slice((walletTopupPage - 1) * ITEMS_PER_PAGE, walletTopupPage * ITEMS_PER_PAGE),
    [walletTopupPage, walletTopups],
  )

  const paginatedBookings = useMemo(
    () => bookings.slice((bookingPage - 1) * ITEMS_PER_PAGE, bookingPage * ITEMS_PER_PAGE),
    [bookingPage, bookings],
  )

  useEffect(() => {
    if (walletTopupPage > walletTopupTotalPages) {
      setWalletTopupPage(walletTopupTotalPages)
    }
  }, [walletTopupPage, walletTopupTotalPages])

  useEffect(() => {
    if (bookingPage > bookingTotalPages) {
      setBookingPage(bookingTotalPages)
    }
  }, [bookingPage, bookingTotalPages])

  const handleExport = () => {
    if (!report) return

    const lines = []
    lines.push(['Booking Court Sales Report'])
    lines.push(['Period', report.period?.label || selectedMonth])
    lines.push(['From', report.period?.from || '-'])
    lines.push(['To', report.period?.to || '-'])
    lines.push([])
    lines.push(['Summary'])
    lines.push(['Metric', 'Value'])
    lines.push(['Gross Sales', report.summary?.gross_revenue || 0])
    lines.push(['Refunded', report.summary?.refunded_total || 0])
    lines.push(['Net Revenue', report.summary?.net_revenue || 0])
    lines.push(['Paid Bookings', report.summary?.paid_bookings || 0])
    lines.push(['Cancelled Bookings', report.summary?.cancelled_bookings || 0])
    lines.push(['Average Booking Value', report.summary?.average_booking_value || 0])
    lines.push([])
    lines.push(['Wallet Top-up Summary'])
    lines.push(['Metric', 'Value'])
    lines.push(['Total Top-ups', report.wallet_topup_summary?.total_topups || 0])
    lines.push(['Successful Top-ups', report.wallet_topup_summary?.paid_topup_count || 0])
    lines.push(['Average Top-up Value', report.wallet_topup_summary?.average_topup_value || 0])
    lines.push(['Refund To Wallet', report.wallet_topup_summary?.wallet_refund_total || 0])
    lines.push([])
    const totalCourtRevenue = (chartData.courtBreakdown || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0)

    lines.push(['Court Breakdown'])
    lines.push(['Court', 'Bookings', 'Total Amount', 'Revenue Share %'])
    ;(chartData.courtBreakdown || []).forEach((row) => {
      const percentage = totalCourtRevenue > 0 ? (Number(row.total_amount || 0) / totalCourtRevenue) * 100 : 0
      lines.push([row.court_name, row.booking_count, row.total_amount, percentage.toFixed(2)])
    })
    lines.push([])
    lines.push(['Daily Breakdown'])
    lines.push(['Day', 'Paid Bookings', 'Gross Sales', 'Refunded', 'Net Revenue', 'Wallet Top-ups', 'Wallet Tx'])
    ;(chartData.dailyBreakdown || []).forEach((row) => {
      lines.push([
        row.day_key,
        row.paid_bookings,
        row.gross_revenue,
        row.refunded_total,
        row.net_revenue,
        row.wallet_topup_total || 0,
        row.wallet_topup_count || 0,
      ])
    })
    lines.push([])
    lines.push(['Wallet Top-up Breakdown'])
    lines.push(['Payment Method', 'Transactions', 'Total Amount'])
    ;(report.wallet_topup_breakdown || []).forEach((row) => {
      lines.push([formatPaymentLabel(row.payment_method), row.transaction_count, row.total_amount])
    })
    lines.push([])
    lines.push(['Wallet Top-up Details'])
    lines.push(['Transaction ID', 'Created At', 'Customer', 'Phone', 'Payment', 'Status', 'Amount', 'Reference'])
    ;(report.wallet_topups || []).forEach((topup) => {
      lines.push([
        topup.id,
        topup.created_at || '',
        topup.user_name || '',
        topup.user_phone || '',
        formatPaymentLabel(topup.payment_type),
        topup.status || '',
        topup.amount || 0,
        topup.charge_id || '',
      ])
    })
    lines.push([])
    lines.push(['Booking Details'])
    lines.push(['Booking ID', 'Date', 'Time', 'Court', 'Customer', 'Phone', 'Payment', 'Status', 'Price', 'Refund Amount', 'Cancel Reason', 'Created At'])
    ;(report.bookings || []).forEach((booking) => {
      lines.push([
        booking.id,
        booking.booking_date,
        booking.booking_time,
        booking.court_name,
        booking.user_name,
        booking.user_phone,
        formatPaymentLabel(booking.payment_provider),
        booking.status,
        booking.price,
        booking.refund_amount || 0,
        booking.cancel_reason || '',
        booking.created_at || '',
      ])
    })

    const csv = `\uFEFF${lines.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `booking-sales-report-${report.period?.month || selectedMonth}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-col gap-lg admin-report-page">
      <div className="glass-card admin-report-hero">
        <div className="admin-report-hero-row">
          <div style={{ minWidth: 0 }}>
            <div className="admin-report-hero-title-row">
              <div className="admin-report-hero-icon">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="admin-report-title">Revenue Dashboard (แดชบอร์ดรายรับ)</h3>
                <p className="admin-report-copy">
                  Detailed court-by-court revenue analysis, wallet circulation, daily momentum, and secure booking records.
                </p>
              </div>
            </div>
          </div>

          <div className="admin-report-toolbar">
            <AdminMonthPicker value={selectedMonth} onChange={setSelectedMonth} />

            <button
              onClick={() => void loadReport(selectedMonth)}
              disabled={isLoading}
              className="secondary-button admin-report-toolbar-btn"
            >
              <RefreshCw size={16} className={isLoading ? 'spin-animation' : ''} />
              {isLoading ? 'Updating...' : 'Update Data'}
            </button>

            <button
              onClick={handleExport}
              disabled={!report || isLoading}
              className="premium-button admin-report-toolbar-btn"
            >
              <Download size={16} />
              Download Report (CSV)
            </button>
          </div>
        </div>
      </div>

      {report ? (
        <>
          <div className="admin-report-stats-grid">
            {summaryCards.map((card) => (
              <div key={card.label} className="glass-card admin-report-stat-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div className="admin-report-eyebrow">{card.label}</div>
                    <div className="admin-report-stat-value">{card.value}</div>
                  </div>
                  <div className="admin-report-stat-icon" style={{ background: card.tone.background, color: card.tone.color }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-report-chart-grid">
            <div className="glass-card admin-report-panel">
              <div className="admin-report-panel-head">
                <PieChart size={18} color="var(--accent-primary)" />
                <h4>Court Revenue Share</h4>
              </div>
              <CourtPerformancePieChart data={chartData.courtBreakdown} />
            </div>

            <div className="glass-card admin-report-panel">
              <div className="admin-report-panel-head">
                <BarChart3 size={18} color="var(--accent-primary)" />
                <h4>Daily Performance Trend</h4>
              </div>
              <DailyRevenueChart data={chartData.dailyBreakdown} metric={dailyMetric} onMetricChange={setDailyMetric} />
            </div>
          </div>

          <div className="admin-report-summary-grid">
            <div className="glass-card admin-report-panel">
              <div className="admin-report-panel-head">
                <FileSpreadsheet size={18} color="var(--accent-primary)" />
                <h4>Report Snapshot</h4>
              </div>
              <div className="admin-report-snapshot-list">
                <div className="admin-report-snapshot-row">
                  <span>Selected Month</span>
                  <strong>{report.period?.label}</strong>
                </div>
                <div className="admin-report-snapshot-row">
                  <span>From</span>
                  <strong>{report.period?.from}</strong>
                </div>
                <div className="admin-report-snapshot-row">
                  <span>To</span>
                  <strong>{report.period?.to}</strong>
                </div>
                <div className="admin-report-snapshot-row">
                  <span>Cancelled Bookings</span>
                  <strong>{Number(report.summary?.cancelled_bookings || 0).toLocaleString('th-TH')}</strong>
                </div>
                <div className="admin-report-snapshot-row">
                  <span>Top Court</span>
                  <strong>{chartData.courtBreakdown[0]?.court_name || '-'}</strong>
                </div>
                <div className="admin-report-snapshot-row">
                  <span>Wallet Top-ups</span>
                  <strong>{formatMoney(report.wallet_topup_summary?.total_topups)}</strong>
                </div>
                <div className="admin-report-snapshot-row no-border">
                  <span>Top Court Revenue</span>
                  <strong>{chartData.courtBreakdown[0] ? formatMoney(chartData.courtBreakdown[0].total_amount) : '-'}</strong>
                </div>
              </div>
            </div>

            <div className="glass-card admin-report-panel">
              <div className="admin-report-panel-head">
                <BarChart3 size={18} color="var(--accent-primary)" />
                <h4>Monthly Revenue Table</h4>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-report-table compact">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="right">Bookings</th>
                      <th className="right">Gross</th>
                      <th className="right">Refunded</th>
                      <th className="right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.monthly_breakdown || []).length > 0 ? (
                      report.monthly_breakdown.map((row) => (
                        <tr key={row.month_key}>
                          <td className="strong">{row.month_label}</td>
                          <td className="right">{Number(row.paid_bookings || 0).toLocaleString('th-TH')}</td>
                          <td className="right green">{formatMoney(row.gross_revenue)}</td>
                          <td className="right red">{formatMoney(row.refunded_total)}</td>
                          <td className="right blue strong">{formatMoney(row.net_revenue)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty">
                          No bookings found in this range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="glass-card admin-report-panel">
            <div className="admin-report-records-head">
              <div>
                <h4>Wallet Top-ups</h4>
                <p>{Number(report.wallet_topup_summary?.paid_topup_count || 0).toLocaleString('th-TH')} successful top-ups in this report window</p>
              </div>
              <Wallet size={18} color="var(--accent-primary)" />
            </div>

            <div className="admin-report-wallet-overview">
              <div className="admin-report-wallet-card">
                <div className="admin-report-eyebrow">Total Top-up Value</div>
                <div className="admin-report-stat-value">{formatMoney(report.wallet_topup_summary?.total_topups)}</div>
              </div>
              <div className="admin-report-wallet-card">
                <div className="admin-report-eyebrow">Average Top-up</div>
                <div className="admin-report-stat-value">{formatMoney(report.wallet_topup_summary?.average_topup_value)}</div>
              </div>
              <div className="admin-report-wallet-card">
                <div className="admin-report-eyebrow">Refunded To Wallet</div>
                <div className="admin-report-stat-value">{formatMoney(report.wallet_topup_summary?.wallet_refund_total)}</div>
              </div>
            </div>

            {(report.wallet_topup_breakdown || []).length > 0 ? (
              <div className="admin-report-chip-row">
                {report.wallet_topup_breakdown.map((row) => (
                  <div key={row.payment_method} className="admin-report-method-chip">
                    <span className="admin-report-method-chip-title">{formatPaymentLabel(row.payment_method)}</span>
                    <span>{Number(row.transaction_count || 0).toLocaleString('th-TH')} tx</span>
                    <strong>{formatMoney(row.total_amount)}</strong>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={{ overflowX: 'auto' }}>
              <table className="admin-report-table">
                <thead>
                  <tr>
                    <th>Transaction</th>
                    <th>Customer</th>
                    <th className="center">Payment</th>
                    <th className="center">Status</th>
                    <th className="right">Amount</th>
                    <th>Created</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {walletTopups.length > 0 ? (
                    paginatedWalletTopups.map((topup) => {
                      const statusTone = getWalletTopupStatusTone(topup.status)

                      return (
                        <tr key={topup.id}>
                          <td className="muted strong">#{topup.id}</td>
                          <td>
                            <div className="strong">{topup.user_name || '-'}</div>
                            <div className="admin-report-subtle">{topup.user_phone || '-'}</div>
                          </td>
                          <td className="center">
                            <span className="admin-report-pill payment">{formatPaymentLabel(topup.payment_type)}</span>
                          </td>
                          <td className="center">
                            <span className="admin-report-pill" style={{ background: statusTone.background, color: statusTone.color }}>
                              {statusTone.label}
                            </span>
                          </td>
                          <td className="right strong blue">{formatMoney(topup.amount)}</td>
                          <td className="muted">{topup.created_at || '-'}</td>
                          <td className="admin-report-ref-cell">{topup.charge_id || '-'}</td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="empty">
                        No wallet top-up transactions in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ReportPagination page={walletTopupPage} totalPages={walletTopupTotalPages} onPageChange={setWalletTopupPage} />
          </div>

          <div className="glass-card admin-report-panel">
            <div className="admin-report-records-head">
              <div>
                <h4>Booking Records</h4>
                <p>{Number(report.bookings?.length || 0).toLocaleString('th-TH')} records in this report window</p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="admin-report-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Customer</th>
                    <th>Court</th>
                    <th className="center">Schedule</th>
                    <th className="center">Payment</th>
                    <th className="center">Status</th>
                    <th className="right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length > 0 ? (
                    paginatedBookings.map((booking) => {
                      const statusTone = getStatusTone(booking)

                      return (
                        <tr key={booking.id}>
                          <td className="muted strong">#{booking.id}</td>
                          <td>
                            <div className="strong">{booking.user_name || '-'}</div>
                            <div className="admin-report-subtle">{booking.user_phone || '-'}</div>
                          </td>
                          <td className="strong">{booking.court_name || '-'}</td>
                          <td className="center muted">
                            {booking.booking_date} {booking.booking_time}
                          </td>
                          <td className="center">
                            <span className="admin-report-pill payment">{formatPaymentLabel(booking.payment_provider)}</span>
                          </td>
                          <td className="center">
                            <span className="admin-report-pill" style={{ background: statusTone.background, color: statusTone.color }}>
                              {statusTone.label}
                            </span>
                          </td>
                          <td className="right">
                            <div className="strong">{formatMoney(booking.price)}</div>
                            {(booking.refund_amount || 0) > 0 ? (
                              <div className="admin-report-refund">Refund {formatMoney(booking.refund_amount)}</div>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="empty">
                        No booking records in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <ReportPagination page={bookingPage} totalPages={bookingTotalPages} onPageChange={setBookingPage} />
          </div>
        </>
      ) : (
        <div className="glass-card admin-report-empty-state">
          {isLoading ? 'Loading report...' : 'Select a month to view sales data.'}
        </div>
      )}
    </div>
  )
}

export default AdminSalesReport
