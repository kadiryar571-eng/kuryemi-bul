-- ============================================================
-- Kuryemi Bul — Migration 02: "Havuzum" (kayıtlı profiller)
-- Bir kullanıcının kendi havuzuna eklediği profiller.
-- KULLANIM: Supabase → SQL Editor → tamamını yapıştır → Run. İdempotent.
-- ============================================================

create table if not exists public.pool_members (
  id          uuid primary key default gen_random_uuid(),
  owner_user  uuid not null references auth.users(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (owner_user, member_id)
);
create index if not exists pool_owner_idx on public.pool_members(owner_user);

alter table public.pool_members enable row level security;

-- Kullanıcı yalnız KENDİ havuzunu görür/ekler/siler
drop policy if exists pool_select_own on public.pool_members;
create policy pool_select_own on public.pool_members
  for select using (owner_user = auth.uid());

drop policy if exists pool_insert_own on public.pool_members;
create policy pool_insert_own on public.pool_members
  for insert with check (owner_user = auth.uid());

drop policy if exists pool_delete_own on public.pool_members;
create policy pool_delete_own on public.pool_members
  for delete using (owner_user = auth.uid());

-- Bitti. Yeni tablo: public.pool_members
