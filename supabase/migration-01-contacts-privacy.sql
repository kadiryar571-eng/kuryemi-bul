-- ============================================================
-- Kuryemi Bul — Migration 01: İletişim gizliliği (KVKK)
-- Amaç: telefon/email artık herkese açık DEĞİL.
--   • Ayrı public.profile_contacts tablosuna taşınır.
--   • Sadece SAHİP ve KABUL EDİLMİŞ teklifin KARŞI TARAFI okuyabilir.
--   • offers tablosuna eksik DELETE policy eklenir.
-- KULLANIM: Supabase → SQL Editor → bu dosyanın TAMAMINI yapıştır → Run.
-- İdempotent (tekrar çalıştırılabilir).
-- ============================================================

-- ---------- 1) Korumalı iletişim tablosu ----------
create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  telefon    text default '',
  email      text default '',
  updated_at timestamptz default now()
);
alter table public.profile_contacts enable row level security;

-- Sahip kendi iletişimini okur/yazar
drop policy if exists contacts_select_own on public.profile_contacts;
create policy contacts_select_own on public.profile_contacts
  for select using (auth.uid() = user_id);

drop policy if exists contacts_insert_own on public.profile_contacts;
create policy contacts_insert_own on public.profile_contacts
  for insert with check (auth.uid() = user_id);

drop policy if exists contacts_update_own on public.profile_contacts;
create policy contacts_update_own on public.profile_contacts
  for update using (auth.uid() = user_id);

-- KABUL EDİLMİŞ teklifin karşı tarafı iletişimi okuyabilir
drop policy if exists contacts_select_accepted on public.profile_contacts;
create policy contacts_select_accepted on public.profile_contacts
  for select using (
    exists (
      select 1
      from public.offers o
      join public.profiles me on me.user_id = auth.uid()
      where o.durum = 'accepted'
        and (
          (o.to_user   = me.id and o.from_user = public.profile_contacts.profile_id) or
          (o.from_user = me.id and o.to_user   = public.profile_contacts.profile_id)
        )
    )
  );

-- ---------- 2) Mevcut veriyi taşı (yalnız gerçek kullanıcılar; demo seed'de user_id NULL) ----------
insert into public.profile_contacts (profile_id, user_id, telefon, email)
select id, user_id,
       coalesce(telefon, ''), coalesce(email, '')
from public.profiles
where user_id is not null
on conflict (profile_id) do update
  set telefon = excluded.telefon,
      email   = excluded.email;

-- ---------- 3) Hassas sütunları public profiles'tan kaldır ----------
alter table public.profiles drop column if exists telefon;
alter table public.profiles drop column if exists email;

-- ---------- 4) Yeni kullanıcı trigger'ı: email artık profile_contacts'a yazılır ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_profile_id uuid;
begin
  insert into public.profiles (user_id, role, ad)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'kurye'),
    coalesce(new.raw_user_meta_data->>'ad', '')
  )
  returning id into new_profile_id;

  insert into public.profile_contacts (profile_id, user_id, email)
  values (new_profile_id, new.id, new.email)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;
-- Trigger zaten on_auth_user_created olarak auth.users'a bağlı; sadece fonksiyon güncellendi.

-- ---------- 5) offers: eksik DELETE policy (taraflar kendi teklifini silebilsin) ----------
drop policy if exists offers_delete_party on public.offers;
create policy offers_delete_party on public.offers
  for delete using (
    (select user_id from public.profiles where id = from_user) = auth.uid()
    or (select user_id from public.profiles where id = to_user) = auth.uid()
  );

-- Bitti. Yeni tablo: public.profile_contacts (telefon/email artık korumalı).
