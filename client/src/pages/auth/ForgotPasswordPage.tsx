import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { api, getErrorMessage } from '../../lib/api'
import { AuthCard } from '../../components/AuthCard'

export function ForgotPasswordPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()

  const forgot = useMutation({
    mutationFn: (email: string) => api.post<{ msg: string }>('/auth/forgot-password', { email }),
    onSuccess: (res, email) => {
      // The API answers the same for unknown emails, so we always move on.
      message.info(res.data.msg)
      navigate('/reset-password', { state: { email, justSent: true } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  return (
    <AuthCard title="Forgot password?" subtitle="Enter your email and we'll send you a code to reset it.">
      <Form<{ email: string }> layout="vertical" onFinish={({ email }) => forgot.mutate(email)} requiredMark={false}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
          <Input autoComplete="email" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={forgot.isPending}>
          Send code
        </Button>
      </Form>

      <p className="mt-4 text-center text-sm">
        <Link to="/login">Back to log in</Link>
      </p>
    </AuthCard>
  )
}
