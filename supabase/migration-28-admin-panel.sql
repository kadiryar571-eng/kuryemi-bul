-- ============================================================
-- Kuryemi Bul — Migration 28: Ayrı yönetici paneli altyapısı
--
-- BAĞLAM: Yönetim artık Supabase Studio'da elle SQL yazarak değil, ayrı bir
-- uygulamadan yapılıyor (kb-yonetim.pages.dev → admin-api Edge Function).
-- Web sitesi (docs/) ve mobil uygulama (www/) admin kavramını TAMAMEN bıraktı;
-- artık hiçbir istemci `admins` tablosuna sorgu atmıyor.
--
-- Bu migration üç şey yapar:
--   1. admin_audit_log — her yönetici işlemi kayıt altına alınır (Studio'nun
--      hiç vermediği şey; yanlış bir update'in kim tarafından yapıldığı artık
--      belli olur).
--   2. admins tablosunun okunmasını tamamen kapatır.
--   3. Bekleyen KYC kuyruğu için index.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent, tekrar çalıştırılabilir.
-- ============================================================


-- ============================================================
-- 1. DENETİM GÜNLÜĞÜ
--
-- RLS açık ama HİÇ POLICY YOK. Postgres'te RLS açık + policy yok = hiçbir
-- normal rol satır göremez/yazamaz. Yalnız service_role (RLS'i baypas eder)
-- ve tablo sahibi erişir. Yani günlüğü yalnız Edge Function yazar; ne bir
-- kullanıcı ne de bir admin tarayıcıdan silebilir/değiştirebilir.
--
-- target_id text: hedef her zaman uuid değil (auth.users id'si, storage yolu,
-- bazen hiç yok). Tip zorlaması yerine serbest metin + target_table ile bağlam.
-- ============================================================

create table if not exists public.admin_audit_log (
  id             bigserial primary key,
  -- NOT NULL DEĞİL, bilerek: `on delete set null` ile çelişirdi ve bir
  -- yönetici hesabı silinmek istendiğinde silme işlemi FK ihlali yüzünden
  -- başarısız olurdu. Günlük satırı kalır, kimliği admin_email'den okunur.
  admin_user_id  uuid references auth.users(id) on delete set null,
  admin_email    text,                    -- anlık kopya: kullanıcı sonradan silinse de kim olduğu kalsın
  action         text not null,           -- 'kyc.decide', 'users.delete', ...
  target_table   text,
  target_id      text,
  payload        jsonb,                   -- ne değişti (istek gövdesi, hassas alanlar maskeli)
  result         text not null default 'ok',   -- 'ok' | 'error'
  error_message  text,
  ip             text,
  created_at     timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

-- Var olabilecek policy'leri temizle — bu tablo hiçbir istemciye açık olmamalı.
do $$
declare p record;
begin
  for p in select policyname from pg_policies
            where schemaname = 'public' and tablename = 'admin_audit_log'
  loop
    execute format('drop policy %I on public.admin_audit_log', p.policyname);
    raise notice 'admin_audit_log üzerindeki policy kaldırıldı: %', p.policyname;
  end loop;
end $$;

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_admin_idx
  on public.admin_audit_log (admin_user_id, created_at desc);
create index if not exists admin_audit_log_action_idx
  on public.admin_audit_log (action, created_at desc);

-- Güvenlik ağı: anon/authenticated rollerine tablo düzeyinde de yetki verilmesin.
revoke all on public.admin_audit_log from anon, authenticated;


-- ============================================================
-- 2. `admins` TABLOSUNU İSTEMCİLERE TAMAMEN KAPAT
--
-- Eskiden `admins_self` policy'si vardı: giriş yapmış kullanıcı kendi satırını
-- okuyabiliyordu. docs/components.js ve docs/supabase.js bunu her girişte
-- sorguluyordu. O kod kaldırıldı; policy artık gereksiz ve zararlı:
-- kim olduğunu bilen biri kendi hesabının admin olup olmadığını tarayıcıdan
-- öğrenebiliyordu.
--
-- is_admin() BUNDAN ETKİLENMEZ — `security definer` olduğu için fonksiyon
-- sahibinin yetkisiyle çalışır ve RLS'i baypas eder. Yani review_kyc(),
-- list_pending_kyc(), guard_dogrulama() aynen çalışmaya devam eder.
-- Edge Function da `admins` kontrolünü service_role ile yapar.
-- ============================================================

drop policy if exists admins_self on public.admins;

-- RLS'in açık olduğunu garanti et (policy yok + RLS açık = kimse okuyamaz)
alter table public.admins enable row level security;

revoke all on public.admins from anon, authenticated;

-- is_admin() hâlâ çalışıyor mu? security definer olduğu için çalışmalı.
do $$
begin
  if public.is_admin(null) then
    raise exception 'is_admin(NULL) true döndü — beklenmedik';
  end if;
  raise notice 'is_admin() policy kaldırıldıktan sonra da çalışıyor ✓';
end $$;


-- ============================================================
-- 3. BEKLEYEN KYC KUYRUĞU İÇİN INDEX
--
-- list_pending_kyc() her çağrıda `where durum = 'pending'` tarıyor. Panelin
-- ana ekranı bunu sürekli soracak.
-- ============================================================

create index if not exists kyc_submissions_durum_idx
  on public.kyc_submissions (durum, created_at asc);


-- ============================================================
-- 4. DOĞRULAMA
-- ============================================================

do $$
declare
  n_policies int;
begin
  -- admin_audit_log üzerinde hiç policy olmamalı
  select count(*) into n_policies from pg_policies
   where schemaname = 'public' and tablename = 'admin_audit_log';
  if n_policies > 0 then
    raise exception 'admin_audit_log üzerinde % policy var — olmamalı', n_policies;
  end if;
  raise notice 'admin_audit_log: policy yok, RLS açık ✓';

  -- admins üzerinde hiç policy olmamalı
  select count(*) into n_policies from pg_policies
   where schemaname = 'public' and tablename = 'admins';
  if n_policies > 0 then
    raise exception 'admins üzerinde % policy var — olmamalı', n_policies;
  end if;
  raise notice 'admins: policy yok, istemciler okuyamaz ✓';
end $$;


-- ============================================================
-- NOT — EDGE FUNCTION TASARIMI İÇİN ÖNEMLİ
--
-- review_kyc(), list_pending_kyc(), list_kyc_history() fonksiyonları
-- `is_admin(auth.uid())` kontrolü yapar. service_role ile çağrıldıklarında
-- auth.uid() NULL olur → is_admin(NULL) = false → 'yetki yok' hatası verirler.
--
-- Bu yüzden admin-api Edge Function'ı İKİ istemci tutar:
--   • userClient (anon key + yöneticinin kendi JWT'si)
--       → auth.uid() dolu olduğu için yukarıdaki RPC'ler çalışır
--   • svcClient (service_role)
--       → auth.users işlemleri, imzalı storage URL'leri, denetim günlüğü,
--         RLS'in engelleyeceği çapraz sorgular
--
-- Yetki kontrolünün kendisi svcClient ile yapılır (RLS'ten bağımsız,
-- policy kaldırıldığı için tek güvenilir yol).
-- ============================================================
