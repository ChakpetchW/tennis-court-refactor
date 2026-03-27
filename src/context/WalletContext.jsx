import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'

const WalletContext = createContext()

export const WalletProvider = ({ children }) => {
  const { user, setUser } = useAuth()
  const [walletBalance, setWalletBalance] = useState(() => {
    try { return Number(localStorage.getItem('court_wallet') || 0) } catch { return 0 }
  })

  const fetchUserBalance = async () => {
    if (!user?.id) return 0
    try {
      const data = await api.getProfile(user.id)
      if (data && data.wallet_balance !== undefined) {
        const val = Number(data.wallet_balance)
        setWalletBalance(val)
        localStorage.setItem('court_wallet', val)
        if (setUser) {
          setUser(prev => {
            if (!prev) return null
            const next = { ...prev, ...data, wallet_balance: val }
            localStorage.setItem('court_user', JSON.stringify(next))
            return next
          })
        }
        return val
      }
    } catch (e) { 
      console.error('Fetch balance error:', e)
    }
    return 0
  }

  const updateWallet = async (amount) => {
    try {
      const data = await api.topupWallet(user?.id, user?.phone, amount)
      if (data.wallet_balance !== undefined) {
        const newBalance = Number(data.wallet_balance)
        setWalletBalance(newBalance)
        localStorage.setItem('court_wallet', newBalance)
        return newBalance
      }
    } catch {
      console.warn('Wallet API unavailable, using localStorage fallback.')
      const fallback = walletBalance + amount
      setWalletBalance(fallback)
      localStorage.setItem('court_wallet', fallback)
      return fallback
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchUserBalance()
    }
  }, [user?.id])

  const value = {
    walletBalance, setWalletBalance, fetchUserBalance, updateWallet
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used within a WalletProvider')
  return context
}
