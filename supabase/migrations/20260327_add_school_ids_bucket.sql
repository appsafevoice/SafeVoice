insert into storage.buckets (id, name, public)
values ('school-ids', 'school-ids', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can upload signup school IDs" on storage.objects;
create policy "Users can upload signup school IDs"
on storage.objects
for insert
to public
with check (
  bucket_id = 'school-ids'
  and (storage.foldername(name))[1] = 'signup'
);
