-- ============================================================================
-- migration-23-push-fix.sql   (idempotent)
--
-- Push bildirimleri hiç çalışmıyordu. migration-14'teki trigger'da üç ayrı
-- hata vardı; üçü de SESSİZDİ, bu yüzden yıllarca fark edilmedi:
--
--  1) YANLIŞ EKLENTİ. Migration `pg_net` kuruyor ama `extensions.http_post(
--     url, body, content_type, ARRAY[http_header(...)])` çağırıyor — bu
--     pgsql-http ("http" eklentisi) imzası, pg_net'inki değil. O eklenti
--     kurulu olmadığı için çağrı her seferinde hata veriyordu.
--
--  2) HİÇ KURULMAMIŞ AYAR. `current_setting('app.supabase_url', true)` ve
--     `app.service_role_key` hiçbir migration'da set edilmiyor. NULL
--     dönüyor, fonksiyon daha ilk satırda `return new` ile çıkıyordu.
--
--  3) HER HATAYI YUTAN BLOK. `exception when others then return new` —
--     yukarıdaki iki hatayı da görünmez yapan şey buydu.
--
-- Bu migration:
--   • pg_net'i doğru imzayla, kurulu olduğu şemayı tespit ederek çağırır
--   • sırrı Vault'tan okur (repo public — anahtar dosyaya YAZILMAZ)
--   • hataları `raise warning` ile Postgres loglarına düşürür
--     (Supabase → Logs → Postgres), ama bildirim eklemeyi ASLA engellemez
--   • public.push_diag() — kurulumun neresi eksik, tek sorguda söyler
--
-- ÇALIŞTIRMADAN ÖNCE: aşağıdaki ADIM 1'i okuyun, service_role anahtarını
-- Vault'a koymanız gerekiyor.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- ADIM 0 — Gerekli eklentiler
-- ---------------------------------------------------------------------------
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault cascade;


-- ---------------------------------------------------------------------------
-- ADIM 1 — service_role anahtarını Vault'a koy
--
-- BU DOSYAYA ANAHTARI YAZMAYIN. Repo herkese açık.
-- Supabase Studio → SQL Editor'de AYRI olarak, tek seferlik çalıştırın:
--
--   select vault.create_secret(
--     'BURAYA_SERVICE_ROLE_ANAHTARINIZ',
--     'service_role_key',
--     'send-push Edge Function cagrisi icin'
--   );
--
-- Anahtar: Project Settings → API Keys → service_role (secret).
-- Anahtarı yenilerseniz:
--   select vault.update_secret(id, 'YENI_ANAHTAR')
--   from vault.secrets where name = 'service_role_key';
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- ADIM 2 — Yapılandırma okuyucuları
--
-- Proje URL'i gizli değil (istemci JS'inde zaten var), bu yüzden varsayılan
-- olarak gömülü. Anahtar ise yalnız Vault'tan gelir.
-- ---------------------------------------------------------------------------
create or replace function public.push_project_url()
returns text language sql stable security definer set search_path = public, vault as $$
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'project_url' limit 1),
    nullif(current_setting('app.supabase_url', true), ''),
    'https://fdszypytpodndtlbuzuz.supabase.co'
  );
$$;

create or replace function public.push_service_key()
returns text language sql stable security definer set search_path = public, vault as $$
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1),
    nullif(current_setting('app.service_role_key', true), '')
  );
$$;

-- Bu iki fonksiyon service_role anahtarını döndürebilir → herkese kapalı.
revoke all on function public.push_project_url()  from public, anon, authenticated;
revoke all on function public.push_service_key()  from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- ADIM 3 — Trigger fonksiyonu
--
-- pg_net'in hangi şemaya kurulduğu projeden projeye değişiyor (bazı
-- projelerde `net`, bazılarında `extensions`). Sabit şema yazmak yerine
-- katalogdan tespit edip dinamik çağırıyoruz — migration-14'ün düştüğü
-- tuzak tam olarak buydu.
-- ---------------------------------------------------------------------------
create or replace function public.send_web_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_url        text;
  v_key        text;
  v_net_schema text;
  v_req_id     bigint;
begin
  v_key := public.push_service_key();
  if v_key is null or v_key = '' then
    raise warning '[push] service_role_key Vault''ta yok — bildirim gonderilemedi (user_id=%)', new.user_id;
    return new;
  end if;

  v_url := public.push_project_url() || '/functions/v1/send-push';

  select n.nspname into v_net_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_net';

  if v_net_schema is null then
    raise warning '[push] pg_net eklentisi kurulu degil — bildirim gonderilemedi';
    return new;
  end if;

  execute format(
    'select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 8000)',
    v_net_schema
  )
  into v_req_id
  using
    v_url,
    jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    jsonb_build_object(
      'user_id', new.user_id::text,
      'title',   new.title,
      'body',    coalesce(new.body, ''),
      'url',     coalesce(nullif(new.link, ''), '/'),
      'tag',     coalesce(new.type, 'kb')
    );

  return new;

exception when others then
  -- Bildirimin veritabanına yazılması push'tan daha önemli: burada patlarsak
  -- kullanıcı bildirimi hiç görmez. Ama artık SESSİZ değil — sebep loglara
  -- düşüyor (Supabase → Logs → Postgres, "[push]" diye aratın).
  raise warning '[push] gonderim hatasi: % / %', sqlstate, sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification
  after insert on public.notifications
  for each row execute function public.send_web_push();


-- ---------------------------------------------------------------------------
-- ADIM 4 — Teşhis
--
--   select * from public.push_diag();
--
-- Her satır "ok" ise kurulum tamam. Değilse "detay" ne yapılacağını söyler.
-- ---------------------------------------------------------------------------
create or replace function public.push_diag()
returns table (kontrol text, durum text, detay text)
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_net_schema text;
begin
  select n.nspname into v_net_schema
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_net';

  kontrol := 'pg_net eklentisi';
  durum   := case when v_net_schema is null then 'EKSIK' else 'ok' end;
  detay   := coalesce('sema: ' || v_net_schema, 'create extension pg_net; calistirin');
  return next;

  kontrol := 'Vault: service_role_key';
  durum   := case when coalesce(public.push_service_key(), '') = '' then 'EKSIK' else 'ok' end;
  detay   := case when coalesce(public.push_service_key(), '') = ''
                  then 'migration-23 ADIM 1''deki vault.create_secret(...) sorgusunu calistirin'
                  else 'uzunluk: ' || length(public.push_service_key()) end;
  return next;

  kontrol := 'Proje URL';
  durum   := 'ok';
  detay   := public.push_project_url();
  return next;

  kontrol := 'Trigger: trg_push_on_notification';
  durum   := case when exists (
                    select 1 from pg_trigger
                    where tgname = 'trg_push_on_notification' and not tgisinternal
                  ) then 'ok' else 'EKSIK' end;
  detay   := 'notifications tablosunda insert sonrasi calisir';
  return next;

  kontrol := 'Web push abonelikleri';
  durum   := 'bilgi';
  detay   := (select count(*)::text || ' satir' from public.push_subscriptions);
  return next;

  kontrol := 'Android cihaz tokenlari';
  durum   := 'bilgi';
  detay   := (select count(*)::text || ' satir' from public.device_tokens);
  return next;
end;
$$;

revoke all on function public.push_diag() from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- ADIM 5 — Test bildirimi gönderme yardımcısı
--
-- E-postadan kullanıcıyı bulup gerçek bir bildirim satırı ekler; trigger
-- normal akıştaki gibi tetiklenir. Yani bu, push zincirinin TAMAMINI test
-- eder — kısayol değil.
--
--   select public.push_test('kadiryar571@gmail.com');
--   select public.push_test('kadiryar571@gmail.com', 'Baslik', 'Metin', '/mesajlar.html');
-- ---------------------------------------------------------------------------
create or replace function public.push_test(
  p_email text,
  p_title text default 'Test bildirimi',
  p_body  text default 'Push zinciri calisiyor. Bu bildirimi gorduyseniz kurulum tamam.',
  p_link  text default '/bildirimler.html'
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_id  uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(p_email) limit 1;
  if v_uid is null then
    return 'Kullanici bulunamadi: ' || p_email;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (v_uid, 'test', p_title, p_body, p_link)
  returning id into v_id;

  return 'Bildirim eklendi. user_id=' || v_uid || ' notification_id=' || v_id ||
         E'\nSonucu gormek icin birkac saniye sonra: select * from public.push_last();';
end;
$$;

revoke all on function public.push_test(text, text, text, text) from public, anon, authenticated;


-- ---------------------------------------------------------------------------
-- ADIM 6 — Son gönderimlerin sonucu
--
-- pg_net ASENKRONDUR: http_post anında döner, yanıt sonra gelir. Yani
-- trigger'ın hatasız çalışması "bildirim gitti" demek DEĞİLDİR. Gerçek
-- sonuç burada:
--
--   select * from public.push_last();
--
-- status_code 200 + icerikte "sent" > 0 ise bildirim gönderildi.
-- ---------------------------------------------------------------------------
create or replace function public.push_last(p_limit int default 5)
returns table (
  istek_id    bigint,
  status_code int,
  icerik      text,
  hata        text,
  zaman       timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_net_schema text;
begin
  select n.nspname into v_net_schema
  from pg_extension e join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pg_net';

  if v_net_schema is null then return; end if;

  return query execute format($q$
    select id, status_code, left(coalesce(content, ''), 500), error_msg, created
    from %I._http_response
    order by created desc
    limit %s
  $q$, v_net_schema, p_limit);
end;
$$;

revoke all on function public.push_last(int) from public, anon, authenticated;
