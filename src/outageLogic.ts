export type OutageNotice = {
  localidad: string
  date: string
  barrios?: string
  hours?: string
  addressRange?: string
  detail?: string
}

export const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export const bulletinMentionsLocalidad = (bulletin: string, localidad: string) => {
  if (!bulletin.trim() || !localidad.trim()) return false
  return normalize(bulletin).includes(normalize(localidad))
}

export const isDateInWeek = (date: string, weekStart: string) => {
  const target = new Date(`${date}T12:00:00`)
  const start = new Date(`${weekStart}T12:00:00`)
  if (Number.isNaN(target.valueOf()) || Number.isNaN(start.valueOf())) return false

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return target >= start && target <= end
}

const addressNumbers = (address: string) => {
  const match = normalize(address).match(/(avenida\s+calle|av\.?\s*calle|ac\.?|calle|cl\.?|carrera|cra\.?|transversal|transv\.?|tv\.?|diagonal|dg\.?)\s*(\d+[a-z]?)[^#\d]*(?:#\s*)?(\d+[a-z]?)/)
  if (!match) return undefined
  const first = Number.parseInt(match[2], 10)
  const second = Number.parseInt(match[3], 10)
  return ['carrera', 'cra', 'cra.', 'transversal', 'transv', 'transv.', 'tv', 'tv.', 'diagonal', 'dg', 'dg.'].includes(match[1])
    ? { street: second, carrera: first }
    : { street: first, carrera: second }
}

const rangeNumbers = (detail: string, kind: 'calle' | 'carrera') => {
  const labels = kind === 'carrera' ? '(?:carrera|cra|transversal|transv|tv\\.?)' : '(?:avenida\\s+)?(?:calle|cl)'
  const match = normalize(detail).match(new RegExp(`${labels}\\s*(\\d+[a-z]?)[^a-z\\d]+(?:a|hasta)\\s*(?:la\\s+)?${labels}\\s*(\\d+[a-z]?)`))
  return match ? [Number.parseInt(match[1], 10), Number.parseInt(match[2], 10)] : undefined
}

export const addressWithinRange = (address: string, detail = '') => {
  const numbers = addressNumbers(address)
  const streetRange = rangeNumbers(detail, 'calle')
  const carreraRange = rangeNumbers(detail, 'carrera')
  if (!numbers || !streetRange || !carreraRange) return false
  return numbers.street >= Math.min(...streetRange) && numbers.street <= Math.max(...streetRange)
    && numbers.carrera >= Math.min(...carreraRange) && numbers.carrera <= Math.max(...carreraRange)
}

export const hasOutageThisWeek = (
  bulletin: string,
  localidad: string,
  notices: OutageNotice[],
  weekStart: string,
  address = '',
) => {
  if (!bulletinMentionsLocalidad(bulletin, localidad)) return false
  return notices.some((notice) => noticeAppliesToAddress(notice, localidad, weekStart, address))
}

export const noticeAppliesToAddress = (notice: OutageNotice, localidad: string, weekStart: string, address = '') =>
  normalize(notice.localidad).includes(normalize(localidad))
    && isDateInWeek(notice.date, weekStart)
    && (!address || addressWithinRange(address, notice.addressRange ?? notice.detail))

export const addressIsReady = (address: string) => address.trim().length >= 8

const getTimeZoneOffsetMinutes = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const values = Object.fromEntries(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, Number(part.value)]))

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  )

  return (asUtc - date.getTime()) / 60000
}

export const nextSundayAtSixPm = (now = new Date()) => {
  const timeZone = 'America/Bogota'
  const offsetMinutes = getTimeZoneOffsetMinutes(now, timeZone)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(now)
  const values = Object.fromEntries(parts
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]))

  const day = Number(values.day)
  const month = Number(values.month)
  const year = Number(values.year)
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  const daysUntilSunday = (7 - weekday) % 7

  const targetUtc = Date.UTC(year, month - 1, day + daysUntilSunday, 18, 0, 0) - offsetMinutes * 60_000
  const next = new Date(targetUtc)
  if (next <= now) next.setUTCDate(next.getUTCDate() + 7)
  return next
}
