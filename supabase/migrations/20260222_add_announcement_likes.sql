create extension if not exists pgcrypto;

create table if not exists public.announcement_likes (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (announcement_id, user_id)
);

create index if not exists announcement_likes_announcement_id_idx
  on public.announcement_likes (announcement_id);

create index if not exists announcement_likes_user_id_idx
  on public.announcement_likes (user_id);

alter table public.announcement_likes enable row level security;

drop policy if exists "Authenticated users can read likes" on public.announcement_likes;
create policy "Authenticated users can read likes"
on public.announcement_likes
for select
to authenticated
using (true);

drop policy if exists "Authenticated users can add own likes" on public.announcement_likes;
create policy "Authenticated users can add own likes"
on public.announcement_likes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Authenticated users can remove own likes" on public.announcement_likes;
create policy "Authenticated users can remove own likes"
on public.announcement_likes
for delete
to authenticated
using (user_id = auth.uid());
