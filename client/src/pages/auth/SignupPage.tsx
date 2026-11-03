import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/useAuth'
import { api, getErrorMessage } from '../../lib/api'
import { AuthCard } from '../../components/AuthCard'

type SignupForm = { name: string; email: string; phone: string; password: string; confirm: string }

export function SignupPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()

  const signup = useMutation({
    mutationFn: ({ name, email, phone, password }: SignupForm) =>
      api.post('/auth/signup', { name: name.trim(), email, phone, password }),
    onSuccess: (_res, values) => {
      message.success(t('signup.created'))
      navigate('/verify-email', { state: { email: values.email, justSent: true } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  if (user) return <Navigate to="/" replace />

  return (
    <AuthCard title={t('signup.title')} subtitle={t('signup.subtitle')}>
      <Form<SignupForm> layout="vertical" onFinish={(values) => signup.mutate(values)} requiredMark={false}>
        <Form.Item name="name" label={t('signup.name')} rules={[{ required: true, whitespace: true, message: t('signup.nameRequired') }]}>
          <Input autoComplete="name" />
        </Form.Item>
        <Form.Item name="email" label={t('common.email')} rules={[{ required: true, type: 'email', message: t('common.validEmail') }]}>
          <Input autoComplete="email" dir="ltr" />
        </Form.Item>
        <Form.Item
          name="phone"
          label={t('signup.phone')}
          rules={[{ required: true, pattern: /^\+?\d{8,15}$/, message: t('signup.phoneInvalid') }]}
        >
          <Input autoComplete="tel" inputMode="tel" placeholder="01012345678" dir="ltr" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('common.password')}
          rules={[{ required: true, min: 6, message: t('common.atLeast6') }]}
          hasFeedback
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label={t('signup.confirm')}
          dependencies={['password']}
          hasFeedback
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
        <Button type="primary" htmlType="submit" block loading={signup.isPending}>
          {t('nav.signup')}
        </Button>
      </Form>

      <p className="mt-4 text-center text-sm text-ink/60">
        {t('signup.haveAccount')} <Link to="/login">{t('nav.login')}</Link>
      </p>
    </AuthCard>
  )
}
