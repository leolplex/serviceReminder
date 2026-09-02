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

/**
 * Nomenclatura vial de Bogotá.
 * Eje de calles (paralelas a calles): Calle, Avenida Calle (AC), Av. Calle, Cll, Cl,
 *                                     Callejón (Cj), Diagonal (Dg).
 * Eje de carreras (paralelas a carreras): Carrera, Avenida Carrera (AK), Av. Carrera,
 *                                         Cra, Kra, Transversal (Tv/Tr), Circular (Circ).
 */
const VIA_CALLE = '(?:avenida\\s+calle|av\\.?\\s*calle|ac\\.?|calle|cll|cl\\.?|callejon|cj\\.?|diagonal|dg\\.?)'
const VIA_CARRERA = '(?:avenida\\s+carrera|av\\.?\\s*carrera|ak\\.?|carrera|cra\\.?|kra\\.?|transversal|transv\\.?|tv\\.?|tr\\.?|circular|circ\\.?)'

/** Número de vía con sufijos: 42, 61B, 53 Bis, 82G Bis, 70D, 1A, 68 Sur, 12D Este */
const VIA_NUMBER = '(\\d{1,4}[a-z]{0,2}(?:\\s*bis)?)'

/** Número de vía con orientación (Sur, Este, Norte, Occidente) para rangos del boletín */
const VIA_NUMBER_RANGE = `(${VIA_NUMBER})(?:\\s*(?:sur|norte|este|occidente))?`

/** Palabras clave de cada eje para clasificar el prefijo capturado */
const CALLE_KEYWORDS = ['calle', 'cll', 'cl', 'callejon', 'cj', 'ac', 'diagonal', 'dg']

const addressNumbers = (address: string) => {
  const match = normalize(address).match(new RegExp(`(${VIA_CALLE}|${VIA_CARRERA})\\s*${VIA_NUMBER}(?:\\s*(?:sur|norte|este|occidente))?[^\\d]*#?\\s*(\\d{1,4}[a-z]{0,2})`))
  if (!match) return undefined
  const via = match[1]
  const first = Number.parseInt(match[2], 10)
  const second = Number.parseInt(match[3], 10)
  const isCalle = CALLE_KEYWORDS.some((keyword) => via.includes(keyword))
  return isCalle
    ? { street: first, carrera: second }
    : { street: second, carrera: first }
}

/**
 * Extrae todos los números de un tipo de vía (calle o carrera) mencionados en el
 * detalle del boletín y devuelve el rango [mínimo, máximo]. Si solo hay una
 * mención, el rango es puntual (permite rangos mixtos como "AC 26 Sur a AK 72").
 */
const extractRange = (detail: string, kind: 'calle' | 'carrera') => {
  const labels = kind === 'calle' ? VIA_CALLE : VIA_CARRERA
  const matches = [...normalize(detail).matchAll(new RegExp(`${labels}\\s*${VIA_NUMBER_RANGE}`, 'gi'))]
  const numbers = matches.map((match) => Number.parseInt(match[2], 10))
  if (numbers.length === 0) return undefined
  return [Math.min(...numbers), Math.max(...numbers)]
}

export const addressWithinRange = (address: string, detail = '') => {
  const numbers = addressNumbers(address)
  const streetRange = extractRange(detail, 'calle')
  const carreraRange = extractRange(detail, 'carrera')
  if (!numbers || !streetRange || !carreraRange) return false
  return numbers.street >= streetRange[0] && numbers.street <= streetRange[1]
    && numbers.carrera >= carreraRange[0] && numbers.carrera <= carreraRange[1]
}

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

/**
 * Lunes de la semana a la que pertenece la fecha (formato YYYY-MM-DD).
 * Fuerza mediodía para evitar desfases por zona horaria / horario de ahorro.
 */
export const weekStartOf = (dateValue: string) => {
  const date = new Date(`${dateValue}T12:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
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

/** Valida localidad y dirección sin restricción de fecha (útil para semanas futuras). */
export const noticeMatchesAddress = (notice: OutageNotice, localidad: string, address = '') =>
  normalize(notice.localidad).includes(normalize(localidad))
    && (!address || addressWithinRange(address, notice.addressRange ?? notice.detail))

export const noticeAppliesToAddress = (notice: OutageNotice, localidad: string, weekStart: string, address = '') =>
  noticeMatchesAddress(notice, localidad, address)
    && isDateInWeek(notice.date, weekStart)

export const addressIsReady = (address: string) => address.trim().length >= 8