do $$
begin
  if exists (
    select 1
    from (
      select lower(btrim(email)) as normalized_email
      from public.profiles
      where nullif(btrim(coalesce(email, '')), '') is not null
      group by 1
      having count(*) > 1
    ) duplicate_emails
  ) then
    raise exception 'Cannot enforce unique profile emails because duplicates already exist in public.profiles.';
  end if;

  if exists (
    select 1
    from (
      select nullif(btrim(coalesce(lrn, student_id, '')), '') as normalized_lrn
      from public.profiles
      where nullif(btrim(coalesce(lrn, student_id, '')), '') is not null
      group by 1
      having count(*) > 1
    ) duplicate_lrns
  ) then
    raise exception 'Cannot enforce unique LRNs because duplicates already exist in public.profiles.';
  end if;
end;
$$;

create unique index if not exists profiles_email_lower_uniq
  on public.profiles (lower(email));

create unique index if not exists profiles_lrn_normalized_uniq
  on public.profiles ((nullif(btrim(coalesce(lrn, student_id, '')), '')))
  where nullif(btrim(coalesce(lrn, student_id, '')), '') is not null;

drop function if exists public.signup_check_duplicates(text, text);

create or replace function public.signup_check_duplicates(
  p_email text,
  p_lrn text
)
returns table (
  email_exists boolean,
  lrn_exists boolean
)
language sql
security definer
set search_path = public, auth
as $$
  with normalized as (
    select
      lower(btrim(coalesce(p_email, ''))) as email,
      nullif(btrim(coalesce(p_lrn, '')), '') as lrn
  )
  select
    (
      exists (
        select 1
        from auth.users u
        cross join normalized n
        where n.email <> ''
          and lower(coalesce(u.email, '')) = n.email
      )
      or exists (
        select 1
        from public.profiles p
        cross join normalized n
        where n.email <> ''
          and lower(coalesce(p.email, '')) = n.email
      )
      or exists (
        select 1
        from public.admin_accounts a
        cross join normalized n
        where n.email <> ''
          and lower(coalesce(a.email, '')) = n.email
      )
    ) as email_exists,
    (
      exists (
        select 1
        from public.profiles p
        cross join normalized n
        where n.lrn is not null
          and nullif(btrim(coalesce(p.lrn, p.student_id, '')), '') = n.lrn
      )
      or exists (
        select 1
        from auth.users u
        cross join normalized n
        where n.lrn is not null
          and nullif(btrim(coalesce(u.raw_user_meta_data ->> 'lrn', u.raw_user_meta_data ->> 'student_id', '')), '') = n.lrn
      )
    ) as lrn_exists;
$$;

revoke all on function public.signup_check_duplicates(text, text) from public;
grant execute on function public.signup_check_duplicates(text, text) to anon;
grant execute on function public.signup_check_duplicates(text, text) to authenticated;
