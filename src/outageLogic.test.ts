import { describe, expect, it } from 'vitest'
import { addressIsReady, addressWithinRange, bulletinMentionsLocalidad, hasOutageThisWeek, isDateInWeek, nextSundayAtSixPm, type OutageNotice } from './outageLogic'

const notices: OutageNotice[] = [{ localidad: 'Kennedy', date: '2026-08-25' }]

describe('outage logic', () => {
  it('accepts a useful address and rejects an incomplete one', () => {
    expect(addressIsReady('Calle 42 # 78-10')).toBe(true)
    expect(addressIsReady('Calle 4')).toBe(false)
  })

  it('matches locality names without depending on accents or case', () => {
    expect(bulletinMentionsLocalidad('Corte en la localidad de Kennedy', 'kennedy')).toBe(true)
    expect(bulletinMentionsLocalidad('Corte en La Candelaria', 'La Candelaria')).toBe(true)
  })

  it('includes only dates from Monday through Sunday', () => {
    expect(isDateInWeek('2026-08-25', '2026-08-24')).toBe(true)
    expect(isDateInWeek('2026-08-30', '2026-08-24')).toBe(true)
    expect(isDateInWeek('2026-09-01', '2026-08-24')).toBe(false)
  })

  it('reports a cut only when locality and week both match', () => {
    expect(hasOutageThisWeek('Kennedy: martes 25', 'Kennedy', notices, '2026-08-24')).toBe(true)
    expect(hasOutageThisWeek('Kennedy: martes 25', 'Bosa', notices, '2026-08-24')).toBe(false)
    expect(hasOutageThisWeek('Kennedy: martes 25', 'Kennedy', notices, '2026-08-31')).toBe(false)
  })

  it('checks the address against the Calle and Carrera boundaries', () => {
    const range = 'De la Calle 42 a la Calle 61B, entre la Carrera 3 a la Carrera 9 Este'
    expect(addressWithinRange('Calle 50 # 5-20', range)).toBe(true)
    expect(addressWithinRange('Calle 70 # 5-20', range)).toBe(false)
    expect(addressWithinRange('Calle 50 # 12-20', range)).toBe(false)
    expect(addressWithinRange('Cl 50 # 5-20', range)).toBe(true)
    expect(addressWithinRange('Carrera 5 # 50-20', range)).toBe(true)
    expect(addressWithinRange('Tv. 5 # 50A-20', range)).toBe(true)
    expect(addressWithinRange('Calle 50 # 5-20', 'De la Avenida Calle 61B a la Avenida Calle 42, entre la Carrera 9 a la Carrera 3')).toBe(true)
  })

  it('supports a Bogotá transversal address with an alphanumeric street', () => {
    const range = 'De la Calle 50A a la Calle 55, entre la Carrera 90 a la Carrera 95'
    expect(addressWithinRange('Tv. 93 #52A-2 a 52A-37', range)).toBe(true)
  })

  it('supports Avenida Calle abbreviated as AC', () => {
    const range = 'De La Calle 26 a la Calle 63, entre la Carrera 93 a la Carrera 122'
    expect(addressWithinRange('AC 63 #109A-47', range)).toBe(true)
    expect(addressWithinRange('Avenida Calle 63 #109A-47', range)).toBe(true)
  })

  it('supports a dotted Carrera abbreviation with a letter suffix', () => {
    const range = 'De la Calle 26 a la Calle 63, entre la Carrera 93 a la Carrera 122'
    expect(addressWithinRange('Cra. 96i #51-99', range)).toBe(true)
  })

  it('supports a Carrera address with the local Colombian format #49A-31', () => {
    const range = 'De la Calle 42 a la Calle 61B, entre la Carrera 68 a la Carrera 80'
    expect(addressWithinRange('Carrera 71#49A-31', range)).toBe(true)
    expect(addressWithinRange('Carrera 71#99A-31', range)).toBe(false)
  })

  it('uses Bogotá time when scheduling the next Sunday alert', () => {
    const nextSunday = nextSundayAtSixPm(new Date('2026-08-24T17:00:00-05:00'))
    const bogota = new Intl.DateTimeFormat('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(nextSunday)
    const values = Object.fromEntries(bogota.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))

    expect(Number(values.day)).toBeGreaterThanOrEqual(30)
    expect(Number(values.hour)).toBe(18)
    expect(Number(values.minute)).toBe(0)
  })

  it('does not alert an address outside the published range', () => {
    const addressNotice: OutageNotice[] = [{ localidad: 'Kennedy', date: '2026-08-25', detail: 'De la Calle 42 a la Calle 61B, entre la Carrera 3 a la Carrera 9' }]
    expect(hasOutageThisWeek('Kennedy: martes 25', 'Kennedy', addressNotice, '2026-08-24', 'Calle 50 # 5-20')).toBe(true)
    expect(hasOutageThisWeek('Kennedy: martes 25', 'Kennedy', addressNotice, '2026-08-24', 'Calle 70 # 5-20')).toBe(false)
  })

  it('schedules the next Sunday at 6:00 p.m. in Bogotá time', () => {
    const nextSunday = nextSundayAtSixPm(new Date('2026-08-24T17:00:00-05:00'))
    const nextSundayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(nextSunday)
    const nextSundayValues = Object.fromEntries(nextSundayParts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
    expect(Number(nextSundayValues.day)).toBeGreaterThanOrEqual(30)
    expect(Number(nextSundayValues.hour)).toBe(18)
    expect(Number(nextSundayValues.minute)).toBe(0)

    const followingSunday = nextSundayAtSixPm(new Date('2026-08-30T19:00:00-05:00'))
    const followingSundayParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(followingSunday)
    const followingSundayValues = Object.fromEntries(followingSundayParts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
    expect(Number(followingSundayValues.day)).toBeGreaterThanOrEqual(6)
    expect(Number(followingSundayValues.hour)).toBe(18)
    expect(Number(followingSundayValues.minute)).toBe(0)
  })
})