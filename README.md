# Nority

App móvil local-first para consultar cortes de agua del Acueducto de Bogotá según una dirección guardada.

## Funciones

- Consulta la programación semanal oficial.
- Extrae localidad, barrios, fecha, horario y rango de direcciones.
- Compara direcciones como `AC 63 #109A-47`, `Tv. 93 #52A-2` y `Cra. 96I #51-99`.
- Guarda dirección, localidad y email en el dispositivo.
- Consulta siempre la programación de la semana actual y programa la actualización de los domingos a las 6:00 p. m. mientras la app está abierta.
- Envía un email con EmailJS si la dirección está en un rango afectado.
- Se puede instalar como PWA.

## Desarrollo

```bash
npm install
npm run dev
```

## Producción

La aplicación publicada en GitHub Pages está disponible en:

https://leolplex.github.io/serviceReminder/

Validación:

```bash
npm test
npm run build
npm run lint
```

## EmailJS

EmailJS funciona en Strict mode mediante la Edge Function `send-subscription-email` de Supabase. La Private Key nunca se envía al navegador.

Instala y autentica Supabase CLI, enlaza el proyecto y configura los secretos:

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase secrets set EMAILJS_SERVICE_ID=service_xxxxxxx EMAILJS_TEMPLATE_ID=template_xxxxxxx EMAILJS_PUBLIC_KEY=public_xxxxxxx EMAILJS_PRIVATE_KEY=tu_private_key
supabase functions deploy send-subscription-email --no-verify-jwt
```

El archivo `supabase/config.toml` conserva esta configuración para futuros despliegues. `--no-verify-jwt` permite que el navegador complete el preflight CORS; la función solo acepta `POST` y el origen de GitHub Pages.

También puedes dejar que GitHub Actions la despliegue automáticamente. Para ello crea el secret `SUPABASE_ACCESS_TOKEN` en GitHub. Créalo desde Supabase Dashboard → Account → Access Tokens y vuelve a ejecutar el workflow.

La plantilla debe aceptar `to_email`, `address`, `locality`, `outage_date`, `neighborhoods` y `hours`. El correo de activación se envía desde la Edge Function después de guardar la suscripción.

Para GitHub Pages y el envío semanal configura estos GitHub Secrets en **Settings > Secrets and variables > Actions**: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY` y `EMAILJS_PRIVATE_KEY`. El workflow leerá los perfiles guardados en Supabase y enviará los avisos desde GitHub Actions. Las claves `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SECRET_KEY` y `EMAILJS_PRIVATE_KEY` nunca deben ir en el frontend.

Ejecuta primero el SQL de `supabase/schema.sql` y habilita el proveedor de autenticación anónima en Supabase. `SUPABASE_PUBLISHABLE_KEY` puede estar en el frontend; `SUPABASE_SECRET_KEY` debe existir únicamente como secret del workflow.

La URL y la clave publicable de Supabase sí se configuran como `VITE_*` para el frontend. Nunca pongas contraseñas, tokens privados o credenciales SMTP en `.env.local` ni en el repositorio.

## Fuente oficial

La app consulta la página de programación semanal del Acueducto:

`https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana`

Durante desarrollo, Vite usa un proxy local para evitar CORS.
