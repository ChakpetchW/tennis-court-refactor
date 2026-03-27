import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { INITIAL_COURTS } from '../data/constants'

export const useCourts = () => {
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
    } catch (err) { console.error('Fetch courts metadata error:', err) }
  }

  useEffect(() => {
    fetchCourtsMetadata()
  }, [])

  return { courts, setCourts, fetchCourtsMetadata }
}
