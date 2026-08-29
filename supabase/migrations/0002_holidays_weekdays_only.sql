-- Holidays that fall on a Saturday/Sunday shouldn't materialize as an 8h
-- workday — nobody works weekends anyway, so counting them double-pays
-- nothing but inflates totals in a confusing way.

create or replace function public.materializar_feriado(p_fecha date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if extract(dow from p_fecha) in (0, 6) then
    return;
  end if;

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
  where extract(dow from h.fecha) not in (0, 6)
  on conflict (user_id, fecha) do nothing;
end;
$$;

create or replace function public.trg_time_entries_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.es_feriado = false and exists (
    select 1 from public.holidays
    where fecha = old.fecha and extract(dow from fecha) not in (0, 6)
  ) then
    insert into public.time_entries (user_id, fecha, horas_calculadas, es_feriado)
    values (old.user_id, old.fecha, 8, true)
    on conflict (user_id, fecha) do nothing;
  end if;
  return old;
end;
$$;

-- Remove already-materialized weekend holiday rows (only the automatic
-- ones — a manual override on a weekend, if anyone ever makes one, stays).
delete from public.time_entries
where es_feriado = true and extract(dow from fecha) in (0, 6);
