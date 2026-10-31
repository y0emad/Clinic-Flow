// Shapes returned by the ClinicFlow API.

export type Role = 'DOCTOR' | 'PATIENT'

export type User = {
  id: string
  name: string
  email: string
  phone: string | null
  role: Role
}

export type Service = {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  price: number
  isActive?: boolean // only in the doctor's create / update responses
}

export type Slot = {
  startAt: string
  endAt: string
  time: string // clinic local time, "16:00"
}

export type AppointmentStatus = 'BOOKED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export type Appointment = {
  id: string
  startAt: string
  endAt: string
  price: number
  status: AppointmentStatus
  notes: string | null
  service: { id: string; name: string }
  patient?: { id: string; name: string; phone: string | null; email: string }
}

export type Pagination = {
  currentPage: number
  limit: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type WorkingDay = {
  dayOfWeek: number // 0 = Sunday ... 6 = Saturday
  startTime: string // "09:00", clinic local time
  endTime: string
}

export type TimeOff = {
  id: string
  startAt: string
  endAt: string
  reason: string | null
}

export type AppointmentStats = {
  today: { total: number; remaining: number }
  upcoming: number
  thisMonth: {
    completed: number
    noShow: number
    cancelled: number
    revenue: number
    noShowRate: number | null
  }
}
