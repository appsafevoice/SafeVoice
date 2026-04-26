drop policy if exists "Super Admin can delete reports" on public.reports;
drop policy if exists "Active admins can delete reports" on public.reports;

create policy "Active admins can delete reports"
on public.reports
for delete
to authenticated
using (public.is_active_admin());
