import type { OutageNotice } from './outageLogic'
import type { EmailNotifier } from './ports'
import { supabase, supabaseIsConfigured } from './supabaseClient'

export const emailIsConfigured = supabaseIsConfigured
export const emailIsValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254

export const weeklyEmailParams = (email: string, address: string, notices: OutageNotice[]) => ({
  to_email: email,
  address,
  locality: notices[0]?.localidad ?? '',
  outage_date: notices.map((notice) => notice.date).join(', '),
  neighborhoods: notices.map((notice) => notice.barrios ?? 'Sector publicado por Acueducto').join(' | '),
  hours: notices.map((notice) => notice.hours ?? 'Consultar fuente oficial').join(' | '),
})

export const testEmailParams = (email: string, address: string, localidad: string) => ({
  to_email: email,
  address,
  locality: localidad,
  outage_date: 'Correo de prueba',
  neighborhoods: 'Este mensaje confirma que tu suscripción está activa.',
  hours: 'No es un aviso de corte real.',
})

const sendThroughFunction = async (templateParams: Record<string, string>) => {
  if (!supabase) throw new Error('Supabase no está configurado')
  const { error } = await supabase.functions.invoke('send-subscription-email', { body: templateParams })
  if (error) throw error
}

export const sendWeeklyOutageEmail = async (email: string, address: string, notices: OutageNotice[]) => {
  if (!emailIsValid(email) || notices.length === 0) return
  if (!emailIsConfigured) throw new Error('EmailJS no está configurado')

  await sendThroughFunction(weeklyEmailParams(email, address, notices))
}

export const sendSubscriptionTestEmail = async (email: string, address: string, localidad: string) => {
  if (!emailIsValid(email)) return
  if (!emailIsConfigured) throw new Error('EmailJS no está configurado')

  await sendThroughFunction(testEmailParams(email, address, localidad))
}

export class EmailJsNotifier implements EmailNotifier {
  readonly configured = emailIsConfigured

  async send(email: string, address: string, notices: OutageNotice[]) {
    await sendWeeklyOutageEmail(email, address, notices)
  }

  async sendTest(email: string, address: string, localidad: string) {
    await sendSubscriptionTestEmail(email, address, localidad)
  }
}
