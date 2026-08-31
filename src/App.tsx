import { useCallback, useEffect, useMemo, useState } from 'react'
import { ACUEDUCTO_SOURCE_URL } from './acueductoScraper'
import { withEmailLock } from './browserAdapters'
import { emailIsValid } from './emailService'
import { emailNotifier, outageSource, profileStore, scheduler, userNotifier } from './norityServices'
import { addressIsReady, noticeAppliesToAddress, nextSundayAtSixPm, type OutageNotice } from './outageLogic'

const LOCALIDADES = [
  'Usaquén', 'Chapinero', 'Santa Fe', 'San Cristóbal', 'Usme',
  'Tunjuelito', 'Bosa', 'Kennedy', 'Fontibón', 'Engativá', 'Suba',
  'Barrios Unidos', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño',
  'Puente Aranda', 'La Candelaria', 'Rafael Uribe Uribe', 'Ciudad Bolívar',
  'Sumapaz',
].sort((first, second) => first.localeCompare(second, 'es'))

const currentMonday = () => {
  const date = new Date()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

const currentDateLabel = () => new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
type Feedback = { type: 'success' | 'error'; message: string }

function App() {
  const [localidad, setLocalidad] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('service-reminder-notifications') === 'true')
  const weekStart = currentMonday()
  const [notices, setNotices] = useState<OutageNotice[]>([])
  const [syncStatus, setSyncStatus] = useState('Sin consultar')
  const [saved, setSaved] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [activationInProgress, setActivationInProgress] = useState(false)

  const notifyUser = (type: Feedback['type'], message: string) => {
    setFeedback({ type, message })
    window.setTimeout(() => setFeedback(null), 5000)
  }

  useEffect(() => {
    void profileStore.load().then((profile) => {
      setLocalidad(profile.localidad ?? '')
      setAddress(profile.address ?? '')
      setEmail(profile.email ?? '')
      setProfileLoaded(true)
    }).catch(() => setProfileLoaded(true))
  }, [])

  useEffect(() => {
    if (profileLoaded && !activationInProgress) void profileStore.save({ localidad, address, email })
  }, [activationInProgress, address, email, localidad, profileLoaded])

  const localNotices = useMemo(() => notices.filter((notice) => noticeAppliesToAddress(notice, localidad, weekStart, address)), [address, localidad, notices, weekStart])
  const hasOutage = localNotices.length > 0
  const isSubscribed = Boolean(email.trim()) && emailIsValid(email)

  const syncWithAcueducto = useCallback(async (sendEmail = false) => {
    setSyncStatus('Consultando Acueducto...')
    try {
      const fetchedNotices = await outageSource.fetch(LOCALIDADES)
      setNotices(fetchedNotices)
      setSyncStatus(`${fetchedNotices.length} avisos encontrados`)
      if (sendEmail && email && emailNotifier.configured) {
        const matchingNotices = fetchedNotices.filter((notice) => noticeAppliesToAddress(notice, localidad, weekStart, address))
        if (matchingNotices.length > 0) await withEmailLock(weekStart, async () => {
          if (await profileStore.hasSentEmail(weekStart)) return
          await emailNotifier.send(email, address, matchingNotices)
          await profileStore.markEmailSent(weekStart)
          setSyncStatus(`Aviso enviado a ${email}`)
        })
      }
      const matchingNotices = fetchedNotices.filter((notice) => noticeAppliesToAddress(notice, localidad, weekStart, address))
      if (notificationsEnabled && matchingNotices.length > 0 && !await profileStore.hasSentNotification(weekStart)) {
        userNotifier.notify('Corte de agua en tu localidad', `Hay un corte para ${address}, en ${localidad}.`)
        await profileStore.markNotificationSent(weekStart)
      }
    } catch {
      setSyncStatus('No se pudo consultar (revisa CORS o conexión)')
      notifyUser('error', 'No se pudo consultar el boletín de Acueducto.')
    }
  }, [address, email, localidad, notificationsEnabled, weekStart])

  useEffect(() => {
    if (!localidad || !addressIsReady(address)) {
      setNotices([])
      setSyncStatus(localidad ? 'Dirección incompleta' : 'Sin consultar')
      return
    }

    return scheduler.schedule(() => {
      setSyncStatus('Verificando nueva dirección...')
      void syncWithAcueducto()
    }, 650)
  }, [address, localidad, syncWithAcueducto])

  useEffect(() => {
    const runAt = nextSundayAtSixPm()
    return scheduler.schedule(() => {
      void syncWithAcueducto(true)
    }, runAt.getTime() - Date.now())
  }, [syncWithAcueducto])

  const requestNotifications = async () => {
    if (await userNotifier.requestPermission()) {
      setNotificationsEnabled(true)
      localStorage.setItem('service-reminder-notifications', 'true')
      if (hasOutage) userNotifier.notify('Corte de agua en tu localidad', `Hay un aviso para ${address}, en ${localidad}. Revisa el boletín guardado.`)
    }
  }

  const saveLocalidad = async () => {
    if (!localidad || !addressIsReady(address) || !emailIsValid(email)) {
      const message = 'Completa una dirección, localidad y correo válidos.'
      setSyncStatus(message)
      notifyUser('error', message)
      return
    }

    const normalizedAddress = address.trim()
    const normalizedEmail = email.trim()
    setActivationInProgress(true)
    try {
      await profileStore.save({ address: normalizedAddress, localidad, email: normalizedEmail })
      if (emailIsValid(normalizedEmail)) {
        await emailNotifier.sendTest(normalizedEmail, normalizedAddress, localidad)
        setSyncStatus(`Correo de prueba enviado a ${normalizedEmail}`)
        notifyUser('success', `Suscripción activada. Revisa ${email.trim()}.`)
      } else {
        setSyncStatus('Escribe un correo válido para activar la suscripción')
        notifyUser('error', 'Escribe un correo válido para activar la suscripción.')
      }
      await requestNotifications()
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2200)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'No se pudo guardar la suscripción'
      setSyncStatus(`No se pudo activar la suscripción: ${detail}`)
      notifyUser('error', `No se pudo activar la suscripción: ${detail}`)
    } finally {
      setActivationInProgress(false)
    }
  }

  const unsubscribe = async () => {
    if (!localidad || !addressIsReady(address)) {
      const message = 'Completa una dirección y localidad antes de cancelar la suscripción.'
      setSyncStatus(message)
      notifyUser('error', message)
      return
    }

    const normalizedAddress = address.trim()
    setActivationInProgress(true)
    try {
      await profileStore.save({ address: normalizedAddress, localidad, email: '' })
      setEmail('')
      setSyncStatus('Suscripción cancelada')
      notifyUser('success', 'Suscripción cancelada.')
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2200)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'No se pudo cancelar la suscripción'
      setSyncStatus(`No se pudo cancelar la suscripción: ${detail}`)
      notifyUser('error', `No se pudo cancelar la suscripción: ${detail}`)
    } finally {
      setActivationInProgress(false)
    }
  }

  const handleSubscription = async () => {
    if (isSubscribed) {
      await unsubscribe()
      return
    }
    await saveLocalidad()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark" role="img" aria-label="Logo de perro negro">🐕‍⬛</div>
        <div><span className="eyebrow">Bogotá · agua al día</span><strong>Nority</strong></div>
        <span className="offline-pill"><span /> Sin hosting</span>
      </header>

      <section className="intro">
        <div className="ember-spirit" aria-hidden="true"><span className="flame-core" /><span className="flame-face" /><span className="flame-smile" /></div>
        <p className="kicker">AVISOS LOCALES</p>
        <h1>Que el corte<br /><em>no te tome por sorpresa.</em></h1>
        <p className="intro-copy">Guarda tu localidad y revisa el boletín dominical de acueducto. Nority encuentra tu zona y te avisa.</p>
      </section>

      {feedback && <div className={`feedback-toast ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}><span aria-hidden="true">{feedback.type === 'success' ? '✓' : '!'}</span>{feedback.message}</div>}

      <section className="panel locality-panel">
        <div className="step-heading"><span className="step-number">01</span><div><h2>Tu dirección</h2><p>Solo se guarda en este dispositivo</p></div></div>
        <label htmlFor="address">Dirección en Bogotá</label>
        <input className="address-input" id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ej. Calle 42 # 78-10" />
        <label htmlFor="email">Email para avisos</label>
        <input className="address-input" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu-correo@ejemplo.com" />
        <label htmlFor="localidad">Localidad de Bogotá</label>
        <div className="select-wrap"><select id="localidad" value={localidad} onChange={(event) => setLocalidad(event.target.value)}><option value="">Elige una localidad...</option>{LOCALIDADES.map((item) => <option key={item} value={item}>{item}</option>)}</select><span>⌄</span></div>
        <button className="primary-button" type="button" disabled={activationInProgress || !localidad || !addressIsReady(address) || (!isSubscribed && !emailIsValid(email))} onClick={handleSubscription}>{activationInProgress ? (isSubscribed ? 'Cancelando suscripción...' : 'Activando suscripción...') : saved ? (isSubscribed ? '✓ Suscripción activa' : '✓ Suscripción cancelada') : (isSubscribed ? 'Darse de baja' : 'Activar suscripción')}</button>
      </section>

      <section className={`status-panel ${hasOutage ? 'alert' : ''}`}>
        <div className="status-icon">{hasOutage ? '!' : '✓'}</div>
        <div><p className="status-label">{hasOutage ? 'AVISO PARA TI' : 'ESTADO DE ESTA SEMANA'}</p><h2>{hasOutage ? `Hay un corte en ${localidad}` : localidad ? `Sin cortes para ${address || localidad}` : 'Guarda tu dirección para empezar'}</h2><p>{hasOutage ? `Tu dirección está en ${localidad}.` : 'Aquí aparecerán los cortes que coincidan con tu zona.'}</p></div>
      </section>

      <section className="panel bulletin-panel">
        <div className="step-heading"><span className="step-number">02</span><div><h2>Boletín de esta semana</h2><p>Actualizado para hoy, {currentDateLabel()}</p></div></div>
        <p className="helper">Nority consulta la fuente oficial y muestra solo los barrios afectados.</p>
        {localNotices.length > 0 ? <div className="notice-list">{localNotices.map((notice) => <article className="notice-card" key={`${notice.date}-${notice.localidad}-${notice.addressRange}`}><p className="notice-date">{new Date(`${notice.date}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p><h3>{notice.localidad}</h3><p><strong>Barrios:</strong> {notice.barrios || 'Sector indicado por Acueducto'}</p><p><strong>Horario:</strong> {notice.hours || 'Consultar en la fuente oficial'}</p><p><strong>Rango:</strong> {notice.addressRange || 'Consultar en la fuente oficial'}</p></article>)}</div> : <div className="empty-notices">Consulta Acueducto para ver los barrios afectados por tu dirección.</div>}
        <div className="button-row"><button className="secondary-button" type="button" onClick={() => void syncWithAcueducto()}>↻ Consultar Acueducto</button></div>
        <p className="sync-status" aria-live="polite">{syncStatus} · <a href={ACUEDUCTO_SOURCE_URL} target="_blank" rel="noreferrer">Ver fuente oficial</a></p>
        <p className="schedule-note">↻ Domingos 6:00 p. m.: consulta y email automático si tu dirección está en un rango. {!emailNotifier.configured && 'Falta configurar EmailJS.'}</p>
      </section>

      <footer><span>Nority funciona sin cuentas ni servidor.</span><span className="footer-dot" /> <span>Datos guardados localmente</span></footer>
    </main>
  )
}

export default App
