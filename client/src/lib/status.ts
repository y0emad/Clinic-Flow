import type { AppointmentStatus } from '../types'

// Tag color per status; the label is the translation "status.<STATUS>".
export const STATUS_COLOR: Record<AppointmentStatus, string> = {
  BOOKED: 'processing',
  COMPLETED: 'success',
  CANCELLED: 'default',
  NO_SHOW: 'warning',
}

export const STATUSES = Object.keys(STATUS_COLOR) as AppointmentStatus[]
