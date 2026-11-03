import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../../lib/api'
import { useCountdown } from '../../lib/useCountdown'
import { AuthCard } from '../../components/AuthCard'
import { OtpInput } from '../../components/OtpInput'

type ResetForm = { email: string; otp: string; password: string; confirm: string }
type LocationState = { email?: string; justSent?: boolean } | null

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()
  const state = useLocation().state as LocationState
  const [form] = Form.useForm<ResetForm>()
  const { secondsLeft, restart } = useCountdown(state?.justSent ? 60 : 0)

  const reset = useMutation({
    mutationFn: ({ email, otp, password }: ResetForm) => api.post('/auth/reset-password', { email, otp, password }),
    onSuccess: (_res, values) => {
      message.success(t('reset.changed'))
      navigate('/login', { state: { email: values.email } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  const resend = useMutation({
    mutationFn: (email: string) => api.post('/auth/forgot-password', { email }),
    onSuccess: () => {
      message.success(t('reset.resent'))
      restart()
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  async function onResend() {
    const { email } = await form.validateFields(['email'])
    resend.mutate(email)
  }

  return (
    <AuthCard title={t('reset.title')} subtitle={t('reset.subtitle')}>
      <Form<ResetForm>
        form={form}
        layout="vertical"
        onFinish={(values) => reset.mutate(values)}
        requiredMark={false}
        initialValues={{ email: state?.email }}
      >
        <Form.Item name="email" label={t('common.email')} rules={[{ required: true, type: 'email', message: t('common.validEmail') }]}>
          <Input autoComplete="email" dir="ltr" />
        </Form.Item>
        <Form.Item name="otp" label={t('common.code')} rules={[{ required: true, len: 6, message: t('common.codeRequired') }]}>
          <OtpInput />
        </Form.Item>
        <Form.Item name="password" label={t('reset.newPassword')} rules={[{ required: true, min: 6, message: t('common.atLeast6') }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={t('reset.confirmNew')}
          dependencies={['password']}
          rules={[
            { required: true, message: t('common.confirmPassword') },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error(t('common.passwordsDontMatch'))),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={reset.isPending}>
          {t('reset.submit')}
        </Button>
      </Form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Button type="link" className="!px-0" onClick={onResend} disabled={secondsLeft > 0} loading={resend.isPending}>
          {secondsLeft > 0 ? t('common.resendIn', { seconds: secondsLeft }) : t('common.resendCode')}
        </Button>
        <Link to="/login">{t('common.backToLogin')}</Link>
      </div>
    </AuthCard>
  )
}
