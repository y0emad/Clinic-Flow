import { Spin } from 'antd'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth'
import type { Role } from '../types'

// Wrap routes that need a logged-in user (optionally with a specific role).
export function RequireAuth({ role }: { role?: Role }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (role && user.role !== role) return <Navigate to="/" replace />

  return <Outlet />
}
