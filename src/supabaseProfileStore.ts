import type { Profile, ProfileStore } from './ports'
import { supabase } from './supabaseClient'

export class SupabaseProfileStore implements ProfileStore {
  private async userId() {
    if (!supabase) throw new Error('Supabase no está configurado')
    const { data: current } = await supabase.auth.getUser()
    if (current.user) return current.user.id
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error || !data.user) throw error ?? new Error('No se pudo crear la sesión anónima')
    return data.user.id
  }

  async load() {
    if (!supabase) return {}
    const userId = await this.userId()
    const { data, error } = await supabase.from('profiles').select('localidad,address,email').eq('user_id', userId).maybeSingle()
    if (error) throw error
    return (data ?? {}) as Partial<Profile>
  }

  async save(profile: Partial<Profile>) {
    if (!supabase) return
    const user_id = await this.userId()
    const { error } = await supabase.from('profiles').upsert({ user_id, ...profile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  }

  async hasSentEmail(weekStart: string) {
    return localStorage.getItem(`service-reminder-email-sent-${weekStart}`) === 'true'
  }

  async markEmailSent(weekStart: string) {
    localStorage.setItem(`service-reminder-email-sent-${weekStart}`, 'true')
  }

  async hasSentNotification(weekStart: string) {
    return localStorage.getItem(`service-reminder-notification-sent-${weekStart}`) === 'true'
  }

  async markNotificationSent(weekStart: string) {
    localStorage.setItem(`service-reminder-notification-sent-${weekStart}`, 'true')
  }
}