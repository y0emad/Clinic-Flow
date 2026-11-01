import type { ReactNode } from 'react'
import { Alert, Card, Skeleton, Statistic } from 'antd'
import { CalendarOutlined, CheckCircleOutlined, DollarOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../lib/api'
import dayjs from 'dayjs'
import { clinicTodayString } from '../../lib/dates'
import { useAuth } from '../../auth/useAuth'
import { DoctorAppointmentsTable } from '../../components/DoctorAppointmentsTable'
import type { AppointmentStats } from '../../types'

function StatCard({ title, value, suffix, icon, hint }: { title: string; value: ReactNode; suffix?: string; icon: ReactNode; hint?: string }) {
  return (
    <Card size="small">
      <div className="flex items-start justify-between">
        <Statistic title={title} value={value as number} suffix={suffix} />
        <span className="text-2xl text-teal">{icon}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-navy/50">{hint}</p>}
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const today = clinicTodayString()

  const { data: stats, isPending, error } = useQuery({
    queryKey: ['appointments', 'stats'],
    queryFn: async () => (await api.get<{ stats: AppointmentStats }>('/appointments/stats')).data.stats,
  })

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">Hello, {user?.name}</h1>
        <p className="text-navy/60">{dayjs(today).format('dddd, D MMMM YYYY')}</p>
      </div>

      {error && <Alert type="error" showIcon title={getErrorMessage(error)} className="mb-4" />}
      {isPending && <Skeleton active />}

      {stats && (
        <>
          <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Today" value={stats.today.total} icon={<CalendarOutlined />} hint={`${stats.today.remaining} still to come`} />
            <StatCard title="Upcoming" value={stats.upcoming} icon={<FieldTimeOutlined />} hint="Booked, from now on" />
            <StatCard title="Completed this month" value={stats.thisMonth.completed} icon={<CheckCircleOutlined />} hint={`${stats.thisMonth.cancelled} cancelled`} />
            <StatCard title="Revenue this month" value={stats.thisMonth.revenue} suffix="EGP" icon={<DollarOutlined />} hint="From completed visits" />
          </div>
          <p className="mb-8 text-sm text-navy/60">
            No-show rate this month:{' '}
            <b>{stats.thisMonth.noShowRate === null ? '—' : `${stats.thisMonth.noShowRate}%`}</b> ({stats.thisMonth.noShow} no-show)
          </p>
        </>
      )}

      <h2 className="mb-4 text-xl font-semibold">Today's appointments</h2>
      <DoctorAppointmentsTable date={today} showDate={false} />
    </>
  )
}
