import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'
import { api, getErrorMessage } from '../../lib/api'
import { useCountdown } from '../../lib/useCountdown'
import { AuthCard } from '../../components/AuthCard'

type ResetForm = { email: string; otp: string; password: string; confirm: string }
type LocationState = { email?: string; justSent?: boolean } | null

export function ResetPasswordPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const state = useLocation().state as LocationState
  const [form] = Form.useForm<ResetForm>()
  const { secondsLeft, restart } = useCountdown(state?.justSent ? 60 : 0)

  const reset = useMutation({
    mutationFn: ({ email, otp, password }: ResetForm) => api.post('/auth/reset-password', { email, otp, password }),
    onSuccess: (_res, values) => {
      message.success('Password changed, log in with your new password')
      navigate('/login', { state: { email: values.email } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const resend = useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password', { email }),
    onSuccess: () => {
      message.success('If this email is registered, a new code was sent')
      restart()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  async function onResend() {
    const { email } = await form.validateFields(['email'])
    resend.mutate(email)
  }

  return (
    <AuthCard title="Reset password" subtitle="Enter the code from your email and choose a new password.">
      <Form<ResetForm>
        form={form}
        layout="vertical"
        onFinish={(values) => reset.mutate(values)}
        requiredMark={false}
        initialValues={{ email: state?.email }}
      >
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item name="otp" label="Code" rules={[{ required: true, len: 6, message: 'Enter the 6-digit code' }]}>
          <Input.OTP length={6} formatter={(v) => v.replace(/\D/g, '')} />
        </Form.Item>
        <Form.Item name="password" label="New password" rules={[{ required: true, min: 6, message: 'At least 6 characters' }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm new password"
          dependencies={['password']}
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
        <Button type="primary" htmlType="submit" block loading={reset.isPending}>
          Change password
        </Button>
      </Form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Button type="link" className="!px-0" onClick={onResend} disabled={secondsLeft > 0} loading={resend.isPending}>
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
        </Button>
        <Link to="/login">Back to log in</Link>
      </div>
    </AuthCard>
  )
}
