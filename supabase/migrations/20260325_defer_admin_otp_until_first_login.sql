create extension if not exists pgcrypto;

drop function if exists public.admin_accounts_prepare_first_login(text, text);

create or replace function public.admin_accounts_prepare_first_login(
  p_email text,
  p_password text
)
returns table (
  full_name text,
  position text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(btrim(coalesce(p_email, '')));

  if v_email = '' or p_password is null or p_password = '' then
    return;
  end if;

  return query
    select
      a.full_name::text,
      a.position::text,
      a.email::text
    from public.admin_accounts a
    where a.is_active = true
      and lower(a.email) = v_email
      and a.password_hash = extensions.crypt(p_password, a.password_hash)
      and not exists (
        select 1
        from auth.users u
        where lower(coalesce(u.email, '')) = v_email
      )
    limit 1;
end;
$$;

revoke all on function public.admin_accounts_prepare_first_login(text, text) from public;
grant execute on function public.admin_accounts_prepare_first_login(text, text) to anon;
grant execute on function public.admin_accounts_prepare_first_login(text, text) to authenticated;
