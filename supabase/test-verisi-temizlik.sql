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
--   • test konuşması ve içindeki 23 mesaj (arama kayıtları, konum,
--     dosya mesajı, sistem mesajları dahil)
--   • test başvurusu
--   • bu konuşmadan doğan bildirimler (her iki tarafta)
--   • push_test ile üretilmiş test bildirimleri
--   • sohbete yüklenmiş dosyalar (chat_files bucket)
--
-- KALACAKLAR
--   • test hesabı ve profili
--   • gerçek ilanlarınız
--   • cihaz push token'ları (kendiliğinden tazeleniyor)
--
-- DİKKAT: Bu betiği çalıştırdıktan sonra "telefondan dosya açma" testini
-- yapamazsınız — test dosyası da silinir. O testi ÖNCE yapın.
-- ============================================================================

begin;

-- Neyin silineceğini önce görün (istersen bu bloğu ayrı çalıştır)
select
  (select count(*) from public.conv_messages)                                    as mesaj,
  (select count(*) from public.conversations)                                    as konusma,
  (select count(*) from public.applications)                                     as basvuru,
  (select count(*) from public.notifications)                                     as bildirim,
  (select count(*) from storage.objects where bucket_id = 'chat_files')          as dosya;


-- ---------------------------------------------------------------------------
-- 1) Sohbete yüklenen dosyalar
--    conv_messages silinince dosyalar OTOMATİK gitmez — storage ayrı bir
--    alan, cascade yok. Önce onları temizliyoruz.
-- ---------------------------------------------------------------------------
delete from storage.objects
where bucket_id = 'chat_files'
  and (storage.foldername(name))[1] in (
    select c.id::text from public.conversations c
  );


-- ---------------------------------------------------------------------------
-- 2) Bu konuşmadan doğan bildirimler (iki tarafta da)
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
-- 3) Konuşmalar ve başvurular
--    conv_messages, conversations'a cascade ile bağlı;
--    conversations da applications'a cascade ile bağlı.
--    Yani başvuruyu silmek zinciri götürür — ama sırayı açıkça yazıyoruz
--    ki ne olduğu belli olsun.
-- ---------------------------------------------------------------------------
delete from public.conv_messages;
delete from public.conversations;
delete from public.applications;


-- Sonuç
select
  (select count(*) from public.conv_messages)                                    as mesaj,
  (select count(*) from public.conversations)                                    as konusma,
  (select count(*) from public.applications)                                     as basvuru,
  (select count(*) from public.notifications)                                     as bildirim,
  (select count(*) from storage.objects where bucket_id = 'chat_files')          as dosya;

commit;

-- ============================================================================
-- Hepsi 0 dönmeli. Yanlış giderse COMMIT yerine ROLLBACK yazıp çalıştırın —
-- begin/commit arasında olduğu için hiçbir şey kalıcı olmaz.
--
-- Test hesabını da silmek isterseniz (şimdilik ÖNERİLMEZ):
--   Supabase Studio → Authentication → Users → oguzhanyar178+kurye@gmail.com
--   Cascade ile profil, token ve kalan her şey temizlenir.
-- ============================================================================
