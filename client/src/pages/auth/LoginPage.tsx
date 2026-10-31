import { useState } from 'react'
import { App, Button, Form, Input } from 'antd'
import axios from 'axios'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { getErrorMessage } from '../../lib/api'
import { AuthCard } from '../../components/AuthCard'

type LoginForm = { email: string; password: string }
type LocationState = { from?: string; email?: string } | null

export function LoginPage() {
  const { user, login } = useAuth()
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
      message.success(`Welcome back, ${loggedIn.name}`)
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
    <AuthCard title="Log in" subtitle="Welcome back to ClinicFlow">
      <Form<LoginForm>
        layout="vertical"
        onFinish={onFinish}
        requiredMark={false}
        initialValues={{ email: state?.email }}
      >
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Enter your password' }]}
          extra={
            <div className="mt-1 text-right">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
          }
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={submitting}>
          Log in
        </Button>
      </Form>

      <p className="mt-4 text-center text-sm text-navy/60">
        No account? <Link to="/signup">Sign up</Link>
      </p>
    </AuthCard>
  )
}
