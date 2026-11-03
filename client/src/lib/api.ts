import axios from 'axios'
import i18n, { currentLang } from '../i18n'
import { apiErrorsAr } from '../i18n/apiErrors.ar'

export const TOKEN_KEY = 'clinicflow_token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15_000,
})

// Send the JWT with every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Expired / invalid token → drop it and tell the AuthProvider to log out.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('auth:logout'))
    }
    return Promise.reject(error)
  },
)

// Every API error looks like { success: false, msg }. The API speaks English; in Arabic the known
// messages are translated (apiErrors.ar.ts) and anything else is shown as it came.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg: string | undefined = error.response?.data?.msg
    if (msg) return (currentLang() === 'ar' && apiErrorsAr[msg]) || msg
    if (!error.response) return i18n.t('errors.cantReach')
  }
  return i18n.t('errors.generic')
}
