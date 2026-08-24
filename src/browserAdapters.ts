import type { Profile, ProfileStore, Scheduler, UserNotifier } from './ports'

const keys = {
  localidad: 'service-reminder-localidad',
  address: 'service-reminder-address',
  email: 'service-reminder-email',
}

export class LocalStorageProfileStore implements ProfileStore {
  private readonly storage: Storage

  constructor(storage: Storage = localStorage) {
    this.storage = storage
  }

  async load(): Promise<Partial<Profile>> {
    return {
      localidad: this.storage.getItem(keys.localidad) ?? undefined,
      address: this.storage.getItem(keys.address) ?? undefined,
      email: this.storage.getItem(keys.email) ?? undefined,
    }
  }

  async save(profile: Partial<Profile>) {
    Object.entries(profile).forEach(([field, value]) => {
      if (value !== undefined) this.storage.setItem(keys[field as keyof typeof keys], value)
    })
  }

  async hasSentEmail(weekStart: string) {
    return this.storage.getItem(`service-reminder-email-sent-${weekStart}`) === 'true'
  }

  async markEmailSent(weekStart: string) {
    this.storage.setItem(`service-reminder-email-sent-${weekStart}`, 'true')
  }

  async hasSentNotification(weekStart: string) {
    return this.storage.getItem(`service-reminder-notification-sent-${weekStart}`) === 'true'
  }

  async markNotificationSent(weekStart: string) {
    this.storage.setItem(`service-reminder-notification-sent-${weekStart}`, 'true')
  }
}

export class BrowserScheduler implements Scheduler {
  schedule(task: () => void, delayMs: number) {
    const timer = window.setTimeout(task, delayMs)
    return () => window.clearTimeout(timer)
  }
}

export class BrowserNotifier implements UserNotifier {
  async requestPermission() {
    if (!('Notification' in window)) return false
    return (await Notification.requestPermission()) === 'granted'
  }

  notify(title: string, body: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  }
}
