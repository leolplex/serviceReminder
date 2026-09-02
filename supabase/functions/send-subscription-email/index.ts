// Envía el correo de confirmación/prueba de suscripción vía EmailJS.
// - Verifica que el JWT sea válido y que el perfil coincida con el destinatario.
// - Limita la cantidad de correos de prueba por usuario (rate limit contra Supabase).
// - CORS restringido a orígenes permitidos (env ALLOWED_ORIGINS + localhost para dev).

const DEFAULT_ALLOWED_ORIGINS = 'https://leolplex.github.io'
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // ventana de 1 hora
const RATE_LIMIT_MAX = 3 // máx. correos de prueba por ventana y usuario

const isAllowedOrigin = (origin: string | null) => {
  if (!origin) return false
  // Desarrollo local (Vite en localhost con puerto arbitrario)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return allowed.includes(origin)
}

const corsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get('Origin') ?? ''
  const base = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  return isAllowedOrigin(origin)
    ? { ...base, 'Access-Control-Allow-Origin': origin }
    : base
}

const json = (
  body: Record<string, string | boolean>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', ...extraHeaders },
})

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254

Deno.serve(async (request) => {
  const extra = corsHeaders(request)
  if (request.method === 'OPTIONS') return new Response('ok', { headers: extra })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, extra)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401, extra)

  const userToken = authorization.slice('Bearer '.length)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${userToken}` },
  })
  if (!userResponse.ok) return json({ error: 'Invalid authentication' }, 401, extra)
  const user = await userResponse.json()

  const missing = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY'].filter((name) => !Deno.env.get(name))
  if (missing.length > 0) return json({ error: `Missing server configuration: ${missing.join(', ')}` }, 500, extra)

  const params = await request.json().catch(() => null)
  if (!params || typeof params.to_email !== 'string' || !isValidEmail(params.to_email)) {
    return json({ error: 'A valid recipient email is required' }, 400, extra)
  }

  // Verifica que la suscripción pertenezca al usuario autenticado
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=email,address,localidad&user_id=eq.${encodeURIComponent(user.id)}`,
    {
      headers: { apikey: anonKey, Authorization: `Bearer ${userToken}` },
    },
  )
  if (!profileResponse.ok) return json({ error: 'Could not verify subscription profile' }, 502, extra)
  const [profile] = await profileResponse.json()
  if (!profile || profile.email !== params.to_email || profile.address !== params.address || profile.localidad !== params.locality) {
    return json({ error: 'Subscription profile does not match the authenticated user' }, 403, extra)
  }

  // Rate limit: cuenta intentos del usuario en la ventana y registra el intento ANTES de enviar.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const rateResponse = await fetch(
    `${supabaseUrl}/rest/v1/email_rate_limits?user_id=eq.${encodeURIComponent(user.id)}&created_at=gte.${encodeURIComponent(since)}&select=id`,
    { headers: { apikey: anonKey, Authorization: `Bearer ${userToken}` } },
  )
  if (!rateResponse.ok) return json({ error: 'Could not check email rate limit' }, 502, extra)
  const attempts = await rateResponse.json()
  if (!Array.isArray(attempts) || attempts.length >= RATE_LIMIT_MAX) {
    return json({ error: 'Too many test emails. Please try again later.' }, 429, extra)
  }
  const insertResponse = await fetch(`${supabaseUrl}/rest/v1/email_rate_limits`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${userToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.id }),
  })
  if (!insertResponse.ok) return json({ error: 'Could not register email attempt' }, 502, extra)

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
      template_id: Deno.env.get('EMAILJS_TEMPLATE_ID'),
      user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
      accessToken: Deno.env.get('EMAILJS_PRIVATE_KEY'),
      template_params: params,
    }),
  })

  if (!response.ok) return json({ error: `EmailJS responded ${response.status}: ${await response.text()}` }, 502, extra)
  return json({ ok: true }, 200, extra)
})
