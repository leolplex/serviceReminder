create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  address text not null,
  localidad text not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
using (auth.uid() = user_id);

create policy "Users can insert their own profile"
on public.profiles for insert
with check (auth.uid() = user_id);

create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Registro de correos ya enviados por semana (para deduplicar envíos automáticos)
create table public.email_sends (
  id bigint generated always as identity primary key,
  email text not null,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (email, week_start)
);

-- RLS activa y SIN políticas: esta tabla contiene correos de los suscriptores.
-- Solo la accede el script de CI (scripts/send-weekly-email.mjs) con la
-- service role key, que bypasea RLS. No se expone a la API pública porque
-- la anon key viaja incrustada en el bundle de la PWA (riesgo de fuga PII).
alter table public.email_sends enable row level security;
