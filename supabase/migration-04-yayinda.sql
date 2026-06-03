-- ============================================================
-- Kuryemi Bul — Migration 04: profil "yayinda" bayragi
-- Bos/eksik profiller havuzda/haritada gorunmesin. Profil tamamlanınca yayinda=true olur.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

alter table public.profiles add column if not exists yayinda boolean not null default false;

-- Demo/seed kayıtlar (user_id NULL) görünür kalsın
update public.profiles set yayinda = true where user_id is null;

-- Bilgisi dolu mevcut gerçek profiller görünür olsun
update public.profiles set yayinda = true
  where user_id is not null and coalesce(ad,'') <> '' and coalesce(sehir,'') <> '';

-- Bitti.
