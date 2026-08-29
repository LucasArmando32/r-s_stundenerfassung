-- Lets the admin look up a worker's current password at any time (not just
-- once at creation) — construction workers lose the paper/WhatsApp message
-- with their password and there's no self-service reset flow in v1.
--
-- Trade-off: this stores the password in plain text, which is not how
-- credentials are normally handled (Supabase Auth only ever stores a hash).
-- Only the admin role can read this table; workers cannot see even their
-- own row here. Acceptable for a small internal tool with a single admin
-- and low-sensitivity data — revisit if that ever changes.

create table public.worker_credentials (
  user_id uuid primary key references public.users (id) on delete cascade,
  password_plano text not null,
  actualizado_en timestamptz not null default now()
);

alter table public.worker_credentials enable row level security;

create policy worker_credentials_admin_only on public.worker_credentials
  for all using (public.is_admin()) with check (public.is_admin());
