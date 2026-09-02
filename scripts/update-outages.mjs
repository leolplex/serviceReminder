import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { scrapeOfficialHtml } from '../src/acueductoScraperCore.ts'
import { LOCALIDADES } from '../src/localidades.ts'

const sourceUrl = 'https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana'
const outputPath = 'public/outages.json'
const localidades = LOCALIDADES

const response = await fetch(sourceUrl)
if (!response.ok) throw new Error(`Acueducto respondió ${response.status}`)
const html = await response.text()
const notices = scrapeOfficialHtml(html, localidades)

const payload = { updatedAt: new Date().toISOString(), notices }
let existing
try {
  existing = JSON.parse(await readFile(outputPath, 'utf8'))
} catch {
  existing = null
}

if (existing && JSON.stringify(existing.notices ?? []) === JSON.stringify(notices)) {
  console.log(`No outage data changes detected. Keeping ${outputPath} unchanged.`)
  process.exit(0)
}

await mkdir('public', { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Saved ${notices.length} outage notices to ${outputPath}`)
