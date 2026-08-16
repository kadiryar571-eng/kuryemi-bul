-- ============================================================
-- Kuryemi Bul — Migration 31: bildirim bağlantıları 404 veriyordu
--
-- SORUN: İki trigger bildirim linkini şöyle yazıyordu:
--
--     '/conversations/' || v_conv_id
--
-- Böyle bir yol YOK. Site statik dosyalardan oluşuyor (GitHub Pages);
-- REST tarzı bir /conversations/<uuid> route'u hiçbir zaman olmadı.
-- Kullanıcı bildirime tıklayınca kuryemibul.com/conversations/<uuid>
-- adresine gidiyor ve 404 sayfasına düşüyordu.
--
-- Mesaj detay sayfası konuşmayı `tid` sorgu parametresiyle bekliyor
-- (docs/mesaj-detay.html → params.get('tid')); mesajlar.html ve
-- karar.html zaten doğru biçimde link veriyor:
--
--     mesaj-detay.html?tid=<conversation_id>
--
-- Etkilenen bildirimler:
--   • "Yeni başvuru alındı"  (on_new_application)
--   • "Yeni mesaj"           (on_new_conv_message)
--
-- Diğer bildirim linkleri ('/gorusmeler.html', '/mesajlar.html',
-- '/ilan.html?id=') gerçek sayfalara işaret ediyor, onlara dokunulmadı.
--
-- Bu migration hem trigger'ları düzeltir hem de VERİTABANINDA BİRİKMİŞ
-- bozuk linkleri onarır — yoksa eski bildirimler 404 vermeye devam eder.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================


-- ============================================================
-- 1. Yeni başvuru bildirimi
-- ============================================================

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
  -- DEĞİŞEN SATIR: link artık gerçek sayfa adresine işaret ediyor.
  -- (Eski hatalı desen bilerek buraya yazılmadı; aşağıdaki doğrulama
  --  bloğu fonksiyon kaynağını tarıyor ve yorumu da kod sanardı.)
  insert into public.notifications (user_id, type, title, body, link, data)
  values (
    v_owner_user, 'new_application',
    'Yeni başvuru alındı',
    coalesce(v_kurye_ad, 'Bir aday') || ' ilanınıza başvurdu.',
    '/mesaj-detay.html?tid=' || v_conv_id,
    jsonb_build_object('conversation_id', v_conv_id, 'listing_title', coalesce(v_listing_title, ''))
  );

  return new;
end $$;


-- ============================================================
-- 2. Yeni mesaj bildirimi
-- ============================================================

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
    -- DEĞİŞEN SATIR: link artık gerçek sayfa adresine işaret ediyor.
    insert into public.notifications (user_id, type, title, body, link, data)
    values (
      v_notify_user, 'new_message', 'Yeni mesaj',
      coalesce(v_sender_ad, 'Kullanıcı') || ': ' || left(new.content, 80),
      '/mesaj-detay.html?tid=' || new.conversation_id,
      jsonb_build_object('conversation_id', new.conversation_id)
    );
  end if;

  return new;
end $$;


-- ============================================================
-- 3. BİRİKMİŞ BOZUK LİNKLERİ ONAR
--
-- Trigger'ları düzeltmek yalnız yeni bildirimleri kurtarır. Kullanıcıların
-- bildirim listesinde duran eski kayıtlar 404 vermeye devam ederdi.
-- ============================================================

update public.notifications
   set link = replace(link, '/conversations/', '/mesaj-detay.html?tid=')
 where link like '/conversations/%';


-- ============================================================
-- 4. DOĞRULAMA
-- ============================================================

do $$
declare
  kalan int;
  onarilan int;
begin
  select count(*) into kalan from public.notifications
   where link like '/conversations/%';

  if kalan > 0 then
    raise exception 'Hala % bildirimde bozuk link var', kalan;
  end if;

  select count(*) into onarilan from public.notifications
   where link like '/mesaj-detay.html?tid=%';

  raise notice 'Bozuk link kalmadi ✓ — mesaj-detay linkli bildirim: %', onarilan;

  -- Fonksiyonlarda eski desen kalmamalı.
  --
  -- DİKKAT: pg_get_functiondef() fonksiyonun TAM kaynağını döndürür,
  -- YORUM SATIRLARI DAHİL. Bu yüzden hem fonksiyon içindeki açıklamalarda
  -- eski desen yazılmamalı, hem de burada kodun kendisi aranmalı — düz
  -- metin araması yorumu da yakalar ve boşuna hata verir.
  -- Aradığımız şey: link ifadesinin eski hali.
  if exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('on_new_application', 'on_new_conv_message')
       and pg_get_functiondef(p.oid) like '%''/conversations/'' ||%'
  ) then
    raise exception 'Trigger fonksiyonlarinda eski link ifadesi hala var';
  end if;

  raise notice 'Trigger fonksiyonlari temiz ✓';
  raise notice 'Migration 31 tamam.';
end $$;
