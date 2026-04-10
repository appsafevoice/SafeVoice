alter table if exists public.reports
  add column if not exists resolution_description text,
  add column if not exists resolution_attachments text[],
  add column if not exists resolved_at timestamptz;

update public.reports
set resolved_at = coalesce(resolved_at, updated_at, created_at)
where status = 'resolved'
  and resolved_at is null;

insert into storage.buckets (id, name, public)
values ('report-attachments', 'report-attachments', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Authenticated users can upload report attachments" on storage.objects;
create policy "Authenticated users can upload report attachments"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'report-attachments');
