alter table if exists public.report_comments
add column if not exists author_name text;

create index if not exists report_comments_author_name_idx
  on public.report_comments (author_name);
