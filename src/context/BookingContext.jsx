import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'
import { INITIAL_COURTS } from '../data/constants'

const BookingContext = createContext()

export const BookingProvider = ({ children }) => {
  const [courts, setCourts] = useState(INITIAL_COURTS)

  const fetchCourtsMetadata = async () => {
    try {
      const data = await api.getCourts()
      if (Array.isArray(data)) {
        setCourts(prev => prev.map(court => {
          const match = data.find(r => r.id === court.id)
          return match ? { ...court, price_per_hour: match.rate || match.price_per_hour } : court
        }))
      }
    } catch (err) { 
      console.error('Fetch courts metadata error:', err)
    }
  }

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
      console.warn('Fetch status error:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchCourtsMetadata()
    const interval = setInterval(() => {
      fetchStatus()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const value = {
    courts, setCourts, fetchCourtsMetadata, fetchStatus
  }

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

export const useBooking = () => {
  const context = useContext(BookingContext)
  if (!context) throw new Error('useBooking must be used within a BookingProvider')
  return context
}
