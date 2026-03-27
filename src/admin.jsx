import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { WalletProvider } from './context/WalletContext'
import { BookingProvider } from './context/BookingContext'
import AdminApp from './AdminApp'
import './index.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AuthProvider>
        <WalletProvider>
          <BookingProvider>
            <AppProvider>
              <AdminApp />
            </AppProvider>
          </BookingProvider>
        </WalletProvider>
      </AuthProvider>
    </React.StrictMode>
  )
}
