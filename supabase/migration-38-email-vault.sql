-- ============================================================
-- Kuryemi Bul — Migration 38: Resend anahtarı Vault'a taşındı
--
-- SORUN (2026-08-24): notify_via_email() anahtarı gövdesine gömüyordu.
-- reply_to eklemek için dosya yeniden çalıştırıldığında api_key satırına
-- Resend anahtarı olmayan 95 karakterlik bir değer yapıştırıldı; Resend
-- 400 validation_error "API key is invalid" döndü ve HİÇBİR mail gitmedi.
-- Hata sessizdi — yalnız net._http_response tablosunda görünüyordu.
--
-- ÇÖZÜM: anahtar Vault'ta durur. Fonksiyon gövdesinde sır YOKTUR, bu dosya
-- olduğu gibi git'e girer, migration istendiği kadar yeniden çalıştırılabilir.
-- Ayrıca format kontrolü (^re_) eklendi: yanlış değer artık gürültü çıkarır.
--
-- ÖN KOŞUL — anahtarı BİR KEZ Vault'a yaz (SQL Editor'de, BU DOSYAYA YAZMA):
--   select vault.create_secret('re_GERCEK_ANAHTAR', 'RESEND_API_KEY',
--                              'Resend transactional mail — notify_via_email');
--
-- Anahtarı sonradan yenilemek için (yeni satır açma, mevcudu güncelle):
--   select vault.update_secret(id, 're_YENI_ANAHTAR')
--   from vault.secrets where name = 'RESEND_API_KEY';
--
-- Kontrol (anahtarı ekrana basmadan):
--   select name, left(decrypted_secret,3) as ilk3, length(decrypted_secret) as uzunluk
--   from vault.decrypted_secrets where name = 'RESEND_API_KEY';
--   → beklenen: re_ / 36 civarı
--
-- İdempotent. Supabase → SQL Editor → Run.
-- ============================================================

create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

create or replace function public.notify_via_email(to_email text, subject text, html text)
returns void
language plpgsql
security definer set search_path = public, net, vault
as $$
declare
  api_key   text;
  from_mail text := 'bildirim@kuryemibul.com';   -- Resend'de dogrulanmis gonderen
  from_name text := 'Kuryemi Bul';
  reply_to  text := 'operasyon@kuryemibul.com';  -- kullanici "Yanitla" derse buraya duser
begin
  if to_email is null or to_email = '' then
    return;
  end if;

  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'RESEND_API_KEY'
  limit 1;

  -- Format kapisi: gecmiste buraya yanlis deger yapistirildi ve hata sessiz kaldi.
  if api_key is null or api_key = '' then
    raise warning 'notify_via_email: RESEND_API_KEY Vault''ta yok — mail gonderilmedi (%)', to_email;
    return;
  elsif api_key !~ '^re_' then
    raise warning 'notify_via_email: RESEND_API_KEY Resend formatinda degil (re_ ile baslamiyor, uzunluk %) — mail gonderilmedi', length(api_key);
    return;
  end if;

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'from',     from_name || ' <' || from_mail || '>',
      'reply_to', reply_to,
      'to',       jsonb_build_array(to_email),
      'subject',  subject,
      'html',     html
    )
  );
end $$;

-- ============================================================
-- TEST (anahtar Vault'a yazildiktan SONRA):
--   select public.notify_via_email('kadiryar571@gmail.com', 'KuryemiBul test',
--          public.email_wrap('Test', '<p>Vault uzerinden gonderildi.</p>', null, null));
--
-- 5 saniye sonra sonucu oku — 200 bekleniyor:
--   select id, status_code, left(content,200) as content, created
--   from net._http_response order by created desc limit 3;
-- ============================================================
