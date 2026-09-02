import { normalize, type OutageNotice } from './outageLogic.ts'

/**
 * Parser del boletín HTML oficial del Acueducto de Bogotá.
 * Módulo 100% puro (sin import.meta.env ni fetch) para compartirse entre la
 * app (src) y los scripts de automatización (scripts/) que corre Node 24.
 */

const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
}

export const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
export const rowCells = (value: string) => [...value.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]))

export const parseDate = (value: string, year: number) => {
  const numeric = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/)
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`
  const named = value.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i)
  if (named) return `${year}-${MONTHS[normalize(named[2])]}-${named[1].padStart(2, '0')}`
  return undefined
}

export const scrapeOfficialHtml = (html: string, localidades: string[], year = new Date().getFullYear()): OutageNotice[] => {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => ({ text: stripHtml(match[1]), cells: rowCells(match[1]) }))
  let currentDate: string | undefined
  return rows.flatMap(({ text, cells }) => {
    const rowDate = parseDate(text, year)
    if (rowDate && !localidades.some((item) => normalize(text).includes(normalize(item)))) {
      currentDate = rowDate
      return []
    }
    const localidad = localidades.find((item) => normalize(cells[0] ?? text).includes(normalize(item)))
    const date = rowDate ?? currentDate
    if (!localidad || !date) return []
    return [{ localidad, date, barrios: cells[1], addressRange: cells[2], hours: cells[3], detail: cells[2] ?? text }]
  })
}