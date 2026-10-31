import { Spin } from 'antd'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppLayout } from './layouts/AppLayout'
import { RequireAuth } from './auth/RequireAuth'

// Each page is loaded only when it's opened (smaller first download).
const page = (load: () => Promise<{ Component: React.ComponentType }>) => ({ lazy: load })

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    hydrateFallbackElement: (
      <div className="flex h-screen items-center justify-center">
        <Spin size="large" />
      </div>
    ),
    children: [
      // Public
      { path: '/', ...page(async () => ({ Component: (await import('./pages/ServicesPage')).ServicesPage })) },
      { path: '/book/:serviceId', ...page(async () => ({ Component: (await import('./pages/BookPage')).BookPage })) },
      { path: '/login', ...page(async () => ({ Component: (await import('./pages/auth/LoginPage')).LoginPage })) },
      { path: '/signup', ...page(async () => ({ Component: (await import('./pages/auth/SignupPage')).SignupPage })) },
      { path: '/verify-email', ...page(async () => ({ Component: (await import('./pages/auth/VerifyEmailPage')).VerifyEmailPage })) },
      { path: '/forgot-password', ...page(async () => ({ Component: (await import('./pages/auth/ForgotPasswordPage')).ForgotPasswordPage })) },
      { path: '/reset-password', ...page(async () => ({ Component: (await import('./pages/auth/ResetPasswordPage')).ResetPasswordPage })) },

      // Patient
      {
        element: <RequireAuth role="PATIENT" />,
        children: [
          { path: '/my-appointments', ...page(async () => ({ Component: (await import('./pages/MyAppointmentsPage')).MyAppointmentsPage })) },
        ],
      },

      // Doctor
      {
        element: <RequireAuth role="DOCTOR" />,
        children: [
          { path: '/dashboard', ...page(async () => ({ Component: (await import('./pages/doctor/DashboardPage')).DashboardPage })) },
          { path: '/doctor/appointments', ...page(async () => ({ Component: (await import('./pages/doctor/AppointmentsPage')).AppointmentsPage })) },
          { path: '/doctor/services', ...page(async () => ({ Component: (await import('./pages/doctor/ServicesManagePage')).ServicesManagePage })) },
          { path: '/doctor/schedule', ...page(async () => ({ Component: (await import('./pages/doctor/SchedulePage')).SchedulePage })) },
        ],
      },

      { path: '*', ...page(async () => ({ Component: (await import('./pages/NotFoundPage')).NotFoundPage })) },
    ],
  },
])

export default function AppRoutes() {
  return <RouterProvider router={router} />
}
