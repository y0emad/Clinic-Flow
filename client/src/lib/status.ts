import type { AppointmentStatus } from '../types'

export const STATUS: Record<AppointmentStatus, { color: string; label: string }> = {
  BOOKED: { color: 'processing', label: 'Booked' },
  COMPLETED: { color: 'success', label: 'Completed' },
  CANCELLED: { color: 'default', label: 'Cancelled' },
  NO_SHOW: { color: 'warning', label: 'No-show' },
}

export const STATUS_OPTIONS = Object.entries(STATUS).map(([value, { label }]) => ({
  value: value as AppointmentStatus,
  label,
}))
