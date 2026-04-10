alter table if exists public.profiles
  add column if not exists is_verified boolean default false;

alter table if exists public.profiles
  add column if not exists verified_at timestamptz;

alter table if exists public.profiles
  add column if not exists verified_by_email text;

update public.profiles
set is_verified = false
where is_verified is null;

alter table if exists public.profiles
  alter column is_verified set default false;

alter table if exists public.profiles
  alter column is_verified set not null;

create index if not exists profiles_is_verified_idx
  on public.profiles (is_verified);

create or replace function public.set_student_account_verification(
  p_profile_id uuid,
  p_is_verified boolean
)
returns table (
  id uuid,
  is_verified boolean,
  verified_at timestamptz,
  verified_by_email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_admin_email text;
  v_is_student boolean;
begin
  if not public.is_active_admin() then
    raise exception using errcode = '42501', message = 'Only admins can verify student accounts.';
  end if;

  if p_profile_id is null then
    raise exception 'profile id is required';
  end if;

  select *
  into v_profile
  from public.profiles as profile_row
  where profile_row.id = p_profile_id;

  if not found then
    raise exception 'Student account not found.';
  end if;

  v_is_student := coalesce(nullif(btrim(coalesce(v_profile.lrn, '')), ''), nullif(btrim(coalesce(v_profile.student_id, '')), ''), nullif(btrim(coalesce(v_profile.school_id_url, '')), '')) is not null;
  if not v_is_student then
    raise exception 'Only student accounts can be verified.';
  end if;

  v_admin_email := lower(btrim(coalesce((auth.jwt() ->> 'email')::text, '')));

  return query
  update public.profiles
  set is_verified = coalesce(p_is_verified, false),
      verified_at = case when coalesce(p_is_verified, false) then now() else null end,
      verified_by_email = case when coalesce(p_is_verified, false) then nullif(v_admin_email, '') else null end,
      updated_at = now()
  where public.profiles.id = p_profile_id
  returning
    public.profiles.id,
    public.profiles.is_verified,
    public.profiles.verified_at,
    public.profiles.verified_by_email;
end;
$$;

revoke all on function public.set_student_account_verification(uuid, boolean) from public;
grant execute on function public.set_student_account_verification(uuid, boolean) to authenticated;
