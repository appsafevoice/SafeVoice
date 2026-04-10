drop policy if exists "Admins can view school ID attachments" on storage.objects;
create policy "Admins can view school ID attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'school-ids'
  and public.is_active_admin()
);

