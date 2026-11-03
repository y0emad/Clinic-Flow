import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../../lib/api'
import { useCountdown } from '../../lib/useCountdown'
import { AuthCard } from '../../components/AuthCard'
import { OtpInput } from '../../components/OtpInput'

type VerifyForm = { email: string; otp: string }
type LocationState = { email?: string; justSent?: boolean } | null

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const state = useLocation().state as LocationState
  const [form] = Form.useForm<VerifyForm>()
  // Just signed up → the code was sent a moment ago, so "resend" waits a minute.
  const { secondsLeft, restart } = useCountdown(state?.justSent ? 60 : 0)

  const verify = useMutation({
    mutationFn: (values: VerifyForm) => api.post('/auth/verify-otp', values),
    onSuccess: (_res, values) => {
      message.success(t('verify.verified'))
      navigate('/login', { state: { email: values.email } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const resend = useMutation({
    mutationFn: (email: string) => api.post('/auth/resend-otp', { email }),
    onSuccess: () => {
      message.success(t('verify.resent'))
      restart()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  async function onResend() {
    const { email } = await form.validateFields(['email'])
    resend.mutate(email)
  }

  return (
    <AuthCard title={t('verify.title')} subtitle={t('verify.subtitle')}>
      <Form<VerifyForm>
        form={form}
        layout="vertical"
        onFinish={(values) => verify.mutate(values)}
        requiredMark={false}
        initialValues={{ email: state?.email }}
      >
        <Form.Item name="email" label={t('common.email')} rules={[{ required: true, type: 'email', message: t('common.validEmail') }]}>
          <Input autoComplete="email" dir="ltr" />
        </Form.Item>
        <Form.Item name="otp" label={t('common.code')} rules={[{ required: true, len: 6, message: t('common.codeRequired') }]}>
          <OtpInput />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={verify.isPending}>
          {t('verify.submit')}
        </Button>
      </Form>

      <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
        <Button type="link" className="!px-0" onClick={onResend} disabled={secondsLeft > 0} loading={resend.isPending}>
          {secondsLeft > 0 ? t('common.resendIn', { seconds: secondsLeft }) : t('common.resendCode')}
        </Button>
        <Link to="/login">{t('common.backToLogin')}</Link>
      </div>
    </AuthCard>
  )
}
