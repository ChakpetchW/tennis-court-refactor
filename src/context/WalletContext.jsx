import React, { useCallback, useState } from 'react'
import { api } from '../services/api'
import { WalletContext } from './wallet-context'
import { useAuth } from '../hooks/useAuth'

export const WalletProvider = ({ children }) => {
  const { user, setUser } = useAuth()
  const [walletBalance, setWalletBalance] = useState(() => {
    try {
      return Number(localStorage.getItem('court_wallet') || 0)
    } catch {
      return 0
    }
  })

  const syncBalance = useCallback((nextBalance, profileData = null) => {
    const normalizedBalance = Number(nextBalance || 0)
    setWalletBalance(normalizedBalance)
    localStorage.setItem('court_wallet', normalizedBalance)

    if (setUser) {
      setUser((prev) => {
        if (!prev) return null
        return {
          ...prev,
          ...(profileData || {}),
          wallet_balance: normalizedBalance,
        }
      })
    }

    return normalizedBalance
  }, [setUser])

  const fetchUserBalance = useCallback(async () => {
    if (!user?.id) return 0

    try {
      const data = await api.getProfile(user.id)
      if (data && data.wallet_balance !== undefined) {
        return syncBalance(data.wallet_balance, data)
      }
    } catch (error) {
      console.error('Fetch balance error:', error)
    }

    return 0
  }, [syncBalance, user])

  const updateWallet = useCallback(async (amount) => {
    if (typeof amount !== 'number') {
      throw new Error('updateWallet expects a numeric amount')
    }

    try {
      const data = await api.topupWallet(user?.id, user?.phone, amount)
      if (data.wallet_balance !== undefined) {
        return syncBalance(data.wallet_balance)
      }
    } catch (error) {
      console.warn('Wallet API unavailable, using localStorage fallback.', error)
      return syncBalance(walletBalance + amount)
    }

    return walletBalance
  }, [syncBalance, user, walletBalance])

  return (
    <WalletContext.Provider
      value={{
        walletBalance,
        setWalletBalance,
        fetchUserBalance,
        updateWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export default WalletProvider
