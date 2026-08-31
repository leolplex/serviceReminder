import { readFile } from 'node:fs/promises'

const required = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY']
const missing = required.filter((name) => !process.env[name])
if (missing.length > 0) {
	console.log(`Email omitido: faltan secrets ${missing.join(', ')}`)
	process.exit(0)
}

const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Misma nomenclatura que src/outageLogic.ts */
const VIA_CALLE = '(?:avenida\\s+calle|av\\.?\\s*calle|ac\\.?|calle|cll|cl\\.?|callejon|cj\\.?|diagonal|dg\\.?)'
const VIA_CARRERA = '(?:avenida\\s+carrera|av\\.?\\s*carrera|ak\\.?|carrera|cra\\.?|kra\\.?|transversal|transv\\.?|tv\\.?|tr\\.?|circular|circ\\.?)'
const VIA_NUMBER = '(\\d{1,4}[a-z]{0,2}(?:\\s*bis)?)'
const VIA_NUMBER_RANGE = `(${VIA_NUMBER})(?:\\s*(?:sur|norte|este|occidente))?`
const CALLE_KEYWORDS = ['calle', 'cll', 'cl', 'callejon', 'cj', 'ac', 'diagonal', 'dg']

const addressNumbers = (address) => {
	const match = normalize(address).match(new RegExp(`(${VIA_CALLE}|${VIA_CARRERA})\\s*${VIA_NUMBER}(?:\\s*(?:sur|norte|este|occidente))?[^\\d]*#?\\s*(\\d{1,4}[a-z]{0,2})`))
	if (!match) return undefined
	const via = match[1]
	const first = Number.parseInt(match[2], 10)
	const second = Number.parseInt(match[3], 10)
	return CALLE_KEYWORDS.some((keyword) => via.includes(keyword))
		? { street: first, carrera: second }
		: { street: second, carrera: first }
}

const extractRange = (detail, kind) => {
	const labels = kind === 'calle' ? VIA_CALLE : VIA_CARRERA
	const matches = [...normalize(detail).matchAll(new RegExp(`${labels}\\s*${VIA_NUMBER_RANGE}`, 'gi'))]
	const numbers = matches.map((match) => Number.parseInt(match[2], 10))
	if (numbers.length === 0) return undefined
	return [Math.min(...numbers), Math.max(...numbers)]
}

const inRange = (address, range) => {
	const numbers = addressNumbers(address)
	const streetRange = extractRange(range, 'calle')
	const carreraRange = extractRange(range, 'carrera')
	if (!numbers || !streetRange || !carreraRange) return false
	return numbers.street >= streetRange[0] && numbers.street <= streetRange[1]
		&& numbers.carrera >= carreraRange[0] && numbers.carrera <= carreraRange[1]
}

const weekStartOf = (dateValue) => {
	const date = new Date(`${dateValue}T12:00:00`)
	const day = date.getDay() || 7
	date.setDate(date.getDate() - day + 1)
	return date.toISOString().slice(0, 10)
}

const supabaseHeaders = () => ({
	apikey: process.env.SUPABASE_SECRET_KEY,
	Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
	'Content-Type': 'application/json',
})

const snapshot = JSON.parse(await readFile('public/outages.json', 'utf8'))
const profileResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/profiles?select=email,address,localidad`, {
	 headers: supabaseHeaders(),
})
if (!profileResponse.ok) throw new Error(`Supabase respondió ${profileResponse.status}`)
const profiles = await profileResponse.json()

const start = new Date(weekStartOf(new Date().toISOString().slice(0, 10)) + 'T12:00:00')
let sent = 0
let skipped = 0
for (const profile of profiles) {
	// Avisos que apliquen a la dirección con fecha de hoy en adelante (incluye la próxima semana si ya salió)
	const applicable = snapshot.notices.filter((notice) => {
		const noticeDate = new Date(`${notice.date}T12:00:00`)
		return noticeDate >= start
			&& normalize(notice.localidad).includes(normalize(profile.localidad))
			&& inRange(profile.address, notice.addressRange ?? notice.detail ?? '')
	})
	const weeks = [...new Set(applicable.map((notice) => weekStartOf(notice.date)))]
	for (const week of weeks) {
		const notices = applicable.filter((notice) => weekStartOf(notice.date) === week)
		// Deduplicación: evita reenviar el mismo aviso de la misma semana
		const sentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/email_sends?select=week_start&email=eq.${encodeURIComponent(profile.email)}&week_start=eq.${week}`, {
			headers: supabaseHeaders(),
		})
		if (!sentResponse.ok) throw new Error(`Supabase respondió ${sentResponse.status}`)
		const existing = await sentResponse.json()
		if (existing.length > 0) {
			skipped += 1
			continue
		}
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
		const insertResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/email_sends`, {
			method: 'POST',
			headers: supabaseHeaders(),
			body: JSON.stringify({ email: profile.email, week_start: week }),
		})
		if (!insertResponse.ok) throw new Error(`Supabase insert respondió ${insertResponse.status}`)
		sent += 1
	}
}
console.log(`Emails enviados: ${sent}, ya enviados (saltados): ${skipped}`)