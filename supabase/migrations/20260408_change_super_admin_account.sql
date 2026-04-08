create extension if not exists pgcrypto;

do $$
declare
  v_old_email constant text := 'jethropayoc@gmail.com';
  v_new_email constant text := 'appsafevoice@gmail.com';
  v_new_name constant text := 'SafeVoice';
  v_new_position constant text := 'Admin';
  v_new_password_hash constant text := '$2b$15$hQO.ORRT88b4Xo5P5Urho.SWRKJwj485udhfJBl6zE7qGGq4IkZ2G';
begin
  update public.admin_accounts
  set full_name = v_new_name,
      position = v_new_position,
      password_hash = v_new_password_hash,
      is_active = true
  where lower(email) = v_new_email;

  if exists (
    select 1
    from public.admin_accounts
    where lower(email) = v_new_email
  ) and exists (
    select 1
    from public.admin_accounts
    where lower(email) = v_old_email
  ) then
    delete from public.admin_accounts
    where lower(email) = v_old_email;
  end if;

  update public.admin_accounts
  set full_name = v_new_name,
      position = v_new_position,
      email = v_new_email,
      password_hash = v_new_password_hash,
      is_active = true
  where lower(email) = v_old_email
    and not exists (
      select 1
      from public.admin_accounts
      where lower(email) = v_new_email
    );

  if not exists (
    select 1
    from public.admin_accounts
    where lower(email) = v_new_email
  ) then
    insert into public.admin_accounts (full_name, position, email, password_hash, is_active)
    values (
      v_new_name,
      v_new_position,
      v_new_email,
      v_new_password_hash,
      true
    );
  end if;

  if exists (
    select 1
    from auth.users
    where lower(email) = v_new_email
  ) then
    update auth.users
    set encrypted_password = v_new_password_hash,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
          'full_name', v_new_name,
          'first_name', v_new_name,
          'last_name', '',
          'position', v_new_position,
          'role', 'admin'
        ),
        updated_at = now()
    where lower(email) = v_new_email;
  elsif exists (
    select 1
    from auth.users
    where lower(email) = v_old_email
  ) then
    update auth.users
    set email = v_new_email,
        encrypted_password = v_new_password_hash,
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
          'full_name', v_new_name,
          'first_name', v_new_name,
          'last_name', '',
          'position', v_new_position,
          'role', 'admin'
        ),
        updated_at = now()
    where lower(email) = v_old_email;

    update public.profiles
    set email = v_new_email,
        full_name = coalesce(nullif(btrim(full_name), ''), v_new_name),
        updated_at = now()
    where lower(email) = v_old_email;
  end if;
end;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_active_admin()
    and coalesce(lower((auth.jwt() ->> 'email')::text), '') = 'appsafevoice@gmail.com';
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to authenticated;

drop policy if exists "Super Admin can insert admin accounts" on public.admin_accounts;
create policy "Super Admin can insert admin accounts"
on public.admin_accounts
for insert
to authenticated
with check (
  public.is_super_admin()
  and lower(email) <> 'appsafevoice@gmail.com'
);

drop policy if exists "Super Admin can update admin accounts" on public.admin_accounts;
create policy "Super Admin can update admin accounts"
on public.admin_accounts
for update
to authenticated
using (public.is_super_admin())
with check (
  public.is_super_admin()
  and lower(email) <> 'appsafevoice@gmail.com'
);

drop policy if exists "Super Admin can delete admin accounts" on public.admin_accounts;
create policy "Super Admin can delete admin accounts"
on public.admin_accounts
for delete
to authenticated
using (
  public.is_super_admin()
  and lower(email) <> 'appsafevoice@gmail.com'
);

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

  if v_email = 'appsafevoice@gmail.com' then
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

create or replace function public.super_admin_delete_admin_account(p_admin_account_id uuid)
returns table (
  deleted_admin_account_id uuid,
  deleted_auth_user_id uuid,
  deleted_email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_account public.admin_accounts%rowtype;
  v_deleted_auth_user_id uuid;
  v_email text;
  v_current_email text;
begin
  if not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'Only the Super Admin can delete admin accounts.';
  end if;

  if p_admin_account_id is null then
    raise exception 'admin account id is required';
  end if;

  select *
  into v_admin_account
  from public.admin_accounts
  where id = p_admin_account_id;

  if not found then
    raise exception 'Admin account not found.';
  end if;

  v_email := lower(btrim(coalesce(v_admin_account.email, '')));
  v_current_email := lower(btrim(coalesce((auth.jwt() ->> 'email')::text, '')));

  if v_email = 'appsafevoice@gmail.com' then
    raise exception using errcode = '42501', message = 'The reserved Super Admin account cannot be removed.';
  end if;

  if v_current_email <> '' and v_email = v_current_email then
    raise exception using errcode = '42501', message = 'You cannot remove your own admin account.';
  end if;

  with deleted_auth as (
    delete from auth.users
    where lower(btrim(coalesce(email, ''))) = v_email
    returning id
  )
  select id
  into v_deleted_auth_user_id
  from deleted_auth
  limit 1;

  if v_deleted_auth_user_id is null then
    delete from public.profiles
    where lower(btrim(coalesce(email, ''))) = v_email;
  end if;

  delete from public.admin_accounts
  where id = v_admin_account.id;

  return query
  select
    v_admin_account.id,
    v_deleted_auth_user_id,
    nullif(v_email, '');
end;
$$;

revoke all on function public.super_admin_delete_admin_account(uuid) from public;
grant execute on function public.super_admin_delete_admin_account(uuid) to authenticated;
