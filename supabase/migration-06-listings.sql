-- ============================================================
-- Kuryemi Bul — Migration 06: İlan & Başvuru modülü
-- listings: işletmenin açtığı ilan. applications: kurye/firma başvurusu.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- ---------- İLANLAR ----------
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  owner_user  uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'isletme',
  baslik      text not null,
  aciklama    text default '',
  sehir       text default '',
  bolge       text default '',
  arac        text default '',
  durum       text not null default 'acik' check (durum in ('acik','kapali')),
  created_at  timestamptz default now()
);
create index if not exists listings_durum_idx on public.listings(durum);
create index if not exists listings_owner_idx on public.listings(owner_user);
alter table public.listings enable row level security;

drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings for select using (durum = 'acik' or owner_user = auth.uid());
drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert with check (
  owner_user = auth.uid() and owner_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update using (owner_user = auth.uid());
drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings for delete using (owner_user = auth.uid());

-- ---------- BAŞVURULAR ----------
create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references public.listings(id) on delete cascade,
  applicant_id   uuid not null references public.profiles(id) on delete cascade,
  applicant_user uuid not null references auth.users(id) on delete cascade,
  applicant_role text not null,
  mesaj          text default '',
  durum          text not null default 'pending' check (durum in ('pending','accepted','rejected')),
  created_at     timestamptz default now(),
  unique (listing_id, applicant_id)
);
create index if not exists applications_listing_idx on public.applications(listing_id);
create index if not exists applications_applicant_idx on public.applications(applicant_user);
alter table public.applications enable row level security;

-- Başvuruyu: başvuran VE ilan sahibi görür
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications for select using (
  applicant_user = auth.uid()
  or (select owner_user from public.listings where id = listing_id) = auth.uid()
);
-- Başvuru ekle: kendi adına, açık ilana
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert with check (
  applicant_user = auth.uid()
  and applicant_id = (select id from public.profiles where user_id = auth.uid())
  and (select durum from public.listings where id = listing_id) = 'acik'
);
-- Durumu ilan sahibi günceller (kabul/ret)
drop policy if exists applications_update_owner on public.applications;
create policy applications_update_owner on public.applications for update using (
  (select owner_user from public.listings where id = listing_id) = auth.uid()
);
-- Başvuran kendi başvurusunu geri çeker
drop policy if exists applications_delete_own on public.applications;
create policy applications_delete_own on public.applications for delete using (applicant_user = auth.uid());

-- Bitti. Yeni tablolar: public.listings, public.applications
