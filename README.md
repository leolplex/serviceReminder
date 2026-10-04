# Nority

Aplicación para consultar cortes de agua del Acueducto de Bogotá según una dirección guardada.

## Funciones

- Consulta la programación semanal oficial.
- Busca los avisos por fecha y rango de dirección en todas las localidades, porque el boletín puede etiquetar un corte con una localidad incorrecta.
- Envía un correo al activar la suscripción y cuando corresponde un aviso.
- Guarda los datos y puede instalarse como PWA.
- Filtra los avisos por dirección y por coincidencia exacta del barrio para evitar falsos positivos.

## Desarrollo

```bash
npm install
npm run dev
```

## Validación

```bash
npm test
npm run build
npm run lint
```

## Producción

La aplicación está publicada en:

https://leolplex.github.io/serviceReminder/

Los despliegues se ejecutan automáticamente desde GitHub Actions al actualizar `main`.

## Fuente de datos

La información proviene del boletín semanal oficial del Acueducto de Bogotá.

https://www.acueducto.com.co/wps/portal/EAB2/Home/atencion-al-usuario/programacion_cortes/cortes+de+la+semana

## Configuración de Supabase

Antes de activar el envío semanal, aplica el esquema de `supabase/schema.sql` al proyecto de Supabase. Si `profiles` ya existe, ejecuta solo el bloque que crea `public.email_sends` y activa RLS; no vuelvas a ejecutar la creación de `profiles`.

El workflow consulta `public.email_sends` para evitar duplicar correos. Si Supabase responde que no encuentra esa tabla en el esquema, créala desde el SQL Editor:

```sql
create table if not exists public.email_sends (
  id bigint generated always as identity primary key,
  email text not null,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (email, week_start)
);

alter table public.email_sends enable row level security;
```

La clave de servicio de Supabase debe estar configurada como el secret `SUPABASE_SECRET_KEY` en GitHub Actions; no uses la clave publicable para este workflow.

El selector de barrios usa los nombres únicos de sectores catastrales urbanos y mixtos de [Catastro Bogotá](https://datosabiertos.bogota.gov.co/dataset/sector-catastral), complementados con nombres de barrio conocidos que no aparecen en ese catálogo (por ejemplo, La Floresta). La coincidencia con barrios del boletín ignora mayúsculas, tildes y prefijos como “Barrio”, pero requiere el nombre completo.
