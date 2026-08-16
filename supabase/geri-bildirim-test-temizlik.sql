-- ============================================================================
-- geri-bildirim-test-temizlik.sql
--
-- Geri bildirim / şikayet akışını test ederken oluşan kayıtları siler ki
-- akış baştan denenebilsin.
--
-- NEDEN GEREKLİ:
--   • public.reviews    → unique (reviewer_user, target_id, hiring_id)
--     Aynı kişi aynı iş için ikinci bir değerlendirme yazamaz; ancak
--     mevcut olanı günceller. Sıfırdan "ilk kez gönderiyorum" akışını
--     test etmek için kaydın silinmesi gerekir.
--   • public.review_reports → unique (review_id, reporter_user)
--     Aynı kişi aynı değerlendirmeyi bir kez şikayet edebilir. Karar
--     verilmiş bir şikayeti tekrar denemek için kaydın silinmesi gerekir.
--
-- BU BİR MİGRATION DEĞİLDİR. Şemayı değiştirmez; test döngüsü için
-- tekrar tekrar çalıştırılabilir.
--
-- SİLİNECEKLER
--   • TÜM değerlendirmeler (public.reviews)
--   • TÜM şikayetler (public.review_reports — reviews'a cascade ile bağlı)
--
-- KALACAKLAR
--   • hesaplar, profiller, işe alım kararları, ilanlar, mesajlar
--   • denetim günlüğü (admin_audit_log) — kasıtlı: yönetici işlemlerinin
--     izi silinmemeli, test bile olsa. Kayıtları görmek isterseniz en
--     alttaki sorgu var.
--
-- DİKKAT: reviews silinince recompute_profile_rating trigger'ı devreye
-- girer ve ilgili profillerin puan/degerlendirme alanlarını 0'a çeker.
-- Bu istenen davranıştır.
--
-- ÜRETİMDE GERÇEK KULLANICI VERİSİ VARSA ÇALIŞTIRMAYIN. Şu an tablodaki
-- her şey testtir; ileride gerçek değerlendirmeler birikirse aşağıdaki
-- "SEÇİCİ SİLME" bölümünü kullanın.
-- ============================================================================


-- ============================================================================
-- ADIM 1 — Silmeden önce ne olduğunu gör
-- ============================================================================

select 'silinecek degerlendirme' as ne, count(*) as adet from public.reviews
union all
select 'silinecek sikayet', count(*) from public.review_reports;


-- ============================================================================
-- ADIM 2 — SİL
--
-- review_reports.review_id → reviews(id) on delete cascade olduğu için
-- reviews'ı silmek şikayetleri de siler. Yine de açıkça yazıyoruz ki
-- ne olduğu okurken belli olsun.
-- ============================================================================

delete from public.review_reports;
delete from public.reviews;


-- ============================================================================
-- ADIM 3 — DOĞRULA
--
-- Tablolar boşalmış ve trigger profil puanlarını sıfırlamış olmalı.
-- ============================================================================

do $$
declare
  n_rev int;
  n_rep int;
  n_puan int;
begin
  select count(*) into n_rev from public.reviews;
  select count(*) into n_rep from public.review_reports;

  if n_rev <> 0 then raise exception 'reviews bosalmadi: % satir', n_rev; end if;
  if n_rep <> 0 then raise exception 'review_reports bosalmadi: % satir', n_rep; end if;

  -- Değerlendirmesi olmadığı halde puanı duran profil kalmamalı
  select count(*) into n_puan from public.profiles
   where degerlendirme > 0 or puan > 0;

  if n_puan > 0 then
    raise warning 'DIKKAT: % profilde puan/degerlendirme hala dolu. '
                  'recompute_profile_rating trigger''i calismamis olabilir.', n_puan;
  else
    raise notice 'Profil puanlari sifirlandi ✓';
  end if;

  raise notice 'Temizlik tamam — degerlendirme: %, sikayet: %', n_rev, n_rep;
end $$;


-- ============================================================================
-- SEÇİCİ SİLME (ileride gerçek veri varken kullanın)
--
-- Yalnız belirli iki test hesabı arasındaki kayıtları siler.
-- Yukarıdaki toplu DELETE yerine bunu çalıştırın.
-- ============================================================================

-- delete from public.reviews r
--  using public.profiles rp, public.profiles tp
--  where r.reviewer_profile = rp.id
--    and r.target_id        = tp.id
--    and rp.ad in ('Kadir Yar', 'oğuzhan yar')
--    and tp.ad in ('Kadir Yar', 'oğuzhan yar');


-- ============================================================================
-- DENETİM GÜNLÜĞÜ — silinmez, incelemek isterseniz
-- ============================================================================

-- select created_at, admin_email, action, target_table, result
--   from public.admin_audit_log
--  order by created_at desc limit 20;
