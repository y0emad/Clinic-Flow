import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App as AntApp, ConfigProvider } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthProvider'
import { theme } from './theme'
import AppRoutes from './App.tsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* layer: put antd's CSS in the "antd" layer, see index.css */}
    <StyleProvider layer>
      <ConfigProvider theme={theme}>
        {/* AntApp gives message / notification / modal that follow the theme (App.useApp()) */}
        <AntApp>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </QueryClientProvider>
        </AntApp>
      </ConfigProvider>
    </StyleProvider>
  </StrictMode>,
)
