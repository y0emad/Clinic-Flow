import dayjs, { type Dayjs } from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

// All times are shown in the clinic's timezone, wherever the user is.
export const CLINIC_TZ = 'Africa/Cairo'
export const BOOKING_DAYS_AHEAD = 60
export const CANCEL_NOTICE_HOURS = 2

export const inClinic = (date: string | Date | Dayjs) => dayjs(date).tz(CLINIC_TZ)

// Today's date in the clinic, as a plain date ("2026-11-07").
export const clinicTodayString = () => dayjs().tz(CLINIC_TZ).format('YYYY-MM-DD')

// Day names follow the current language (dayjs locale is set in i18n/index.ts); Arabic uses its own comma.
const comma = () => (dayjs.locale() === 'ar' ? '،' : ',')
export const formatDay = (date: Dayjs) => date.format(`ddd${comma()} D MMM`)
export const formatLongDay = (date: Dayjs) => date.format(`dddd${comma()} D MMMM YYYY`)
export const formatDate = (iso: string) => inClinic(iso).format(`ddd${comma()} D MMM YYYY`)
export const formatTime = (iso: string) => inClinic(iso).format('h:mm A')
export const formatDateTime = (iso: string) => inClinic(iso).format(`ddd${comma()} D MMM YYYY · h:mm A`)

// A date / time picked in the browser → the same wall-clock time in the clinic → ISO (UTC) for the API.
export const clinicWallTimeToIso = (value: Dayjs) =>
  dayjs.tz(value.format('YYYY-MM-DDTHH:mm:ss'), CLINIC_TZ).toISOString()

export const hasStarted = (iso: string) => dayjs(iso).isBefore(dayjs())

export const canPatientCancel = (iso: string) => dayjs(iso).diff(dayjs(), 'minute') >= CANCEL_NOTICE_HOURS * 60
