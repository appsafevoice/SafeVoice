create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (char_length(btrim(email)) > 0),
  lrn text,
  first_name text,
  last_name text,
  full_name text,
  student_id text,
  school_id_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists id uuid;

alter table if exists public.profiles
  add column if not exists email text;

alter table if exists public.profiles
  add column if not exists lrn text;

alter table if exists public.profiles
  add column if not exists first_name text;

alter table if exists public.profiles
  add column if not exists last_name text;

alter table if exists public.profiles
  add column if not exists full_name text;

alter table if exists public.profiles
  add column if not exists student_id text;

alter table if exists public.profiles
  add column if not exists school_id_url text;

alter table if exists public.profiles
  add column if not exists created_at timestamptz default now();

alter table if exists public.profiles
  add column if not exists updated_at timestamptz default now();

alter table if exists public.profiles
  alter column lrn drop not null;

update public.profiles
set first_name = split_part(btrim(full_name), ' ', 1)
where coalesce(btrim(first_name), '') = ''
  and coalesce(btrim(full_name), '') <> '';

update public.profiles
set last_name = nullif(substr(btrim(full_name), length(split_part(btrim(full_name), ' ', 1)) + 2), '')
where coalesce(btrim(last_name), '') = ''
  and coalesce(btrim(full_name), '') like '% %';

update public.profiles
set full_name = nullif(btrim(concat_ws(' ', first_name, last_name)), '')
where coalesce(btrim(full_name), '') = ''
  and (
    coalesce(btrim(first_name), '') <> ''
    or coalesce(btrim(last_name), '') <> ''
  );

update public.profiles
set lrn = nullif(btrim(student_id), '')
where coalesce(btrim(lrn), '') = ''
  and coalesce(btrim(student_id), '') <> '';

update public.profiles
set student_id = nullif(btrim(lrn), '')
where coalesce(btrim(student_id), '') = ''
  and coalesce(btrim(lrn), '') <> '';

update public.profiles p
set email = lower(btrim(u.email))
from auth.users u
where p.id = u.id
  and coalesce(btrim(p.email), '') = ''
  and u.email is not null
  and btrim(u.email) <> '';

alter table public.profiles
  alter column created_at set default now();

alter table public.profiles
  alter column updated_at set default now();

create unique index if not exists profiles_id_uniq
  on public.profiles (id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_lrn text;
  v_first_name text;
  v_last_name text;
  v_full_name text;
begin
  v_email := lower(btrim(coalesce(new.email, '')));
  v_lrn := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'lrn', new.raw_user_meta_data ->> 'student_id', '')), '');
  v_first_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), '');
  v_last_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '');
  v_full_name := nullif(
    btrim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        concat_ws(' ', v_first_name, v_last_name)
      )
    ),
    ''
  );

  if v_first_name is null and v_full_name is not null then
    v_first_name := split_part(v_full_name, ' ', 1);
  end if;

  if v_last_name is null and v_full_name is not null and v_full_name like '% %' then
    v_last_name := nullif(substr(v_full_name, length(split_part(v_full_name, ' ', 1)) + 2), '');
  end if;

  insert into public.profiles (
    id,
    email,
    lrn,
    first_name,
    last_name,
    full_name,
    student_id,
    created_at,
    updated_at
  )
  values (
    new.id,
    v_email,
    v_lrn,
    coalesce(v_first_name, ''),
    coalesce(v_last_name, ''),
    coalesce(v_full_name, nullif(btrim(concat_ws(' ', v_first_name, v_last_name)), '')),
    v_lrn,
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      lrn = coalesce(nullif(btrim(excluded.lrn), ''), public.profiles.lrn),
      first_name = case
        when nullif(btrim(excluded.first_name), '') is not null then excluded.first_name
        else public.profiles.first_name
      end,
      last_name = case
        when nullif(btrim(excluded.last_name), '') is not null then excluded.last_name
        else public.profiles.last_name
      end,
      full_name = case
        when nullif(btrim(excluded.full_name), '') is not null then excluded.full_name
        else public.profiles.full_name
      end,
      student_id = coalesce(nullif(btrim(excluded.student_id), ''), public.profiles.student_id),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  email,
  lrn,
  first_name,
  last_name,
  full_name,
  student_id,
  created_at,
  updated_at
)
select
  u.id,
  lower(btrim(coalesce(u.email, ''))),
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'lrn', u.raw_user_meta_data ->> 'student_id', '')), ''),
  coalesce(
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), ''),
    split_part(nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''), ' ', 1),
    ''
  ),
  coalesce(
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'last_name', '')), ''),
    nullif(
      substr(
        nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
        length(split_part(nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''), ' ', 1)) + 2
      ),
      ''
    ),
    ''
  ),
  nullif(
    btrim(
      coalesce(
        u.raw_user_meta_data ->> 'full_name',
        concat_ws(
          ' ',
          nullif(btrim(coalesce(u.raw_user_meta_data ->> 'first_name', '')), ''),
          nullif(btrim(coalesce(u.raw_user_meta_data ->> 'last_name', '')), '')
        )
      )
    ),
    ''
  ),
  nullif(btrim(coalesce(u.raw_user_meta_data ->> 'lrn', u.raw_user_meta_data ->> 'student_id', '')), ''),
  coalesce(u.created_at, now()),
  now()
from auth.users u
on conflict (id) do update
set email = excluded.email,
    lrn = coalesce(nullif(btrim(excluded.lrn), ''), public.profiles.lrn),
    first_name = case
      when nullif(btrim(excluded.first_name), '') is not null then excluded.first_name
      else public.profiles.first_name
    end,
    last_name = case
      when nullif(btrim(excluded.last_name), '') is not null then excluded.last_name
      else public.profiles.last_name
    end,
    full_name = case
      when nullif(btrim(excluded.full_name), '') is not null then excluded.full_name
      else public.profiles.full_name
    end,
    student_id = coalesce(nullif(btrim(excluded.student_id), ''), public.profiles.student_id),
    updated_at = now();
