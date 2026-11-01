import { createContext, useContext } from 'react'
import type { User } from '../types'

export type AuthContextValue = {
  user: User | null
  loading: boolean // true while restoring the session on page load
  login: (email: string, password: string) => Promise<User>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
