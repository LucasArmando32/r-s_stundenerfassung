-- RS Stundenerfassung — initial schema, RLS and holiday automation.
-- Run against the self-hosted Supabase Postgres instance (e.g. via the SQL
-- editor, or `supabase db push` if you keep this repo linked to the project).

create extension if not exists pgcrypto;

-- RLS policies only take effect on top of standard SQL privileges — Postgres
-- still denies access outright without these grants, regardless of policy.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on routines to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- users (profile row, 1:1 with auth.users; password lives in Supabase Auth)
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nombre text not null,
  rol text not null default 'trabajador' check (rol in ('trabajador', 'admin')),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- SECURITY DEFINER + fixed search_path so this can be called from RLS
-- policies on `users` itself without recursing into those same policies.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and rol = 'admin'
  );
$$;

alter table public.users enable row level security;

create policy users_select_own on public.users
  for select using (id = auth.uid());

create policy users_select_admin on public.users
  for select using (public.is_admin());

create policy users_update_admin on public.users
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- holidays (canton Bern, preloaded per year)
-- ---------------------------------------------------------------------------

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  nombre text not null,
  canton text not null default 'Bern'
);

alter table public.holidays enable row level security;

create policy holidays_select_authenticated on public.holidays
  for select using (auth.role() = 'authenticated');

create policy holidays_write_admin on public.holidays
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- time_entries
-- ---------------------------------------------------------------------------

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  fecha date not null,
  hora_inicio time,
  hora_fin time,
  pausa_minutos integer not null default 0,
  horas_calculadas numeric(5, 2) not null,
  nota text,
  es_feriado boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  editado_por uuid references public.users (id),
  unique (user_id, fecha)
);

create index time_entries_fecha_idx on public.time_entries (fecha);
create index time_entries_user_fecha_idx on public.time_entries (user_id, fecha);

create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger time_entries_set_actualizado_en
  before update on public.time_entries
  for each row execute function public.set_actualizado_en();

alter table public.time_entries enable row level security;

-- Workers see their own history in full; admin sees everything.
create policy time_entries_select on public.time_entries
  for select using (user_id = auth.uid() or public.is_admin());

-- Workers may only write their own rows, and only within the 5-day
-- edit window (today back to today - 5 days, no future dates). Admin
-- has no date restriction.
create policy time_entries_insert on public.time_entries
  for insert with check (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '5 days'
    )
  );

create policy time_entries_update on public.time_entries
  for update using (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '5 days'
    )
  ) with check (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '5 days'
    )
  );

create policy time_entries_delete on public.time_entries
  for delete using (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '5 days'
    )
  );

-- ---------------------------------------------------------------------------
-- Holiday automation: materialize an 8h `es_feriado` row for every active
-- worker whenever a holiday is added, and for every new worker whenever
-- they're created (covering all holidays already on file). Deleting a
-- worker's manual override (a real day someone worked on a holiday)
-- restores the automatic 8h holiday row.
-- ---------------------------------------------------------------------------

create or replace function public.materializar_feriado(p_fecha date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.time_entries (user_id, fecha, horas_calculadas, es_feriado)
  select u.id, p_fecha, 8, true
  from public.users u
  where u.rol = 'trabajador' and u.activo = true
  on conflict (user_id, fecha) do nothing;
end;
$$;

create or replace function public.materializar_feriados_para_usuario(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.time_entries (user_id, fecha, horas_calculadas, es_feriado)
  select p_user_id, h.fecha, 8, true
  from public.holidays h
  on conflict (user_id, fecha) do nothing;
end;
$$;

create or replace function public.trg_holidays_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.materializar_feriado(new.fecha);
  return new;
end;
$$;

create trigger holidays_after_insert
  after insert on public.holidays
  for each row execute function public.trg_holidays_after_insert();

create or replace function public.trg_users_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rol = 'trabajador' and new.activo = true then
    perform public.materializar_feriados_para_usuario(new.id);
  end if;
  return new;
end;
$$;

create trigger users_after_insert
  after insert on public.users
  for each row execute function public.trg_users_after_insert();

create or replace function public.trg_time_entries_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.es_feriado = false and exists (
    select 1 from public.holidays where fecha = old.fecha
  ) then
    insert into public.time_entries (user_id, fecha, horas_calculadas, es_feriado)
    values (old.user_id, old.fecha, 8, true)
    on conflict (user_id, fecha) do nothing;
  end if;
  return old;
end;
$$;

create trigger time_entries_after_delete
  after delete on public.time_entries
  for each row execute function public.trg_time_entries_after_delete();

-- ---------------------------------------------------------------------------
-- Seed: official Bern cantonal holidays, 2025-2027.
-- IMPORTANT: verify these against the official Bern cantonal calendar
-- before relying on them for payroll — an error here directly affects
-- everyone's paid hours.
-- ---------------------------------------------------------------------------

insert into public.holidays (fecha, nombre, canton) values
  ('2025-01-01', 'Neujahrstag', 'Bern'),
  ('2025-01-02', 'Berchtoldstag', 'Bern'),
  ('2025-04-18', 'Karfreitag', 'Bern'),
  ('2025-04-21', 'Ostermontag', 'Bern'),
  ('2025-05-29', 'Auffahrt', 'Bern'),
  ('2025-06-09', 'Pfingstmontag', 'Bern'),
  ('2025-08-01', 'Nationalfeiertag', 'Bern'),
  ('2025-12-25', 'Weihnachten', 'Bern'),
  ('2025-12-26', 'Stephanstag', 'Bern'),

  ('2026-01-01', 'Neujahrstag', 'Bern'),
  ('2026-01-02', 'Berchtoldstag', 'Bern'),
  ('2026-04-03', 'Karfreitag', 'Bern'),
  ('2026-04-06', 'Ostermontag', 'Bern'),
  ('2026-05-14', 'Auffahrt', 'Bern'),
  ('2026-05-25', 'Pfingstmontag', 'Bern'),
  ('2026-08-01', 'Nationalfeiertag', 'Bern'),
  ('2026-12-25', 'Weihnachten', 'Bern'),
  ('2026-12-26', 'Stephanstag', 'Bern'),

  ('2027-01-01', 'Neujahrstag', 'Bern'),
  ('2027-01-02', 'Berchtoldstag', 'Bern'),
  ('2027-03-26', 'Karfreitag', 'Bern'),
  ('2027-03-29', 'Ostermontag', 'Bern'),
  ('2027-05-06', 'Auffahrt', 'Bern'),
  ('2027-05-17', 'Pfingstmontag', 'Bern'),
  ('2027-08-01', 'Nationalfeiertag', 'Bern'),
  ('2027-12-25', 'Weihnachten', 'Bern'),
  ('2027-12-26', 'Stephanstag', 'Bern')
on conflict (fecha) do nothing;
