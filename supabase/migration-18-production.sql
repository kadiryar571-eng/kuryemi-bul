-- ============================================================
-- KuryemiBul — Migration 18: PRODUCTION CLEANUP + CANLI SİSTEM
--
-- 1) Demo/seed verisini kalıcı olarak siler
-- 2) Gerçek çevrimiçi (presence) sistemi kurar
-- 3) Ana sayfa / dashboard sayaçları için canlı istatistik RPC'leri ekler
-- 4) Realtime yayınını açar (anlık ilan/başvuru güncellemeleri)
--
-- KULLANIM: Supabase → SQL Editor → bu dosyanın TAMAMINI yapıştır → Run
-- İdempotent: tekrar çalıştırılabilir.
-- ============================================================

-- ============================================================
-- 0) ÖN KOŞUL KONTROLÜ
-- ============================================================
-- Eksik bir bağımlılık varsa yarım uygulanmış migration yerine
-- anlaşılır bir hata verir. (schema.sql + migration-11/12/13/17 gerekir.)
do $$
declare eksik text := '';
begin
  if to_regclass('public.profiles')       is null then eksik := eksik || ' profiles(schema.sql)'; end if;
  if to_regclass('public.listings')       is null then eksik := eksik || ' listings(mig-06)'; end if;
  if to_regclass('public.applications')   is null then eksik := eksik || ' applications(schema.sql)'; end if;
  if to_regclass('public.notifications')  is null then eksik := eksik || ' notifications(mig-12)'; end if;
  if to_regclass('public.conversations')  is null then eksik := eksik || ' conversations(schema.sql)'; end if;
  if to_regclass('public.reviews')        is null then eksik := eksik || ' reviews(mig-05)'; end if;
  if to_regclass('public.pool_members')   is null then eksik := eksik || ' pool_members(schema.sql)'; end if;
  if to_regprocedure('public.push_to_profile(uuid,text,text,text,text)') is null
    then eksik := eksik || ' push_to_profile(mig-12)'; end if;
  -- migration-17 ile gelen kolon
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='listings' and column_name='son_basvuru')
    then eksik := eksik || ' listings.son_basvuru(mig-17)'; end if;

  if eksik <> '' then
    raise exception 'migration-18 ÖN KOŞUL EKSİK →%. Önce bu migration(lar)ı çalıştırın.', eksik;
  end if;
end $$;

-- ============================================================
-- 1) DEMO / SEED VERİSİNİ SİL
-- ============================================================
-- schema.sql'deki seed bloğu user_id = NULL olan profiller ekliyordu
-- (Ahmet Yılmaz, Lezzet Burger, Hız Kurye Lojistik ...).
-- Bunlar gerçek kullanıcı değil; giriş yapamazlar. Siliniyorlar.
-- profiles'a bağlı her şey (offers, listings, applications, reviews,
-- pool_members, conversations ...) on delete cascade ile temizlenir.
--
-- 2026-08-04 canlı ortam ölçümü: 38 profilin 15'i demo (6 kurye, 6 esnaf, 3 firma).
-- Silmeden önce ne gideceğini logla:
do $$
declare n int;
begin
  select count(*) into n from public.profiles where user_id is null;
  raise notice 'Silinecek demo profil sayısı: %', n;
end $$;

delete from public.profiles where user_id is null;

-- auth.users'ta karşılığı kalmamış artık profiller (elle silinmiş test
-- hesapları) — cascade zaten halleder, yine de güvence için:
delete from public.profiles p
  where p.user_id is not null
    and not exists (select 1 from auth.users u where u.id = p.user_id);

-- Sahipsiz kalmış ilanlar / ihaleler
delete from public.listings l
  where not exists (select 1 from public.profiles p where p.id = l.owner_id);
do $$ begin
  delete from public.tenders t
    where not exists (select 1 from public.profiles p where p.id = t.owner_id);
exception when undefined_table then null; end $$;

-- ============================================================
-- 2) PRESENCE — GERÇEK ÇEVRİMİÇİ DURUMU
-- ============================================================
-- Kullanıcı giriş yapınca / uygulama aktifken heartbeat atar (presence_ping).
-- Çıkışta, sekme kapanınca veya boşta kalınca offline'a düşer (presence_offline).
-- Heartbeat gelmezse ONLINE_WINDOW sonunda otomatik offline sayılır.
create table if not exists public.user_presence (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  profile_id   uuid references public.profiles(id) on delete cascade,
  role         text,
  online       boolean not null default true,
  last_seen_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists presence_online_idx  on public.user_presence(online, last_seen_at);
create index if not exists presence_profile_idx on public.user_presence(profile_id);

alter table public.user_presence enable row level security;

-- Ham satırı (last_seen_at dahil) yalnız sahibi görür — kimin ne zaman
-- online olduğu herkese açık olmamalı. Toplu sayı ve profil rozeti için
-- aşağıdaki güvenli view/RPC'ler kullanılır.
drop policy if exists presence_select_own on public.user_presence;
create policy presence_select_own on public.user_presence
  for select using (user_id = auth.uid());

-- Kaç dakika heartbeat gelmezse offline sayılır
create or replace function public.presence_window()
returns interval language sql immutable as $$ select interval '2 minutes' $$;

-- Heartbeat: oturum açık ve uygulama aktifken çağrılır
create or replace function public.presence_ping()
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pid  uuid;
  v_role text;
begin
  if auth.uid() is null then return; end if;
  select id, role into v_pid, v_role from public.profiles where user_id = auth.uid();
  insert into public.user_presence (user_id, profile_id, role, online, last_seen_at, updated_at)
  values (auth.uid(), v_pid, v_role, true, now(), now())
  on conflict (user_id) do update set
    profile_id   = excluded.profile_id,
    role         = excluded.role,
    online       = true,
    last_seen_at = now(),
    updated_at   = now();
end $$;

-- Çıkış / sekme kapanışı / boşta kalma
create or replace function public.presence_offline()
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.user_presence
     set online = false, updated_at = now()
   where user_id = auth.uid();
end $$;

-- Anlık çevrimiçi kullanıcı sayısı (misafirler de görebilir)
create or replace function public.online_users_count()
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int
    from public.user_presence
   where online = true
     and last_seen_at > now() - public.presence_window();
$$;

-- Role göre çevrimiçi dağılımı
create or replace function public.online_counts_by_role()
returns table (role text, adet integer)
language sql stable security definer set search_path = public as $$
  select coalesce(up.role, 'bilinmiyor') as role, count(*)::int as adet
    from public.user_presence up
   where up.online = true
     and up.last_seen_at > now() - public.presence_window()
   group by 1;
$$;

-- Profil kartlarındaki "çevrimiçi" rozeti için güvenli view.
-- Yalnız profile_id + boolean açığa çıkar; zaman damgası sızmaz.
create or replace view public.profile_presence as
  select up.profile_id,
         (up.online and up.last_seen_at > now() - public.presence_window()) as online
    from public.user_presence up
   where up.profile_id is not null;

grant select on public.profile_presence to anon, authenticated;
grant execute on function public.presence_ping()          to authenticated;
grant execute on function public.presence_offline()       to authenticated;
grant execute on function public.online_users_count()     to anon, authenticated;
grant execute on function public.online_counts_by_role()  to anon, authenticated;

-- ============================================================
-- 3) CANLI İSTATİSTİKLER — ana sayfa / dashboard sayaçları
-- ============================================================
-- Tek round-trip'te tüm sayaçlar. Hiçbir değer sabit değildir.
-- security definer: applications/listings RLS'i toplu sayım için aşar,
-- ama yalnız SAYI döner — satır içeriği sızmaz.
create or replace function public.platform_stats()
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    -- Sayaçlar yalnız GERÇEK kullanıcıları kapsar: auth hesabı bağlı
    -- (user_id dolu) ve profil adı girilmiş olmalı. Yarım kalmış kayıt sayılmaz.
    'kurye',        (select count(*)::int from public.profiles
                      where role = 'kurye'   and yayinda = true
                        and user_id is not null and coalesce(ad, '') <> ''),
    'isletme',      (select count(*)::int from public.profiles
                      where role = 'isletme' and yayinda = true
                        and user_id is not null and coalesce(ad, '') <> ''),
    'firma',        (select count(*)::int from public.profiles
                      where role = 'firma'   and yayinda = true
                        and user_id is not null and coalesce(ad, '') <> ''),
    'dogrulanmis',  (select count(*)::int from public.profiles
                      where yayinda = true and dogrulama = 'verified'
                        and user_id is not null and coalesce(ad, '') <> ''),
    'acik_ilan',    (select count(*)::int from public.listings
                      where durum = 'acik'
                        and (son_basvuru is null or son_basvuru >= current_date)),
    'bugun_ilan',   (select count(*)::int from public.listings
                      where created_at >= date_trunc('day', now())),
    'basvuru',      (select count(*)::int from public.applications),
    'bugun_basvuru',(select count(*)::int from public.applications
                      where created_at >= date_trunc('day', now())),
    'degerlendirme',(select count(*)::int from public.reviews),
    'online',       public.online_users_count()
  );
$$;
grant execute on function public.platform_stats() to anon, authenticated;

-- Profil tamamlanma yüzdesi — dolu alanlardan hesaplanır, sabit değer yok
create or replace function public.profile_completion(p_profile_id uuid)
returns integer
language plpgsql stable security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  dolu int := 0;
  toplam int := 0;
begin
  if p_profile_id is null then return 0; end if;
  select * into p from public.profiles where id = p_profile_id;
  if not found then return 0; end if;

  -- Ortak alanlar
  toplam := toplam + 4;
  if coalesce(p.ad, '')       <> '' then dolu := dolu + 1; end if;
  if coalesce(p.sehir, '')    <> '' then dolu := dolu + 1; end if;
  if coalesce(p.aciklama, '') <> '' then dolu := dolu + 1; end if;
  if p.lat is not null and p.lng is not null then dolu := dolu + 1; end if;

  -- İletişim
  toplam := toplam + 1;
  if exists (select 1 from public.profile_contacts c
              where c.profile_id = p.id and coalesce(c.telefon, '') <> '')
    then dolu := dolu + 1; end if;

  -- Role özel alanlar
  if p.role = 'kurye' then
    toplam := toplam + 3;
    if coalesce(p.arac, '') <> ''            then dolu := dolu + 1; end if;
    if coalesce(array_length(p.bolgeler,1),0) > 0 then dolu := dolu + 1; end if;
    if coalesce(p.deneyim, 0) > 0            then dolu := dolu + 1; end if;
  elsif p.role = 'isletme' then
    toplam := toplam + 2;
    if coalesce(p.tur, '') <> ''     then dolu := dolu + 1; end if;
    if coalesce(p.ihtiyac, '') <> '' then dolu := dolu + 1; end if;
  elsif p.role = 'firma' then
    toplam := toplam + 2;
    if coalesce(p.kapasite, 0) > 0                 then dolu := dolu + 1; end if;
    if coalesce(array_length(p.hizmetler,1),0) > 0 then dolu := dolu + 1; end if;
  end if;

  -- Doğrulama
  toplam := toplam + 1;
  if p.dogrulama = 'verified' then dolu := dolu + 1; end if;

  return greatest(0, least(100, round(dolu::numeric * 100 / nullif(toplam,0))::int));
end $$;
grant execute on function public.profile_completion(uuid) to authenticated;

-- Kullanıcıya özel dashboard sayaçları (tek çağrı, hepsi gerçek)
create or replace function public.my_dashboard_stats()
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_pid uuid;
  v_role text;
  v_res json;
begin
  if v_uid is null then return '{}'::json; end if;
  select id, role into v_pid, v_role from public.profiles where user_id = v_uid;

  select json_build_object(
    -- okunmamış bildirim
    'okunmamis_bildirim', (select count(*)::int from public.notifications
                            where user_id = v_uid and read_at is null),
    -- okunmamış mesaj (konuşma tabanlı)
    'okunmamis_mesaj', coalesce((
        select sum(case when c.kurye_user = v_uid then c.kurye_unread
                        else c.employer_unread end)::int
          from public.conversations c
         where c.kurye_user = v_uid or c.employer_user = v_uid), 0),
    -- kaydedilmiş profiller (havuzum)
    'havuzum', (select count(*)::int from public.pool_members where owner_user = v_uid),
    -- bekleyen teklifler (bana gelen)
    'bekleyen_teklif', (select count(*)::int from public.offers
                         where to_user = v_pid and durum = 'pending'),
    -- kendi ilanlarım
    'acik_ilanim', (select count(*)::int from public.listings
                     where owner_user = v_uid and durum = 'acik'),
    -- ilanlarıma gelen başvurular
    'gelen_basvuru', (select count(*)::int from public.applications a
                       join public.listings l on l.id = a.listing_id
                      where l.owner_user = v_uid),
    'yeni_basvuru', (select count(*)::int from public.applications a
                      join public.listings l on l.id = a.listing_id
                     where l.owner_user = v_uid and a.durum = 'pending'),
    -- benim başvurularım
    'basvurum', (select count(*)::int from public.applications
                  where applicant_user = v_uid),
    'kabul_basvurum', (select count(*)::int from public.applications
                        where applicant_user = v_uid and durum = 'accepted'),
    -- profilimi kaç kişi görüntüledi (gerçek kayıtlardan)
    'goruntulenme', (select count(*)::int from public.profile_views
                      where profile_id = v_pid),
    'goruntulenme_7g', (select count(*)::int from public.profile_views
                         where profile_id = v_pid
                           and created_at > now() - interval '7 days'),
    -- profil tamamlanma yüzdesi (gerçek alanlardan hesaplanır)
    'profil_tamamlanma', public.profile_completion(v_pid)
  ) into v_res;
  return v_res;
end $$;
grant execute on function public.my_dashboard_stats() to authenticated;

-- ============================================================
-- 3b) İLAN BAŞVURU SAYILARI — kart üzerindeki "N başvuru" için
-- ============================================================
-- applications RLS'i satırları gizler; burada YALNIZ sayı döner.
-- Böylece kartlarda uydurma değil, gerçek başvuru adedi gösterilir.
create or replace function public.listing_application_counts(p_ids uuid[])
returns table (listing_id uuid, adet integer)
language sql stable security definer set search_path = public as $$
  select a.listing_id, count(*)::int
    from public.applications a
   where a.listing_id = any(p_ids)
   group by a.listing_id;
$$;
grant execute on function public.listing_application_counts(uuid[]) to anon, authenticated;

-- ============================================================
-- 3c) PROFİL GÖRÜNTÜLENME — gerçek olay, gerçek sayaç
-- ============================================================
-- schema.sql notifications tablosunu dar bir type CHECK'i ile oluşturmuş olabilir
-- ('info','success',...). Yeni olay tipleri (profile_view, listing_match, offer_new ...)
-- bu kısıtı ihlal edip trigger'ları patlatır. Kısıtı kaldır — tip serbest metin.
do $$ begin
  alter table public.notifications drop constraint if exists notifications_type_check;
exception when undefined_table then null; end $$;

create table if not exists public.profile_views (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  viewer_user    uuid references auth.users(id) on delete set null,
  viewer_profile uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists pv_profile_idx on public.profile_views(profile_id, created_at desc);
create index if not exists pv_viewer_idx  on public.profile_views(profile_id, viewer_user, created_at desc);
alter table public.profile_views enable row level security;

-- Profil sahibi kendi görüntülenmelerini görür. INSERT policy YOK:
-- satırlar yalnız aşağıdaki security-definer RPC ile eklenir (sahte view engellenir).
drop policy if exists pv_select_owner on public.profile_views;
create policy pv_select_owner on public.profile_views for select using (
  profile_id = (select id from public.profiles where user_id = auth.uid())
);

-- Görüntüleme kaydı. Aynı ziyaretçi 24 saatte bir kez sayılır (şişirme olmaz).
create or replace function public.record_profile_view(p_profile_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_viewer_pid  uuid;
  v_viewer_ad   text;
  v_owner_user  uuid;
begin
  if p_profile_id is null or auth.uid() is null then return; end if;
  select id, ad into v_viewer_pid, v_viewer_ad from public.profiles where user_id = auth.uid();
  -- Kendi profilini görüntülemek sayılmaz
  if v_viewer_pid is null or v_viewer_pid = p_profile_id then return; end if;
  -- 24 saat içinde aynı ziyaretçi tekrar sayılmaz
  if exists (
    select 1 from public.profile_views
     where profile_id = p_profile_id
       and viewer_user = auth.uid()
       and created_at > now() - interval '24 hours'
  ) then return; end if;

  insert into public.profile_views (profile_id, viewer_user, viewer_profile)
  values (p_profile_id, auth.uid(), v_viewer_pid);

  -- Gerçek olay → uygulama içi bildirim.
  -- push_to_profile KULLANILMAZ: her görüntülemede e-posta göndermek spam olur.
  select user_id into v_owner_user from public.profiles where id = p_profile_id;
  if v_owner_user is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_owner_user, 'profile_view', 'Profiliniz görüntülendi',
            coalesce(v_viewer_ad, 'Bir kullanıcı') || ' profilinizi görüntüledi.',
            '/bildirimler.html');
  end if;
end $$;
grant execute on function public.record_profile_view(uuid) to authenticated;

-- ============================================================
-- 3c2) İLAN GÖRÜNTÜLENME — ilan durum ekranındaki gerçek sayaç
-- ============================================================
create table if not exists public.listing_views (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  viewer_user uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists lv_listing_idx on public.listing_views(listing_id, created_at desc);
alter table public.listing_views enable row level security;

-- İlan sahibi kendi ilanının görüntülenmelerini görür. INSERT yalnız RPC ile.
drop policy if exists lv_select_owner on public.listing_views;
create policy lv_select_owner on public.listing_views for select using (
  (select owner_user from public.listings where id = listing_id) = auth.uid()
);

-- Aynı ziyaretçi 6 saatte bir kez sayılır; misafir görüntülemeleri de sayılır.
create or replace function public.record_listing_view(p_listing_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_listing_id is null then return; end if;
  -- Sahibinin kendi ilanına bakması sayılmaz
  if auth.uid() is not null
     and (select owner_user from public.listings where id = p_listing_id) = auth.uid()
    then return; end if;
  if auth.uid() is not null and exists (
    select 1 from public.listing_views
     where listing_id = p_listing_id and viewer_user = auth.uid()
       and created_at > now() - interval '6 hours'
  ) then return; end if;
  insert into public.listing_views (listing_id, viewer_user) values (p_listing_id, auth.uid());
end $$;
grant execute on function public.record_listing_view(uuid) to anon, authenticated;

-- İlan istatistikleri — görüntülenme / başvuru / kabul, hepsi gerçek
create or replace function public.listing_stats(p_listing_id uuid)
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'views',    (select count(*)::int from public.listing_views where listing_id = p_listing_id),
    'apps',     (select count(*)::int from public.applications where listing_id = p_listing_id),
    'pending',  (select count(*)::int from public.applications
                  where listing_id = p_listing_id and durum = 'pending'),
    'accepted', (select count(*)::int from public.applications
                  where listing_id = p_listing_id and durum = 'accepted'),
    'rejected', (select count(*)::int from public.applications
                  where listing_id = p_listing_id and durum = 'rejected')
  );
$$;
grant execute on function public.listing_stats(uuid) to authenticated;

-- ============================================================
-- 3d) YENİ İLAN → EŞLEŞEN KURYELERE BİLDİRİM
-- ============================================================
-- "Sana uygun yeni ilan" bildirimi gerçek bir olaydan doğar: ilan yayınlanır,
-- aynı şehirdeki yayında kuryelere gider. Uydurma bildirim üretilmez.
--
-- ÖNEMLİ: Burada push_to_profile KULLANILMAZ. O fonksiyon her bildirimde
-- ayrıca e-posta gönderir; toplu eşleşmede tek ilan yayını yüzlerce e-posta
-- demek olurdu (spam + INSERT işlemini yavaşlatır). Toplu eşleşme bildirimi
-- YALNIZ uygulama içi olur; e-posta gönderilmez.
create or replace function public.trg_listing_match_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.durum <> 'acik' then return new; end if;
  if coalesce(new.sehir, '') = '' then return new; end if;

  insert into public.notifications (user_id, type, title, body, link)
  select p.user_id, 'listing_match', 'Sana uygun yeni ilan',
         coalesce(new.baslik, 'Yeni ilan') || ' — ' || new.sehir,
         '/ilan.html?id=' || new.id
    from public.profiles p
   where p.role = 'kurye'
     and p.yayinda = true
     and p.user_id is not null
     and p.id <> new.owner_id
     and lower(coalesce(p.sehir, '')) = lower(new.sehir)
     and (coalesce(new.arac, '') = '' or coalesce(p.arac, '') = ''
          or lower(p.arac) = lower(new.arac))
   limit 200;

  return new;
exception when others then
  -- Bildirim üretimi ilan yayınlamayı ASLA engellememeli
  return new;
end $$;

drop trigger if exists kb_listing_match on public.listings;
create trigger kb_listing_match after insert on public.listings
  for each row execute function public.trg_listing_match_notify();

-- ============================================================
-- 4) REALTIME YAYINI — anlık güncelleme için
-- ============================================================
-- Yeni ilan yayınlanınca / başvuru gelince sayfalar yenilenmeden güncellensin.
do $$ begin alter publication supabase_realtime add table public.listings;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.applications;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.offers;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.conv_messages;
exception when duplicate_object then null; when others then null; end $$;

-- ============================================================
-- 5) SÜRESİ DOLMUŞ İLANLARI KAPAT
-- ============================================================
-- İş akışı: son_basvuru geçmiş ilanlar havuzda görünmemeli.
-- Sorgular zaten filtreliyor; bu fonksiyon veriyi de tutarlı tutar.
-- İstenirse pg_cron ile günlük çalıştırılabilir.
create or replace function public.close_expired_listings()
returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.listings
     set durum = 'kapali'
   where durum = 'acik'
     and son_basvuru is not null
     and son_basvuru < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

select public.close_expired_listings();

-- ============================================================
-- BİTTİ.
-- Doğrulama sorguları:
--   select count(*) from public.profiles where user_id is null;  -- 0 olmalı
--   select public.platform_stats();
--   select public.online_users_count();
-- ============================================================
