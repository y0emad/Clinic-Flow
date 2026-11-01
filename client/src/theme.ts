import type { ThemeConfig } from 'antd'

// The brand colors. Same values as the @theme block in index.css (Tailwind classes: bg-navy, text-sky, ...).
export const colors = {
  navy: '#1C1C41', // text, navbar
  sky: '#38BDF8', // primary actions (book, submit)
  teal: '#2DD4BF', // details, icons
  bg: '#F8FAFC', // page background
  danger: '#B81A1A', // errors only
}

export const theme: ThemeConfig = {
  token: {
    colorPrimary: colors.sky,
    colorInfo: colors.sky,
    colorSuccess: colors.teal,
    colorError: colors.danger,
    colorTextBase: colors.navy,
    colorBgLayout: colors.bg,
    colorLink: colors.navy, // light sky text on a white page is hard to read
    borderRadius: 8,
  },
  components: {
    // Navy text on the sky buttons: white on #38BDF8 is too low contrast.
    Button: { primaryColor: colors.navy, primaryShadow: 'none', fontWeight: 600 },
    Layout: { headerBg: colors.navy, footerBg: colors.bg },
    Menu: {
      darkItemBg: colors.navy,
      darkItemSelectedBg: 'transparent',
      darkItemSelectedColor: colors.sky,
      darkItemColor: 'rgba(255, 255, 255, 0.75)',
      darkItemHoverColor: '#ffffff',
    },
  },
}
