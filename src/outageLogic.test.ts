import { describe, expect, it } from 'vitest'
import { addressIsReady, addressWithinRange, bulletinMentionsLocalidad, hasOutageThisWeek, isDateInWeek, neighborhoodsInNotice, noticeAppliesToAddress, noticeIncludesNeighborhood, noticeMatchesProfile, type OutageNotice } from './outageLogic'

const notices: OutageNotice[] = [{
  localidad: 'Kennedy',
  date: '2026-08-25',
  addressRange: 'De la Calle 42 a la Calle 61B, entre la Carrera 3 a la Carrera 9',
  barrios: 'Normandia',
}]

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

  it('matches the address and week when either locality or neighborhood matches', () => {
    expect(hasOutageThisWeek(notices, '2026-08-24', 'Calle 50 # 5-20', 'Kennedy', 'Normandia')).toBe(true)
    expect(hasOutageThisWeek(notices, '2026-08-24', 'Calle 50 # 5-20', 'Kennedy', 'Los Andes')).toBe(true)
    expect(hasOutageThisWeek(notices, '2026-08-31', 'Calle 50 # 5-20', 'Kennedy', 'Normandia')).toBe(false)
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

  it('applies the real Engativá notice for Friday 4 September to a 71#49A-31 address', () => {
    const notice: OutageNotice = {
      localidad: 'Engativá',
      date: '2026-09-04',
      addressRange: 'De la Calle 26 a la Calle 63, entre la Carrera 68 a la Carrera 72',
    }
    expect(noticeAppliesToAddress({ ...notice, barrios: 'Normandia' }, '2026-08-31', 'Carrera 71#49A-31', 'Engativá', 'Normandía')).toBe(true)
  })

  it('shows a matching next-week notice in the UI when the current date is near the week boundary', () => {
    const notice: OutageNotice = {
      localidad: 'Engativá',
      date: '2026-09-04',
      addressRange: 'De la Calle 26 a la Calle 63, entre la Carrera 68 a la Carrera 72',
    }
    const currentWeek = '2026-08-25'
    expect(noticeAppliesToAddress({ ...notice, barrios: 'Normandia' }, currentWeek, 'Carrera 71#49A-31', 'Engativá', 'Normandía')).toBe(false)
  })

  it('does not alert an address outside the published range', () => {
    const addressNotice: OutageNotice[] = [{ localidad: 'Kennedy', date: '2026-08-25', barrios: 'Normandia', detail: 'De la Calle 42 a la Calle 61B, entre la Carrera 3 a la Carrera 9' }]
    expect(hasOutageThisWeek(addressNotice, '2026-08-24', 'Calle 50 # 5-20', 'Kennedy', 'Normandia')).toBe(true)
    expect(hasOutageThisWeek(addressNotice, '2026-08-24', 'Calle 70 # 5-20', 'Kennedy', 'Normandia')).toBe(false)
  })

  it('matches the selected neighborhood as a complete name, not as a substring', () => {
    const notice: OutageNotice = {
      localidad: 'Ciudad Bolívar',
      date: '2026-10-06',
      barrios: 'Bogotá: Sierra Morena II, Sierra Morena, Santa Viviana Soacha: Santo Domingo, Minuto de Dios',
      addressRange: 'De la Carrera 77C a la Transversal 50, entre la Diagonal 73C Sur a la Calle 64A Sur Soacha: Calle 61 a Calle 43F, entre la Diagonal 43J Carrera 18A Este',
    }
    expect(addressWithinRange('Carrera 73A#49A-31', notice.addressRange)).toBe(true)
    expect(noticeIncludesNeighborhood(notice, 'Normandía')).toBe(false)
    expect(noticeAppliesToAddress(notice, '2026-10-05', 'Carrera 73A#49A-31', 'Engativá', 'Normandía')).toBe(false)
    expect(noticeIncludesNeighborhood(notice, 'Sierra Morena')).toBe(true)
    expect(noticeIncludesNeighborhood({ ...notice, barrios: 'Normandia Occidental' }, 'Normandia')).toBe(false)
    expect(noticeMatchesProfile(notice, 'Carrera 73A#49A-31', 'Chapinero', 'Normandía')).toBe(false)
    expect(noticeMatchesProfile(notice, 'Carrera 73A#49A-31', 'Engativá', 'Normandía')).toBe(false)
    expect(noticeMatchesProfile(notice, 'Carrera 73A#49A-31', 'Engativá', 'Sierra Morena')).toBe(true)
    expect(noticeMatchesProfile(notice, 'Carrera 73A#49A-31', 'Ciudad Bolívar', 'Sierra Morena')).toBe(true)
    expect(noticeMatchesProfile(notice, 'Carrera 73A#49A-31', 'Ciudad Bolívar', 'Normandía')).toBe(true)
  })

  it('extracts distinct neighborhood names from a bulletin string', () => {
    expect(neighborhoodsInNotice('Bogotá: Sierra Morena, Santa Viviana Soacha: Santo Domingo, Minuto de Dios')).toEqual([
      'Sierra Morena', 'Santa Viviana', 'Santo Domingo', 'Minuto de Dios',
    ])
  })
})