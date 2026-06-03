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

-- Bitti. Tablolar: public.profiles, public.offers, public.profile_contacts, public.pool_members
