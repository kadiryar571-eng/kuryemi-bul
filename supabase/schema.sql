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

-- ---------- 13) NOTIFICATIONS ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info' check (type in ('info','success','warning','error','new_application','new_message','offer','system')),
  title text not null,
  body text default '',
  link text default '',
  data jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists notif_user_idx on public.notifications(user_id);
create index if not exists notif_unread_idx on public.notifications(user_id, read_at) where read_at is null;
alter table public.notifications enable row level security;
drop policy if exists notif_select_own on public.notifications;
create policy notif_select_own on public.notifications for select using (user_id = auth.uid());
drop policy if exists notif_update_own on public.notifications;
create policy notif_update_own on public.notifications for update using (user_id = auth.uid());
drop policy if exists notif_delete_own on public.notifications;
create policy notif_delete_own on public.notifications for delete using (user_id = auth.uid());

-- ---------- 14) CONVERSATIONS ----------
-- İşe alım pipeline'ı: her başvuru otomatik bir konuşma başlatır.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid unique references public.applications(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  kurye_id uuid not null references public.profiles(id) on delete cascade,
  employer_id uuid not null references public.profiles(id) on delete cascade,
  kurye_user uuid not null references auth.users(id) on delete cascade,
  employer_user uuid not null references auth.users(id) on delete cascade,
  last_message text default '',
  last_message_at timestamptz default now(),
  kurye_unread int not null default 0,
  employer_unread int not null default 0,
  status text not null default 'active' check (status in ('active','archived','closed')),
  created_at timestamptz default now()
);
create index if not exists conv_kurye_user_idx on public.conversations(kurye_user);
create index if not exists conv_employer_user_idx on public.conversations(employer_user);
create index if not exists conv_last_msg_idx on public.conversations(last_message_at desc);
alter table public.conversations enable row level security;
drop policy if exists conv_select_party on public.conversations;
create policy conv_select_party on public.conversations for select using (
  kurye_user = auth.uid() or employer_user = auth.uid()
);
drop policy if exists conv_update_party on public.conversations;
create policy conv_update_party on public.conversations for update using (
  kurye_user = auth.uid() or employer_user = auth.uid()
);

-- ---------- 15) CONV_MESSAGES ----------
create table if not exists public.conv_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user uuid references auth.users(id) on delete set null,
  sender_role text not null default 'system',
  content text not null,
  message_type text not null default 'text' check (message_type in ('text','system','profile_card','action','document')),
  metadata jsonb default '{}',
  read_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists conv_msg_conv_idx on public.conv_messages(conversation_id, created_at);
alter table public.conv_messages enable row level security;
drop policy if exists conv_msg_select_party on public.conv_messages;
create policy conv_msg_select_party on public.conv_messages for select using (
  exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
  )
);
drop policy if exists conv_msg_insert_party on public.conv_messages;
create policy conv_msg_insert_party on public.conv_messages for insert with check (
  sender_user = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
  )
);

-- ---------- 16) TRIGGER: Başvuru → Konuşma otomatik başlat ----------
create or replace function public.on_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv_id uuid;
  v_owner_id uuid;
  v_owner_user uuid;
  v_listing_title text;
  v_kurye_ad text;
  v_kurye_puan numeric;
  v_kurye_sehir text;
  v_kurye_arac text;
  v_kurye_seviye text;
  v_kurye_deneyim int;
begin
  select owner_id, owner_user, baslik
    into v_owner_id, v_owner_user, v_listing_title
    from public.listings where id = new.listing_id;
  if v_owner_id is null then return new; end if;

  select ad, puan, sehir, arac, seviye, deneyim
    into v_kurye_ad, v_kurye_puan, v_kurye_sehir, v_kurye_arac, v_kurye_seviye, v_kurye_deneyim
    from public.profiles where id = new.applicant_id;

  -- Konuşma oluştur (application başına bir tane garantisi için unique constraint var)
  insert into public.conversations (
    application_id, listing_id,
    kurye_id, employer_id,
    kurye_user, employer_user,
    last_message, employer_unread
  ) values (
    new.id, new.listing_id,
    new.applicant_id, v_owner_id,
    new.applicant_user, v_owner_user,
    'Yeni başvuru', 1
  ) returning id into v_conv_id;

  -- Sistem mesajı
  insert into public.conv_messages (conversation_id, sender_user, sender_role, content, message_type)
  values (v_conv_id, null, 'system',
    '"' || coalesce(v_listing_title, 'İlan') || '" ilanına yeni başvuru geldi.', 'system');

  -- Başvuran profil kartı (işveren tarafı görecek)
  insert into public.conv_messages (
    conversation_id, sender_user, sender_role, content, message_type, metadata
  ) values (
    v_conv_id, new.applicant_user, 'kurye',
    coalesce(v_kurye_ad, 'Aday') || ' profilini paylaştı.',
    'profile_card',
    jsonb_build_object(
      'profile_id', new.applicant_id,
      'ad', coalesce(v_kurye_ad, ''),
      'puan', coalesce(v_kurye_puan, 0),
      'sehir', coalesce(v_kurye_sehir, ''),
      'arac', coalesce(v_kurye_arac, ''),
      'seviye', coalesce(v_kurye_seviye, 'standart'),
      'deneyim', coalesce(v_kurye_deneyim, 0)
    )
  );

  -- Kapak mesajı varsa
  if new.mesaj is not null and trim(new.mesaj) <> '' then
    insert into public.conv_messages (conversation_id, sender_user, sender_role, content, message_type)
    values (v_conv_id, new.applicant_user, 'kurye', new.mesaj, 'text');
  end if;

  -- İşveren bildirimi
  insert into public.notifications (user_id, type, title, body, link, data)
  values (
    v_owner_user, 'new_application',
    'Yeni başvuru alındı',
    coalesce(v_kurye_ad, 'Bir aday') || ' ilanınıza başvurdu.',
    '/conversations/' || v_conv_id,
    jsonb_build_object('conversation_id', v_conv_id, 'listing_title', coalesce(v_listing_title, ''))
  );

  return new;
end $$;

drop trigger if exists on_application_created on public.applications;
create trigger on_application_created
  after insert on public.applications
  for each row execute function public.on_new_application();

-- ---------- 17) TRIGGER: Yeni mesaj → unread güncelle + bildirim ----------
create or replace function public.on_new_conv_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_conv record;
  v_notify_user uuid;
  v_sender_ad text;
begin
  select * into v_conv from public.conversations where id = new.conversation_id;
  if v_conv is null or new.sender_user is null then return new; end if;

  if new.sender_user = v_conv.kurye_user then
    v_notify_user := v_conv.employer_user;
    update public.conversations set
      last_message = left(new.content, 100),
      last_message_at = now(),
      employer_unread = employer_unread + 1
    where id = new.conversation_id;
  elsif new.sender_user = v_conv.employer_user then
    v_notify_user := v_conv.kurye_user;
    update public.conversations set
      last_message = left(new.content, 100),
      last_message_at = now(),
      kurye_unread = kurye_unread + 1
    where id = new.conversation_id;
  else
    return new;
  end if;

  select ad into v_sender_ad from public.profiles where user_id = new.sender_user;

  if new.message_type = 'text' then
    insert into public.notifications (user_id, type, title, body, link, data)
    values (
      v_notify_user, 'new_message', 'Yeni mesaj',
      coalesce(v_sender_ad, 'Kullanıcı') || ': ' || left(new.content, 80),
      '/conversations/' || new.conversation_id,
      jsonb_build_object('conversation_id', new.conversation_id)
    );
  end if;

  return new;
end $$;

drop trigger if exists on_conv_msg_created on public.conv_messages;
create trigger on_conv_msg_created
  after insert on public.conv_messages
  for each row execute function public.on_new_conv_message();

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

-- ---------- 18) HESAP SİLME (KVKK / Google Play hesap silme gereksinimi) ----------
-- auth.users satırını siler; tüm public tablolar zaten "on delete cascade" ile
-- auth.users(id)'e bağlı olduğundan profil, teklif, ilan, mesaj, bildirim,
-- device_token vb. her şey otomatik temizlenir.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'oturum yok'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
