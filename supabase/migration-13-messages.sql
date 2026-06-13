-- ============================================================
-- Kuryemi Bul — Migration 13: Mesajlaşma (in-app chat)
-- Yalnız EŞLEŞENLER yazışabilir: aralarında kabul edilmiş teklif
-- (offers) VEYA kabul edilmiş başvuru (applications) olan iki profil.
-- messages tablosu + are_matched() + RLS + realtime + bildirim trigger'ı.
-- ÖN KOŞUL: migration-12 (push_to_profile) ÖNCE çalıştırılmış olmalı.
-- KULLANIM: Supabase → SQL Editor → bu dosyanın TAMAMINI yapıştır → Run.
-- İdempotent (tekrar çalıştırılabilir).
-- ============================================================

-- 1) Tablo
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  read_at    timestamptz,
  created_at timestamptz default now()
);
create index if not exists messages_to_idx   on public.messages(to_user, read_at);
create index if not exists messages_pair_idx on public.messages(from_user, to_user, created_at);
alter table public.messages enable row level security;

-- 2) Eşleşme kontrolü: kabul edilmiş teklif VEYA başvuru (iki yön)
create or replace function public.are_matched(a uuid, b uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.offers o
    where o.durum = 'accepted'
      and ((o.from_user = a and o.to_user = b) or (o.from_user = b and o.to_user = a))
  ) or exists (
    select 1 from public.applications ap
    join public.listings l on l.id = ap.listing_id
    where ap.durum = 'accepted'
      and ((ap.applicant_id = a and l.owner_id = b) or (ap.applicant_id = b and l.owner_id = a))
  );
$$;

-- 3) RLS
--    SELECT: yalnız taraf olduğum mesajlar
drop policy if exists messages_select_party on public.messages;
create policy messages_select_party on public.messages for select using (
  exists (select 1 from public.profiles me
          where me.user_id = auth.uid() and (me.id = messages.from_user or me.id = messages.to_user))
);
--    INSERT: gönderen ben + karşı tarafla eşleşmişiz
drop policy if exists messages_insert_matched on public.messages;
create policy messages_insert_matched on public.messages for insert with check (
  exists (select 1 from public.profiles me where me.user_id = auth.uid() and me.id = messages.from_user)
  and public.are_matched(messages.from_user, messages.to_user)
);
--    UPDATE: yalnız alıcı (okundu işaretleme)
drop policy if exists messages_update_recipient on public.messages;
create policy messages_update_recipient on public.messages for update using (
  exists (select 1 from public.profiles me where me.user_id = auth.uid() and me.id = messages.to_user)
);

-- 4) Realtime yayını (anlık mesaj)
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; when others then null; end $$;

-- 5) Yeni mesaj → alıcıya bildirim (+ e-posta) — push_to_profile yeniden kullanılır
create or replace function public.trg_message_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare from_name text;
begin
  select ad into from_name from public.profiles where id = new.from_user;
  perform public.push_to_profile(new.to_user, 'message_new',
    coalesce(from_name, 'Bir kullanıcı') || ' sana mesaj gönderdi',
    left(coalesce(new.body, ''), 120), 'mesajlar.html');
  return new;
end $$;
drop trigger if exists kb_message_insert on public.messages;
create trigger kb_message_insert after insert on public.messages
  for each row execute function public.trg_message_insert();

-- Bitti. Yeni tablo: public.messages ; fn: are_matched ; trigger: kb_message_insert.
