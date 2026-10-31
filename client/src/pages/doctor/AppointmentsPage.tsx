import { useState } from 'react'
import { DatePicker, Select } from 'antd'
import type { Dayjs } from 'dayjs'
import { DoctorAppointmentsTable } from '../../components/DoctorAppointmentsTable'
import { PageTitle } from '../../components/PageTitle'
import { STATUS_OPTIONS } from '../../lib/status'
import type { AppointmentStatus } from '../../types'

export function AppointmentsPage() {
  const [date, setDate] = useState<Dayjs | null>(null)
  const [status, setStatus] = useState<AppointmentStatus | undefined>()

  return (
    <>
      <PageTitle title="Appointments" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DatePicker value={date} onChange={setDate} placeholder="Any day (upcoming)" allowClear />
        <Select<AppointmentStatus>
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          placeholder="Any status"
          allowClear
          className="w-40"
        />
        {!date && <span className="text-sm text-navy/50">Showing upcoming appointments. Pick a day to see past ones.</span>}
      </div>

      <DoctorAppointmentsTable date={date?.format('YYYY-MM-DD')} status={status} />
    </>
  )
}
