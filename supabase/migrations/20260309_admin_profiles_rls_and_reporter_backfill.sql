create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) > 0),
  email text not null check (char_length(trim(email)) > 0),
  password_hash text not null check (char_length(trim(password_hash)) > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists admin_accounts_email_lower_uniq
  on public.admin_accounts (lower(email));

drop policy if exists "Active admins can view all profiles" on public.profiles;

create policy "Active admins can view all profiles"
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_accounts a
    where a.is_active = true
      and lower(a.email::text) = lower((auth.jwt() ->> 'email')::text)
  )
);

update public.reports r
set reporter_name = trim(concat_ws(' ', p.first_name, p.last_name))
from public.profiles p
where r.user_id = p.id
  and (
    r.reporter_name is null
    or btrim(r.reporter_name) = ''
    or lower(btrim(r.reporter_name)) = 'unknown student'
  )
  and btrim(concat_ws(' ', p.first_name, p.last_name)) <> '';
