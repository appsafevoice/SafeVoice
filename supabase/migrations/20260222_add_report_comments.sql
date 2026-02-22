create extension if not exists pgcrypto;

create table if not exists public.report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('student', 'admin')),
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists report_comments_report_id_created_at_idx
  on public.report_comments (report_id, created_at);

alter table public.report_comments enable row level security;

drop policy if exists "Authenticated users can read report comments" on public.report_comments;
create policy "Authenticated users can read report comments"
on public.report_comments
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can add report comments" on public.report_comments;
create policy "Authenticated users can add report comments"
on public.report_comments
for insert
to authenticated
with check (author_id = auth.uid());
