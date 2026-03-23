create extension if not exists pgcrypto;

alter table if exists public.admin_accounts
  add column if not exists position text;

update public.admin_accounts
set position = 'Super Admin'
where lower(email) = 'jethropayoc@gmail.com'
  and btrim(coalesce(position, '')) = '';

drop function if exists public.admin_accounts_create(text, text, text);
drop function if exists public.admin_accounts_create(text, text, text, text);

create or replace function public.admin_accounts_create(
  p_full_name text,
  p_position text,
  p_email text,
  p_password text
)
returns table (
  id uuid,
  full_name text,
  email text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_position text;
  v_email text;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;

  v_full_name := btrim(coalesce(p_full_name, ''));
  v_position := btrim(coalesce(p_position, ''));
  v_email := lower(btrim(coalesce(p_email, '')));

  if v_full_name = '' then
    raise exception 'full name is required';
  end if;

  if v_position = '' then
    raise exception 'position is required';
  end if;

  if v_email = '' then
    raise exception 'email is required';
  end if;

  if v_email = 'jethropayoc@gmail.com' then
    raise exception 'super admin account is reserved';
  end if;

  if p_password is null or char_length(p_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;

  return query
    insert into public.admin_accounts (full_name, position, email, password_hash, is_active)
    values (v_full_name, v_position, v_email, extensions.crypt(p_password, extensions.gen_salt('bf')), true)
    returning
      admin_accounts.id::uuid,
      admin_accounts.full_name::text,
      admin_accounts.email::text,
      admin_accounts.is_active::boolean,
      admin_accounts.created_at::timestamptz;
end;
$$;

revoke all on function public.admin_accounts_create(text, text, text, text) from public;
grant execute on function public.admin_accounts_create(text, text, text, text) to authenticated;
