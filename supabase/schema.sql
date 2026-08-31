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

alter table public.email_sends enable row level security;

-- El script de CI usa la service role key (bypass RLS); esta política
-- permite consultar/insertar desde la app si alguna vez se necesita.
create policy "Anyone can read email sends"
on public.email_sends for select
using (true);

create policy "Anyone can insert email sends"
on public.email_sends for insert
with check (true);
