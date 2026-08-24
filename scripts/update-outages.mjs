import { mkdir, writeFile } from 'node:fs/promises'

const sourceUrl = 'https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana'
const outputPath = 'public/outages.json'
const localidades = ['Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme', 'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba', 'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar', 'Sumapaz'].sort((a, b) => a.localeCompare(b, 'es'))
const months = { enero: '01', febrero: '02', marzo: '03', abril: '04', mayo: '05', junio: '06', julio: '07', agosto: '08', septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12' }
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const stripHtml = (value) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const parseDate = (value) => {
  const numeric = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/)
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`
  const named = value.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})/i)
  return named ? `${named[3]}-${months[normalize(named[2])]}-${named[1].padStart(2, '0')}` : undefined
}

const response = await fetch(sourceUrl)
if (!response.ok) throw new Error(`Acueducto respondió ${response.status}`)
const html = await response.text()
const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
let currentDate
const notices = []
for (const [, rawRow] of rows) {
  const text = stripHtml(rawRow)
  const cells = [...rawRow.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(([, cell]) => stripHtml(cell))
  const rowDate = parseDate(text)
  if (rowDate && !localidades.some((item) => normalize(text).includes(normalize(item)))) currentDate = rowDate
  const localidad = localidades.find((item) => normalize(cells[0] ?? text).includes(normalize(item)))
  const date = rowDate ?? currentDate
  if (localidad && date) notices.push({ localidad, date, barrios: cells[1], addressRange: cells[2], hours: cells[3], detail: cells[2] ?? text })
}
await mkdir('public', { recursive: true })
await writeFile(outputPath, `${JSON.stringify({ updatedAt: new Date().toISOString(), notices }, null, 2)}\n`)
console.log(`Saved ${notices.length} outage notices to ${outputPath}`)
