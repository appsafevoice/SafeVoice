alter table if exists public.report_comments
add column if not exists author_position text;

update public.report_comments as comment
set author_position = source.position
from (
  select
    comment_row.id,
    coalesce(account_by_email.position, account_by_name.position) as position
  from public.report_comments as comment_row
  left join auth.users as auth_user
    on auth_user.id = comment_row.author_id
  left join public.admin_accounts as account_by_email
    on lower(account_by_email.email) = lower(coalesce(auth_user.email, ''))
  left join public.admin_accounts as account_by_name
    on lower(btrim(coalesce(account_by_name.full_name, ''))) = lower(btrim(coalesce(comment_row.author_name, '')))
  where comment_row.author_role = 'admin'
) as source
where comment.id = source.id
  and btrim(coalesce(comment.author_position, '')) = ''
  and btrim(coalesce(source.position, '')) <> '';

create index if not exists report_comments_author_position_idx
  on public.report_comments (author_position);
