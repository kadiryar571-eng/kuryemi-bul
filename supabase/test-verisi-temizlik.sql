-- ============================================================================
-- test-verisi-temizlik.sql
--
-- Test sırasında oluşan verileri siler. Test HESABI kalır
-- (oguzhanyar178+kurye@gmail.com) — Play Store incelemesinde Google'a test
-- hesabı vermeniz gerekebiliyor, o zaman hazır olur.
--
-- BU BİR MİGRATION DEĞİLDİR. Numaralandırılmadı çünkü şemayı değiştirmiyor
-- ve tekrar tekrar çalıştırılacak bir şey değil. Bir kez çalıştırıp
-- sonucuna bakın.
--
-- SİLİNECEKLER
--   • test konuşması ve içindeki mesajlar (arama kayıtları, konum,
--     dosya mesajı, sistem mesajları dahil)
--   • test başvurusu
--   • bu konuşmadan doğan bildirimler (her iki tarafta)
--   • push_test ile üretilmiş test bildirimleri
--
-- KALACAKLAR
--   • test hesabı ve profili
--   • gerçek ilanlarınız
--   • cihaz push token'ları (kendiliğinden tazeleniyor)
--
-- DİKKAT: Bu betiği çalıştırdıktan sonra "telefondan dosya açma" testini
-- yapamazsınız — sohbet silinince dosya mesajı da gider. O testi ÖNCE yapın.
-- ============================================================================


-- ============================================================================
-- ADIM 1 — DOSYALAR (SQL DEĞİL, STUDIO'DAN)
--
-- Yüklenen dosyalar SQL ile silinemez. Supabase, storage.objects üzerinde
-- storage.protect_delete() trigger'ı çalıştırıyor ve doğrudan DELETE'i
-- reddediyor:
--
--   ERROR 42501: Direct deletion from storage tables is not allowed.
--                Use the Storage API instead.
--
-- Sebebi mantıklı: satırı silmek diskteki dosyayı silmez, yetim dosya kalır.
-- Bu yüzden silme yalnız Storage API üzerinden yapılabiliyor — RLS
-- politikalarımız (kb_chatfiles_delete) doğru, trigger onların üstünde.
--
-- YAPILACAK:
--   Supabase Studio → Storage → chat_files → içindeki klasörü aç →
--   dosyaları seç → Delete
--
-- Bucket tamamen teste ait, içindeki her şey silinebilir.
-- Neyin durduğunu önce görmek isterseniz (bu SELECT çalışır):
-- ============================================================================

select
  name                                       as dosya_yolu,
  (storage.foldername(name))[1]              as konusma_id,
  round((metadata ->> 'size')::numeric / 1024, 1) as boyut_kb,
  created_at
from storage.objects
where bucket_id = 'chat_files'
order by created_at;


-- ============================================================================
-- ADIM 2 — VERİTABANI (aşağısını tek seferde çalıştırın)
--
-- Dosyaları Studio'dan sildikten SONRA burayı çalıştırın. Sırası önemli:
-- konuşmalar silinince hangi dosyanın hangi konuşmaya ait olduğu
-- kaybolur (klasör adı = conversation_id).
-- ============================================================================

begin;

-- Öncesi
select
  (select count(*) from public.conv_messages)                           as mesaj,
  (select count(*) from public.conversations)                           as konusma,
  (select count(*) from public.applications)                            as basvuru,
  (select count(*) from public.notifications)                           as bildirim,
  (select count(*) from storage.objects where bucket_id = 'chat_files') as kalan_dosya;


-- ---------------------------------------------------------------------------
-- 1) Bu konuşmadan doğan bildirimler (iki tarafta da)
--    data->>'conversation_id' ile bağlılar. Ayrıca push_test'in ürettiği
--    type='test' kayıtları.
-- ---------------------------------------------------------------------------
delete from public.notifications
where type = 'test'
   or (data ->> 'conversation_id') in (
        select c.id::text from public.conversations c
      );

-- Başvurudan doğan bildirimler (yeni başvuru vb.)
delete from public.notifications
where (data ->> 'application_id') in (
        select a.id::text from public.applications a
      );


-- ---------------------------------------------------------------------------
-- 2) Konuşmalar ve başvurular
--    conv_messages, conversations'a cascade ile bağlı;
--    conversations da applications'a cascade ile bağlı.
--    Yani başvuruyu silmek zinciri götürür — ama sırayı açıkça yazıyoruz
--    ki ne olduğu belli olsun.
-- ---------------------------------------------------------------------------
delete from public.conv_messages;
delete from public.conversations;
delete from public.applications;


-- Sonrası
select
  (select count(*) from public.conv_messages)                           as mesaj,
  (select count(*) from public.conversations)                           as konusma,
  (select count(*) from public.applications)                            as basvuru,
  (select count(*) from public.notifications)                           as bildirim,
  (select count(*) from storage.objects where bucket_id = 'chat_files') as kalan_dosya;

commit;

-- ============================================================================
-- İlk dört sütun 0 dönmeli. kalan_dosya da 0 değilse Adım 1'i atlamışsınız
-- demektir — Studio → Storage'dan silin, veri kaybı olmaz.
--
-- Yanlış giderse COMMIT yerine ROLLBACK yazıp çalıştırın — begin/commit
-- arasında olduğu için hiçbir şey kalıcı olmaz. (Nitekim ilk denemede
-- storage hatası tam da bunu yaptı: tamamı geri alındı.)
--
-- Test hesabını da silmek isterseniz (şimdilik ÖNERİLMEZ):
--   Supabase Studio → Authentication → Users → oguzhanyar178+kurye@gmail.com
--   Cascade ile profil, token ve kalan her şey temizlenir.
-- ============================================================================
