import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import { WalletProvider } from './context/WalletContext'
import { BookingProvider } from './context/BookingContext'
import { ConfigProvider } from './context/ConfigContext'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ConfigProvider>
        <AuthProvider>
          <WalletProvider>
            <BookingProvider>
              <AppProvider>
                <App />
              </AppProvider>
            </BookingProvider>
          </WalletProvider>
        </AuthProvider>
      </ConfigProvider>
    </React.StrictMode>
  )
}
