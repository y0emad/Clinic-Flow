import { useState } from 'react'
import { Button, Drawer, Dropdown, Layout, Menu } from 'antd'
import { LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Logo } from '../components/Logo'

const { Header, Content, Footer } = Layout
const YEAR = new Date().getFullYear()

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const pages =
    user?.role === 'DOCTOR'
      ? [
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/doctor/appointments', label: 'Appointments' },
          { to: '/doctor/services', label: 'Services' },
          { to: '/doctor/schedule', label: 'Schedule' },
        ]
      : [
          { to: '/', label: 'Services' },
          ...(user ? [{ to: '/my-appointments', label: 'My appointments' }] : []),
        ]
  const links = pages.map((p) => ({ key: p.to, label: <Link to={p.to}>{p.label}</Link> }))

  // The booking page belongs to "Services".
  const { pathname } = location
  const selectedKey = pathname.startsWith('/book/') ? '/' : pathname

  function onLogout() {
    setDrawerOpen(false)
    logout()
    navigate('/login')
  }

  return (
    <Layout className="min-h-screen">
      <Header className="sticky top-0 z-20 flex items-center gap-4 shadow-sm !px-4 sm:!px-6 lg:gap-6">
        <Link to={user?.role === 'DOCTOR' ? '/dashboard' : '/'} className="flex shrink-0 items-center" aria-label="ClinicFlow home">
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

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <div className="hidden md:block">
              <Dropdown
                menu={{
                  items: [
                    { key: 'email', label: user.email, disabled: true },
                    { type: 'divider' },
                    { key: 'logout', icon: <LogoutOutlined />, label: 'Log out', onClick: onLogout },
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
                  Log in
                </Button>
              </Link>
              <Link to="/signup">
                <Button type="primary">Sign up</Button>
              </Link>
            </>
          )}

          {/* Mobile: links in a side drawer */}
          <Button
            type="text"
            aria-label="Open menu"
            icon={<MenuOutlined />}
            className="!text-white md:!hidden"
            onClick={() => setDrawerOpen(true)}
          />
        </div>
      </Header>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        size={280}
        title={<Logo size={26} />}
      >
        {user && (
          <div className="mb-4 rounded-lg bg-page p-3">
            <div className="font-semibold">{user.name}</div>
            <div className="truncate text-xs text-navy/60">{user.email}</div>
          </div>
        )}

        <Menu
          mode="vertical"
          selectedKeys={[selectedKey]}
          items={links}
          onClick={() => setDrawerOpen(false)}
          className="!border-none"
        />

        <div className="mt-6 flex flex-col gap-2">
          {user ? (
            <Button danger block icon={<LogoutOutlined />} onClick={onLogout}>
              Log out
            </Button>
          ) : (
            <>
              <Link to="/login" onClick={() => setDrawerOpen(false)}>
                <Button block>Log in</Button>
              </Link>
              <Link to="/signup" onClick={() => setDrawerOpen(false)}>
                <Button type="primary" block>
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </Drawer>

      <Content className="mx-auto w-full max-w-5xl px-4 py-5 sm:p-6">
        <Outlet />
      </Content>

      <Footer className="text-center text-navy/50">ClinicFlow © {YEAR}</Footer>
    </Layout>
  )
}
