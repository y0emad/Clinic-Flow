import { createContext, useContext } from 'react'
import type { Lang } from '../i18n'

export type Prefs = {
  lang: Lang
  setLang: (lang: Lang) => void
  dark: boolean
  setDark: (dark: boolean) => void
}

export const DARK_KEY = 'clinicflow_dark'

// Saved choice, otherwise the device setting.
export function initialDark(): boolean {
  try {
    const saved = localStorage.getItem(DARK_KEY)
    if (saved !== null) return saved === 'true'
  } catch {
    // storage blocked
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export const PrefsContext = createContext<Prefs | null>(null)

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used inside <PrefsProvider>')
  return ctx
}
