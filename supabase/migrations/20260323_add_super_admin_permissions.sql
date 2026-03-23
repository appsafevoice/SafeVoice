create extension if not exists pgcrypto;

alter table if exists public.admin_accounts
  add column if not exists position text;

alter table if exists public.admin_accounts
  add column if not exists password_hash text;

update public.admin_accounts
set password_hash = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))
where password_hash is null
  or btrim(password_hash) = '';

update public.admin_accounts
set full_name = case
      when btrim(coalesce(full_name, '')) = '' then 'Jethro Payoc'
      else full_name
    end,
    position = case
      when btrim(coalesce(position, '')) = '' then 'Super Admin'
      else position
    end,
    is_active = true
where lower(email) = 'jethropayoc@gmail.com';

insert into public.admin_accounts (full_name, position, email, password_hash, is_active)
select
  'Jethro Payoc',
  'Super Admin',
  'jethropayoc@gmail.com',
  extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
  true
where not exists (
  select 1
  from public.admin_accounts
  where lower(email) = 'jethropayoc@gmail.com'
);

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_active_admin()
    and coalesce(lower((auth.jwt() ->> 'email')::text), '') = 'jethropayoc@gmail.com';
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

drop policy if exists "Active admins can view admin accounts" on public.admin_accounts;
drop policy if exists "Active admins can insert admin accounts" on public.admin_accounts;
drop policy if exists "Active admins can update admin accounts" on public.admin_accounts;
drop policy if exists "Active admins can delete admin accounts" on public.admin_accounts;
drop policy if exists "Admins can view their own admin account or Super Admin can view all" on public.admin_accounts;
drop policy if exists "Super Admin can insert admin accounts" on public.admin_accounts;
drop policy if exists "Super Admin can update admin accounts" on public.admin_accounts;
drop policy if exists "Super Admin can delete admin accounts" on public.admin_accounts;

create policy "Admins can view their own admin account or Super Admin can view all"
on public.admin_accounts
for select
to authenticated
using (
  public.is_super_admin()
  or (
    public.is_active_admin()
    and lower(email) = lower((auth.jwt() ->> 'email')::text)
  )
);

create policy "Super Admin can insert admin accounts"
on public.admin_accounts
for insert
to authenticated
with check (
  public.is_super_admin()
  and lower(email) <> 'jethropayoc@gmail.com'
);

create policy "Super Admin can update admin accounts"
on public.admin_accounts
for update
to authenticated
using (public.is_super_admin())
with check (
  public.is_super_admin()
  and lower(email) <> 'jethropayoc@gmail.com'
);

create policy "Super Admin can delete admin accounts"
on public.admin_accounts
for delete
to authenticated
using (
  public.is_super_admin()
  and lower(email) <> 'jethropayoc@gmail.com'
);

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
