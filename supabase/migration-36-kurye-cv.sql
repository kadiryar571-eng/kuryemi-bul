-- ============================================================
-- Kuryemi Bul — Migration 36: kurye özgeçmişi (CV)
--
-- Tasarım: specs/2026-08-19-kurye-cv-design.md
--
-- profiles'a kolon EKLENMEZ: o tablo zaten 30+ kolonla üç rolü taşıyor ve
-- bu alanlar yalnız kuryeyi ilgilendiriyor. Desen migration-34'ün
-- work_experience deseninin aynısı.
--
-- Adli sicil / sağlık raporu / psikoteknik BİLEREK YOK — KVKK m.6 özel
-- nitelikli veri ve platformun ilgi alanı dışında.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================

create table if not exists public.courier_cv (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null unique references public.profiles(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,

  ozet            text    not null default '',
  ehliyet_sinifi  text[]  not null default '{}',   -- A1 / A2 / A / B
  ehliyet_tarihi  date,
  src_belge       boolean not null default false,  -- 15.05.2026'dan beri zorunlu
  src_gecerlilik  date,
  egitim          jsonb   not null default '[]'::jsonb,  -- [{okul,derece,yil}]
  tercih_bolgeler text[]  not null default '{}',
  musaitlik       text    not null default '',

  yayinlandi      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists courier_cv_profile_idx on public.courier_cv (profile_id);

alter table public.courier_cv enable row level security;

-- TEK KATMAN. work_experience iki katman kullanıyor çünkü orada referans
-- bilgisi için bir gizlilik kademesi var; CV'de öyle bir alan yok.
drop policy if exists cv_owner_all on public.courier_cv;
create policy cv_owner_all on public.courier_cv
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at'i sunucu tutar; istemciye güvenilmez.
create or replace function public.touch_courier_cv()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists touch_courier_cv_trg on public.courier_cv;
create trigger touch_courier_cv_trg
  before update on public.courier_cv
  for each row execute function public.touch_courier_cv();

-- Okuma yolu. AÇIK KOLON LİSTESİ — sonradan eklenen bir kolon sessizce
-- dışarı sızmasın diye (profiles_public ile aynı gerekçe).
drop view if exists public.courier_cv_public;
create view public.courier_cv_public with (security_invoker = false) as
  select
    c.id, c.profile_id,
    c.ozet, c.ehliyet_sinifi, c.ehliyet_tarihi,
    c.src_belge, c.src_gecerlilik,
    c.egitim, c.tercih_bolgeler, c.musaitlik,
    c.updated_at
  from public.courier_cv c
  join public.profiles p on p.id = c.profile_id
 where c.yayinlandi = true
   and p.yayinda    = true
   and p.role       = 'kurye'
   and p.user_id is not null;

-- Misafire KAPALI — profiles select politikasıyla aynı sınır (migration-20).
grant select on public.courier_cv_public to authenticated;
