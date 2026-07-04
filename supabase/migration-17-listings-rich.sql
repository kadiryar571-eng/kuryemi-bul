-- ============================================================
-- KuryemiBul — Migration 17: listings rich fields
-- listings tablosuna form'daki tüm alanları ekle.
-- ÖN KOŞUL: migration-06 (listings) çalıştırılmış olmalı.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

alter table public.listings
  add column if not exists kategori          text,
  add column if not exists maas_min          integer,
  add column if not exists maas_max          integer,
  add column if not exists maas_aralik       text,
  add column if not exists maas_modeli       text,
  add column if not exists calisma_sekli     text,
  add column if not exists vardiya_tipi      text,
  add column if not exists calisma_saatleri  text,
  add column if not exists deneyim           text,
  add column if not exists sigorta           text,
  add column if not exists bonus             text,
  add column if not exists faydalar          jsonb    default '[]'::jsonb,
  add column if not exists gereksinimler     jsonb    default '[]'::jsonb,
  add column if not exists oncelik           text     default 'normal',
  add column if not exists kontenjan         integer  default 1,
  add column if not exists son_basvuru       date,
  add column if not exists teslimat_bolge    text,
  add column if not exists mahalle           text,
  add column if not exists gorev_tanimi      text,
  add column if not exists gunluk_akis       text,
  add column if not exists beklentiler       text,
  add column if not exists tip               text     default 'kurye-ilani';

-- Sahibinin rolü (isletme/firma) — doğrudan listings'te cache'le,
-- join gerektirmeden filtre yapılabilsin.
alter table public.listings
  add column if not exists sahip_rol         text     default 'isletme';

-- Performans indeksleri
create index if not exists listings_oncelik_idx  on public.listings(oncelik);
create index if not exists listings_kategori_idx on public.listings(kategori);
create index if not exists listings_arac_idx     on public.listings(arac);
