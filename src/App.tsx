import { useCallback, useEffect, useMemo, useState } from 'react'
import { ACUEDUCTO_SOURCE_URL } from './acueductoScraper'
import { emailIsValid } from './emailService'
import { emailNotifier, outageSource, profileStore, scheduler, userNotifier } from './norityServices'
import { LOCALIDADES } from './localidades'
import { addressIsReady, noticeAppliesToAddress, weekStartOf, type OutageNotice } from './outageLogic'

const currentMonday = () => weekStartOf(new Date().toISOString().slice(0, 10))

const nextWeekStart = (weekStart: string) => {
  const date = new Date(`${weekStart}T12:00:00`)
  date.setDate(date.getDate() + 7)
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
  const upcomingWeekStarts = useMemo(() => [weekStart, nextWeekStart(weekStart)], [weekStart])
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

  const addressIncomplete = !localidad || !addressIsReady(address)
  const visibleSyncStatus = addressIncomplete ? (localidad ? 'Dirección incompleta' : 'Sin consultar') : syncStatus
  const localNotices = useMemo(() => {
    if (addressIncomplete) return []
    return notices.filter((notice) => upcomingWeekStarts.some((start) => noticeAppliesToAddress(notice, localidad, start, address)))
  }, [address, addressIncomplete, localidad, notices, upcomingWeekStarts])
  const hasOutage = localNotices.length > 0
  const isSubscribed = Boolean(email.trim()) && emailIsValid(email)

  const syncWithAcueducto = useCallback(async () => {
    setSyncStatus('Consultando Acueducto...')
    try {
      const fetchedNotices = await outageSource.fetch(LOCALIDADES)
      setNotices(fetchedNotices)
      setSyncStatus(`${fetchedNotices.length} avisos encontrados`)
      const matchingNotices = fetchedNotices.filter((notice) => noticeAppliesToAddress(notice, localidad, weekStart, address))
      if (notificationsEnabled && matchingNotices.length > 0 && !await profileStore.hasSentNotification(weekStart)) {
        userNotifier.notify('Corte de agua en tu localidad', `Hay un corte para ${address}, en ${localidad}.`)
        await profileStore.markNotificationSent(weekStart)
      }
    } catch {
      setSyncStatus('No se pudo consultar (revisa CORS o conexión)')
      notifyUser('error', 'No se pudo consultar el boletín de Acueducto.')
    }
  }, [address, localidad, notificationsEnabled, weekStart])

  useEffect(() => {
    if (addressIncomplete) return

    return scheduler.schedule(() => {
      setSyncStatus('Verificando nueva dirección...')
      void syncWithAcueducto()
    }, 650)
  }, [addressIncomplete, address, localidad, syncWithAcueducto])

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
        <div className="brand-mark" role="img" aria-label="Castillo ambulante de Howl">
          <svg viewBox="0 0 64 64" width="34" height="34" aria-hidden="true">
            <g transform="translate(32 32) scale(.8) translate(-32 -32)">
              <ellipse cx="32" cy="61.3" rx="21" ry="2.6" fill="#7aae63" opacity=".55" />
              <rect x="12" y="24" width="15" height="28" rx="1.5" fill="#5c8492" />
              <polygon points="9,25 30,25 19.5,11" fill="#c24127" />
              <rect x="24" y="28" width="22" height="24" rx="2" fill="#6b95a3" />
              <rect x="30" y="19" width="5" height="9" rx="1" fill="#a36a3c" />
              <circle cx="33.5" cy="13" r="2.8" fill="#e8ece7" opacity=".85" />
              <circle cx="37.5" cy="9" r="2.2" fill="#e8ece7" opacity=".55" />
              <rect x="40" y="14" width="15" height="38" rx="1.5" fill="#7da3b0" />
              <polygon points="37,15 58,15 47.5,3" fill="#2f4f8f" />
              <line x1="47.5" y1="3" x2="47.5" y2="1" stroke="#4a3428" strokeWidth="1.4" />
              <circle cx="47.5" cy="1" r="1.2" fill="#e2764e" />
              <path d="M4.8 47.5 L20.2 47.5 L16 41.5 L9 41.5 Z" fill="#7a4a2e" />
              <rect x="6" y="47" width="13" height="9" rx="2" fill="#a63d1d" />
              <rect x="9.5" y="50" width="5" height="4" rx="1" fill="#ffe9a8" />
              <path d="M31.5 52 v-3.5 a3.7 3.7 0 0 1 7.4 0 v3.5 Z" fill="#8a5a3c" />
              <rect x="16.5" y="30" width="4" height="5" rx="1" fill="#ffe9a8" />
              <rect x="16.5" y="39" width="4" height="5" rx="1" fill="#ffe9a8" />
              <rect x="28" y="33" width="4" height="5" rx="1" fill="#ffe9a8" />
              <rect x="38" y="33" width="4" height="5" rx="1" fill="#ffe9a8" />
              <rect x="28" y="42" width="4" height="5" rx="1" fill="#ffe9a8" />
              <rect x="38" y="42" width="4" height="5" rx="1" fill="#ffe9a8" />
              <rect x="45.5" y="20" width="4" height="6" rx="1" fill="#ffe9a8" />
              <rect x="45.5" y="30" width="4" height="6" rx="1" fill="#ffe9a8" />
              <rect x="45.5" y="40" width="4" height="6" rx="1" fill="#ffe9a8" />
              <rect x="14" y="52" width="3" height="7.5" rx="1.3" fill="#4a3428" />
              <rect x="48" y="52" width="3" height="7.5" rx="1.3" fill="#4a3428" />
              <path d="M11.5 58.5 Q14.5 61.5 17.5 58.5" fill="none" stroke="#4a3428" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M47.5 58.5 Q50.5 61.5 53.5 58.5" fill="none" stroke="#4a3428" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          </svg>
        </div>
        <div><span className="eyebrow">Bogotá · agua al día</span><strong>Nority</strong></div>
      </header>

      <section className="intro">
        <div className="ember-spirit" aria-hidden="true"><span className="flame-core" /><span className="flame-face" /><span className="flame-smile" /></div>
        <p className="kicker">AVISOS LOCALES</p>
        <h1>Que el corte<br /><em>no te tome por sorpresa.</em></h1>
        <p className="intro-copy">Guarda tu localidad y revisa el boletín de los viernes de acueducto. Nority encuentra tu zona y te avisa.</p>
      </section>

      {feedback && <div className={`feedback-toast ${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}><span aria-hidden="true">{feedback.type === 'success' ? '✓' : '!'}</span>{feedback.message}</div>}

      <section className="panel locality-panel">
        <div className="step-heading"><span className="step-number">01</span><div><h2>Tu dirección</h2><p>Solo se guarda en este dispositivo</p></div></div>
        <label htmlFor="localidad">Localidad de Bogotá</label>
        <div className="select-wrap"><select id="localidad" value={localidad} onChange={(event) => setLocalidad(event.target.value)}><option value="">Elige una localidad...</option>{LOCALIDADES.map((item) => <option key={item} value={item}>{item}</option>)}</select><span>⌄</span></div>
        <label htmlFor="address">Dirección en Bogotá</label>
        <input className="address-input" id="address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Ej. Calle 42 # 78-10" />
        <label htmlFor="email">Email para avisos</label>
        <input className="address-input" id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu-correo@ejemplo.com" />
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
        <p className="sync-status" aria-live="polite">{visibleSyncStatus} · <a href={ACUEDUCTO_SOURCE_URL} target="_blank" rel="noreferrer">Ver fuente oficial</a></p>
        <p className="schedule-note">✉ El email semanal se envía automáticamente los viernes 7:00 p. m. (hora Bogotá) si tu dirección está en un rango. Aquí la consulta es manual.</p>
      </section>
    </main>
  )
}

export default App
