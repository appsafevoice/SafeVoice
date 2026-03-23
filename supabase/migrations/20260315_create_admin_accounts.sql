create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) > 0),
  position text,
  email text not null check (char_length(trim(email)) > 0),
  password_hash text not null check (char_length(trim(password_hash)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Repair legacy admin_accounts tables created before password_hash/id existed.
alter table if exists public.admin_accounts
  add column if not exists full_name text;

alter table if exists public.admin_accounts
  add column if not exists position text;

alter table if exists public.admin_accounts
  add column if not exists email text;

alter table if exists public.admin_accounts
  add column if not exists password_hash text;

alter table if exists public.admin_accounts
  add column if not exists is_active boolean default true;

alter table if exists public.admin_accounts
  add column if not exists created_at timestamptz default now();

alter table if exists public.admin_accounts
  add column if not exists id uuid;

update public.admin_accounts
set full_name = coalesce(nullif(btrim(full_name), ''), split_part(coalesce(email::text, gen_random_uuid()::text), '@', 1))
where full_name is null
  or btrim(full_name) = '';

update public.admin_accounts
set is_active = coalesce(is_active, true)
where is_active is null;

update public.admin_accounts
set created_at = coalesce(created_at, now())
where created_at is null;

update public.admin_accounts
set password_hash = extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))
where password_hash is null
  or btrim(password_hash) = '';

update public.admin_accounts
set id = gen_random_uuid()
where id is null;

alter table public.admin_accounts
  alter column is_active set default true;

alter table public.admin_accounts
  alter column created_at set default now();

alter table public.admin_accounts
  alter column id set default gen_random_uuid();

alter table public.admin_accounts
  alter column id set not null;

create unique index if not exists admin_accounts_id_uniq
  on public.admin_accounts (id);

create unique index if not exists admin_accounts_email_lower_uniq
  on public.admin_accounts (lower(email));

create index if not exists admin_accounts_is_active_idx
  on public.admin_accounts (is_active);

grant select, insert, update, delete on public.admin_accounts to authenticated;

alter table public.admin_accounts enable row level security;

-- SECURITY DEFINER avoids RLS recursion when admin_accounts policies depend on admin_accounts itself.
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_accounts a
    where a.is_active = true
      and lower(a.email) = lower((auth.jwt() ->> 'email')::text)
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "Active admins can view admin accounts" on public.admin_accounts;
create policy "Active admins can view admin accounts"
on public.admin_accounts
for select
to authenticated
using (public.is_active_admin());

drop policy if exists "Active admins can insert admin accounts" on public.admin_accounts;
create policy "Active admins can insert admin accounts"
on public.admin_accounts
for insert
to authenticated
with check (public.is_active_admin());

drop policy if exists "Active admins can update admin accounts" on public.admin_accounts;
create policy "Active admins can update admin accounts"
on public.admin_accounts
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

drop policy if exists "Active admins can delete admin accounts" on public.admin_accounts;
create policy "Active admins can delete admin accounts"
on public.admin_accounts
for delete
to authenticated
using (public.is_active_admin());

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
  if not public.is_active_admin() then
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

create or replace function public.admin_accounts_set_own_password_hash(
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not public.is_active_admin() then
    return false;
  end if;

  if p_new_password is null or char_length(p_new_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;

  v_email := lower((auth.jwt() ->> 'email')::text);
  if v_email is null or v_email = '' then
    return false;
  end if;

  update public.admin_accounts
  set password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  where is_active = true
    and lower(email) = v_email;

  return found;
end;
$$;

revoke all on function public.admin_accounts_set_own_password_hash(text) from public;
grant execute on function public.admin_accounts_set_own_password_hash(text) to authenticated;
