import { useState } from 'react'
import { Alert, App, Button, Card, DatePicker, Input, Popconfirm, Segmented, Skeleton, Switch, Table, TimePicker } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { api, getErrorMessage } from '../../lib/api'
import { clinicWallTimeToIso, formatDateTime } from '../../lib/dates'
import { DAY_NAMES, WEEK_ORDER } from '../../lib/week'
import { PageTitle } from '../../components/PageTitle'
import type { TimeOff, WorkingDay } from '../../types'

// ---------- Working hours ----------

type DayRow = { dayOfWeek: number; open: boolean; range: [Dayjs, Dayjs] }

const toTime = (hhmm: string) => dayjs(`2000-01-01T${hhmm}`)

function WorkingHoursEditor({ initial }: { initial: WorkingDay[] }) {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [rows, setRows] = useState<DayRow[]>(() =>
    WEEK_ORDER.map((dayOfWeek) => {
      const day = initial.find((d) => d.dayOfWeek === dayOfWeek)
      return {
        dayOfWeek,
        open: !!day,
        range: [toTime(day?.startTime ?? '09:00'), toTime(day?.endTime ?? '17:00')],
      }
    }),
  )

  const save = useMutation({
    mutationFn: (days: WorkingDay[]) => api.put('/schedule/working-hours', { days }),
    onSuccess: () => {
      message.success('Working hours saved')
      queryClient.invalidateQueries({ queryKey: ['working-hours'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
    onError: (e) => message.error(getErrorMessage(e)),
  })

  function update(dayOfWeek: number, change: Partial<DayRow>) {
    setRows((all) => all.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...change } : r)))
  }

  function onSave() {
    const open = rows.filter((r) => r.open)
    if (open.length === 0) return message.warning('Open at least one day')
    save.mutate(
      open.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.range[0].format('HH:mm'), endTime: r.range[1].format('HH:mm') })),
    )
  }

  return (
    <>
      <ul className="divide-y divide-navy/5">
        {rows.map((r) => (
          <li key={r.dayOfWeek} className="flex flex-wrap items-center gap-3 py-3">
            <Switch checked={r.open} onChange={(open) => update(r.dayOfWeek, { open })} />
            <span className="w-24 font-medium">{DAY_NAMES[r.dayOfWeek]}</span>
            {r.open ? (
              <TimePicker.RangePicker
                className="min-w-0 flex-1 basis-44"
                format="HH:mm"
                minuteStep={15}
                allowClear={false}
                value={r.range}
                onChange={(range) => range?.[0] && range[1] && update(r.dayOfWeek, { range: [range[0], range[1]] })}
              />
            ) : (
              <span className="text-navy/40">Closed</span>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button type="primary" onClick={onSave} loading={save.isPending}>
          Save working hours
        </Button>
      </div>
    </>
  )
}

// ---------- Time off ----------

type Mode = 'days' | 'hours'

function TimeOffSection() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('days')
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [reason, setReason] = useState('')

  const { data: timeOff, isPending, error } = useQuery({
    queryKey: ['time-off'],
    queryFn: async () => (await api.get<{ timeOff: TimeOff[] }>('/schedule/time-off')).data.timeOff,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['time-off'] })
    queryClient.invalidateQueries({ queryKey: ['availability'] })
  }

  const add = useMutation({
    mutationFn: () => {
      const [from, to] = range!
      // Whole days: from the start of the first day to the start of the day after the last one.
      const startAt = mode === 'days' ? from.startOf('day') : from
      const endAt = mode === 'days' ? to.add(1, 'day').startOf('day') : to
      return api.post('/schedule/time-off', {
        startAt: clinicWallTimeToIso(startAt),
        endAt: clinicWallTimeToIso(endAt),
        reason: reason.trim() || undefined,
      })
    },
    onSuccess: () => {
      message.success('Time off added')
      setRange(null)
      setReason('')
      refresh()
    },
    onError: (e) => message.error(getErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/schedule/time-off/${id}`),
    onSuccess: () => {
      message.success('Time off removed')
      refresh()
    },
    onError: (e) => message.error(getErrorMessage(e)),
  })

  const today = dayjs().startOf('day')

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 rounded-lg bg-page p-4">
        <Segmented<Mode>
          value={mode}
          onChange={(m) => {
            setMode(m)
            setRange(null)
          }}
          options={[
            { value: 'days', label: 'Whole days' },
            { value: 'hours', label: 'Specific hours' },
          ]}
          className="self-start"
        />
        <div className="flex flex-wrap gap-3">
          {mode === 'days' ? (
            <DatePicker.RangePicker
              className="w-full sm:w-auto"
              value={range}
              onChange={(v) => setRange(v?.[0] && v[1] ? [v[0], v[1]] : null)}
              disabledDate={(d) => d.isBefore(today)}
            />
          ) : (
            <DatePicker.RangePicker
              className="w-full sm:w-auto"
              showTime={{ format: 'HH:mm', minuteStep: 15 }}
              format="YYYY-MM-DD HH:mm"
              value={range}
              onChange={(v) => setRange(v?.[0] && v[1] ? [v[0], v[1]] : null)}
              disabledDate={(d) => d.isBefore(today)}
            />
          )}
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            maxLength={200}
            className="min-w-48 flex-1"
          />
          <Button type="primary" disabled={!range} loading={add.isPending} onClick={() => add.mutate()}>
            Add time off
          </Button>
        </div>
        <p className="text-xs text-navy/50">Times are in clinic time (Cairo). Up to 30 days at once. Existing bookings are not cancelled.</p>
      </div>

      {error && <Alert type="error" showIcon title={getErrorMessage(error)} className="mb-4" />}

      <Table<TimeOff>
        rowKey="id"
        loading={isPending}
        dataSource={timeOff}
        pagination={false}
        scroll={{ x: 560 }}
        locale={{ emptyText: 'No upcoming time off' }}
        columns={[
          { title: 'From', dataIndex: 'startAt', render: formatDateTime },
          { title: 'To', dataIndex: 'endAt', render: formatDateTime },
          { title: 'Reason', dataIndex: 'reason', render: (r: string | null) => r ?? '—' },
          {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_, t) => (
              <Popconfirm title="Remove this time off?" okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => remove.mutateAsync(t.id).catch(() => undefined)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />
    </>
  )
}

// ---------- Page ----------

export function SchedulePage() {
  const { data: hours, isPending, error } = useQuery({
    queryKey: ['working-hours'],
    queryFn: async () => (await api.get<{ workingHours: WorkingDay[] }>('/schedule/working-hours')).data.workingHours,
  })

  return (
    <>
      <PageTitle title="Schedule" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card title="Weekly working hours" size="small">
          {isPending && <Skeleton active />}
          {error && <Alert type="error" showIcon title={getErrorMessage(error)} />}
          {hours && <WorkingHoursEditor initial={hours} />}
        </Card>
        <Card title="Days off" size="small">
          <TimeOffSection />
        </Card>
      </div>
    </>
  )
}
