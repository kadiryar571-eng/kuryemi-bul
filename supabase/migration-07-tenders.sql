-- ============================================================
-- Kuryemi Bul — Migration 07: İhale modülü
-- tenders: işletmenin açtığı toplu kurye ihalesi. bids: kurye firmasının teklifi.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- ---------- İHALELER ----------
create table if not exists public.tenders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  owner_user  uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'isletme',
  baslik      text not null,
  aciklama    text default '',
  sehir       text default '',
  bolge       text default '',
  adet        int default 0,            -- kaç kurye
  sure        text default '',          -- süre (örn "3 ay")
  butce       text default '',          -- bütçe / şart (serbest)
  durum       text not null default 'acik' check (durum in ('acik','kapali')),
  created_at  timestamptz default now()
);
create index if not exists tenders_durum_idx on public.tenders(durum);
create index if not exists tenders_owner_idx on public.tenders(owner_user);
alter table public.tenders enable row level security;

drop policy if exists tenders_select on public.tenders;
create policy tenders_select on public.tenders for select using (durum = 'acik' or owner_user = auth.uid());
drop policy if exists tenders_insert on public.tenders;
create policy tenders_insert on public.tenders for insert with check (
  owner_user = auth.uid() and owner_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists tenders_update on public.tenders;
create policy tenders_update on public.tenders for update using (owner_user = auth.uid());
drop policy if exists tenders_delete on public.tenders;
create policy tenders_delete on public.tenders for delete using (owner_user = auth.uid());

-- ---------- TEKLİFLER (bids) ----------
create table if not exists public.bids (
  id          uuid primary key default gen_random_uuid(),
  tender_id   uuid not null references public.tenders(id) on delete cascade,
  bidder_id   uuid not null references public.profiles(id) on delete cascade,
  bidder_user uuid not null references auth.users(id) on delete cascade,
  tutar       text default '',
  mesaj       text default '',
  durum       text not null default 'pending' check (durum in ('pending','accepted','rejected')),
  created_at  timestamptz default now(),
  unique (tender_id, bidder_id)
);
create index if not exists bids_tender_idx on public.bids(tender_id);
create index if not exists bids_bidder_idx on public.bids(bidder_user);
alter table public.bids enable row level security;

-- Teklifi: teklif veren VE ihale sahibi görür
drop policy if exists bids_select on public.bids;
create policy bids_select on public.bids for select using (
  bidder_user = auth.uid()
  or (select owner_user from public.tenders where id = tender_id) = auth.uid()
);
-- Teklif ver: yalnız FİRMA, kendi adına, açık ihaleye
drop policy if exists bids_insert on public.bids;
create policy bids_insert on public.bids for insert with check (
  bidder_user = auth.uid()
  and bidder_id = (select id from public.profiles where user_id = auth.uid())
  and (select role from public.profiles where user_id = auth.uid()) = 'firma'
  and (select durum from public.tenders where id = tender_id) = 'acik'
);
-- Durumu ihale sahibi günceller (kabul/ret)
drop policy if exists bids_update_owner on public.bids;
create policy bids_update_owner on public.bids for update using (
  (select owner_user from public.tenders where id = tender_id) = auth.uid()
);
-- Teklif veren kendi teklifini geri çeker
drop policy if exists bids_delete_own on public.bids;
create policy bids_delete_own on public.bids for delete using (bidder_user = auth.uid());

-- Bitti. Yeni tablolar: public.tenders, public.bids
