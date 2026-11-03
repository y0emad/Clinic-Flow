import { useState } from 'react'
import { Button, Drawer, Dropdown, Layout, Menu, Tooltip } from 'antd'
import { GlobalOutlined, LogoutOutlined, MenuOutlined, MoonOutlined, SunOutlined, UserOutlined } from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/useAuth'
import { usePrefs } from '../prefs/usePrefs'
import { Logo } from '../components/Logo'

const { Header, Content, Footer } = Layout
const YEAR = new Date().getFullYear()

export function AppLayout() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const { lang, setLang, dark, setDark } = usePrefs()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const pages =
    user?.role === 'DOCTOR'
      ? [
          { to: '/dashboard', label: t('nav.dashboard') },
          { to: '/doctor/appointments', label: t('nav.appointments') },
          { to: '/doctor/services', label: t('nav.services') },
          { to: '/doctor/schedule', label: t('nav.schedule') },
        ]
      : [
          { to: '/', label: t('nav.services') },
          ...(user ? [{ to: '/my-appointments', label: t('nav.myAppointments') }] : []),
        ]
  const links = pages.map((p) => ({ key: p.to, label: <Link to={p.to}>{p.label}</Link> }))

  // The booking page belongs to "Services".
  const { pathname } = location
  const selectedKey = pathname.startsWith('/book/') ? '/' : pathname

  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar')
  const toggleDark = () => setDark(!dark)
  const darkLabel = dark ? t('nav.lightMode') : t('nav.darkMode')

  function onLogout() {
    setDrawerOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <Layout className="min-h-screen">
      <Header className="sticky top-0 z-20 flex items-center gap-4 shadow-sm !px-4 sm:!px-6 lg:gap-6">
        <Link to={user?.role === 'DOCTOR' ? '/dashboard' : '/'} className="flex shrink-0 items-center" aria-label="ClinicFlow">
          <Logo dark />
        </Link>

        {/* Desktop: links in the bar */}
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={links}
          className="!hidden min-w-0 flex-1 border-none md:!flex"
        />

        <div className="ms-auto flex items-center gap-2">
          {/* Language + light/dark (desktop; on mobile they're in the drawer) */}
          <div className="hidden items-center gap-1 md:flex">
            <Button type="text" icon={<GlobalOutlined />} className="!text-white/85" onClick={toggleLang}>
              {t('nav.switchLanguage')}
            </Button>
            <Tooltip title={darkLabel}>
              <Button
                type="text"
                aria-label={darkLabel}
                icon={dark ? <SunOutlined /> : <MoonOutlined />}
                className="!text-white/85"
                onClick={toggleDark}
              />
            </Tooltip>
          </div>

          {user ? (
            <div className="hidden md:block">
              <Dropdown
                menu={{
                  items: [
                    { key: 'email', label: user.email, disabled: true },
                    { type: 'divider' },
                    { key: 'logout', icon: <LogoutOutlined />, label: t('nav.logout'), onClick: onLogout },
                  ],
                }}
              >
                <Button ghost icon={<UserOutlined />} className="!border-white/40 !text-white">
                  {user.name}
                </Button>
              </Dropdown>
            </div>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block">
                <Button ghost className="!border-white/40 !text-white">
                  {t('nav.login')}
                </Button>
              </Link>
              <Link to="/signup">
                <Button type="primary">{t('nav.signup')}</Button>
              </Link>
            </>
          )}

          {/* Mobile: links in a side drawer */}
          <Button
            type="text"
            aria-label={t('nav.openMenu')}
            icon={<MenuOutlined />}
            className="!text-white md:!hidden"
            onClick={() => setDrawerOpen(true)}
          />
        </div>
      </Header>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement={lang === 'ar' ? 'left' : 'right'}
        size={280}
        title={<Logo size={26} />}
      >
        {user && (
          <div className="mb-4 rounded-lg bg-page p-3">
            <div className="font-semibold">{user.name}</div>
            <div className="truncate text-xs text-ink/60">{user.email}</div>
          </div>
        )}

        <Menu
          mode="vertical"
          selectedKeys={[selectedKey]}
          items={links}
          onClick={() => setDrawerOpen(false)}
          className="!border-none"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button icon={<GlobalOutlined />} onClick={toggleLang}>
            {t('nav.switchLanguage')}
          </Button>
          <Button icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={toggleDark}>
            {darkLabel}
          </Button>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {user ? (
            <Button danger block icon={<LogoutOutlined />} onClick={onLogout}>
              {t('nav.logout')}
            </Button>
          ) : (
            <>
              <Link to="/login" onClick={() => setDrawerOpen(false)}>
                <Button block>{t('nav.login')}</Button>
              </Link>
              <Link to="/signup" onClick={() => setDrawerOpen(false)}>
                <Button type="primary" block>
                  {t('nav.signup')}
                </Button>
              </Link>
            </>
          )}
        </div>
      </Drawer>

      <Content className="mx-auto w-full max-w-5xl px-4 py-5 sm:p-6">
        {/* Remount the page on language change, so dates and pickers pick up the new locale. */}
        <Outlet key={lang} />
      </Content>

      <Footer className="text-center text-ink/50">ClinicFlow © {YEAR}</Footer>
    </Layout>
  )
}
