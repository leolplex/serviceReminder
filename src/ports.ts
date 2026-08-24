import type { OutageNotice } from './outageLogic'

export type Profile = {
  localidad: string
  address: string
  email: string
}

export interface OutageSource {
  fetch(localidades: string[]): Promise<OutageNotice[]>
}

export interface EmailNotifier {
  readonly configured: boolean
  send(email: string, address: string, notices: OutageNotice[]): Promise<void>
  sendTest(email: string, address: string, localidad: string): Promise<void>
}

export interface ProfileStore {
  load(): Promise<Partial<Profile>>
  save(profile: Partial<Profile>): Promise<void>
  hasSentEmail(weekStart: string): Promise<boolean>
  markEmailSent(weekStart: string): Promise<void>
  hasSentNotification(weekStart: string): Promise<boolean>
  markNotificationSent(weekStart: string): Promise<void>
}

export interface Scheduler {
  schedule(task: () => void, delayMs: number): () => void
}

export interface UserNotifier {
  requestPermission(): Promise<boolean>
  notify(title: string, body: string): void
}
