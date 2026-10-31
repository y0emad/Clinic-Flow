import type { ReactNode } from 'react'
import { Card, Typography } from 'antd'
import { LogoMark } from './Logo'

// The small centered card used by login, sign up, OTP and password pages.
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex justify-center pt-6 sm:pt-10">
      <Card className="w-full max-w-sm">
        <div className="mb-3 flex justify-center">
          <LogoMark size={44} />
        </div>
        <Typography.Title level={3} className="!mb-2 text-center">
          {title}
        </Typography.Title>
        {subtitle && <p className="mb-6 text-center text-sm text-navy/60">{subtitle}</p>}
        {!subtitle && <div className="mb-6" />}
        {children}
      </Card>
    </div>
  )
}
