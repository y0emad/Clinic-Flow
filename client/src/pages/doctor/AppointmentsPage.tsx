import { useState } from 'react'
import { DatePicker, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import { useTranslation } from 'react-i18next'
import { DoctorAppointmentsTable } from '../../components/DoctorAppointmentsTable'
import { PageTitle } from '../../components/PageTitle'
import { STATUSES } from '../../lib/status'
import type { AppointmentStatus } from '../../types'

export function AppointmentsPage() {
  const { t } = useTranslation()
  const [date, setDate] = useState<Dayjs | null>(null)
  const [status, setStatus] = useState<AppointmentStatus | undefined>()

  return (
    <>
      <PageTitle title={t('doctorAppointments.title')} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DatePicker value={date} onChange={setDate} placeholder={t('doctorAppointments.anyDay')} allowClear className="w-48" />
        <Select<AppointmentStatus>
          value={status}
          onChange={setStatus}
          options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
          placeholder={t('doctorAppointments.anyStatus')}
          allowClear
          className="w-40"
        />
        {!date && <span className="text-sm text-ink/50">{t('doctorAppointments.upcomingHint')}</span>}
      </div>

      <DoctorAppointmentsTable date={date?.format('YYYY-MM-DD')} status={status} />
    </>
  )
}
