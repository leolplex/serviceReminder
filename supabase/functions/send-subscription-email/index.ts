const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://leolplex.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const required = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY']

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401)

  const accessToken = authorization.slice('Bearer '.length)
  const userResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!userResponse.ok) return json({ error: 'Invalid authentication' }, 401)
  const user = await userResponse.json()

  const missing = required.filter((name) => !Deno.env.get(name))
  if (missing.length > 0) return json({ error: `Missing server configuration: ${missing.join(', ')}` }, 500)

  const params = await request.json().catch(() => null)
  if (!params || typeof params.to_email !== 'string' || !isValidEmail(params.to_email)) {
    return json({ error: 'A valid recipient email is required' }, 400)
  }

  const profileResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/profiles?select=email,address,localidad&user_id=eq.${encodeURIComponent(user.id)}`, {
    headers: {
      apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!profileResponse.ok) return json({ error: 'Could not verify subscription profile' }, 502)
  const [profile] = await profileResponse.json()
  if (!profile || profile.email !== params.to_email || profile.address !== params.address || profile.localidad !== params.locality) {
    return json({ error: 'Subscription profile does not match the authenticated user' }, 403)
  }

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

  if (!response.ok) return json({ error: `EmailJS responded ${response.status}: ${await response.text()}` }, 502)
  return json({ ok: true })
})

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254

const json = (body: Record<string, string | boolean>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})
