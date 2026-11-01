import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '../../auth/useAuth'
import { api, getErrorMessage } from '../../lib/api'
import { AuthCard } from '../../components/AuthCard'

type SignupForm = { name: string; email: string; phone: string; password: string; confirm: string }

export function SignupPage() {
  const { user } = useAuth()
  const { message } = App.useApp()
  const navigate = useNavigate()

  const signup = useMutation({
    mutationFn: ({ name, email, phone, password }: SignupForm) =>
      api.post('/auth/signup', { name: name.trim(), email, phone, password }),
    onSuccess: (_res, values) => {
      message.success('Account created, we sent a 6-digit code to your email')
      navigate('/verify-email', { state: { email: values.email, justSent: true } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  if (user) return <Navigate to="/" replace />

  return (
    <AuthCard title="Create an account" subtitle="Book your visits online in a few clicks">
      <Form<SignupForm> layout="vertical" onFinish={(values) => signup.mutate(values)} requiredMark={false}>
        <Form.Item name="name" label="Full name" rules={[{ required: true, whitespace: true, message: 'Enter your name' }]}>
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item
          name="phone"
          label="Phone"
          rules={[{ required: true, pattern: /^\+?\d{8,15}$/, message: 'Enter a valid phone number, e.g. 01012345678' }]}
        >
          <Input autoComplete="tel" inputMode="tel" placeholder="01012345678" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}
          hasFeedback
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm password"
          dependencies={['password']}
          hasFeedback
          rules={[
            { required: true, message: 'Confirm your password' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error("Passwords don't match")),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={signup.isPending}>
          Sign up
        </Button>
      </Form>

      <p className="mt-4 text-center text-sm text-navy/60">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthCard>
  )
}
