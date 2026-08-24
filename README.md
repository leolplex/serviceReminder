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

Copia `.env.example` como `.env.local` y completa las variables públicas de EmailJS:

```env
VITE_EMAILJS_SERVICE_ID=service_xxxxxxx
VITE_EMAILJS_TEMPLATE_ID=template_xxxxxxx
VITE_EMAILJS_PUBLIC_KEY=public_xxxxxxx
```

La plantilla debe aceptar `to_email`, `address`, `locality`, `outage_date`, `neighborhoods` y `hours`. El correo se envía como máximo una vez por semana en ese dispositivo.

Para que GitHub Pages use el almacenamiento remoto y envíe el correo aunque la app esté cerrada, configura estos GitHub Secrets en **Settings > Secrets and variables > Actions**: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID` y `EMAILJS_PUBLIC_KEY`. El workflow leerá todos los perfiles guardados en Supabase, buscará coincidencias en `outages.json` y enviará cada aviso desde GitHub Actions. La `SUPABASE_SECRET_KEY` nunca debe ir en el frontend.

Ejecuta primero el SQL de `supabase/schema.sql` y habilita el proveedor de autenticación anónima en Supabase. `SUPABASE_PUBLISHABLE_KEY` puede estar en el frontend; `SUPABASE_SECRET_KEY` debe existir únicamente como secret del workflow.

Las variables `VITE_EMAILJS_*` son públicas por diseño en una app frontend, pero deben restringirse por dominio en el panel de EmailJS. Nunca pongas contraseñas, tokens privados o credenciales SMTP en `.env.local` ni en el repositorio.

## Fuente oficial

La app consulta la página de programación semanal del Acueducto:

`https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana`

Durante desarrollo, Vite usa un proxy local para evitar CORS.
