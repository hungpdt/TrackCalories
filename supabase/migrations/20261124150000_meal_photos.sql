-- Ảnh bữa ăn: bucket riêng tư, mỗi người chỉ thấy thư mục <user_id>/ của mình.
alter table public.meals
  add column photo_path text check (photo_path is null or (length(photo_path) <= 200 and photo_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'));

-- Client vẫn không được sửa bữa trực tiếp, trừ cột ảnh của bữa của mình (đường dẫn phải nằm trong thư mục của mình).
grant update (photo_path) on public.meals to authenticated;
create policy "meals: gắn ảnh của mình" on public.meals for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (photo_path is null or photo_path like (select auth.uid())::text || '/%'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 2097152, array['image/jpeg'])
on conflict (id) do nothing;

create policy "meal-photos: đọc của mình" on storage.objects for select to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal-photos: tải lên của mình" on storage.objects for insert to authenticated
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal-photos: ghi đè của mình" on storage.objects for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "meal-photos: xóa của mình" on storage.objects for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
