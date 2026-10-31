import { useState } from 'react'
import { Alert, Button, Popconfirm, Table, Tooltip } from 'antd'
import { CheckOutlined, CloseOutlined, UserDeleteOutlined } from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { api, getErrorMessage } from '../lib/api'
import { PAGE_SIZE, useCancelAppointment, useUpdateAppointmentStatus } from '../lib/appointments'
import { formatDate, formatTime, hasStarted } from '../lib/dates'
import { StatusTag } from './StatusTag'
import type { Appointment, AppointmentStatus, Pagination } from '../types'

type Props = {
  date?: string // "YYYY-MM-DD"; without it the API returns upcoming appointments
  status?: AppointmentStatus
  showDate?: boolean
}

// The doctor's appointment list with its actions. Used by the dashboard (today) and the appointments page.
export function DoctorAppointmentsTable({ date, status, showDate = true }: Props) {
  const [page, setPage] = useState(1)
  const cancel = useCancelAppointment()
  const updateStatus = useUpdateAppointmentStatus()

  // Back to page 1 when the filters change.
  const filterKey = `${date}|${status}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const { data, isFetching, error } = useQuery({
    queryKey: ['appointments', 'all', date, status, page],
    queryFn: async () =>
      (
        await api.get<{ appointments: Appointment[]; pagination: Pagination }>('/appointments', {
          params: { date, status, page, limit: PAGE_SIZE },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  return (
    <>
      {error && <Alert type="error" showIcon title={getErrorMessage(error)} className="mb-4" />}
      <Table<Appointment>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.appointments}
        scroll={{ x: 760 }}
        locale={{ emptyText: 'No appointments' }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.pagination.totalItems,
          onChange: setPage,
          showSizeChanger: false,
          hideOnSinglePage: true,
        }}
        expandable={{
          rowExpandable: (a) => !!a.notes,
          expandedRowRender: (a) => <p className="text-navy/70">📝 {a.notes}</p>,
        }}
        columns={[
          ...(showDate ? [{ title: 'Date', key: 'date', render: (_: unknown, a: Appointment) => formatDate(a.startAt) }] : []),
          { title: 'Time', key: 'time', render: (_, a) => formatTime(a.startAt) },
          {
            title: 'Patient',
            key: 'patient',
            render: (_, a) => (
              <div>
                <div className="font-medium">{a.patient?.name}</div>
                <div className="text-xs text-navy/50">{a.patient?.phone ?? a.patient?.email}</div>
              </div>
            ),
          },
          { title: 'Service', key: 'service', render: (_, a) => a.service.name },
          { title: 'Price', dataIndex: 'price', render: (price: number) => `${price} EGP` },
          { title: 'Status', dataIndex: 'status', render: (s: AppointmentStatus) => <StatusTag status={s} /> },
          {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_, a) => {
              if (a.status !== 'BOOKED') return null

              // Before it starts the doctor can cancel; after it starts they record what happened.
              if (!hasStarted(a.startAt)) {
                return (
                  <Popconfirm
                    title="Cancel this appointment?"
                    description="The patient gets an email."
                    okText="Yes, cancel"
                    cancelText="Keep it"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => cancel.mutateAsync(a.id).catch(() => undefined)}
                  >
                    <Button size="small" danger icon={<CloseOutlined />}>
                      Cancel
                    </Button>
                  </Popconfirm>
                )
              }
              return (
                <div className="flex justify-end gap-2">
                  <Tooltip title="Patient came">
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={() => updateStatus.mutate({ id: a.id, status: 'COMPLETED' })}
                    >
                      Done
                    </Button>
                  </Tooltip>
                  <Tooltip title="Patient didn't come">
                    <Button
                      size="small"
                      icon={<UserDeleteOutlined />}
                      onClick={() => updateStatus.mutate({ id: a.id, status: 'NO_SHOW' })}
                    >
                      No-show
                    </Button>
                  </Tooltip>
                </div>
              )
            },
          },
        ]}
      />
    </>
  )
}
