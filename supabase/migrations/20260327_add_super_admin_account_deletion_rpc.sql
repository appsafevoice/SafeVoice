drop function if exists public.super_admin_delete_student_account(uuid);

create or replace function public.super_admin_delete_student_account(p_profile_id uuid)
returns table (
  deleted_profile_id uuid,
  deleted_auth_user_id uuid,
  deleted_email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles%rowtype;
  v_deleted_auth_user_id uuid;
  v_email text;
begin
  if not public.is_super_admin() then
    raise exception using errcode = '42501', message = 'Only the Super Admin can delete student accounts.';
  end if;

  if p_profile_id is null then
    raise exception 'profile id is required';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = p_profile_id;

  if not found then
    raise exception 'Student account not found.';
  end if;

  v_email := lower(btrim(coalesce(v_profile.email, '')));

  if exists (
    select 1
    from public.admin_accounts a
    where lower(a.email) = v_email
  ) then
    raise exception 'Admin-linked accounts must be removed from the account management panel.';
  end if;

  with deleted_auth as (
    delete from auth.users
    where id = v_profile.id
    returning id
  )
  select id
  into v_deleted_auth_user_id
  from deleted_auth
  limit 1;

  if v_deleted_auth_user_id is null then
    delete from public.profiles
    where id = v_profile.id;
  end if;

  return query
  select
    v_profile.id,
    v_deleted_auth_user_id,
    nullif(v_email, '');
end;
$$;

revoke all on function public.super_admin_delete_student_account(uuid) from public;
grant execute on function public.super_admin_delete_student_account(uuid) to authenticated;

drop function if exists public.super_admin_delete_admin_account(uuid);

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

  if v_email = 'jethropayoc@gmail.com' then
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
