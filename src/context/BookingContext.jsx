import React, { useCallback, useState } from 'react'
import { api } from '../services/api'
import { INITIAL_COURTS } from '../data/constants'
import { BookingContext } from './booking-context'

export const BookingProvider = ({ children }) => {
  const [courts, setCourts] = useState(INITIAL_COURTS)

  const fetchCourtsMetadata = useCallback(async () => {
    try {
      const data = await api.getCourts()
      if (Array.isArray(data)) {
        setCourts((prev) =>
          prev.map((court) => {
            const match = data.find((backend) => Number(backend.id) === court.id)
            if (match) {
              return {
                ...court,
                name: match.name || court.name,
                type: match.type || court.type,
                price_per_hour: Number(match.rate || match.price_per_hour || 0)
              }
            }
            return court
          }),
        )
      }

      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Fetch courts metadata error:', error)
      return []
    }
  }, [])

  const fetchStatus = useCallback(async (dateArg) => {
    const date = dateArg || new Date().toLocaleDateString('sv-SE')

    try {
      const data = await api.getAllStatus(date)
      const normalizedData = Array.isArray(data) ? data : []
      setCourts((prev) =>
        prev.map((court) => {
          const courtAllotments = normalizedData.filter((allotment) => Number.parseInt(allotment.court_id, 10) === court.id)

          return {
            ...court,
            allotment: INITIAL_COURTS.find((seedCourt) => seedCourt.id === court.id).allotment.map((slot, index) => {
              const hourStr = `${(index + 6).toString().padStart(2, '0')}:00`
              const match = courtAllotments.find((allotment) => allotment.hour === hourStr)
              return match
                ? {
                    isOpen: match.is_open === null ? true : Boolean(Number.parseInt(match.is_open, 10)),
                    bookedBy: match.booked_by,
                    pendingBy: match.pending_by,
                  }
                : { ...slot, isOpen: true, bookedBy: null, pendingBy: null }
            }),
          }
        }),
      )
      return normalizedData
    } catch (error) {
      console.warn('Fetch status error:', error)
      return []
    }
  }, [])

  return (
    <BookingContext.Provider
      value={{
        courts,
        setCourts,
        fetchCourtsMetadata,
        fetchStatus,
      }}
    >
      {children}
    </BookingContext.Provider>
  )
}

export default BookingProvider
