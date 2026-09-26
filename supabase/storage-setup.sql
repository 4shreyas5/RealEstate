-- Supabase Storage setup for property photos (run once per Supabase project,
-- in the SQL editor). Not a Prisma migration: it only touches the `storage`
-- schema and adds one helper function.

-- 1. Public-read bucket. Photos are served straight from their public URL
--    (https://<project>.supabase.co/storage/v1/object/public/property-images/...),
--    which is the host next.config.ts allows for next/image.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-images', 'property-images', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Only rows in admin_users may write — being a signed-in Supabase user is not enough.
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where id = auth.uid()::text)
$$;

drop policy if exists "property-images admin select" on storage.objects;
drop policy if exists "property-images admin insert" on storage.objects;
drop policy if exists "property-images admin update" on storage.objects;
drop policy if exists "property-images admin delete" on storage.objects;

-- Storage looks an object up (as the caller) before it will update/delete it,
-- so admins need SELECT too. Public *reads* of photo URLs don't use this.
create policy "property-images admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'property-images' and public.is_admin_user());

create policy "property-images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property-images' and public.is_admin_user());

create policy "property-images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'property-images' and public.is_admin_user());

create policy "property-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property-images' and public.is_admin_user());
