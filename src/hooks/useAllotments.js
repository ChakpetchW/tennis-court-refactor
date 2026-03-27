import { useEffect } from 'react'
import { api } from '../services/api'
import { INITIAL_COURTS } from '../data/constants'

export const useAllotments = (setCourts) => {
  const fetchStatus = async (dateArg) => {
    const date = dateArg || new Date().toLocaleDateString('sv-SE')
    try {
      const data = await api.getAllStatus(date)
      
      setCourts(prev => prev.map(court => {
        const courtAllotments = Array.isArray(data) ? data.filter(a => parseInt(a.court_id) === court.id) : []
        return {
          ...court,
          allotment: INITIAL_COURTS.find(ic => ic.id === court.id).allotment.map((slot, i) => {
            const hourStr = (i + 6).toString().padStart(2, '0') + ':00'
            const match = courtAllotments.find(a => a.hour === hourStr)
            return match ? {
              isOpen: match.is_open === null ? true : !!parseInt(match.is_open),
              bookedBy: match.booked_by,
              pendingBy: match.pending_by
            } : { ...slot, isOpen: true, bookedBy: null, pendingBy: null }
          })
        }
      }))
    } catch (err) {
      console.warn('Backend API not reachable, using local state.', err)
    }
  }

  // Initial fetch and polling could be here, but usually it's better to keep it in the main flow or App
  // for coordinated intervals.

  return { fetchStatus }
}
