// Dates move around as 'YYYY-MM-DD' keys, the same format the API uses.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const pad = (value: number) => String(value).padStart(2, '0')

export function parseKey(key: string) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const isWeekend = (key: string) => [0, 6].includes(parseKey(key).getDay())

// '2026-10-29' → '29 Oct'
export function fmtDay(key: string) {
  const date = parseKey(key)
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`
}

// '2026-10-29' → 'Thu 29 Oct 2026'
export function fmtLongDay(key: string) {
  const date = parseKey(key)
  return `${WEEKDAYS[date.getDay()]} ${fmtDay(key)} ${date.getFullYear()}`
}

// '2026-10' → 'October 2026'
export function fmtMonth(month: string) {
  const [year, index] = month.split('-').map(Number)
  return `${MONTH_NAMES[index - 1]} ${year}`
}

export function shiftMonth(month: string, delta: number) {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(year, index - 1 + delta, 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function monthDays(month: string) {
  const [year, index] = month.split('-').map(Number)
  return Array.from({ length: new Date(year, index, 0).getDate() }, (_, day) => `${month}-${pad(day + 1)}`)
}

// Wall-clock time in the viewer's timezone, e.g. '5:48 PM'.
export function fmtTime(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const hours = date.getHours()
  return `${hours % 12 || 12}:${pad(date.getMinutes())} ${hours >= 12 ? 'PM' : 'AM'}`
}

// '18:30' → '6:30 PM'
export function fmtClock(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return fmtTime(new Date(2000, 0, 1, hours, minutes))
}
