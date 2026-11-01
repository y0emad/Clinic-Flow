import { useState } from 'react'
import { Alert, App, Button, Form, Input, InputNumber, Modal, Popconfirm, Table } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, getErrorMessage } from '../../lib/api'
import { PageTitle } from '../../components/PageTitle'
import type { Service } from '../../types'

type ServiceForm = { name: string; description?: string; durationMinutes: number; price: number }

export function ServicesManagePage() {
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
      message.success(editing === 'new' ? 'Service added' : 'Service updated')
      setEditing(null)
      refresh()
    },
    onError: (e) => message.error(getErrorMessage(e)),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => {
      message.success('Service removed')
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
        title="Services"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => open('new')}>
            Add service
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
            title: 'Service',
            key: 'name',
            render: (_, s) => (
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-navy/50">{s.description}</div>
              </div>
            ),
          },
          { title: 'Duration', dataIndex: 'durationMinutes', render: (m: number) => `${m} min` },
          { title: 'Price', dataIndex: 'price', render: (p: number) => `${p} EGP` },
          {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_, s) => (
              <div className="flex justify-end gap-2">
                <Button size="small" icon={<EditOutlined />} onClick={() => open(s)}>
                  Edit
                </Button>
                <Popconfirm
                  title="Remove this service?"
                  description="Patients can't book it anymore. Old appointments stay."
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => remove.mutateAsync(s.id).catch(() => undefined)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={editing === 'new' ? 'Add service' : 'Edit service'}
        open={editing !== null}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText="Save"
        confirmLoading={save.isPending}
        forceRender
      >
        <Form<ServiceForm> form={form} layout="vertical" requiredMark={false} onFinish={(v) => save.mutate(v)} className="pt-2">
          <Form.Item name="name" label="Name" rules={[{ required: true, min: 2, max: 100, whitespace: true, message: '2–100 characters' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ max: 500 }]}>
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} maxLength={500} showCount />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="durationMinutes" label="Duration (min)" rules={[{ required: true, message: '5–240 minutes' }]}>
              <InputNumber min={5} max={240} step={5} precision={0} className="!w-full" />
            </Form.Item>
            <Form.Item name="price" label="Price (EGP)" rules={[{ required: true, message: 'Enter a price' }]}>
              <InputNumber min={0} precision={0} className="!w-full" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  )
}
