-- ============================================================================
-- test-akis-temizlik.sql
--
-- İşlem verisini siler ki akış en baştan test edilebilsin:
--   ilan → başvuru → kabul → mesaj → değerlendirme → şikayet
--
-- BU BİR MİGRATION DEĞİLDİR. Şemayı değiştirmez; test döngüsü boyunca
-- tekrar tekrar çalıştırılabilir.
--
-- ─────────────────────────────────────────────────────────────────────
-- SİLİNİR                          KALIR
-- ─────────────────────────────────────────────────────────────────────
-- başvurular (applications)        hesaplar (auth.users)
-- işe alım kararları               profiller (profiles, profile_contacts)
-- görüşmeler, onboarding           ilanlar (listings)
-- konuşmalar + mesajlar            kimlik başvuruları (kyc_submissions)
-- değerlendirmeler + şikayetler    yönetici listesi (admins)
-- teklifler (offers) + bids        DENETİM GÜNLÜĞÜ (admin_audit_log)
-- bildirimler                      cihaz push token'ları
-- görüntülenme sayaçları
-- ─────────────────────────────────────────────────────────────────────
--
-- DENETİM GÜNLÜĞÜNE DOKUNULMAZ — bilinçli. Yönetici işlemlerinin izi test
-- bile olsa silinmemeli; değiştirilemez olması onun tek anlamı.
--
-- KYC BAŞVURULARI KALIR — kimlik doğrulama bu akışın parçası değil. Onları
-- da sıfırlamak istersen en alttaki yorumlu bloğu aç.
--
-- reviews silinince recompute_profile_rating trigger'ı devreye girer ve
-- profillerin puan/degerlendirme alanlarını 0'a çeker. İstenen davranış.
--
-- ÜRETİMDE GERÇEK KULLANICI VERİSİ VARSA ÇALIŞTIRMAYIN.
--
-- KULLANIM: Supabase → SQL Editor → Run.
-- ============================================================================


-- ============================================================================
-- ADIM 1 — Silmeden önce ne olduğunu gör
-- ============================================================================

select 'basvuru'          as tablo, count(*) as adet from public.applications
union all select 'ise alim karari',   count(*) from public.hiring_decisions
union all select 'gorusme',           count(*) from public.interviews
union all select 'onboarding',        count(*) from public.onboarding
union all select 'konusma',           count(*) from public.conversations
union all select 'mesaj (conv)',      count(*) from public.conv_messages
union all select 'mesaj (eski)',      count(*) from public.messages
union all select 'degerlendirme',     count(*) from public.reviews
union all select 'sikayet',           count(*) from public.review_reports
union all select 'teklif',            count(*) from public.offers
union all select 'bildirim',          count(*) from public.notifications
order by 1;


-- ============================================================================
-- ADIM 2 — SİL
--
-- Sıra FK bağımlılıklarına göre: çocuk kayıtlar önce. Çoğunda zaten
-- `on delete cascade` var ama açıkça yazmak ne silindiğini okunur kılıyor.
-- ============================================================================

-- Değerlendirme zinciri
delete from public.review_reports;
delete from public.reviews;

-- Mesajlaşma
delete from public.conv_messages;
delete from public.conversations;
delete from public.messages;              -- eski mesaj tablosu

-- İşe alım zinciri
delete from public.onboarding;
delete from public.interviews;
delete from public.hiring_decisions;
delete from public.applications;

-- Teklif / ihale zinciri
delete from public.bids;
delete from public.offers;
delete from public.tenders;

-- Bildirimler ve sayaçlar
delete from public.notifications;
delete from public.listing_views;
delete from public.profile_views;


-- ============================================================================
-- ADIM 3 — Denormalize sayaçları da sıfırla
--
-- profiles.acik_ilan ve tamamlanan gibi alanlar trigger'larla güncelleniyor;
-- kaynak kayıtlar silinince otomatik düşmeyebilir. guard_profile_metrics
-- auth.uid() NULL iken (SQL Editor) serbest bırakır, o yüzden buradan
-- düzeltilebilir.
-- ============================================================================

update public.profiles p
   set acik_ilan     = (select count(*) from public.listings l
                         where l.owner_id = p.id and l.durum = 'acik'),
       tamamlanan    = 0,
       puan          = 0,
       degerlendirme = 0;


-- ============================================================================
-- ADIM 4 — DOĞRULA
-- ============================================================================

do $$
declare
  n int;
  kalan text := '';
begin
  select count(*) into n from public.applications;      if n > 0 then kalan := kalan || 'applications=' || n || ' '; end if;
  select count(*) into n from public.hiring_decisions;  if n > 0 then kalan := kalan || 'hiring_decisions=' || n || ' '; end if;
  select count(*) into n from public.conversations;     if n > 0 then kalan := kalan || 'conversations=' || n || ' '; end if;
  select count(*) into n from public.conv_messages;     if n > 0 then kalan := kalan || 'conv_messages=' || n || ' '; end if;
  select count(*) into n from public.reviews;           if n > 0 then kalan := kalan || 'reviews=' || n || ' '; end if;
  select count(*) into n from public.review_reports;    if n > 0 then kalan := kalan || 'review_reports=' || n || ' '; end if;
  select count(*) into n from public.notifications;     if n > 0 then kalan := kalan || 'notifications=' || n || ' '; end if;

  if kalan <> '' then
    raise exception 'Bazi tablolar bosalmadi: %', kalan;
  end if;

  select count(*) into n from public.profiles where puan > 0 or degerlendirme > 0;
  if n > 0 then
    raise warning 'DIKKAT: % profilde puan/degerlendirme hala dolu', n;
  end if;

  raise notice 'Islem verisi temizlendi ✓';

  select count(*) into n from public.profiles;  raise notice '  kalan profil        : %', n;
  select count(*) into n from public.listings;  raise notice '  kalan ilan          : %', n;
  select count(*) into n from public.admins;    raise notice '  kalan yonetici      : %', n;
  select count(*) into n from public.admin_audit_log; raise notice '  denetim gunlugu     : % (dokunulmadi)', n;
end $$;


-- ============================================================================
-- İSTEĞE BAĞLI — kimlik doğrulama (KYC) kayıtlarını da sıfırla
--
-- Bu akışın parçası değil, o yüzden varsayılan olarak KAPALI. KYC onay
-- ekranını da baştan test etmek istersen aşağıdaki iki satırı aç.
-- ============================================================================

-- delete from public.kyc_submissions;
-- update public.profiles set dogrulama = 'none' where dogrulama <> 'none';


-- ============================================================================
-- İSTEĞE BAĞLI — havuz kayıtlarını temizle
-- ============================================================================

-- delete from public.pool_members;
