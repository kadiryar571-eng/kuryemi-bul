-- ============================================================
-- KuryemiBul — Migration 19: İşe alım omurgası düzeltmeleri
--
-- migration-16 canlıya alınırken ortaya çıkan üç eksik:
--   1) onboarding.decision_id'de UNIQUE yok → upsert çalışmaz
--   2) hiring_decisions'taki unique index KISMİ (partial) → upsert çalışmaz
--   3) Bildirimler yalnız UPDATE'te üretiliyor → doğrudan 'kabul' olarak
--      eklenen karar veya yeni oluşturulan görüşme daveti hiç bildirilmiyor
--
-- ÖN KOŞUL: migration-16 ÖNCE çalıştırılmalı.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- ---------- 0) ÖN KOŞUL ----------
do $$
begin
  if to_regclass('public.interviews') is null
     or to_regclass('public.hiring_decisions') is null
     or to_regclass('public.onboarding') is null then
    raise exception 'migration-19 ÖN KOŞUL EKSİK: önce migration-16-hiring.sql çalıştırılmalı.';
  end if;
end $$;

-- ---------- 0b) EKSİK KOLONLAR ----------
-- Görüşme davet formunda "not" ve online görüşme bağlantısı alanları var,
-- migration-16'da karşılıkları yoktu.
alter table public.interviews add column if not exists note         text default '';
alter table public.interviews add column if not exists meeting_link text default '';

-- ---------- 1) ONBOARDING: decision_id benzersiz olmalı ----------
-- saveOnboarding() upsert'ü onConflict=decision_id kullanıyor.
-- UNIQUE yoksa Postgres "no unique or exclusion constraint matching
-- the ON CONFLICT specification" hatası verir.
-- Önce olası mükerrer satırları temizle (en yenisi kalsın):
delete from public.onboarding o
 where exists (
   select 1 from public.onboarding o2
    where o2.decision_id = o.decision_id
      and o2.created_at > o.created_at
 );

create unique index if not exists onboarding_decision_uidx
  on public.onboarding(decision_id);

-- ---------- 2) HIRING_DECISIONS: kısmi index → tam unique index ----------
-- migration-16'daki index "where listing_id is not null" olduğu için
-- ON CONFLICT (listing_id, applicant_id) ile eşleşmiyor.
-- Tam index'te listing_id NULL olan satırlar zaten benzersiz sayılmaz
-- (Postgres'te NULL <> NULL), davranış korunur.
drop index if exists public.hiring_decisions_pair_idx;

-- Olası mükerrerleri temizle (en yenisi kalsın)
delete from public.hiring_decisions d
 where d.listing_id is not null
   and exists (
     select 1 from public.hiring_decisions d2
      where d2.listing_id = d.listing_id
        and d2.applicant_id = d.applicant_id
        and d2.created_at > d.created_at
   );

create unique index if not exists hiring_decisions_pair_uidx
  on public.hiring_decisions(listing_id, applicant_id);

-- ---------- 3) BİLDİRİM: INSERT anında da üret ----------
-- migration-16 yalnız AFTER UPDATE dinliyordu. Karar doğrudan 'kabul'
-- olarak eklenirse ya da yeni görüşme daveti oluşturulursa adaya
-- hiçbir şey ulaşmıyordu.

-- 3a) Yeni işe alım kararı eklendiğinde
create or replace function public.notify_on_decision_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body  text;
  v_type  text := 'karar';
begin
  if new.status = 'kabul' then
    v_title := 'İşe Kabul!';
    v_body  := 'Başvurunuz kabul edildi. İşe başlangıç bilgilerinizi kontrol edin.';
  elsif new.status = 'reddedildi' then
    v_title := 'Başvuru Sonucu';
    v_body  := 'Başvurunuz değerlendirildi ve bu pozisyon için uygun görülmedi.';
  elsif new.status = 'mulakat_planli' then
    v_title := 'Mülakat Daveti';
    v_body  := 'Sizi bir görüşmeye davet ettik. Görüşmeler sayfasını kontrol edin.';
    v_type  := 'gorusme';
  elsif new.status = 'kisa_listede' then
    v_title := 'Kısa Listeye Alındınız';
    v_body  := 'Başvurunuz kısa listeye alındı.';
  else
    return new;   -- 'beklemede' için bildirim yok
  end if;

  perform public.push_to_profile(new.applicant_id, v_type, v_title, v_body, '/gorusmeler.html');
  return new;
exception when others then
  return new;     -- bildirim hatası kaydı engellemesin
end $$;

drop trigger if exists notify_decision_insert on public.hiring_decisions;
create trigger notify_decision_insert
  after insert on public.hiring_decisions
  for each row execute function public.notify_on_decision_insert();

-- 3b) 'kisa_listede' durumu UPDATE'te de bildirilsin + hata yutulsun
create or replace function public.notify_on_decision()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body  text;
  v_type  text := 'karar';
begin
  if new.status = old.status then return new; end if;
  if new.status = 'kabul' then
    v_title := 'İşe Kabul!';
    v_body  := 'Başvurunuz kabul edildi. İşe başlangıç bilgilerinizi kontrol edin.';
  elsif new.status = 'reddedildi' then
    v_title := 'Başvuru Sonucu';
    v_body  := 'Başvurunuz değerlendirildi ve bu pozisyon için uygun görülmedi.';
  elsif new.status = 'mulakat_planli' then
    v_title := 'Mülakat Daveti';
    v_body  := 'Sizi bir görüşmeye davet ettik. Görüşmeler sayfasını kontrol edin.';
    v_type  := 'gorusme';
  elsif new.status = 'kisa_listede' then
    v_title := 'Kısa Listeye Alındınız';
    v_body  := 'Başvurunuz kısa listeye alındı.';
  else
    return new;
  end if;
  perform public.push_to_profile(new.applicant_id, v_type, v_title, v_body, '/gorusmeler.html');
  return new;
exception when others then
  return new;
end $$;

-- 3c) Yeni görüşme daveti oluşturulduğunda adaya bildir
create or replace function public.notify_on_interview_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.push_to_profile(
    new.interviewee_id, 'gorusme', 'Görüşme Daveti',
    'Sizi bir görüşmeye davet ettiler. Tarih: ' || coalesce(new.date::text, 'belirtilmedi'),
    '/gorusmeler.html');
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists notify_interview_insert on public.interviews;
create trigger notify_interview_insert
  after insert on public.interviews
  for each row execute function public.notify_on_interview_insert();

-- 3d) Görüşme UPDATE bildirimi — hata yutma eklendi
create or replace function public.notify_on_interview()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body  text;
  v_hedef uuid;
begin
  if new.status = old.status then return new; end if;
  v_hedef := new.interviewee_id;
  if new.status = 'onaylandi' then
    v_title := 'Görüşme Onaylandı';
    v_body  := 'Görüşme davetiniz onaylandı. Tarih: ' || coalesce(new.date::text, '—');
    v_hedef := new.interviewer_id;   -- onayı işveren görmeli
  elsif new.status = 'yeniden_planlandi' then
    v_title := 'Yeniden Planlama Talebi';
    v_body  := 'Görüşme için yeni tarih talebi geldi.';
    v_hedef := new.interviewer_id;   -- talebi işveren görmeli
  elsif new.status = 'tamamlandi' then
    v_title := 'Görüşme Tamamlandı';
    v_body  := 'Görüşmeniz tamamlandı. Karar bekleniyor.';
  elsif new.status = 'iptal' then
    v_title := 'Görüşme İptal Edildi';
    v_body  := 'Planlanan görüşme iptal edildi.';
  else
    return new;
  end if;
  perform public.push_to_profile(v_hedef, 'gorusme', v_title, v_body, '/gorusmeler.html');
  return new;
exception when others then
  return new;
end $$;

-- ---------- 4) Realtime ----------
do $$ begin alter publication supabase_realtime add table public.onboarding;
exception when duplicate_object then null; when others then null; end $$;

-- ============================================================
-- BİTTİ. Doğrulama:
--   select indexname from pg_indexes
--    where tablename in ('onboarding','hiring_decisions');
--   select tgname from pg_trigger
--    where tgrelid in ('public.hiring_decisions'::regclass,'public.interviews'::regclass)
--      and not tgisinternal;
-- ============================================================
