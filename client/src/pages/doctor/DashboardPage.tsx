import type { ReactNode } from 'react'
import { Alert, Card, Skeleton, Statistic } from 'antd'
import { CalendarOutlined, CheckCircleOutlined, DollarOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../../lib/api'
import { clinicTodayString, formatLongDay } from '../../lib/dates'
import { useAuth } from '../../auth/useAuth'
import { DoctorAppointmentsTable } from '../../components/DoctorAppointmentsTable'
import type { AppointmentStats } from '../../types'

function StatCard({ title, value, suffix, icon, hint }: { title: string; value: number; suffix?: string; icon: ReactNode; hint?: string }) {
  return (
    <Card size="small">
      <div className="flex items-start justify-between">
        <Statistic title={title} value={value} suffix={suffix} />
        <span className="text-2xl text-teal">{icon}</span>
      </div>
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const today = clinicTodayString()

  const { data: stats, isPending, error } = useQuery({
    queryKey: ['appointments', 'stats'],
    queryFn: async () => (await api.get<{ stats: AppointmentStats }>('/appointments/stats')).data.stats,
  })

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">{t('dashboard.hello', { name: user?.name })}</h1>
        <p className="text-ink/60">{formatLongDay(dayjs(today))}</p>
      </div>

      {error && <Alert type="error" showIcon title={getErrorMessage(error)} className="mb-4" />}
      {isPending && <Skeleton active />}

      {stats && (
        <>
          <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('dashboard.today')}
              value={stats.today.total}
              icon={<CalendarOutlined />}
              hint={t('dashboard.stillToCome', { count: stats.today.remaining })}
            />
            <StatCard
              title={t('dashboard.upcoming')}
              value={stats.upcoming}
              icon={<FieldTimeOutlined />}
              hint={t('dashboard.upcomingHint')}
            />
            <StatCard
              title={t('dashboard.completedMonth')}
              value={stats.thisMonth.completed}
              icon={<CheckCircleOutlined />}
              hint={t('dashboard.cancelledCount', { count: stats.thisMonth.cancelled })}
            />
            <StatCard
              title={t('dashboard.revenueMonth')}
              value={stats.thisMonth.revenue}
              suffix={t('common.currency')}
              icon={<DollarOutlined />}
              hint={t('dashboard.revenueHint')}
            />
          </div>
          <p className="mb-8 text-sm text-ink/60">
            {t('dashboard.noShowRate')}{' '}
            <b>{stats.thisMonth.noShowRate === null ? '—' : `${stats.thisMonth.noShowRate}%`}</b>{' '}
            {t('dashboard.noShowCount', { count: stats.thisMonth.noShow })}
          </p>
        </>
      )}

      <h2 className="mb-4 text-xl font-semibold">{t('dashboard.todaysAppointments')}</h2>
      <DoctorAppointmentsTable date={today} showDate={false} />
    </>
  )
}
