import { useState } from 'react'
import { Alert, App, Button, Calendar, Card, Empty, Input, Skeleton, Spin, Tag } from 'antd'
import { ArrowLeftOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs, { type Dayjs } from 'dayjs'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../auth/useAuth'
import { BOOKING_DAYS_AHEAD, clinicTodayString, formatDateTime } from '../lib/dates'
import type { Service, Slot } from '../types'

type Availability = { closed: boolean; slots: Slot[] }

export function BookPage() {
  const { serviceId } = useParams() as { serviceId: string }
  const { user } = useAuth()
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

  const availability = useQuery({
    queryKey: ['availability', serviceId, dateString],
    queryFn: async () =>
      (await api.get<Availability>(`/availability/${serviceId}`, { params: { date: dateString } })).data,
    enabled: service.isSuccess,
  })

  const book = useMutation({
    mutationFn: () =>
      api.post('/appointments', { serviceId, startAt: slot!.startAt, notes: notes.trim() || undefined }),
    onSuccess: () => {
      message.success('Booked! We sent you a confirmation email')
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
    return <Alert type="error" showIcon title={getErrorMessage(service.error)} action={<Link to="/">Back</Link>} />
  }

  const s = service.data
  const lastDay = today.add(BOOKING_DAYS_AHEAD, 'day')

  return (
    <>
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm">
        <ArrowLeftOutlined /> All services
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-bold">{s.name}</h1>
          <p className="text-navy/60">{s.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Tag icon={<ClockCircleOutlined className="text-teal" />}>{s.durationMinutes} min</Tag>
          <span className="text-lg font-semibold">{s.price} EGP</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card title="1. Pick a day" size="small">
          <Calendar
            fullscreen={false}
            value={date}
            validRange={[today, lastDay]}
            disabledDate={(d) => d.isBefore(today, 'day') || d.isAfter(lastDay, 'day')}
            onSelect={(d, { source }) => source === 'date' && pickDate(d)}
          />
        </Card>

        <Card title={`2. Pick a time · ${date.format('ddd, D MMM')}`} size="small">
          {availability.isPending && (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          )}
          {availability.error && <Alert type="error" showIcon title={getErrorMessage(availability.error)} />}
          {availability.data?.closed && <Empty description="The clinic is closed on this day" />}
          {availability.data && !availability.data.closed && availability.data.slots.length === 0 && (
            <Empty description="No free times left on this day, try another day" />
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

          <div className="mt-6 border-t border-navy/5 pt-4">
            <p className="mb-2 text-sm font-medium">Notes for the doctor (optional)</p>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              showCount
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="Anything the doctor should know before your visit"
            />
          </div>

          <div className="mt-4 flex justify-end">
            {user?.role === 'DOCTOR' ? (
              <Alert type="info" showIcon title="Only patients can book appointments" />
            ) : user ? (
              <Button
                type="primary"
                size="large"
                disabled={!slot}
                onClick={() =>
                  modal.confirm({
                    title: 'Confirm your booking',
                    content: (
                      <p>
                        <b>{s.name}</b> on <b>{formatDateTime(slot!.startAt)}</b> · {s.price} EGP
                      </p>
                    ),
                    okText: 'Book',
                    onOk: () => book.mutateAsync().catch(() => undefined),
                  })
                }
              >
                Book appointment
              </Button>
            ) : (
              <Button type="primary" size="large" onClick={() => navigate('/login', { state: { from: location.pathname } })}>
                Log in to book
              </Button>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
