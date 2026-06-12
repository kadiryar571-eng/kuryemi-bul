-- ============================================================
-- Kuryemi Bul — Migration 12: Bildirim omurgası (in-app + e-posta)
-- notifications tablosu + olay trigger'ları. Her önemli olay → bir notifications
-- satırı (in-app merkez) + push_to_profile içinden Brevo e-postası.
-- ÖN KOŞUL: migration-11 (notify_via_email, email_wrap) ÖNCE çalıştırılmalı.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- 1) Tablo
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null default 'info',
  title      text not null,
  body       text default '',
  link       text default '',
  data       jsonb default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

-- 2) RLS: kullanıcı yalnız kendi bildirimlerini okur/günceller/siler.
--    INSERT yok → satırlar yalnız security-definer trigger'larla eklenir (sahte bildirim engellenir).
drop policy if exists notif_select_own on public.notifications;
create policy notif_select_own on public.notifications for select using (user_id = auth.uid());
drop policy if exists notif_update_own on public.notifications;
create policy notif_update_own on public.notifications for update using (user_id = auth.uid());
drop policy if exists notif_delete_own on public.notifications;
create policy notif_delete_own on public.notifications for delete using (user_id = auth.uid());

-- 3) Realtime yayını (anlık bildirim için)
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when others then null; end $$;

-- 4) Çekirdek yardımcı: bir PROFİLE bildirim it (+ e-posta)
create or replace function public.push_to_profile(
  p_profile_id uuid, p_type text, p_title text, p_body text, p_link text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user  uuid;
  v_email text;
  v_safe  text;
begin
  if p_profile_id is null then return; end if;
  select user_id into v_user from public.profiles where id = p_profile_id;
  if v_user is null then return; end if;

  insert into public.notifications(user_id, type, title, body, link)
    values (v_user, p_type, p_title, coalesce(p_body,''), coalesce(p_link,''));

  -- e-posta (iletişim e-postası varsa)
  select email into v_email from public.profile_contacts where user_id = v_user;
  if v_email is not null and v_email <> '' then
    v_safe := replace(replace(replace(coalesce(p_body,''), '&','&amp;'), '<','&lt;'), '>','&gt;');
    perform public.notify_via_email(
      v_email, p_title,
      public.email_wrap(p_title, '<p>' || v_safe || '</p>', 'Panelde gör →',
                        'https://kuryemibul.com/' || coalesce(nullif(p_link,''), 'index.html'))
    );
  end if;
end $$;

-- ============================================================
-- 5) Olay trigger'ları
-- ============================================================

-- TEKLİF geldi → alıcıya
create or replace function public.trg_offer_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare from_name text;
begin
  select ad into from_name from public.profiles where id = new.from_user;
  perform public.push_to_profile(new.to_user, 'offer_new',
    coalesce(from_name,'Bir kullanıcı') || ' size teklif gönderdi',
    coalesce(new.mesaj,''), 'panel-' || new.to_role || '.html');
  return new;
end $$;
drop trigger if exists kb_offer_insert on public.offers;
create trigger kb_offer_insert after insert on public.offers
  for each row execute function public.trg_offer_insert();

-- TEKLİF cevaplandı → gönderene
create or replace function public.trg_offer_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare to_name text; durum_tr text;
begin
  if new.durum is distinct from old.durum and new.durum in ('accepted','rejected') then
    select ad into to_name from public.profiles where id = new.to_user;
    durum_tr := case new.durum when 'accepted' then 'kabul edildi ✓' else 'reddedildi' end;
    perform public.push_to_profile(new.from_user, 'offer_' || new.durum,
      'Teklifin ' || durum_tr,
      coalesce(to_name,'Karşı taraf') || ' teklifini ' || durum_tr || '.',
      'panel-' || new.from_role || '.html');
  end if;
  return new;
end $$;
drop trigger if exists kb_offer_update on public.offers;
create trigger kb_offer_update after update on public.offers
  for each row execute function public.trg_offer_update();

-- BAŞVURU geldi → ilan sahibine
create or replace function public.trg_application_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_pid uuid; orole text; ltitle text; app_name text;
begin
  select owner_id, role, baslik into owner_pid, orole, ltitle from public.listings where id = new.listing_id;
  select ad into app_name from public.profiles where id = new.applicant_id;
  perform public.push_to_profile(owner_pid, 'application_new',
    'İlanına yeni başvuru: ' || coalesce(ltitle,''),
    coalesce(app_name,'Bir aday') || ' başvurdu.', 'panel-' || coalesce(orole,'isletme') || '.html');
  return new;
end $$;
drop trigger if exists kb_application_insert on public.applications;
create trigger kb_application_insert after insert on public.applications
  for each row execute function public.trg_application_insert();

-- BAŞVURU cevaplandı → başvurana
create or replace function public.trg_application_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare ltitle text; durum_tr text;
begin
  if new.durum is distinct from old.durum and new.durum in ('accepted','rejected') then
    select baslik into ltitle from public.listings where id = new.listing_id;
    durum_tr := case new.durum when 'accepted' then 'kabul edildi ✓' else 'reddedildi' end;
    perform public.push_to_profile(new.applicant_id, 'application_' || new.durum,
      'Başvurun ' || durum_tr, coalesce(ltitle,'') || ' · ' || durum_tr,
      'panel-' || new.applicant_role || '.html');
  end if;
  return new;
end $$;
drop trigger if exists kb_application_update on public.applications;
create trigger kb_application_update after update on public.applications
  for each row execute function public.trg_application_update();

-- İHALE TEKLİFİ geldi → ihale sahibine
create or replace function public.trg_bid_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_pid uuid; orole text; ttitle text; bname text;
begin
  select owner_id, role, baslik into owner_pid, orole, ttitle from public.tenders where id = new.tender_id;
  select ad into bname from public.profiles where id = new.bidder_id;
  perform public.push_to_profile(owner_pid, 'bid_new',
    'İhalene yeni teklif: ' || coalesce(ttitle,''),
    coalesce(bname,'Bir firma') || ' teklif verdi.', 'panel-' || coalesce(orole,'isletme') || '.html');
  return new;
end $$;
drop trigger if exists kb_bid_insert on public.bids;
create trigger kb_bid_insert after insert on public.bids
  for each row execute function public.trg_bid_insert();

-- İHALE TEKLİFİ cevaplandı → teklif verene (firma)
create or replace function public.trg_bid_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare ttitle text; durum_tr text;
begin
  if new.durum is distinct from old.durum and new.durum in ('accepted','rejected') then
    select baslik into ttitle from public.tenders where id = new.tender_id;
    durum_tr := case new.durum when 'accepted' then 'kabul edildi ✓' else 'reddedildi' end;
    perform public.push_to_profile(new.bidder_id, 'bid_' || new.durum,
      'İhale teklifin ' || durum_tr, coalesce(ttitle,'') || ' · ' || durum_tr, 'panel-firma.html');
  end if;
  return new;
end $$;
drop trigger if exists kb_bid_update on public.bids;
create trigger kb_bid_update after update on public.bids
  for each row execute function public.trg_bid_update();

-- DEĞERLENDİRME alındı → hedefe
create or replace function public.trg_review_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare rname text; trole text;
begin
  select ad into rname from public.profiles where id = new.reviewer_profile;
  select role into trole from public.profiles where id = new.target_id;
  perform public.push_to_profile(new.target_id, 'review_new',
    'Yeni değerlendirme aldın ⭐',
    coalesce(rname,'Bir kullanıcı') || ' seni değerlendirdi (' || new.puan || '/5).',
    'profil-' || coalesce(trole,'kurye') || '.html?id=' || new.target_id);
  return new;
end $$;
drop trigger if exists kb_review_insert on public.reviews;
create trigger kb_review_insert after insert on public.reviews
  for each row execute function public.trg_review_insert();

-- KYC sonucu (profiles.dogrulama değişti) → kullanıcıya
create or replace function public.trg_dogrulama_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare durum_tr text;
begin
  if new.dogrulama is distinct from old.dogrulama and new.dogrulama in ('verified','rejected') then
    durum_tr := case new.dogrulama when 'verified' then 'onaylandı ✓' else 'reddedildi' end;
    perform public.push_to_profile(new.id, 'kyc_' || new.dogrulama,
      'Kimlik doğrulaman ' || durum_tr,
      'Doğrulama başvurunun sonucu: ' || durum_tr || '.', 'profil-duzenle.html');
  end if;
  return new;
end $$;
drop trigger if exists kb_dogrulama_notify on public.profiles;
create trigger kb_dogrulama_notify after update on public.profiles
  for each row execute function public.trg_dogrulama_notify();

-- Bitti. Yeni tablo: public.notifications ; trigger'lar: offers/applications/bids/reviews/profiles(dogrulama)
