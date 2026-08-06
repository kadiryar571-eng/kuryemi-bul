-- ============================================================
-- KuryemiBul — Migration 20: GÜVENLİK SERTLEŞTİRME
--
-- İki kritik açık kapatılır:
--
--  1) profiles tablosu anon anahtarla HERKESE açıktı. Giriş yapmadan
--     tüm kurye/esnaf profilleri (adres, konum, belgeler dahil) tek
--     istekte çekilebiliyordu. İstemcideki giriş kapısı yalnız görseldi.
--     → Tablo authenticated'a daraltılır; misafire yalnız GÜVENLİ
--       kolonları veren public.profiles_public view'ı açılır.
--
--  2) Kullanıcı kendi puan / degerlendirme / tamamlanan / seviye
--     alanlarını REST API'den istediği değere çekebiliyordu
--     (arayüzde alan yok ama doğrudan istek yeterliydi).
--     → BEFORE UPDATE trigger'ı ile bu alanlar kullanıcıya kapatılır.
--
-- ÖN KOŞUL: schema.sql + migration-17 + migration-18 uygulanmış olmalı.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- ---------- 0) ÖN KOŞUL ----------
do $$
begin
  if to_regclass('public.profiles') is null or to_regclass('public.listings') is null then
    raise exception 'migration-20 ÖN KOŞUL EKSİK: schema.sql çalıştırılmalı.';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='profiles' and column_name='avatar_url') then
    raise exception 'migration-20 ÖN KOŞUL EKSİK: profiles.avatar_url yok (migration-10?).';
  end if;
end $$;

-- ============================================================
-- 1) LISTINGS: sahip adını denormalize et
-- ============================================================
-- Misafir artık profiles'a JOIN yapamayacağı için ilan kartlarındaki
-- işveren adı boş kalırdı. migration-17'deki sahip_rol ile aynı desen:
-- adı listings satırında tut, join gerektirmesin.
alter table public.listings add column if not exists sahip_ad text default '';

-- Mevcut satırları doldur
update public.listings l
   set sahip_ad = coalesce(p.ad, '')
  from public.profiles p
 where p.id = l.owner_id
   and coalesce(l.sahip_ad, '') = '';

-- İlan eklenirken/güncellenirken sahip adını otomatik yaz
create or replace function public.sync_listing_owner_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is not null then
    select coalesce(ad, '') into new.sahip_ad from public.profiles where id = new.owner_id;
  end if;
  return new;
end $$;

drop trigger if exists kb_listing_owner_name on public.listings;
create trigger kb_listing_owner_name
  before insert or update of owner_id on public.listings
  for each row execute function public.sync_listing_owner_name();

-- Profil adı değişirse ilanlardaki kopyayı da güncelle
create or replace function public.sync_listings_on_profile_rename()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ad is distinct from old.ad then
    update public.listings set sahip_ad = coalesce(new.ad, '') where owner_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists kb_profile_rename on public.profiles;
create trigger kb_profile_rename
  after update of ad on public.profiles
  for each row execute function public.sync_listings_on_profile_rename();

-- ============================================================
-- 2) PROFILES: hassas kolonları misafirden gizle
-- ============================================================
-- Tabloyu yalnız giriş yapmış kullanıcılar okuyabilir.
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select to authenticated using (true);

-- Misafirin görebileceği GÜVENLİ alanlar. Kasten DIŞARIDA bırakılanlar:
--   user_id     → auth kimliği, sızmamalı
--   adres       → açık adres (KVKK)
--   lat / lng   → tam konum (KVKK)
--   belgeler    → kimlik/vergi belgesi yolları
--   fotograflar → işletme fotoğrafı yolları
--   created_at  → hesap yaşı, profil çıkarımına yarar
create or replace view public.profiles_public as
  select
    p.id, p.role, p.ad, p.sehir, p.aciklama,
    p.arac, p.bolgeler, p.deneyim, p.seviye,
    p.puan, p.degerlendirme, p.dogrulama, p.tamamlanan,
    p.sertifikalar, p.calistigi, p.avatar_url,
    p.tur, p.acik_ilan, p.ihtiyac,
    p.kapasite, p.hizmetler,
    p.yayinda
  from public.profiles p
 where p.yayinda = true
   and p.user_id is not null          -- seed/demo satırı asla görünmesin
   and coalesce(p.ad, '') <> '';      -- yarım kalmış kayıt havuzda çıkmasın

grant select on public.profiles_public to anon, authenticated;

-- Misafir açık ilanları görebilmeli (ana sayfa hero'su + ilan önizlemesi).
-- listings_select politikası zaten "durum='acik' or owner_user=auth.uid()"
-- olduğu için değiştirilmiyor; sahip adı artık sahip_ad kolonundan geliyor.

-- ============================================================
-- 3) PUAN / İTİBAR SAHTEKÂRLIĞINI KAPAT
-- ============================================================
-- puan, degerlendirme, tamamlanan ve seviye alanları kullanıcı tarafından
-- DEĞİŞTİRİLEMEZ. Bunlar yalnız sistem tarafından üretilir:
--   puan / degerlendirme → recompute_profile_rating() (reviews trigger'ı)
--   tamamlanan / seviye  → şimdilik yalnız admin (Studio) tarafından
--
-- pg_trigger_depth() > 1 ise değişiklik başka bir trigger'dan geliyordur
-- (ör. değerlendirme sonrası puan hesabı) — ona izin verilir.
-- Studio'dan (auth.uid() null) yapılan yönetimsel düzeltmeler de serbesttir.
create or replace function public.guard_profile_metrics()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Sistem içi güncelleme (trigger zinciri) ya da yönetimsel erişim: dokunma
  if pg_trigger_depth() > 1 or auth.uid() is null then
    return new;
  end if;
  -- Admin ise serbest bırak
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  -- Kullanıcının kendi eliyle değiştiremeyeceği alanlar → eski değere sabitle
  new.puan          := old.puan;
  new.degerlendirme := old.degerlendirme;
  new.tamamlanan    := old.tamamlanan;
  new.seviye        := old.seviye;
  return new;
end $$;

drop trigger if exists guard_profile_metrics_trg on public.profiles;
create trigger guard_profile_metrics_trg
  before update on public.profiles
  for each row execute function public.guard_profile_metrics();

-- ============================================================
-- BİTTİ. Doğrulama:
--
--  1) Misafir (anon) profiles'ı okuyamamalı, view'ı okuyabilmeli:
--       set role anon;
--       select count(*) from public.profiles;          -- 0 dönmeli
--       select count(*) from public.profiles_public;   -- >0 dönmeli
--       reset role;
--
--  2) İlanlarda sahip adı dolu olmalı:
--       select baslik, sahip_ad from public.listings limit 5;
--
--  3) Puan koruması (giriş yapmış kullanıcı tarayıcıdan denemeli):
--       update profiles set puan = 5 where user_id = auth.uid();  -- puan DEĞİŞMEMELİ
-- ============================================================
