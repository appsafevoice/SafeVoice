create or replace function public.normalize_admin_account_position(p_position text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(regexp_replace(btrim(coalesce(p_position, '')), '\s+', ' ', 'g'))
    when 'intern' then 'Intern'
    when 'guidance counselor' then 'Guidance Counselor'
    when 'admin' then 'Admin'
    when 'super admin' then 'Admin'
    else null
  end;
$$;

revoke all on function public.normalize_admin_account_position(text) from public;
grant execute on function public.normalize_admin_account_position(text) to authenticated;

update public.admin_accounts
set position = public.normalize_admin_account_position(position)
where position is not null
  and public.normalize_admin_account_position(position) is not null
  and position <> public.normalize_admin_account_position(position);

drop policy if exists "Super Admin can insert admin accounts" on public.admin_accounts;
create policy "Super Admin can insert admin accounts"
on public.admin_accounts
for insert
to authenticated
with check (
  public.is_super_admin()
  and lower(email) <> 'appsafevoice@gmail.com'
  and public.normalize_admin_account_position(position) is not null
  and position = public.normalize_admin_account_position(position)
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
  and public.normalize_admin_account_position(position) is not null
  and position = public.normalize_admin_account_position(position)
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
  v_position_input text;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;

  v_full_name := btrim(coalesce(p_full_name, ''));
  v_position_input := btrim(coalesce(p_position, ''));
  v_position := public.normalize_admin_account_position(v_position_input);
  v_email := lower(btrim(coalesce(p_email, '')));

  if v_full_name = '' then
    raise exception 'full name is required';
  end if;

  if v_position is null or v_position <> v_position_input then
    raise exception using errcode = '22023', message = 'position must be one of: Intern, Guidance Counselor, Admin';
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

create or replace function public.can_current_admin_comment_on_reports()
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.admin_accounts a
      where a.is_active = true
        and lower(a.email) = lower((auth.jwt() ->> 'email')::text)
        and public.normalize_admin_account_position(a.position) in ('Intern', 'Guidance Counselor')
    );
$$;

revoke all on function public.can_current_admin_comment_on_reports() from public;
grant execute on function public.can_current_admin_comment_on_reports() to authenticated;

drop policy if exists "Authenticated users can add report comments" on public.report_comments;
create policy "Authenticated users can add report comments"
on public.report_comments
for insert
to authenticated
with check (
  author_id = auth.uid()
  and (
    (author_role = 'student' and not public.is_active_admin())
    or (author_role = 'admin' and public.can_current_admin_comment_on_reports())
  )
);
