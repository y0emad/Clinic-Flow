import { App, Button, Form, Input } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../../lib/api'
import { apiErrorsAr } from '../../i18n/apiErrors.ar'
import { AuthCard } from '../../components/AuthCard'

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
  const { message } = App.useApp()
  const navigate = useNavigate()

  const forgot = useMutation({
    mutationFn: (email: string) => api.post<{ msg: string }>('/auth/forgot-password', { email }),
    onSuccess: (res, email) => {
      // The API answers the same for unknown emails, so we always move on.
      const msg = res.data.msg
      message.info((i18n.language === 'ar' && apiErrorsAr[msg]) || msg)
      navigate('/reset-password', { state: { email, justSent: true } })
    },
    onError: (error) => message.error(getErrorMessage(error)),
  })

  return (
    <AuthCard title={t('forgot.title')} subtitle={t('forgot.subtitle')}>
      <Form<{ email: string }> layout="vertical" onFinish={({ email }) => forgot.mutate(email)} requiredMark={false}>
        <Form.Item name="email" label={t('common.email')} rules={[{ required: true, type: 'email', message: t('common.validEmail') }]}>
          <Input autoComplete="email" dir="ltr" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block loading={forgot.isPending}>
          {t('forgot.submit')}
        </Button>
      </Form>

      <p className="mt-4 text-center text-sm">
        <Link to="/login">{t('common.backToLogin')}</Link>
      </p>
    </AuthCard>
  )
}
