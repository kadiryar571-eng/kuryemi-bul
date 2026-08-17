-- ============================================================
-- Kuryemi Bul — Migration 34: iş deneyimi kayıtları sunucuya taşınıyor
--
-- SORUN: Kurye, profil düzenleme sayfasında geçmiş iş deneyimlerini
-- (şirket, pozisyon, tarih aralığı, referans kişi) ayrıntılı olarak
-- dolduruyor — ama bu kayıtlar YALNIZCA o tarayıcının localStorage'ında
-- duruyordu (`kb_exp_<uid>`). Sonuçları:
--
--   • İşveren aday detayında bu bilgilerin HİÇBİRİNİ göremiyordu.
--   • Kurye telefonundan girdiğini bilgisayarında göremiyordu.
--   • Tarayıcı verisi silinince kayıtlar yok oluyordu.
--
-- Yani kurye, kimsenin görmediği bir forma emek veriyordu.
--
-- ─────────────────────────────────────────────────────────────
-- REFERANS BİLGİSİ NEDEN AYRI KORUNUYOR
--
-- `referans_ad` ve `referans_tel` ÜÇÜNCÜ BİR ŞAHSIN kişisel verisidir.
-- O kişi platformun kullanıcısı değil ve verisinin herkese gösterilmesine
-- rıza vermedi. Bu yüzden migration-20'deki `profile_contacts` deseni
-- birebir uygulanıyor:
--
--   • Genel bilgiler (şirket/pozisyon/tarih/açıklama/etiketler) →
--     work_experience_public view'ı ile her oturum açmış kullanıcıya açık.
--   • Referans alanları → yalnız KAYIT SAHİBİ ve adayın BAŞVURDUĞU ilanın
--     sahibi olan işveren okuyabilir (temel tablo RLS'i).
--
-- İşveren adayı değerlendirirken referansı arayabilmeli; ama havuzu
-- gezen herkesin üçüncü şahsın telefonunu görmesi gerekmiyor.
-- ─────────────────────────────────────────────────────────────
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================


-- ============================================================
-- 1. TABLO
-- ============================================================

create table if not exists public.work_experience (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,

  sirket       text not null default '',
  pozisyon     text not null default '',
  model        text default '',          -- tam zamanlı / yarı zamanlı / freelance…
  sehir        text default '',
  baslangic    date,
  bitis        date,                     -- null + aktif=true → hâlâ çalışıyor
  aktif        boolean not null default false,
  aciklama     text default '',
  etiketler    text[] default '{}',

  -- ÜÇÜNCÜ ŞAHIS VERİSİ — view'a DAHİL DEĞİL (yukarıdaki nota bak)
  referans_ad  text default '',
  referans_tel text default '',

  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists work_experience_profile_idx
  on public.work_experience(profile_id);
create index if not exists work_experience_user_idx
  on public.work_experience(user_id);

alter table public.work_experience enable row level security;


-- ============================================================
-- 2. RLS
-- ============================================================

-- Sahip: kendi kayıtları üzerinde tam yetki
drop policy if exists we_owner_all on public.work_experience;
create policy we_owner_all on public.work_experience
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- İşveren: YALNIZ kendi ilanına başvurmuş adayın kayıtlarını okur.
-- (Referans alanlarını görebilmesinin tek yolu budur.)
drop policy if exists we_employer_select on public.work_experience;
create policy we_employer_select on public.work_experience
  for select
  using (
    exists (
      select 1
        from public.applications a
        join public.listings l on l.id = a.listing_id
       where a.applicant_id = public.work_experience.profile_id
         and l.owner_user   = auth.uid()
    )
  );


-- ============================================================
-- 3. HERKESE AÇIK GÖRÜNÜM (referans alanları YOK)
--
-- security_invoker = false: view sahibinin yetkisiyle çalışır, yani
-- temel tablonun RLS'ini baypas eder. profiles_public ile aynı desen.
-- Yalnız yayında olan profillerin kayıtları görünür.
-- ============================================================

drop view if exists public.work_experience_public;
create view public.work_experience_public with (security_invoker = false) as
  select
    w.id, w.profile_id,
    w.sirket, w.pozisyon, w.model, w.sehir,
    w.baslangic, w.bitis, w.aktif,
    w.aciklama, w.etiketler,
    w.created_at
    -- referans_ad / referans_tel BİLEREK YOK
  from public.work_experience w
  join public.profiles p on p.id = w.profile_id
 where p.yayinda = true
   and p.user_id is not null;

grant select on public.work_experience_public to authenticated;


-- ============================================================
-- 4. updated_at OTOMATİK
-- ============================================================

create or replace function public.touch_work_experience()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists kb_touch_work_experience on public.work_experience;
create trigger kb_touch_work_experience
  before update on public.work_experience
  for each row execute function public.touch_work_experience();


-- ============================================================
-- 5. DOĞRULAMA
-- ============================================================

do $$
declare
  n int;
  v_var boolean;
begin
  -- Tablo ve RLS
  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename = 'work_experience';
  if n < 2 then
    raise exception 'work_experience politikalari eksik (bulunan: %)', n;
  end if;

  select relrowsecurity into v_var from pg_class
   where oid = 'public.work_experience'::regclass;
  if not v_var then raise exception 'RLS acik degil'; end if;

  -- View referans alanlarini SIZDIRMAMALI
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'work_experience_public'
     and column_name in ('referans_ad', 'referans_tel');
  if n > 0 then
    raise exception 'work_experience_public referans alanlarini sizdiriyor';
  end if;

  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'work_experience_public';

  raise notice 'work_experience tablosu hazir ✓';
  raise notice 'RLS politikasi sayisi: % ✓', (select count(*) from pg_policies where schemaname='public' and tablename='work_experience');
  raise notice 'work_experience_public kolon sayisi: % (referans alanlari yok ✓)', n;
  raise notice 'Migration 34 tamam.';
end $$;
