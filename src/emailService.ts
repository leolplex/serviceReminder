import emailjs from '@emailjs/browser'
import type { OutageNotice } from './outageLogic'
import type { EmailNotifier } from './ports'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export const emailIsConfigured = Boolean(serviceId && templateId && publicKey)
export const emailIsValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254

export const weeklyEmailParams = (email: string, address: string, notices: OutageNotice[]) => ({
  to_email: email,
  address,
  locality: notices[0]?.localidad ?? '',
  outage_date: notices.map((notice) => notice.date).join(', '),
  neighborhoods: notices.map((notice) => notice.barrios ?? 'Sector publicado por Acueducto').join(' | '),
  hours: notices.map((notice) => notice.hours ?? 'Consultar fuente oficial').join(' | '),
})

export const sendWeeklyOutageEmail = async (email: string, address: string, notices: OutageNotice[]) => {
  if (!emailIsValid(email) || notices.length === 0) return
  if (!emailIsConfigured) throw new Error('EmailJS no está configurado')

  await emailjs.send(serviceId, templateId, weeklyEmailParams(email, address, notices), { publicKey })
}

export class EmailJsNotifier implements EmailNotifier {
  readonly configured = emailIsConfigured

  async send(email: string, address: string, notices: OutageNotice[]) {
    await sendWeeklyOutageEmail(email, address, notices)
  }
}
