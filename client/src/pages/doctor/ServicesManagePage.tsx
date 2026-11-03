import { useState } from 'react'
import { Alert, App, Button, Form, Input, InputNumber, Modal, Popconfirm, Table } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, getErrorMessage } from '../../lib/api'
import { PageTitle } from '../../components/PageTitle'
import type { Service } from '../../types'

type ServiceForm = { name: string; description?: string; durationMinutes: number; price: number }

export function ServicesManagePage() {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ServiceForm>()
  // null = modal closed, 'new' = creating, a service = editing it
  const [editing, setEditing] = useState<Service | 'new' | null>(null)

  const { data: services, isPending, error } = useQuery({
    queryKey: ['services'],
    queryFn: async () => (await api.get<{ services: Service[] }>('/services')).data.services,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['services'] })

  const save = useMutation({
    mutationFn: (values: ServiceForm) =>
      editing === 'new' ? api.post('/services', values) : api.patch(`/services/${(editing as Service).id}`, values),
    onSuccess: () => {
      message.success(editing === 'new' ? t('manageServices.added') : t('manageServices.updated'))
      setEditing(null)
      refresh()
    },
    onError: (e) => message.error(getErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => {
      message.success(t('manageServices.removed'))
      refresh()
    },
    onError: (e) => message.error(getErrorMessage(e)),
  })

  function open(service: Service | 'new') {
    setEditing(service)
    form.setFieldsValue(
      service === 'new'
        ? { name: '', description: '', durationMinutes: 30, price: undefined }
        : { name: service.name, description: service.description ?? '', durationMinutes: service.durationMinutes, price: service.price },
    )
  }

  return (
    <>
      <PageTitle
        title={t('manageServices.title')}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => open('new')}>
            {t('manageServices.add')}
          </Button>
        }
      />

      {error && <Alert type="error" showIcon title={getErrorMessage(error)} className="mb-4" />}

      <Table<Service>
        rowKey="id"
        loading={isPending}
        dataSource={services}
        pagination={false}
        scroll={{ x: 640 }}
        columns={[
          {
            title: t('table.service'),
            key: 'name',
            render: (_, s) => (
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-ink/50">{s.description}</div>
              </div>
            ),
          },
          { title: t('manageServices.duration'), dataIndex: 'durationMinutes', render: (m: number) => t('common.minutes', { count: m }) },
          { title: t('table.price'), dataIndex: 'price', render: (p: number) => t('common.price', { price: p }) },
          {
            title: '',
            key: 'actions',
            render: (_, s) => (
              <div className="flex justify-end gap-2">
                <Button size="small" icon={<EditOutlined />} onClick={() => open(s)}>
                  {t('common.edit')}
                </Button>
                <Popconfirm
                  title={t('manageServices.removeConfirm')}
                  description={t('manageServices.removeDescription')}
                  okText={t('common.remove')}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove.mutateAsync(s.id).catch(() => undefined)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label={t('common.remove')} />
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editing === 'new' ? t('manageServices.add') : t('manageServices.editTitle')}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText={t('common.save')}
        confirmLoading={save.isPending}
        forceRender
      >
        <Form<ServiceForm> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)} className="pt-2">
          <Form.Item
            name="name"
            label={t('manageServices.name')}
            rules={[{ required: true, min: 2, max: 100, whitespace: true, message: t('manageServices.nameRule') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('manageServices.description')} rules={[{ max: 500 }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={500} showCount />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="durationMinutes"
              label={t('manageServices.durationLabel')}
              rules={[{ required: true, message: t('manageServices.durationRule') }]}
            >
              <InputNumber min={5} max={240} step={5} precision={0} className="!w-full" />
            </Form.Item>
            <Form.Item name="price" label={t('manageServices.priceLabel')} rules={[{ required: true, message: t('manageServices.priceRule') }]}>
              <InputNumber min={0} precision={0} className="!w-full" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  )
}
