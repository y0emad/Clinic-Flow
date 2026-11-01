import { Tag } from 'antd'
import { STATUS } from '../lib/status'
import type { AppointmentStatus } from '../types'

export function StatusTag({ status }: { status: AppointmentStatus }) {
  return <Tag color={STATUS[status].color}>{STATUS[status].label}</Tag>
}
