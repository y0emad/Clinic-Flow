import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'
import { api, getErrorMessage } from '../../lib/api'
import { useCountdown } from '../../lib/useCountdown'
import { AuthCard } from '../../components/AuthCard'

type VerifyForm = { email: string; otp: string }
type LocationState = { email?: string; justSent?: boolean } | null

export function VerifyEmailPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const state = useLocation().state as LocationState
  const [form] = Form.useForm<VerifyForm>()
  // Just signed up → the code was sent a moment ago, so "resend" waits a minute.
  const { secondsLeft, restart } = useCountdown(state?.justSent ? 60 : 0)

  const verify = useMutation({
    mutationFn: (values: VerifyForm) => api.post('/auth/verify-otp', values),
    onSuccess: (_res, values) => {
      message.success('Email verified, you can log in now')
      navigate('/login', { state: { email: values.email } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const resend = useMutation({
    mutationFn: (email: string) => api.post('/auth/resend-otp', { email }),
    onSuccess: () => {
      message.success('A new code was sent to your email')
      restart()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  async function onResend() {
    const { email } = await form.validateFields(['email'])
    resend.mutate(email)
  }

  return (
    <AuthCard title="Verify your email" subtitle="Enter the 6-digit code we sent to your email. It expires in 10 minutes.">
      <Form<VerifyForm>
        form={form}
        layout="vertical"
        onFinish={(values) => verify.mutate(values)}
        requiredMark={false}
        initialValues={{ email: state?.email }}
      >
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
          <Input autoComplete="email" />
        </Form.Item>
        <Form.Item name="otp" label="Code" rules={[{ required: true, len: 6, message: 'Enter the 6-digit code' }]}>
          <Input.OTP length={6} formatter={(v) => v.replace(/\D/g, '')} />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={verify.isPending}>
          Verify
        </Button>
      </Form>

      <div className="mt-4 flex items-center justify-between text-sm text-navy/60">
        <Button type="link" className="!px-0" onClick={onResend} disabled={secondsLeft > 0} loading={resend.isPending}>
          {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
        </Button>
        <Link to="/login">Back to log in</Link>
      </div>
    </AuthCard>
  )
}
