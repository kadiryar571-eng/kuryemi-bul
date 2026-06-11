-- ============================================================
-- Kuryemi Bul — Migration 10: Storage (avatar + KYC belgesi)
-- İki bucket: 'avatars' (herkese açık okuma) + 'kyc_documents' (özel, PII).
-- Dosya yolu kuralı: "<auth.uid>/dosya.ext" — kullanıcı yalnız KENDİ klasörüne yazar.
-- profiles.avatar_url + kyc_submissions.belge_url sütunları eklenir.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- NOT: Bucket'lar Dashboard → Storage'dan da oluşturulabilir; bu SQL ikisini de yapar.
-- ============================================================

-- 1) Bucket'lar
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('kyc_documents', 'kyc_documents', false)
on conflict (id) do update set public = false;

-- 2) Profil sütunları
alter table public.profiles add column if not exists avatar_url text;
alter table public.kyc_submissions add column if not exists belge_url text;

-- 3) storage.objects RLS politikaları
--    (storage.objects'te RLS varsayılan açıktır)

-- AVATARS: herkes okur, sahip kendi klasörüne yazar/günceller/siler
drop policy if exists kb_avatars_read on storage.objects;
create policy kb_avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists kb_avatars_insert on storage.objects;
create policy kb_avatars_insert on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists kb_avatars_update on storage.objects;
create policy kb_avatars_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists kb_avatars_delete on storage.objects;
create policy kb_avatars_delete on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- KYC_DOCUMENTS: yalnız sahip + admin okur; sahip kendi klasörüne yazar
drop policy if exists kb_kyc_read on storage.objects;
create policy kb_kyc_read on storage.objects for select
  using (
    bucket_id = 'kyc_documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin(auth.uid()))
  );

drop policy if exists kb_kyc_insert on storage.objects;
create policy kb_kyc_insert on storage.objects for insert
  with check (bucket_id = 'kyc_documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists kb_kyc_update on storage.objects;
create policy kb_kyc_update on storage.objects for update
  using (bucket_id = 'kyc_documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists kb_kyc_delete on storage.objects;
create policy kb_kyc_delete on storage.objects for delete
  using (bucket_id = 'kyc_documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Bitti. Yeni bucket'lar: avatars, kyc_documents ; yeni sütun: profiles.avatar_url, kyc_submissions.belge_url
