import { useState } from 'react'
import { Alert, Button, Popconfirm, Segmented, Table, Tooltip } from 'antd'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { api, getErrorMessage } from '../lib/api'
import { PAGE_SIZE, useCancelAppointment } from '../lib/appointments'
import { CANCEL_NOTICE_HOURS, canPatientCancel, formatDate, formatTime } from '../lib/dates'
import { StatusTag } from '../components/StatusTag'
import { STATUS_OPTIONS } from '../lib/status'
import { PageTitle } from '../components/PageTitle'
import type { Appointment, AppointmentStatus, Pagination } from '../types'

type Filter = AppointmentStatus | 'ALL'

export function MyAppointmentsPage() {
  const [status, setStatus] = useState<Filter>('ALL')
  const [page, setPage] = useState(1)
  const cancel = useCancelAppointment()

  const { data, isFetching, error } = useQuery({
    queryKey: ['appointments', 'me', status, page],
    queryFn: async () =>
      (
        await api.get<{ appointments: Appointment[]; pagination: Pagination }>('/appointments/me', {
          params: { status: status === 'ALL' ? undefined : status, page, limit: PAGE_SIZE },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <PageTitle
        title="My appointments"
        extra={
          <Link to="/">
            <Button type="primary">Book a new one</Button>
          </Link>
        }
      />

      <Segmented<Filter>
        className="mb-4"
        value={status}
        onChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
        options={[{ value: 'ALL', label: 'All' }, ...STATUS_OPTIONS]}
      />

      {error && <Alert type="error" showIcon title={getErrorMessage(error)} className="mb-4" />}

      <Table<Appointment>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.appointments}
        scroll={{ x: 640 }}
        locale={{ emptyText: 'No appointments here yet' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.pagination.totalItems,
          onChange: setPage,
          showSizeChanger: false,
          hideOnSinglePage: true,
        }}
        columns={[
          { title: 'Date', key: 'date', render: (_, a) => formatDate(a.startAt) },
          { title: 'Time', key: 'time', render: (_, a) => formatTime(a.startAt) },
          { title: 'Service', key: 'service', render: (_, a) => a.service.name },
          { title: 'Price', dataIndex: 'price', render: (price: number) => `${price} EGP` },
          { title: 'Status', dataIndex: 'status', render: (s: AppointmentStatus) => <StatusTag status={s} /> },
          {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_, a) => {
              if (a.status !== 'BOOKED') return null
              if (!canPatientCancel(a.startAt)) {
                return (
                  <Tooltip title={`You can only cancel at least ${CANCEL_NOTICE_HOURS} hours before`}>
                    <Button size="small" disabled>
                      Cancel
                    </Button>
                  </Tooltip>
                )
              }
              return (
                <Popconfirm
                  title="Cancel this appointment?"
                  okText="Yes, cancel"
                  cancelText="Keep it"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => cancel.mutateAsync(a.id).catch(() => undefined)}
                >
                  <Button size="small" danger>
                    Cancel
                  </Button>
                </Popconfirm>
              )
            },
          },
        ]}
      />
    </>
  )
}
