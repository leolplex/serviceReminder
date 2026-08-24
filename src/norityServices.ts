import { AcueductoOutageSource } from './acueductoScraper'
import { BrowserNotifier, BrowserScheduler, LocalStorageProfileStore } from './browserAdapters'
import { EmailJsNotifier } from './emailService'
import { SupabaseProfileStore } from './supabaseProfileStore'
import { supabaseIsConfigured } from './supabaseClient'

export const profileStore = supabaseIsConfigured ? new SupabaseProfileStore() : new LocalStorageProfileStore()
export const outageSource = new AcueductoOutageSource()
export const emailNotifier = new EmailJsNotifier()
export const scheduler = new BrowserScheduler()
export const userNotifier = new BrowserNotifier()
