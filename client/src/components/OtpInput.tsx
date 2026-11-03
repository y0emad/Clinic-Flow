import { Input } from 'antd'
import type { OTPProps } from 'antd/es/input/OTP'

// 6-digit code boxes. Always left-to-right, so in Arabic the digits still read in the order they were typed.
export function OtpInput(props: OTPProps) {
  return (
    <div dir="ltr">
      <Input.OTP length={6} formatter={(v) => v.replace(/\D/g, '')} {...props} />
    </div>
  )
}
