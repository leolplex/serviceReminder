import { describe, expect, it } from 'vitest'
import { LocalStorageProfileStore, withEmailLock } from './browserAdapters'

const memoryStorage = (): Storage => {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key) },
    setItem: (key, value) => { values.set(key, value) },
  }
}

describe('LocalStorageProfileStore', () => {
  it('persists the profile through the storage port', async () => {
    const store = new LocalStorageProfileStore(memoryStorage())
    store.save({ localidad: 'Kennedy', address: 'Cra. 96I #51-99', email: 'ana@example.com' })
    await expect(store.load()).resolves.toEqual({ localidad: 'Kennedy', address: 'Cra. 96I #51-99', email: 'ana@example.com' })
  })

  it('deduplicates email delivery by week', async () => {
    const store = new LocalStorageProfileStore(memoryStorage())
    await expect(store.hasSentEmail('2026-08-24')).resolves.toBe(false)
    await store.markEmailSent('2026-08-24')
    await expect(store.hasSentEmail('2026-08-24')).resolves.toBe(true)
  })

  it('serializes email tasks for the same week', async () => {
    const events: string[] = []
    const first = withEmailLock('2026-08-24', async () => {
      events.push('first-start')
      await new Promise((resolve) => setTimeout(resolve, 5))
      events.push('first-end')
    })
    const second = withEmailLock('2026-08-24', async () => events.push('second'))
    await Promise.all([first, second])
    expect(events).toEqual(['first-start', 'first-end', 'second'])
  })
})
