-- ============================================================
-- Kuryemi Bul — Migration 35: profil formlarının yazdığı eksik kolonlar
--
-- SORUN: docs/profil-duzenle.html üç formda şu alanları public.profiles'a
-- yazıyor ama kolonların hiçbiri yok:
--   dogum_tarihi  ilce  gunluk_saat  arac_marka  arac_model  plaka  plaka_gizli
--
-- PostgREST bunu 400 / PGRST204 ile reddediyor. savePersonal() tek bir UPDATE
-- gönderdiği için aynı istekteki ad, sehir ve aciklama da yazılmıyor —
-- yani Kişisel Bilgiler ve Araç Bilgileri formları hiç kaydetmiyor.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================

alter table public.profiles
  add column if not exists dogum_tarihi date,
  add column if not exists ilce         text    default '',
  add column if not exists gunluk_saat  int,
  add column if not exists arac_marka   text    default '',
  add column if not exists arac_model   text    default '',
  add column if not exists plaka        text    default '',
  -- Plaka kişisel veridir; varsayılan GİZLİ olmalı.
  add column if not exists plaka_gizli  boolean not null default true;

-- Günlük çalışma saati makul aralıkta kalsın (0 = belirtilmemiş).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'profiles_gunluk_saat_araligi'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_gunluk_saat_araligi
      check (gunluk_saat is null or (gunluk_saat >= 0 and gunluk_saat <= 24));
  end if;
end $$;

-- NOT: public.profiles_public görünümü AÇIK KOLON LİSTESİ kullanıyor
-- (migration-20:97). Bu yedi kolon oraya eklenmediği için misafire
-- sızmaz — görünüme dokunmaya gerek YOK. Bu bilinçli bir tercihtir:
-- dogum_tarihi ve plaka dışarı açılmamalıdır.
