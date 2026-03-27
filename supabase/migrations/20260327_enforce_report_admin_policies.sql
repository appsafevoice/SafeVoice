grant select, insert, update, delete on public.reports to authenticated;

drop policy if exists "Users can view own reports" on public.reports;
create policy "Users can view own reports"
on public.reports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert reports" on public.reports;
create policy "Users can insert reports"
on public.reports
for insert
to authenticated
with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Admins can view all reports" on public.reports;
drop policy if exists "Active admins can view all reports" on public.reports;
create policy "Active admins can view all reports"
on public.reports
for select
to authenticated
using (public.is_active_admin());

drop policy if exists "Admins can update reports" on public.reports;
drop policy if exists "Active admins can update reports" on public.reports;
create policy "Active admins can update reports"
on public.reports
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Super Admin can delete reports" on public.reports;
create policy "Super Admin can delete reports"
on public.reports
for delete
to authenticated
using (public.is_super_admin());
