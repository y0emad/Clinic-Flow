import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './i18n'
import { AuthProvider } from './auth/AuthProvider'
import { PrefsProvider } from './prefs/PrefsProvider'
import { initialDark } from './prefs/usePrefs'
import AppRoutes from './App.tsx'
import './index.css'

// Set before the first paint, so a dark-mode visitor doesn't see a white flash.
document.documentElement.classList.toggle('dark', initialDark())

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* layer: put antd's CSS in the "antd" layer, see index.css */}
    <StyleProvider layer>
      <PrefsProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </QueryClientProvider>
      </PrefsProvider>
    </StyleProvider>
  </StrictMode>,
)
