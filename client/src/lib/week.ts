import dayjs from 'dayjs'

// Egyptian week order: Saturday first. Values are dayOfWeek (0 = Sunday, like the API).
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5]

// Day name in the current language ("Saturday" / "السبت").
export const dayName = (dayOfWeek: number) => dayjs().day(dayOfWeek).format('dddd')
