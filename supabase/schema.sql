-- ============================================================
-- Kuryemi Bul — Faz 2 veritabanı şeması
-- profiles + offers + RLS + trigger + örnek (seed) veri
-- KULLANIM: Supabase → SQL Editor → bu dosyanın TAMAMINI yapıştır → Run
-- Tekrar çalıştırılabilir (idempotent): drop/if not exists kullanır.
-- ============================================================

-- ---------- 1) PROFILES ----------
-- id: profilin kendi kimliği (seed/demo kayıtlar için auth gerektirmez)
-- user_id: gerçek kullanıcıya bağ (auth.users). Demo kayıtlarda NULL.
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete cascade,
  role        text not null check (role in ('kurye','isletme','firma')),
  ad          text not null default '',
  sehir       text default '',
  -- NOT: telefon/email burada DEĞİL — KVKK gereği ayrı public.profile_contacts
  -- tablosunda tutulur (yalnız sahip + kabul edilmiş teklifin karşı tarafı okur).
  aciklama    text default '',
  lat         double precision,
  lng         double precision,
  -- kurye alanları
  arac        text,
  bolgeler    text[] default '{}',
  deneyim     int default 0,
  seviye      text default 'standart' check (seviye in ('standart','profesyonel','premium')),
  puan        numeric(3,2) default 0,
  degerlendirme int not null default 0,  -- değerlendirme sayısı (reviews trigger ile güncellenir)
  dogrulama   text not null default 'none' check (dogrulama in ('none','pending','verified','rejected')),
  tamamlanan  int default 0,
  sertifikalar text[] default '{}',
  calistigi   text[] default '{}',
  -- isletme alanları
  tur         text,
  acik_ilan   int default 0,
  ihtiyac     text,
  -- firma alanları
  kapasite    int default 0,
  hizmetler   text[] default '{}',
  yayinda     boolean not null default false,  -- profil tamamlanınca true; havuzda görünürlük
  created_at  timestamptz default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_sehir_idx on public.profiles(sehir);

-- ---------- 2) OFFERS (teklifler) ----------
create table if not exists public.offers (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references public.profiles(id) on delete cascade,
  from_role   text not null,
  to_user     uuid not null references public.profiles(id) on delete cascade,
  to_role     text not null,
  mesaj       text not null default '',
  durum       text not null default 'pending' check (durum in ('pending','accepted','rejected')),
  created_at  timestamptz default now()
);
create index if not exists offers_to_idx   on public.offers(to_user);
create index if not exists offers_from_idx on public.offers(from_user);

-- ---------- 2b) PROFILE_CONTACTS (korumalı iletişim — KVKK) ----------
-- telefon/email public profiles'ta tutulmaz; burada tutulur ve RLS ile korunur.
create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  telefon    text default '',
  email      text default '',
  updated_at timestamptz default now()
);

-- ---------- 3) RLS (satır bazlı güvenlik) ----------
alter table public.profiles         enable row level security;
alter table public.offers           enable row level security;
alter table public.profile_contacts enable row level security;

-- profiles: herkes okuyabilir (açık havuz)
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
  for select using (true);

-- profiles: kullanıcı yalnız KENDİ satırını ekler/günceller/siler
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = user_id);

-- offers: yalnız TARAFI olduğun teklifleri görürsün
drop policy if exists offers_select_party on public.offers;
create policy offers_select_party on public.offers
  for select using (
    (select user_id from public.profiles where id = from_user) = auth.uid()
    or (select user_id from public.profiles where id = to_user) = auth.uid()
  );

-- offers: yalnız KENDİ adına gönderebilirsin
drop policy if exists offers_insert_sender on public.offers;
create policy offers_insert_sender on public.offers
  for insert with check (
    (select user_id from public.profiles where id = from_user) = auth.uid()
  );

-- offers: alıcı durumu güncelleyebilir (kabul/ret)
drop policy if exists offers_update_recipient on public.offers;
create policy offers_update_recipient on public.offers
  for update using (
    (select user_id from public.profiles where id = to_user) = auth.uid()
  );

-- offers: taraflar kendi teklifini silebilir
drop policy if exists offers_delete_party on public.offers;
create policy offers_delete_party on public.offers
  for delete using (
    (select user_id from public.profiles where id = from_user) = auth.uid()
    or (select user_id from public.profiles where id = to_user) = auth.uid()
  );

-- profile_contacts: sahip kendi iletişimini okur/yazar
drop policy if exists contacts_select_own on public.profile_contacts;
create policy contacts_select_own on public.profile_contacts
  for select using (auth.uid() = user_id);

drop policy if exists contacts_insert_own on public.profile_contacts;
create policy contacts_insert_own on public.profile_contacts
  for insert with check (auth.uid() = user_id);

drop policy if exists contacts_update_own on public.profile_contacts;
create policy contacts_update_own on public.profile_contacts
  for update using (auth.uid() = user_id);

-- profile_contacts: KABUL EDİLMİŞ teklifin karşı tarafı okuyabilir
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

-- ---------- 4) Yeni kullanıcı → otomatik profil ----------
-- Kayıt sırasında signUp({ options:{ data:{ role, ad } } }) ile gelen
-- meta veriden profiles satırı oluşturulur.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 5) SEED — örnek havuz verisi (user_id NULL = demo) ----------
-- Havuzlar boş görünmesin diye. Bu kayıtlar giriş yapamaz; gerçek kullanıcılar
-- kayıt olunca kendi profillerini ekler. (Yeniden çalıştırmadan önce istersen:
--   delete from public.profiles where user_id is null;  )
insert into public.profiles
  (role, ad, sehir, arac, bolgeler, deneyim, seviye, puan, tamamlanan, sertifikalar, calistigi, lat, lng)
values
  ('kurye','Ahmet Yılmaz','İstanbul','Motosiklet', ARRAY['Kadıköy','Üsküdar','Ataşehir'], 5,'premium',4.90,1240, ARRAY['MYK Motorlu Kurye','Trafik Güvenliği'], ARRAY['Lezzet Burger','Anadolu Eczanesi'], 40.9907,29.0277),
  ('kurye','Mert Demir','İstanbul','Motosiklet', ARRAY['Şişli','Beşiktaş'], 3,'profesyonel',4.60,720, ARRAY['MYK Motorlu Kurye'], ARRAY['Mavi Market'], 41.0602,28.9877),
  ('kurye','Emre Kaya','İstanbul','Elektrikli Bisiklet', ARRAY['Bağcılar','Bahçelievler'], 1,'standart',4.20,130, '{}', '{}', 41.0345,28.8567),
  ('kurye','Selin Aydın','Ankara','Motosiklet', ARRAY['Çankaya','Kızılay'], 4,'profesyonel',4.70,880, ARRAY['MYK Motorlu Kurye'], ARRAY['Başkent Çiçek'], 39.9208,32.8541),
  ('kurye','Burak Şahin','İzmir','Motosiklet', ARRAY['Konak','Bornova'], 7,'premium',4.95,2100, ARRAY['MYK Motorlu Kurye','İleri Sürüş'], ARRAY['Ege Su','Sahil Eczanesi'], 38.4189,27.1287),
  ('kurye','Deniz Çelik','İstanbul','Otomobil', ARRAY['Maltepe','Kartal'], 2,'standart',4.00,210, '{}', '{}', 40.9351,29.1556);

insert into public.profiles
  (role, ad, tur, sehir, bolgeler, acik_ilan, aciklama, ihtiyac, lat, lng)
values
  ('isletme','Lezzet Burger','Restoran','İstanbul', ARRAY['Kadıköy'], 2,'Günlük 200+ paket servisi yapan yoğun bir burger restoranı.','Akşam vardiyası motokurye', 40.9901,29.0254),
  ('isletme','Mavi Market','Market','İstanbul', ARRAY['Şişli'], 1,'Mahalle marketi, hızlı teslimat ağı kuruyor.','Yarı zamanlı bisikletli kurye', 41.0588,28.9862),
  ('isletme','Anadolu Eczanesi','Eczane','İstanbul', ARRAY['Üsküdar'], 1,'Reçeteli ilaç teslimatı için güvenilir kurye arıyor.','Güvenilir, referanslı kurye', 41.0235,29.0152),
  ('isletme','Başkent Çiçek','Çiçekçi','Ankara', ARRAY['Çankaya'], 1,'Aynı gün çiçek teslimatı yapan butik çiçekçi.','Özenli teslimat yapan kurye', 39.9189,32.8523),
  ('isletme','Ege Su','Su Firması','İzmir', ARRAY['Konak'], 3,'Bölgesel su dağıtımı, sürekli kurye ihtiyacı var.','Tam zamanlı dağıtım kuryesi', 38.4170,27.1281),
  ('isletme','HızlıAl E-Ticaret','E-Ticaret','İstanbul', ARRAY['Ataşehir'], 5,'Şehir içi aynı gün teslimat yapan e-ticaret deposu.','Çok sayıda kurye / firma teklifi', 40.9923,29.1244);

insert into public.profiles
  (role, ad, bolgeler, kapasite, puan, aciklama, hizmetler, lat, lng)
values
  ('firma','Hız Kurye Lojistik', ARRAY['İstanbul Anadolu','İstanbul Avrupa'], 60,4.80,'150+ kuryelik filosuyla kurumsal teslimat çözümleri.', ARRAY['Aynı gün teslimat','Kurumsal anlaşma','Soğuk zincir'], 41.0082,28.9784),
  ('firma','Anadolu Express', ARRAY['Ankara','Eskişehir'], 35,4.50,'İç Anadolu bölgesinde hızlı dağıtım ağı.', ARRAY['Şehirler arası','Kurumsal anlaşma'], 39.9334,32.8597),
  ('firma','Ege Moto Kurye', ARRAY['İzmir','Manisa'], 28,4.70,'Ege bölgesinde motokurye ağı.', ARRAY['Aynı gün teslimat','Yoğun bölge desteği'], 38.4237,27.1428);

-- Seed kayıtlar havuzda görünsün
update public.profiles set yayinda = true where user_id is null;

-- ---------- 6) POOL_MEMBERS ("Havuzum" — kayıtlı profiller) ----------
create table if not exists public.pool_members (
  id          uuid primary key default gen_random_uuid(),
  owner_user  uuid not null references auth.users(id) on delete cascade,
  member_id   uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (owner_user, member_id)
);
create index if not exists pool_owner_idx on public.pool_members(owner_user);
alter table public.pool_members enable row level security;

drop policy if exists pool_select_own on public.pool_members;
create policy pool_select_own on public.pool_members for select using (owner_user = auth.uid());
drop policy if exists pool_insert_own on public.pool_members;
create policy pool_insert_own on public.pool_members for insert with check (owner_user = auth.uid());
drop policy if exists pool_delete_own on public.pool_members;
create policy pool_delete_own on public.pool_members for delete using (owner_user = auth.uid());

-- ---------- 7) REVIEWS (değerlendirme / puan) ----------
create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  reviewer_user    uuid not null references auth.users(id) on delete cascade,
  reviewer_profile uuid references public.profiles(id) on delete set null,
  target_id        uuid not null references public.profiles(id) on delete cascade,
  offer_id         uuid references public.offers(id) on delete set null,
  puan             int not null check (puan between 1 and 5),
  yorum            text default '',
  created_at       timestamptz default now(),
  unique (reviewer_user, target_id)
);
create index if not exists reviews_target_idx on public.reviews(target_id);
alter table public.reviews enable row level security;

drop policy if exists reviews_select_all on public.reviews;
create policy reviews_select_all on public.reviews for select using (true);

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

-- ---------- 8) İLAN & BAŞVURU ----------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_user uuid not null references auth.users(id) on delete cascade,
  role text not null default 'isletme',
  baslik text not null, aciklama text default '', sehir text default '', bolge text default '', arac text default '',
  durum text not null default 'acik' check (durum in ('acik','kapali')),
  created_at timestamptz default now()
);
create index if not exists listings_durum_idx on public.listings(durum);
create index if not exists listings_owner_idx on public.listings(owner_user);
alter table public.listings enable row level security;
drop policy if exists listings_select on public.listings;
create policy listings_select on public.listings for select using (durum = 'acik' or owner_user = auth.uid());
drop policy if exists listings_insert on public.listings;
create policy listings_insert on public.listings for insert with check (owner_user = auth.uid() and owner_id = (select id from public.profiles where user_id = auth.uid()));
drop policy if exists listings_update on public.listings;
create policy listings_update on public.listings for update using (owner_user = auth.uid());
drop policy if exists listings_delete on public.listings;
create policy listings_delete on public.listings for delete using (owner_user = auth.uid());

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  applicant_user uuid not null references auth.users(id) on delete cascade,
  applicant_role text not null, mesaj text default '',
  durum text not null default 'pending' check (durum in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique (listing_id, applicant_id)
);
create index if not exists applications_listing_idx on public.applications(listing_id);
create index if not exists applications_applicant_idx on public.applications(applicant_user);
alter table public.applications enable row level security;
drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications for select using (
  applicant_user = auth.uid() or (select owner_user from public.listings where id = listing_id) = auth.uid()
);
drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert with check (
  applicant_user = auth.uid() and applicant_id = (select id from public.profiles where user_id = auth.uid())
  and (select durum from public.listings where id = listing_id) = 'acik'
);
drop policy if exists applications_update_owner on public.applications;
create policy applications_update_owner on public.applications for update using (
  (select owner_user from public.listings where id = listing_id) = auth.uid()
);
drop policy if exists applications_delete_own on public.applications;
create policy applications_delete_own on public.applications for delete using (applicant_user = auth.uid());

-- ---------- 9) İHALE & TEKLİF (bids) ----------
create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_user uuid not null references auth.users(id) on delete cascade,
  role text not null default 'isletme',
  baslik text not null, aciklama text default '', sehir text default '', bolge text default '',
  adet int default 0, sure text default '', butce text default '',
  durum text not null default 'acik' check (durum in ('acik','kapali')),
  created_at timestamptz default now()
);
create index if not exists tenders_durum_idx on public.tenders(durum);
create index if not exists tenders_owner_idx on public.tenders(owner_user);
alter table public.tenders enable row level security;
drop policy if exists tenders_select on public.tenders;
create policy tenders_select on public.tenders for select using (durum = 'acik' or owner_user = auth.uid());
drop policy if exists tenders_insert on public.tenders;
create policy tenders_insert on public.tenders for insert with check (owner_user = auth.uid() and owner_id = (select id from public.profiles where user_id = auth.uid()));
drop policy if exists tenders_update on public.tenders;
create policy tenders_update on public.tenders for update using (owner_user = auth.uid());
drop policy if exists tenders_delete on public.tenders;
create policy tenders_delete on public.tenders for delete using (owner_user = auth.uid());

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  bidder_user uuid not null references auth.users(id) on delete cascade,
  tutar text default '', mesaj text default '',
  durum text not null default 'pending' check (durum in ('pending','accepted','rejected')),
  created_at timestamptz default now(),
  unique (tender_id, bidder_id)
);
create index if not exists bids_tender_idx on public.bids(tender_id);
create index if not exists bids_bidder_idx on public.bids(bidder_user);
alter table public.bids enable row level security;
drop policy if exists bids_select on public.bids;
create policy bids_select on public.bids for select using (
  bidder_user = auth.uid() or (select owner_user from public.tenders where id = tender_id) = auth.uid()
);
drop policy if exists bids_insert on public.bids;
create policy bids_insert on public.bids for insert with check (
  bidder_user = auth.uid() and bidder_id = (select id from public.profiles where user_id = auth.uid())
  and (select role from public.profiles where user_id = auth.uid()) = 'firma'
  and (select durum from public.tenders where id = tender_id) = 'acik'
);
drop policy if exists bids_update_owner on public.bids;
create policy bids_update_owner on public.bids for update using (
  (select owner_user from public.tenders where id = tender_id) = auth.uid()
);
drop policy if exists bids_delete_own on public.bids;
create policy bids_delete_own on public.bids for delete using (bidder_user = auth.uid());

-- ---------- 10) KYC / Kimlik Doğrulama ----------
create table if not exists public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ad_soyad text not null, tc_no text not null, belge_turu text default '', not_text text default '',
  durum text not null default 'pending' check (durum in ('pending','verified','rejected')),
  created_at timestamptz default now(),
  unique (user_id)
);
alter table public.kyc_submissions enable row level security;
drop policy if exists kyc_select_own on public.kyc_submissions;
create policy kyc_select_own on public.kyc_submissions for select using (user_id = auth.uid());
drop policy if exists kyc_insert_own on public.kyc_submissions;
create policy kyc_insert_own on public.kyc_submissions for insert with check (user_id = auth.uid() and profile_id = (select id from public.profiles where user_id = auth.uid()));
drop policy if exists kyc_update_own on public.kyc_submissions;
create policy kyc_update_own on public.kyc_submissions for update using (user_id = auth.uid());

create or replace function public.on_kyc_submit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set dogrulama = 'pending' where id = new.profile_id and dogrulama in ('none','rejected');
  return new;
end $$;
drop trigger if exists kyc_submit_trg on public.kyc_submissions;
create trigger kyc_submit_trg after insert or update on public.kyc_submissions for each row execute function public.on_kyc_submit();

create or replace function public.guard_dogrulama()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dogrulama is distinct from old.dogrulama then
    if auth.uid() is not null and new.dogrulama <> 'pending' then
      new.dogrulama := old.dogrulama;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_dogrulama_trg on public.profiles;
create trigger guard_dogrulama_trg before update on public.profiles for each row execute function public.guard_dogrulama();

-- ---------- 11) ADMIN & KYC ONAY ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (user_id = auth.uid());

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;

-- guard_dogrulama'yı adminlere izin verecek şekilde değiştir (KYC bölümündeki sürümü ezer)
create or replace function public.guard_dogrulama()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dogrulama is distinct from old.dogrulama then
    if auth.uid() is not null and new.dogrulama <> 'pending' and not public.is_admin(auth.uid()) then
      new.dogrulama := old.dogrulama;
    end if;
  end if;
  return new;
end $$;

create or replace function public.review_kyc(p_profile_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'yetki yok'; end if;
  if p_decision not in ('verified','rejected') then raise exception 'gecersiz karar'; end if;
  update public.profiles set dogrulama = p_decision where id = p_profile_id;
  update public.kyc_submissions set durum = p_decision where profile_id = p_profile_id;
end $$;
revoke all on function public.review_kyc(uuid, text) from public;
grant execute on function public.review_kyc(uuid, text) to authenticated;

create or replace function public.list_pending_kyc()
returns table (profile_id uuid, ad text, role text, ad_soyad text, tc_no text, belge_turu text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'yetki yok'; end if;
  return query
    select k.profile_id, p.ad, p.role, k.ad_soyad, k.tc_no, k.belge_turu, k.created_at
    from public.kyc_submissions k join public.profiles p on p.id = k.profile_id
    where k.durum = 'pending' order by k.created_at asc;
end $$;
revoke all on function public.list_pending_kyc() from public;
grant execute on function public.list_pending_kyc() to authenticated;

-- Bitti. Tablolar: ...+ public.admins. Admin yapmak için: insert into admins(user_id) values('<uid>');

-- ---------- 12) DEVICE_TOKENS (native push bildirimleri) ----------
-- Her kullanıcının cihaz başına bir satırı olur. APK push token alınca upsert eder.
create table if not exists public.device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text not null,
  platform    text not null default 'android' check (platform in ('android','ios')),
  updated_at  timestamptz default now(),
  unique (user_id, token)
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);
alter table public.device_tokens enable row level security;

-- Kullanıcı yalnız KENDİ tokenlarını görür/yönetir
drop policy if exists device_tokens_select_own on public.device_tokens;
create policy device_tokens_select_own on public.device_tokens
  for select using (auth.uid() = user_id);

drop policy if exists device_tokens_insert_own on public.device_tokens;
create policy device_tokens_insert_own on public.device_tokens
  for insert with check (auth.uid() = user_id);

drop policy if exists device_tokens_update_own on public.device_tokens;
create policy device_tokens_update_own on public.device_tokens
  for update using (auth.uid() = user_id);

drop policy if exists device_tokens_delete_own on public.device_tokens;
create policy device_tokens_delete_own on public.device_tokens
  for delete using (auth.uid() = user_id);
