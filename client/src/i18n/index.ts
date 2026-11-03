import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import updateLocale from 'dayjs/plugin/updateLocale'
import 'dayjs/locale/ar'
import en from './en'
import ar from './ar'

export type Lang = 'en' | 'ar'
const LANG_KEY = 'clinicflow_lang'

dayjs.extend(updateLocale)
// dayjs' Arabic locale calls 12:00–12:59 "ص" (morning); noon and after is "م".
dayjs.updateLocale('ar', { meridiem: (hour: number) => (hour < 12 ? 'ص' : 'م') })

function savedLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'en' || saved === 'ar') return saved
  } catch {
    // storage blocked: fall back to the browser language
  }
  return navigator.language?.startsWith('ar') ? 'ar' : 'en'
}

// Everything that depends on the language outside React: dates, page direction, the saved choice.
i18n.on('languageChanged', (lng) => {
  const lang: Lang = lng === 'ar' ? 'ar' : 'en'
  dayjs.locale(lang)
  document.documentElement.lang = lang
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // not saved, still works for this visit
  }
})

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: savedLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
})

export const currentLang = (): Lang => (i18n.language === 'ar' ? 'ar' : 'en')

export default i18n
