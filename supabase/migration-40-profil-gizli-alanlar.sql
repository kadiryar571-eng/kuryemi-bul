-- ============================================================
-- Kuryemi Bul — Migration 40: doğum tarihi / plaka / adres yalnız sahibine
--
-- SORUN (2026-10-13'te ÖLÇÜLDÜ, varsayım değil):
--   profiles select'i tüm `authenticated`'a açık (migration-20). RLS satır
--   bazlıdır, kolon bazlı değildir → giriş yapmış HERHANGİ bir kullanıcı
--   başkasının dogum_tarihi (4 dolu satır), plaka ve adres değerini
--   doğrudan PostgREST ile okuyabiliyordu. Ekranda gösterilmiyorlardı ama
--   API'den alınabiliyorlardı. "Plakam gizli" (plaka_gizli) anahtarı da
--   bu yüzden hiçbir şeyi gizlemiyordu.
--
-- NEDEN KOLON YETKİSİ DEĞİL: `revoke select (adres) ...` tek başına işe
--   yaramaz (tablo düzeyi SELECT varken kolon revoke'u etkisizdir); tablo
--   SELECT'ini alıp kolon kolon grant etmek ise iki istemcideki TÜM
--   `select('*')` sorgularını kırar ve her yeni kolonda grant unutma
--   tuzağı kurar.
--
-- ÇÖZÜM: profile_contacts ile aynı desen —
--   1) public.profile_private: yalnız sahibi okur/yazar.
--   2) Mevcut değerler oraya taşınır, profiles'taki kopyalar boşaltılır.
--   3) BEFORE INSERT/UPDATE trigger'ı: profiles'a bu üç alandan biri dolu
--      yazılırsa değer profile_private'a yönlendirilir ve profiles'ta
--      boşaltılır. ESKİ APK'lar (firma adresi ekranı) bozulmadan çalışır.
--      Kolonlar SİLİNMEZ — silinirse eski APK'nın adres kaydı PGRST204 alır.
--
-- BİLİNEN SINIR: eski APK'dan adresi SİLMEK (boş yazmak) işlemez — profiles'ta
--   değer zaten boş olduğu için trigger değişiklik göremez. Yeni istemciler
--   profile_private'a doğrudan yazdığı için onlarda sorun yok.
--
-- ETKİLENENLER: docs/ ve www/ supabase.js (myProfile birleştirir,
--   updateMyProfile ayırır), admin-api (users.get birleştirir).
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================

-- ---------- 1) Tablo ----------
create table if not exists public.profile_private (
  -- DEFERRABLE: trigger INSERT sırasında (profil satırı henüz yokken) yazar;
  -- yabancı anahtar denetimi işlem sonuna ertelenmezse yeni profil eklenemez.
  profile_id   uuid primary key
               references public.profiles(id) on delete cascade
               deferrable initially deferred,
  user_id      uuid not null references auth.users(id) on delete cascade,
  dogum_tarihi date,
  plaka        text default '',
  adres        text default '',
  updated_at   timestamptz default now()
);

alter table public.profile_private enable row level security;

-- ---------- 2) RLS — yalnız sahibi ----------
drop policy if exists private_select_own on public.profile_private;
create policy private_select_own on public.profile_private
  for select to authenticated
  using (auth.uid() = user_id);

-- Ekleme: profile_id de GERÇEKTEN kullanıcının olmalı. Yoksa biri başkasının
-- profile_id'si için önceden satır açar; sahibinin upsert'i o satıra çarpar,
-- update policy'sine takılır ve kendi bilgisini hiç kaydedemezdi.
drop policy if exists private_insert_own on public.profile_private;
create policy private_insert_own on public.profile_private
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p
                 where p.id = profile_id and p.user_id = auth.uid())
  );

-- Güncelleme: with check'te profile_id sahipliği de ŞART. Yoksa kullanıcı
-- kendi satırının profile_id'sini, henüz satırı olmayan BAŞKA birinin
-- profiline çevirebilir; o kişinin sonraki kaydı (trigger) bu satıra yazılır
-- ve değerler user_id'si saldırgan olan satırda saldırgana açık kalırdı.
-- (Kolon düzeyinde UPDATE grant'ı kullanılmadı: supabase-js upsert'i
-- profile_id/user_id'yi de SET eder ve izin hatası alırdı.)
drop policy if exists private_update_own on public.profile_private;
create policy private_update_own on public.profile_private
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p
                 where p.id = profile_id and p.user_id = auth.uid())
  );

-- Silme policy'si YOK: satır profil silinince cascade ile gider.

-- Supabase varsayılan yetkileri anon'a da SELECT verir (bkz. migration-37).
-- RLS zaten kapalı tutar ama kapıyı açıkça kapatıyoruz.
revoke all on public.profile_private from anon;
grant select, insert, update on public.profile_private to authenticated;

-- ---------- 3) Mevcut veriyi taşı ----------
insert into public.profile_private (profile_id, user_id, dogum_tarihi, plaka, adres)
select p.id, p.user_id, p.dogum_tarihi, coalesce(p.plaka, ''), coalesce(p.adres, '')
  from public.profiles p
 where p.user_id is not null
   and (p.dogum_tarihi is not null
        or coalesce(p.plaka, '') <> ''
        or coalesce(p.adres, '') <> '')
on conflict (profile_id) do update
  set user_id      = excluded.user_id,
      dogum_tarihi = coalesce(excluded.dogum_tarihi, public.profile_private.dogum_tarihi),
      plaka        = coalesce(nullif(excluded.plaka, ''), public.profile_private.plaka),
      adres        = coalesce(nullif(excluded.adres, ''), public.profile_private.adres),
      updated_at   = now();

update public.profiles
   set dogum_tarihi = null, plaka = '', adres = ''
 where user_id is not null
   and (dogum_tarihi is not null
        or coalesce(plaka, '') <> ''
        or coalesce(adres, '') <> '');

-- ---------- 4) Yönlendirme trigger'ı ----------
-- security definer: admin-api (service_role) ve kullanıcı yolları için aynı
-- davranış. Yalnız profiles RLS'ini zaten geçmiş bir yazımda çalışır.
create or replace function public.kb_profile_private_redirect()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  has_dogum boolean := new.dogum_tarihi is not null;
  has_plaka boolean := coalesce(new.plaka, '') <> '';
  has_adres boolean := coalesce(new.adres, '') <> '';
begin
  if new.user_id is null or not (has_dogum or has_plaka or has_adres) then
    return new;
  end if;

  insert into public.profile_private (profile_id, user_id, dogum_tarihi, plaka, adres)
  values (new.id, new.user_id,
          new.dogum_tarihi,
          coalesce(new.plaka, ''),
          coalesce(new.adres, ''))
  on conflict (profile_id) do update
    -- Sahiplik her yazımda profilin GERÇEK sahibine sabitlenir; satır bir
    -- şekilde yanlış user_id ile kalmışsa bile değerler ona sızmaz.
    set user_id      = excluded.user_id,
        dogum_tarihi = case when has_dogum then excluded.dogum_tarihi
                            else public.profile_private.dogum_tarihi end,
        plaka        = case when has_plaka then excluded.plaka
                            else public.profile_private.plaka end,
        adres        = case when has_adres then excluded.adres
                            else public.profile_private.adres end,
        updated_at   = now();

  new.dogum_tarihi := null;
  new.plaka        := '';
  new.adres        := '';
  return new;
end $$;

revoke all on function public.kb_profile_private_redirect() from public, anon, authenticated;

drop trigger if exists kb_profile_private_redirect on public.profiles;
create trigger kb_profile_private_redirect
  before insert or update on public.profiles
  for each row execute function public.kb_profile_private_redirect();

-- ---------- 5) DOĞRULAMA (çalıştırdıktan sonra) ----------
--   select count(*) from public.profiles
--    where dogum_tarihi is not null or coalesce(plaka,'') <> '' or coalesce(adres,'') <> '';
--   → 0 olmalı
--   select count(*) from public.profile_private;   → taşınan satır sayısı (≥ 4)
--
-- Dışarıdan (anon key ile):
--   curl ".../rest/v1/profile_private?select=profile_id" -H "apikey: <ANON>"
--   → 401 / 42501 olmalı. `200 []` KAPALI DEĞİLDİR (bkz. CLAUDE.md).
