import { parseDate, rowCells, scrapeOfficialHtml, stripHtml } from './acueductoScraperCore.ts'
import type { OutageNotice } from './outageLogic.ts'
import type { OutageSource } from './ports'

export { parseDate, rowCells, scrapeOfficialHtml, stripHtml }

export const ACUEDUCTO_SOURCE_URL = 'https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana'
export const ACUEDUCTO_FETCH_URL = import.meta.env.DEV ? '/api/acueducto' : `${import.meta.env.BASE_URL}outages.json`

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
