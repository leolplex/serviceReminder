alter table public.profiles
add column if not exists barrio text not null default '';
