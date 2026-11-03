import { Tag } from 'antd'
import { useTranslation } from 'react-i18next'
import { STATUS_COLOR } from '../lib/status'
import type { AppointmentStatus } from '../types'

export function StatusTag({ status }: { status: AppointmentStatus }) {
  const { t } = useTranslation()
  return <Tag color={STATUS_COLOR[status]}>{t(`status.${status}`)}</Tag>
}
