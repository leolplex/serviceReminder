import { describe, expect, it } from 'vitest'
import { emailIsValid, sendWeeklyOutageEmail, testEmailParams, weeklyEmailParams } from './emailService'

describe('weekly email', () => {
  it('builds a readable EmailJS payload', () => {
    expect(weeklyEmailParams('ana@example.com', 'Cra. 96I #51-99', [{ localidad: 'Engativá', date: '2026-08-25', barrios: 'Los Álamos', hours: '10:00 a.m. 24 horas' }])).toEqual({
      to_email: 'ana@example.com', address: 'Cra. 96I #51-99', locality: 'Engativá', outage_date: '2026-08-25', neighborhoods: 'Los Álamos', hours: '10:00 a.m. 24 horas',
    })
  })

  it('does not call the provider when there is no matching outage', async () => {
    await expect(sendWeeklyOutageEmail('ana@example.com', 'Cra. 96I #51-99', [])).resolves.toBeUndefined()
  })

  it('builds the subscription confirmation payload', () => {
    expect(testEmailParams('ana@example.com', 'Cra. 96I #51-99', 'Engativá')).toEqual({
      to_email: 'ana@example.com',
      address: 'Cra. 96I #51-99',
      locality: 'Engativá',
      outage_date: 'Correo de prueba',
      neighborhoods: 'Este mensaje confirma que tu suscripción está activa.',
      hours: 'No es un aviso de corte real.',
    })
  })

  it('rejects malformed or oversized recipient addresses', () => {
    expect(emailIsValid('ana@example.com')).toBe(true)
    expect(emailIsValid('not-an-email')).toBe(false)
    expect(emailIsValid(`${'a'.repeat(250)}@x.co`)).toBe(false)
  })
})