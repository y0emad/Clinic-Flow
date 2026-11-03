import { Button, Result } from 'antd'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Result
      status="404"
      title={t('notFound.title')}
      extra={
        <Link to="/">
          <Button type="primary">{t('notFound.backHome')}</Button>
        </Link>
      }
    />
  )
}
