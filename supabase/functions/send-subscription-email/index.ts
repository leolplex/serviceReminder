const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://leolplex.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const required = ['EMAILJS_SERVICE_ID', 'EMAILJS_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY', 'EMAILJS_PRIVATE_KEY']

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const missing = required.filter((name) => !Deno.env.get(name))
  if (missing.length > 0) return json({ error: `Missing server configuration: ${missing.join(', ')}` }, 500)

  const params = await request.json().catch(() => null)
  if (!params || typeof params.to_email !== 'string' || !isValidEmail(params.to_email)) {
    return json({ error: 'A valid recipient email is required' }, 400)
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
