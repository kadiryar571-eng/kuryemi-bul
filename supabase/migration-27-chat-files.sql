-- ============================================================================
-- migration-27-chat-files.sql   (idempotent)
--
-- SOHBETTE GERÇEK DOSYA GÖNDERİMİ
--
-- "Belge Gönder", "CV Gönder", "Evrak Yükle" butonları bugüne kadar hiçbir
-- dosya göndermiyordu; yalnızca "belgelerimi gönderiyorum" diye bir metin
-- yazıyorlardı. Karşı taraf bir şey geldiğini sanıyor, ortada dosya yok.
--
-- Bu migration sohbet ekleri için özel bir bucket ve erişim kurallarını kurar.
--
-- YOL KURALI
--   <conversation_id>/<gönderen_user_id>/<zaman>.<uzantı>
--
-- Neden iki katmanlı: mevcut bucket'larda (avatars, kyc_documents) kural
-- "yalnız kendi klasörün" şeklinde. Sohbet dosyasında bu yetmez — KARŞI
-- TARAFIN da okuyabilmesi gerekiyor. Birinci klasör konuşma kimliği olunca
-- okuma iznini "bu konuşmanın tarafı mısın" diye sorabiliyoruz; ikinci
-- klasör gönderen olduğu için de kimsenin başkası adına dosya yüklemesi
-- mümkün olmuyor.
--
-- SUNUCU TARAFI SINIR
-- Boyut ve tür kısıtı bucket üzerinde tanımlı. İstemcide de kontrol var ama
-- oradaki kontrol atlatılabilir; asıl kapı burası.
--   • en fazla 10 MB
--   • resim (jpg/png/webp), PDF ve Office (doc/docx/xls/xlsx)
--   • video, arşiv (zip/rar) ve çalıştırılabilir dosyalar KABUL EDİLMEZ
--
-- NOT: message_type için yeni bir değer gerekmiyor — 'document' zaten
-- şemadaki CHECK listesinde var (bkz. schema.sql / migration-26).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat_files', 'chat_files', false, 10485760,
  array[
    'image/jpeg','image/png','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


-- ---------------------------------------------------------------------------
-- 2) Erişim kuralları
--
-- foldername(name)[1] = konuşma kimliği
-- foldername(name)[2] = gönderen kullanıcı kimliği
--
-- Karşılaştırma metin üzerinden yapılıyor (c.id::text); klasör adı geçerli
-- bir uuid değilse sorgu hata vermez, sadece eşleşmez.
-- ---------------------------------------------------------------------------

-- OKUMA: yalnız konuşmanın tarafları
drop policy if exists kb_chatfiles_read on storage.objects;
create policy kb_chatfiles_read on storage.objects for select
  using (
    bucket_id = 'chat_files'
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
    )
  );

-- YAZMA: konuşmanın tarafısın VE kendi klasörüne yazıyorsun
drop policy if exists kb_chatfiles_insert on storage.objects;
create policy kb_chatfiles_insert on storage.objects for insert
  with check (
    bucket_id = 'chat_files'
    and (storage.foldername(name))[2] = auth.uid()::text
    and exists (
      select 1 from public.conversations c
      where c.id::text = (storage.foldername(name))[1]
        and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
    )
  );

-- SİLME: yalnız kendi yüklediğin dosya
drop policy if exists kb_chatfiles_delete on storage.objects;
create policy kb_chatfiles_delete on storage.objects for delete
  using (
    bucket_id = 'chat_files'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Güncelleme gerekmiyor: her gönderim yeni bir dosya (zaman damgalı ad).
drop policy if exists kb_chatfiles_update on storage.objects;


-- ---------------------------------------------------------------------------
-- 3) Doğrulama
--
--   select id, public, file_size_limit, array_length(allowed_mime_types,1) as tur_sayisi
--   from storage.buckets where id = 'chat_files';
--
--   select policyname from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--     and policyname like 'kb_chatfiles%';
--
-- Beklenen: bucket public=false, 10485760 bayt, 8 tür;
--           üç politika (read / insert / delete).
-- ---------------------------------------------------------------------------
