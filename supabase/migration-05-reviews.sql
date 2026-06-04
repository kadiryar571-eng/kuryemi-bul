-- ============================================================
-- Kuryemi Bul — Migration 05: Değerlendirme / Puan sistemi
-- Kabul edilmiş teklifin tarafları birbirini 1-5 yıldız + yorum ile değerlendirir.
-- Profil puanı (profiles.puan) gerçek değerlendirmelerin ortalamasından otomatik hesaplanır.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- Profil: değerlendirme sayısı
alter table public.profiles add column if not exists degerlendirme int not null default 0;

-- Değerlendirmeler
create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  reviewer_user    uuid not null references auth.users(id) on delete cascade,
  reviewer_profile uuid references public.profiles(id) on delete set null,
  target_id        uuid not null references public.profiles(id) on delete cascade,
  offer_id         uuid references public.offers(id) on delete set null,
  puan             int not null check (puan between 1 and 5),
  yorum            text default '',
  created_at       timestamptz default now(),
  unique (reviewer_user, target_id)   -- kişi başına hedef başına tek değerlendirme (güncellenebilir)
);
create index if not exists reviews_target_idx on public.reviews(target_id);

alter table public.reviews enable row level security;

-- Herkes okuyabilir (profilde gösterim)
drop policy if exists reviews_select_all on public.reviews;
create policy reviews_select_all on public.reviews for select using (true);

-- Yalnız KABUL edilmiş teklifin tarafı, kendi adına, kendisi olmayan birini değerlendirir
drop policy if exists reviews_insert_party on public.reviews;
create policy reviews_insert_party on public.reviews for insert with check (
  reviewer_user = auth.uid()
  and reviewer_profile = (select id from public.profiles where user_id = auth.uid())
  and target_id <> reviewer_profile
  and exists (
    select 1 from public.offers o
    join public.profiles me on me.user_id = auth.uid()
    where o.durum = 'accepted'
      and ((o.from_user = me.id and o.to_user = target_id)
        or (o.to_user = me.id and o.from_user = target_id))
  )
);

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews for update using (reviewer_user = auth.uid());
drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews for delete using (reviewer_user = auth.uid());

-- Profil puanını ve değerlendirme sayısını yeniden hesapla
create or replace function public.recompute_profile_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare tgt uuid;
begin
  tgt := coalesce(new.target_id, old.target_id);
  update public.profiles set
    puan = coalesce((select round(avg(puan)::numeric, 2) from public.reviews where target_id = tgt), 0),
    degerlendirme = (select count(*) from public.reviews where target_id = tgt)
  where id = tgt;
  return coalesce(new, old);
end $$;

drop trigger if exists on_review_change on public.reviews;
create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_profile_rating();

-- Bitti. Yeni tablo: public.reviews
