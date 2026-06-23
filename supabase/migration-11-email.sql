-- ============================================================
-- Kuryemi Bul — Migration 11: Tek e-posta omurgası (Resend)
-- Tüm transactional e-postalar Resend HTTP API'si ile gönderilir.
-- notify_via_email(to_email, subject, html) — her yerden çağrılır (migration-12 trigger'ları dahil).
-- ÖN KOŞUL: pg_net eklentisi + Resend API anahtarı (resend.com → API Keys → Create API Key).
-- KULLANIM: Aşağıda api_key + from_mail DOLDUR, Supabase → SQL Editor → Run. İdempotent.
-- NOT: Anahtar fonksiyon içinde sunucu tarafında durur (tarayıcıya sızmaz). Git'e gerçek key YAZMA.
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notify_via_email(to_email text, subject text, html text)
returns void
language plpgsql
security definer set search_path = public, net
as $$
declare
  -- >>> DOLDUR <<<
  api_key   text := 'RESEND_API_KEY_BURAYA';
  from_mail text := 'bildirim@kuryemibul.com';   -- Resend'de doğrulanmış gönderen (domain)
  from_name text := 'Kuryemi Bul';
begin
  if to_email is null or to_email = '' or api_key = 'RESEND_API_KEY_BURAYA' then
    return;  -- alıcı yok ya da key ayarlanmamış → sessizce çık (in-app bildirim yine de oluşur)
  end if;

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || api_key,
      'Content-Type',  'application/json'
    ),
    body    := jsonb_build_object(
      'from',    from_name || ' <' || from_mail || '>',
      'to',      jsonb_build_array(to_email),
      'subject', subject,
      'html',    html
    )
  );
end $$;

-- Basit, markalı HTML sarmalayıcı (başlık + gövde + buton)
create or replace function public.email_wrap(title text, body_html text, cta_label text, cta_href text)
returns text language sql immutable as $$
  select
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#1a1a2e">'
    || '<h2 style="color:#6C4DFF;margin:0 0 12px">' || title || '</h2>'
    || body_html
    || case when cta_label is not null and cta_href is not null then
        '<p style="margin-top:22px"><a href="' || cta_href || '" style="background:#6C4DFF;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:700">'
        || cta_label || '</a></p>' else '' end
    || '<hr style="border:none;border-top:1px solid #eee;margin:22px 0">'
    || '<p style="color:#999;font-size:12px">Bu e-posta Kuryemi Bul tarafından gönderildi · kuryemibul.com</p></div>';
$$;

-- migration-03'ün eski trigger'ı kaldırıldı (migration-12'deki birleşik bildirim trigger'ına devredildi).
drop trigger if exists on_offer_created on public.offers;
drop function if exists public.notify_offer_email();

-- Bitti. Fonksiyonlar: notify_via_email(), email_wrap()
