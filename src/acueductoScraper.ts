import { normalize, type OutageNotice } from './outageLogic'
import type { OutageSource } from './ports'

export const ACUEDUCTO_SOURCE_URL = 'https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana'
export const ACUEDUCTO_FETCH_URL = import.meta.env.DEV ? '/api/acueducto' : `${import.meta.env.BASE_URL}outages.json`

const MONTHS: Record<string, string> = {
  enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06',
  julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const rowCells = (value: string) => [...value.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => stripHtml(match[1]))

const parseDate = (value: string, year: number) => {
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

export const fetchOfficialOutages = async (localidades: string[], fetcher: typeof fetch = fetch) => {
  const response = await fetcher(ACUEDUCTO_FETCH_URL)
  if (!response.ok) throw new Error(`Acueducto respondió ${response.status}`)
  if (ACUEDUCTO_FETCH_URL.endsWith('outages.json')) {
    const snapshot = await response.json() as { notices: OutageNotice[] }
    return { notices: snapshot.notices, html: '' }
  }
  const html = await response.text()
  if (html.length > 2_000_000) throw new Error('Respuesta del Acueducto demasiado grande')
  return { notices: scrapeOfficialHtml(html, localidades), html }
}

export class AcueductoOutageSource implements OutageSource {
  private readonly fetcher: typeof fetch

  constructor(fetcher: typeof fetch = fetch) {
    this.fetcher = fetcher
  }

  async fetch(localidades: string[]) {
    const result = await fetchOfficialOutages(localidades, this.fetcher)
    return result.notices
  }
}
