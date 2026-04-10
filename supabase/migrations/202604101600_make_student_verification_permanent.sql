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
  v_next_verified boolean;
begin
  if not public.is_active_admin() then
    raise exception using errcode = '42501', message = 'Only admins can verify student accounts.';
  end if;

  if p_profile_id is null then
    raise exception 'profile id is required';
  end if;

  v_next_verified := coalesce(p_is_verified, false);

  select *
  into v_profile
  from public.profiles as profile_row
  where profile_row.id = p_profile_id;

  if not found then
    raise exception 'Student account not found.';
  end if;

  v_is_student := coalesce(
    nullif(btrim(coalesce(v_profile.lrn, '')), ''),
    nullif(btrim(coalesce(v_profile.student_id, '')), ''),
    nullif(btrim(coalesce(v_profile.school_id_url, '')), '')
  ) is not null;

  if not v_is_student then
    raise exception 'Only student accounts can be verified.';
  end if;

  if v_profile.is_verified and not v_next_verified then
    raise exception using errcode = '22023', message = 'Verified student accounts cannot be unverified.';
  end if;

  v_admin_email := lower(btrim(coalesce((auth.jwt() ->> 'email')::text, '')));

  return query
  update public.profiles as profile_update
  set is_verified = (profile_update.is_verified or v_next_verified),
      verified_at = case
        when profile_update.is_verified then profile_update.verified_at
        when v_next_verified then now()
        else null
      end,
      verified_by_email = case
        when profile_update.is_verified then profile_update.verified_by_email
        when v_next_verified then nullif(v_admin_email, '')
        else null
      end,
      updated_at = now()
  where profile_update.id = p_profile_id
  returning
    profile_update.id,
    profile_update.is_verified,
    profile_update.verified_at,
    profile_update.verified_by_email;
end;
$$;

revoke all on function public.set_student_account_verification(uuid, boolean) from public;
grant execute on function public.set_student_account_verification(uuid, boolean) to authenticated;

