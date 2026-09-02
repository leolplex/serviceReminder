import { readFile } from 'node:fs/promises'
import { addressWithinRange, normalize, weekStartOf } from '../src/outageLogic.ts'

const required = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY']
const missing = required.filter((name) => !process.env[name])
if (missing.length > 0) {
	console.log(`Email omitido: faltan secrets ${missing.join(', ')}`)
	process.exit(0)
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
			&& addressWithinRange(profile.address, notice.addressRange ?? notice.detail ?? '')
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