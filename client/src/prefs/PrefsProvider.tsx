import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { App as AntApp, ConfigProvider } from 'antd'
import arEG from 'antd/es/locale/ar_EG'
import enUS from 'antd/es/locale/en_US'
import { useTranslation } from 'react-i18next'
import { makeTheme } from '../theme'
import type { Lang } from '../i18n'
import { DARK_KEY, initialDark, PrefsContext } from './usePrefs'

// antd's Arabic locale uses full day names in calendar headers ("الأربعاء"), which run into each other
// in the narrow columns, so the calendars get the short names instead.
const AR_SHORT_DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
const arLocale = {
  ...arEG,
  DatePicker: { ...arEG.DatePicker!, lang: { ...arEG.DatePicker!.lang, shortWeekDays: AR_SHORT_DAYS } },
  Calendar: { ...arEG.Calendar!, lang: { ...arEG.Calendar!.lang, shortWeekDays: AR_SHORT_DAYS } },
}

// Language + light/dark: feeds Ant Design (theme, direction, its own texts) and Tailwind (the "dark" class).
export function PrefsProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const lang: Lang = i18n.language === 'ar' ? 'ar' : 'en'
  const [dark, setDarkState] = useState(initialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem(DARK_KEY, String(dark))
    } catch {
      // not saved, still works for this visit
    }
  }, [dark])

  const setLang = useCallback((next: Lang) => void i18n.changeLanguage(next), [i18n])

  return (
    <PrefsContext.Provider value={{ lang, setLang, dark, setDark: setDarkState }}>
      <ConfigProvider
        theme={makeTheme(dark, lang)}
        direction={lang === 'ar' ? 'rtl' : 'ltr'}
        locale={lang === 'ar' ? arLocale : enUS}
      >
        {/* AntApp gives message / notification / modal that follow the theme (App.useApp()) */}
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </PrefsContext.Provider>
  )
}
