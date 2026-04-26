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
    new.status is distinct from old.status
    or new.resolution_description is distinct from old.resolution_description
    or new.resolution_attachments is distinct from old.resolution_attachments
    or new.resolved_at is distinct from old.resolved_at
  ) and not public.can_current_admin_manage_report_resolutions() then
    raise exception using
      errcode = '42501',
      message = 'Only Intern, Guidance Counselor, or Super Admin accounts can change report status or post resolutions.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_report_resolution_permissions on public.reports;
create trigger enforce_report_resolution_permissions
before update on public.reports
for each row
execute function public.enforce_report_resolution_permissions();
