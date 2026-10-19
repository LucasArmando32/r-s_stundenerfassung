-- Extend the worker edit window from 5 to 10 days back. Admin still has no
-- date restriction.

drop policy if exists time_entries_insert on public.time_entries;
drop policy if exists time_entries_update on public.time_entries;
drop policy if exists time_entries_delete on public.time_entries;

create policy time_entries_insert on public.time_entries
  for insert with check (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '10 days'
    )
  );

create policy time_entries_update on public.time_entries
  for update using (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '10 days'
    )
  ) with check (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '10 days'
    )
  );

create policy time_entries_delete on public.time_entries
  for delete using (
    public.is_admin()
    or (
      user_id = auth.uid()
      and fecha <= current_date
      and fecha >= current_date - interval '10 days'
    )
  );
