import { describe, expect, it } from 'vitest'
import { fetchOfficialOutages, scrapeOfficialHtml } from './acueductoScraper'

const localidades = ['Kennedy', 'La Candelaria', 'Bosa']

describe('Acueducto HTML scraper', () => {
  it('extracts locality and dates from an official-style table row', () => {
    const html = '<table><tr><td>Jueves 27 de agosto de 2026</td></tr><tr><td>Kennedy</td><td>Tintal</td><td>De la Calle 8 a la Calle 10, entre la Carrera 86 a la Carrera 89</td><td>8:00 a.m. a 8:00 p.m.</td><td>Cierre a terceros</td></tr></table>'
    expect(scrapeOfficialHtml(html, localidades)).toEqual([{
      localidad: 'Kennedy',
      date: '2026-08-27',
      barrios: 'Tintal',
      addressRange: 'De la Calle 8 a la Calle 10, entre la Carrera 86 a la Carrera 89',
      hours: '8:00 a.m. a 8:00 p.m.',
      detail: 'De la Calle 8 a la Calle 10, entre la Carrera 86 a la Carrera 89',
    }])
  })

  it('understands Spanish month names and accents', () => {
    const html = '<table><tr><td>La Candelaria</td><td>martes 25 de agosto</td></tr></table>'
    expect(scrapeOfficialHtml(html, localidades, 2026)[0]).toMatchObject({ localidad: 'La Candelaria', date: '2026-08-25' })
  })

  it('applies a date heading to the following outage rows', () => {
    const html = '<table><tr><td>Martes 25 de agosto de 2026</td></tr><tr><td>Kennedy</td><td>Barrios del norte</td><td>De la Calle 42 a la Calle 61B, entre la Carrera 3 a la Carrera 9</td><td>10:00 a.m. 24 horas</td><td>Mantenimiento</td></tr></table>'
    expect(scrapeOfficialHtml(html, localidades)).toEqual([{
      localidad: 'Kennedy',
      date: '2026-08-25',
      barrios: 'Barrios del norte',
      addressRange: 'De la Calle 42 a la Calle 61B, entre la Carrera 3 a la Carrera 9',
      hours: '10:00 a.m. 24 horas',
      detail: 'De la Calle 42 a la Calle 61B, entre la Carrera 3 a la Carrera 9',
    }])
  })

  it('ignores rows without a known locality or date', () => {
    const html = '<table><tr><td>Usaquén</td><td>Información general</td></tr><tr><td>Obras</td></tr></table>'
    expect(scrapeOfficialHtml(html, localidades)).toEqual([])
  })

  it('fetches and parses the remote HTML response', async () => {
    const fetcher: typeof fetch = async () => new Response(
      '<table><tr><td>Bosa</td><td>28/08/2026</td></tr></table>',
      { status: 200 },
    )
    const result = await fetchOfficialOutages(localidades, fetcher)
    expect(result.notices[0]).toMatchObject({ localidad: 'Bosa', date: '2026-08-28' })
  })

  it('rejects a failed remote response', async () => {
    const fetcher: typeof fetch = async () => new Response('', { status: 503 })
    await expect(fetchOfficialOutages(localidades, fetcher)).rejects.toThrow('503')
  })
})
