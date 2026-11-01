import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Card, Empty, Skeleton, Tag } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { Link } from 'react-router'
import { api, getErrorMessage } from '../lib/api'
import { useAuth } from '../auth/useAuth'
import { DAY_NAMES, WEEK_ORDER } from '../lib/week'
import type { Service, WorkingDay } from '../types'

// Public home page: the active services and the clinic's opening hours.
export function ServicesPage() {
  const { user } = useAuth()

  const { data: services, isPending, error } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<{ services: Service[] }>('/services')).data.services,
  })

  const { data: hours } = useQuery({
    queryKey: ['working-hours'],
    queryFn: async () => (await api.get<{ workingHours: WorkingDay[] }>('/schedule/working-hours')).data.workingHours,
  })

  return (
    <>
      <section className="mb-8 rounded-2xl bg-navy px-6 py-10 text-white sm:px-10">
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
          Book your visit in <span className="text-sky">a few clicks</span>
        </h1>
        <p className="max-w-xl text-white/70">
          Pick a service, choose a free time that suits you, and get a confirmation email right away.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <h2 className="mb-4 text-xl font-semibold">Our services</h2>

          {isPending && <Skeleton active />}
          {error && <Alert type="error" showIcon title={getErrorMessage(error)} />}
          {services?.length === 0 && <Empty description="No services yet" />}

          <div className="grid gap-4 sm:grid-cols-2">
            {services?.map((service) => (
              <Card key={service.id} title={service.name} className="flex flex-col">
                <p className="mb-4 min-h-10 text-navy/60">{service.description}</p>
                <div className="mb-4 flex items-center justify-between">
                  <Tag icon={<ClockCircleOutlined className="text-teal" />}>{service.durationMinutes} min</Tag>
                  <span className="font-semibold">{service.price} EGP</span>
                </div>
                {user?.role !== 'DOCTOR' && (
                  <Link to={`/book/${service.id}`}>
                    <Button type="primary" block>
                      Book now
                    </Button>
                  </Link>
                )}
              </Card>
            ))}
          </div>
        </div>

        <aside>
          <h2 className="mb-4 text-xl font-semibold">Opening hours</h2>
          <Card size="small">
            <ul className="divide-y divide-navy/5">
              {WEEK_ORDER.map((day) => {
                const open = hours?.find((h) => h.dayOfWeek === day)
                return (
                  <li key={day} className="flex justify-between py-2 text-sm">
                    <span>{DAY_NAMES[day]}</span>
                    {open ? (
                      <span className="font-medium">
                        {open.startTime} – {open.endTime}
                      </span>
                    ) : (
                      <span className="text-navy/40">Closed</span>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  )
}
