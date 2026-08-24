import { readFile } from 'node:fs/promises'

const required = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY']
const missing = required.filter((name) => !process.env[name])
if (missing.length > 0) {
	console.log(`Email omitido: faltan secrets ${missing.join(', ')}`)
	process.exit(0)
}

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const addressNumbers = (address) => {
	const match = normalize(address).match(/(avenida\s+calle|av\.?\s*calle|ac\.?|calle|cl\.?|carrera|cra\.?|transversal|transv\.?|tv\.?|diagonal|dg\.?)\s*(\d+[a-z]?)[^#\d]*(?:#\s*)?(\d+[a-z]?)/)
	if (!match) return undefined
	const first = Number.parseInt(match[2], 10)
	const second = Number.parseInt(match[3], 10)
	return ['carrera', 'cra', 'transversal', 'transv', 'tv', 'diagonal', 'dg'].includes(match[1].replace('.', ''))
		? { street: second, carrera: first }
		: { street: first, carrera: second }
}
const inRange = (address, range) => {
	const numbers = addressNumbers(address)
	const values = [...normalize(range).matchAll(/(?:calle|cl|carrera|cra|transversal|transv|tv)\s*(\d+)/g)].map(([, value]) => Number(value))
	if (!numbers || values.length < 4) return false
	const street = values.slice(0, 2)
	const carrera = values.slice(2, 4)
	return numbers.street >= Math.min(...street) && numbers.street <= Math.max(...street)
		&& numbers.carrera >= Math.min(...carrera) && numbers.carrera <= Math.max(...carrera)
}

const snapshot = JSON.parse(await readFile('public/outages.json', 'utf8'))
const profileResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles?select=email,address,localidad`, {
	 headers: { apikey: process.env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}` },
})
if (!profileResponse.ok) throw new Error(`Supabase respondió ${profileResponse.status}`)
const profiles = await profileResponse.json()
let sent = 0
for (const profile of profiles) {
	const notices = snapshot.notices.filter((notice) => normalize(notice.localidad).includes(normalize(profile.localidad)) && inRange(profile.address, notice.addressRange ?? notice.detail ?? ''))
	if (notices.length === 0) continue
	const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({
		service_id: process.env.EMAILJS_SERVICE_ID,
		template_id: process.env.EMAILJS_TEMPLATE_ID,
		user_id: process.env.EMAILJS_PUBLIC_KEY,
		accessToken: process.env.EMAILJS_PRIVATE_KEY,
		template_params: {
			to_email: profile.email,
			address: profile.address,
			locality: notices[0].localidad,
			outage_date: notices.map((notice) => notice.date).join(', '),
			neighborhoods: notices.map((notice) => notice.barrios ?? 'Sector publicado por Acueducto').join(' | '),
			hours: notices.map((notice) => notice.hours ?? 'Consultar fuente oficial').join(' | '),
		},
		}),
	})
	if (!response.ok) throw new Error(`EmailJS respondió ${response.status}: ${await response.text()}`)
	sent += 1
}
console.log(`Emails enviados: ${sent}`)
