import { useState } from 'react'
import { Alert, Button, Popconfirm, Segmented, Table, Tooltip } from 'antd'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../lib/api'
import { PAGE_SIZE, useCancelAppointment } from '../lib/appointments'
import { CANCEL_NOTICE_HOURS, canPatientCancel, formatDate, formatTime } from '../lib/dates'
import { StatusTag } from '../components/StatusTag'
import { STATUSES } from '../lib/status'
import { PageTitle } from '../components/PageTitle'
import type { Appointment, AppointmentStatus, Pagination } from '../types'

type Filter = AppointmentStatus | 'ALL'

export function MyAppointmentsPage() {
  const { t } = useTranslation()
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
        title={t('myAppointments.title')}
        extra={
          <Link to="/">
            <Button type="primary">{t('myAppointments.bookNew')}</Button>
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
        options={[
          { value: 'ALL', label: t('myAppointments.all') },
          ...STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
        ]}
      />

      {error && <Alert type="error" showIcon title={getErrorMessage(error)} className="mb-4" />}

      <Table<Appointment>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.appointments}
        scroll={{ x: 640 }}
        locale={{ emptyText: t('myAppointments.empty') }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: data?.pagination.totalItems,
          onChange: setPage,
          showSizeChanger: false,
          hideOnSinglePage: true,
        }}
        columns={[
          { title: t('table.date'), key: 'date', render: (_, a) => formatDate(a.startAt) },
          { title: t('table.time'), key: 'time', render: (_, a) => formatTime(a.startAt) },
          { title: t('table.service'), key: 'service', render: (_, a) => a.service.name },
          { title: t('table.price'), dataIndex: 'price', render: (price: number) => t('common.price', { price }) },
          { title: t('table.status'), dataIndex: 'status', render: (s: AppointmentStatus) => <StatusTag status={s} /> },
          {
            title: '',
            key: 'actions',
            render: (_, a) => {
              if (a.status !== 'BOOKED') return null
              if (!canPatientCancel(a.startAt)) {
                return (
                  <div className="flex justify-end">
                    <Tooltip title={t('myAppointments.cancelTooLate', { hours: CANCEL_NOTICE_HOURS })}>
                      <Button size="small" className="!h-7 !px-3" disabled>
                        {t('common.cancel')}
                      </Button>
                    </Tooltip>
                  </div>
                )
              }
              return (
                <div className="flex justify-end">
                  <Popconfirm
                    title={t('myAppointments.cancelConfirm')}
                    okText={t('common.yesCancel')}
                    cancelText={t('common.keepIt')}
                    okButtonProps={{ danger: true }}
                    onConfirm={() => cancel.mutateAsync(a.id).catch(() => undefined)}
                  >
                    <Button size="small" className="!h-7 !px-3" danger>
                      {t('common.cancel')}
                    </Button>
                  </Popconfirm>
                </div>
              )
            },
          },
        ]}
      />
    </>
  )
}
