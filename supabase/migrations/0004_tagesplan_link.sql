-- Links a worker account in this app to their corresponding worker row in
-- the Tagesplan app (public.obreros) — same shared Supabase instance, but
-- a separate identity table, so names alone aren't a reliable match.
-- Used to compute Reisezeit: Tagesplan's public.asignaciones_diarias
-- records which Baustelle (public.obras, with a fixed reisezeit_minutos)
-- a worker was sent to each day.

alter table public.users
  add column if not exists tagesplan_obrero_id uuid references public.obreros (id) on delete set null;
