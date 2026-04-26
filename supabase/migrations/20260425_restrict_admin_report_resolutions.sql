create or replace function public.can_current_admin_manage_report_resolutions()
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.admin_accounts a
      where a.is_active = true
        and lower(a.email) = lower((auth.jwt() ->> 'email')::text)
        and public.normalize_admin_account_position(a.position) in ('Intern', 'Guidance Counselor')
    );
$$;

revoke all on function public.can_current_admin_manage_report_resolutions() from public;
grant execute on function public.can_current_admin_manage_report_resolutions() to authenticated;

create or replace function public.enforce_report_resolution_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_admin() then
    return new;
  end if;

  if (
    (coalesce(new.status, '') = 'resolved' and coalesce(old.status, '') <> 'resolved')
    or (coalesce(old.status, '') = 'resolved' and coalesce(new.status, '') <> 'resolved')
    or new.resolution_description is distinct from old.resolution_description
    or new.resolution_attachments is distinct from old.resolution_attachments
    or new.resolved_at is distinct from old.resolved_at
  ) and not public.can_current_admin_manage_report_resolutions() then
    raise exception using
      errcode = '42501',
      message = 'Only Intern, Guidance Counselor, or Super Admin accounts can post resolutions.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_report_resolution_permissions on public.reports;
create trigger enforce_report_resolution_permissions
before update on public.reports
for each row
execute function public.enforce_report_resolution_permissions();
