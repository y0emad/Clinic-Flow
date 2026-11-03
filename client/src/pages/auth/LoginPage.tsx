import { useState } from 'react'
import { App, Button, Form, Input } from 'antd'
import axios from 'axios'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/useAuth'
import { getErrorMessage } from '../../lib/api'
import { AuthCard } from '../../components/AuthCard'

type LoginForm = { email: string; password: string }
type LocationState = { from?: string; email?: string } | null

export function LoginPage() {
  const { user, login } = useAuth()
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const state = useLocation().state as LocationState
  const [submitting, setSubmitting] = useState(false)

  // Logged in (just now, or already) → back where they came from, or to their home page.
  if (user) return <Navigate to={state?.from ?? (user.role === 'DOCTOR' ? '/dashboard' : '/')} replace />

  async function onFinish(values: LoginForm) {
    setSubmitting(true)
    try {
      const loggedIn = await login(values.email, values.password)
      message.success(t('login.welcome', { name: loggedIn.name }))
    } catch (error) {
      // 403 = right password but the email isn't verified yet → send them to the OTP page.
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        message.warning(getErrorMessage(error))
        navigate('/verify-email', { state: { email: values.email } })
        return
      }
      message.error(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title={t('login.title')} subtitle={t('login.subtitle')}>
      <Form<LoginForm>
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        initialValues={{ email: state?.email }}
      >
        <Form.Item name="email" label={t('common.email')} rules={[{ required: true, type: 'email', message: t('common.validEmail') }]}>
          <Input autoComplete="email" dir="ltr" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('common.password')}
          rules={[{ required: true, message: t('login.passwordRequired') }]}
          extra={
            <div className="mt-1 text-end">
              <Link to="/forgot-password">{t('login.forgot')}</Link>
            </div>
          }
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting}>
          {t('login.title')}
        </Button>
      </Form>

      <p className="mt-4 text-center text-sm text-ink/60">
        {t('login.noAccount')} <Link to="/signup">{t('nav.signup')}</Link>
      </p>
    </AuthCard>
  )
}
