import { useState } from 'react'
import { Alert, App, Button, Calendar, Card, Empty, Input, Skeleton, Spin, Tag } from 'antd'
import { ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { Trans, useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../auth/useAuth'
import { BOOKING_DAYS_AHEAD, clinicTodayString, formatDateTime, formatDay, hasStarted, inClinic } from '../lib/dates'
import { MAX_UPCOMING_BOOKINGS } from '../lib/appointments'
import type { Appointment, Service, Slot } from '../types'

type Availability = { closed: boolean; slots: Slot[] }

const myAppointmentsLink = { link: <Link to="/my-appointments" /> }

export function BookPage() {
  const { serviceId } = useParams() as { serviceId: string }
  const { user } = useAuth()
  const { t } = useTranslation()
  const { message, modal } = App.useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // The calendar works with plain dates; "today" is today in the clinic.
  const today = dayjs(clinicTodayString())
  const [date, setDate] = useState<Dayjs>(today)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [notes, setNotes] = useState('')
  const dateString = date.format('YYYY-MM-DD')

  const service = useQuery({
    queryKey: ['services', serviceId],
    queryFn: async () => (await api.get<{ service: Service }>(`/services/${serviceId}`)).data.service,
  })

  // The patient's upcoming bookings: the API allows one per day and MAX_UPCOMING_BOOKINGS in total,
  // so those days are disabled here instead of failing after "Book".
  const isPatient = user?.role === 'PATIENT'
  const myUpcoming = useQuery({
    queryKey: ['appointments', 'me', 'upcoming'],
    queryFn: async () =>
      (await api.get<{ appointments: Appointment[] }>('/appointments/me', { params: { status: 'BOOKED', limit: 50 } }))
        .data.appointments,
    select: (list) => list.filter((a) => !hasStarted(a.startAt)),
    enabled: isPatient,
  })
  const bookedDays = new Set((myUpcoming.data ?? []).map((a) => inClinic(a.startAt).format('YYYY-MM-DD')))
  const atLimit = (myUpcoming.data?.length ?? 0) >= MAX_UPCOMING_BOOKINGS
  const dayAlreadyBooked = bookedDays.has(dateString)

  const availability = useQuery({
    queryKey: ['availability', serviceId, dateString],
    queryFn: async () =>
      (await api.get<Availability>(`/availability/${serviceId}`, { params: { date: dateString } })).data,
    enabled: service.isSuccess && !dayAlreadyBooked,
  })

  const book = useMutation({
    mutationFn: () =>
      api.post('/appointments', { serviceId, startAt: slot!.startAt, notes: notes.trim() || undefined }),
    onSuccess: () => {
      message.success(t('book.booked'))
      queryClient.invalidateQueries({ queryKey: ['availability'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      navigate('/my-appointments')
    },
    onError: (error) => {
      message.error(getErrorMessage(error))
      setSlot(null)
      availability.refetch() // someone may have taken the slot
    },
  })

  function pickDate(value: Dayjs) {
    setDate(value)
    setSlot(null)
  }

  if (service.isPending) return <Skeleton active />
  if (service.error) {
    return (
      <Alert type="error" showIcon title={getErrorMessage(service.error)} action={<Link to="/">{t('common.back')}</Link>} />
    )
  }

  const s = service.data
  const lastDay = today.add(BOOKING_DAYS_AHEAD, 'day')

  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm">
        <ArrowLeftOutlined className="rtl:rotate-180" /> {t('book.allServices')}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold">{s.name}</h1>
          <p className="text-ink/60">{s.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Tag icon={<ClockCircleOutlined className="text-teal" />}>{t('common.minutes', { count: s.durationMinutes })}</Tag>
          <span className="text-lg font-semibold">{t('common.price', { price: s.price })}</span>
        </div>
      </div>

      {atLimit && (
        <Alert
          type="warning"
          showIcon
          className="mb-6"
          title={t('book.atLimitTitle', { count: MAX_UPCOMING_BOOKINGS })}
          description={<Trans i18nKey="book.atLimitText" components={myAppointmentsLink} />}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card title={t('book.pickDay')} size="small">
          <Calendar
            fullscreen={false}
            value={date}
            validRange={[today, lastDay]}
            disabledDate={(d) =>
              d.isBefore(today, 'day') || d.isAfter(lastDay, 'day') || bookedDays.has(d.format('YYYY-MM-DD'))
            }
            onSelect={(d, { source }) => source === 'date' && pickDate(d)}
            // Booked days are disabled like past days, so mark them to show why.
            fullCellRender={(d, info) =>
              info.type === 'date' && bookedDays.has(d.format('YYYY-MM-DD')) ? (
                <div className="ant-picker-cell-inner !rounded-full !bg-teal/25 !text-ink dark:!bg-teal/45" title={t('book.bookedLegend')}>
                  {d.date()}
                </div>
              ) : (
                info.originNode
              )
            }
          />
          {bookedDays.size > 0 && (
            <p className="mt-2 flex items-center gap-2 text-xs text-ink/60">
              <span className="inline-block size-3 rounded-full bg-teal/25 dark:bg-teal/45" /> {t('book.bookedLegend')}
            </p>
          )}
        </Card>

        <Card title={t('book.pickTime', { date: formatDay(date) })} size="small">
          {dayAlreadyBooked && (
            <Empty description={<Trans i18nKey="book.dayBooked" components={myAppointmentsLink} />} />
          )}
          {!dayAlreadyBooked && availability.isPending && (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          )}
          {availability.error && <Alert type="error" showIcon title={getErrorMessage(availability.error)} />}
          {availability.data?.closed && <Empty description={t('book.closedDay')} />}
          {availability.data && !availability.data.closed && availability.data.slots.length === 0 && (
            <Empty description={t('book.noSlots')} />
          )}

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
            {availability.data?.slots.map((x) => (
              <Button
                key={x.startAt}
                type={slot?.startAt === x.startAt ? 'primary' : 'default'}
                onClick={() => setSlot(x)}
              >
                {dayjs(`2000-01-01T${x.time}`).format('h:mm A')}
              </Button>
            ))}
          </div>

          <div className="mt-6 border-t border-ink/5 pt-4">
            <p className="mb-2 text-sm font-medium">{t('book.notes')}</p>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              showCount
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder={t('book.notesPlaceholder')}
            />
          </div>

          <div className="mt-9 flex justify-end">
            {user?.role === 'DOCTOR' ? (
              <Alert type="info" showIcon title={t('book.onlyPatients')} />
            ) : user ? (
              <Button
                type="primary"
                size="large"
                disabled={!slot || atLimit || dayAlreadyBooked}
                onClick={() =>
                  modal.confirm({
                    title: t('book.confirmTitle'),
                    content: (
                      <p>
                        <b>{s.name}</b> · <b>{formatDateTime(slot!.startAt)}</b> · {t('common.price', { price: s.price })}
                      </p>
                    ),
                    okText: t('book.confirmOk'),
                    onOk: () => book.mutateAsync().catch(() => undefined),
                  })
                }
              >
                {t('book.submit')}
              </Button>
            ) : (
              <Button type="primary" size="large" onClick={() => navigate('/login', { state: { from: location.pathname } })}>
                {t('book.loginToBook')}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
