import type { ReactNode } from 'react'
import { Typography } from 'antd'

export function PageTitle({ title, extra }: { title: string; extra?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <Typography.Title level={2} className="!mb-0">
        {title}
      </Typography.Title>
      {extra}
    </div>
  )
}
