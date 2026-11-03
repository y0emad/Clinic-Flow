import { useId } from 'react'

// The mark: a calendar page (sky → teal) with a heartbeat line that ends in a check mark.
// "Booking + health + confirmed" in one shape.
export function LogoMark({ size = 32 }: { size?: number }) {
  const gradient = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="2" y1="5" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#2DD4BF" />
        </linearGradient>
      </defs>
      <rect x="2" y="5" width="28" height="25" rx="7" fill={`url(#${gradient})`} />
      {/* calendar rings */}
      <rect x="8" y="2" width="3.2" height="7" rx="1.6" fill="#E0F2FE" />
      <rect x="20.8" y="2" width="3.2" height="7" rx="1.6" fill="#E0F2FE" />
      {/* heartbeat → check */}
      <path
        d="M6.5 19.5h4l2-4.5 3 8 3.5-6.5 2.5 3 5-6"
        stroke="#1C1C41"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Mark + name. `dark` = on the navy navbar (white "Clinic"), otherwise the page text color.
export function Logo({ dark = false, size = 32 }: { dark?: boolean; size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className={`text-xl font-extrabold tracking-tight ${dark ? 'text-white' : 'text-ink'}`}>
        Clinic
        <span className="bg-linear-to-r from-sky to-teal bg-clip-text text-transparent">Flow</span>
      </span>
    </span>
  )
}
