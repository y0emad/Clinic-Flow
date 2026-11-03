import { theme as antdTheme, type ThemeConfig } from 'antd'
import type { Lang } from './i18n'

// The brand colors. Same values as index.css (Tailwind classes: bg-navy, text-sky, text-ink, ...).
export const colors = {
  navy: '#1C1C41', // navbar, text in light mode
  sky: '#38BDF8', // primary actions (book, submit)
  teal: '#2DD4BF', // details, icons
  danger: '#B81A1A', // errors only
}

// Page background and main text for each mode (keep in sync with --page / --ink in index.css).
const modes = {
  light: { page: '#F8FAFC', ink: colors.navy, surface: '#FFFFFF' },
  dark: { page: '#0B0B1F', ink: '#E2E8F0', surface: '#14142E' },
}

const FONTS = {
  en: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  ar: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
}

export function makeTheme(dark: boolean, lang: Lang): ThemeConfig {
  const m = dark ? modes.dark : modes.light
  return {
    algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: colors.sky,
      colorInfo: colors.sky,
      colorSuccess: colors.teal,
      colorError: colors.danger,
      colorTextBase: m.ink,
      colorBgBase: dark ? m.page : '#FFFFFF',
      colorBgLayout: m.page,
      colorBgContainer: m.surface,
      colorBgElevated: m.surface,
      // Links: navy on light pages (light sky is hard to read there), sky on dark ones.
      colorLink: dark ? colors.sky : colors.navy,
      borderRadius: 8,
      fontFamily: FONTS[lang],
    },
    components: {
      // Navy text on the sky buttons: white on #38BDF8 is too low contrast.
      Button: { primaryColor: colors.navy, primaryShadow: 'none', fontWeight: 600 },
      Layout: { headerBg: colors.navy, footerBg: m.page },
      Menu: {
        darkItemBg: colors.navy,
        darkItemSelectedBg: 'transparent',
        darkItemSelectedColor: colors.sky,
        darkItemColor: 'rgba(255, 255, 255, 0.75)',
        darkItemHoverColor: '#ffffff',
      },
    },
  }
}
