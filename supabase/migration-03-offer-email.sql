-- ============================================================
-- Kuryemi Bul — Migration 03: Teklif gelince E-POSTA BİLDİRİMİ
-- Teklif (offers) eklendiğinde, alıcıya Resend API ile e-posta gönderir.
-- Edge Function / CLI GEREKMEZ — sadece bu SQL + bir Resend API anahtarı.
--
-- ÖN KOŞULLAR:
--   1) Resend hesabı (resend.com) + API key. Gerçek alıcılara göndermek için
--      Resend'de bir DOMAIN doğrulanmalı; doğrulanmadıysa from'u
--      'onboarding@resend.dev' yap (yalnız kendi Resend e-postana ulaşır - test).
--   2) Supabase'de pg_net eklentisi (aşağıdaki create extension açar; gerekirse
--      Dashboard → Database → Extensions → "pg_net" enable).
--
-- KULLANIM: Aşağıda 2 yeri DOLDUR (api_key + from_addr), sonra SQL Editor'de Run.
-- NOT: API anahtarı bu fonksiyonda sunucu tarafında durur (tarayıcıya sızmaz).
--      Anahtarını herkese açık git deposuna YAZMA.
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notify_offer_email()
returns trigger
language plpgsql
security definer set search_path = public, net
as $$
declare
  to_email   text;
  to_name    text;
  from_name  text;
  msg_safe   text;
  subject    text;
  html       text;
  -- >>> DOLDUR <<<
  api_key    text := 'RESEND_API_KEY_BURAYA';
  from_addr  text := 'Kuryemi Bul <onboarding@resend.dev>';  -- domain doğrulayınca: bildirim@senin-domain.com
  site_url   text := 'https://kadiryar571-eng.github.io/kuryemi-bul';
begin
  -- Alıcının e-postası (korumalı tablodan) ve isimler
  select email into to_email from public.profile_contacts where profile_id = new.to_user;
  select ad    into to_name  from public.profiles         where id = new.to_user;
  select ad    into from_name from public.profiles        where id = new.from_user;

  if to_email is null or to_email = '' then
    return new;  -- alıcı e-postası yoksa sessizce çık
  end if;

  -- Mesajı basitçe kaçışla (HTML kırılmasın)
  msg_safe := replace(replace(replace(coalesce(new.mesaj, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');

  subject := coalesce(from_name, 'Bir kullanıcı') || ' size yeni bir teklif gönderdi';
  html :=
    '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto">'
    || '<h2 style="color:#0EA5C4">Yeni teklifin var 🎉</h2>'
    || '<p>Merhaba ' || coalesce(to_name, '') || ',</p>'
    || '<p><b>' || coalesce(from_name, 'Bir kullanıcı') || '</b> sana bir teklif gönderdi.</p>'
    || case when msg_safe <> '' then '<blockquote style="border-left:3px solid #22D3EE;margin:14px 0;padding:8px 14px;color:#444">' || msg_safe || '</blockquote>' else '' end
    || '<p style="margin-top:20px"><a href="' || site_url || '/panel-' || new.to_role || '.html" '
    || 'style="background:#0EA5C4;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:700">Panelinde gör →</a></p>'
    || '<hr style="border:none;border-top:1px solid #eee;margin:22px 0">'
    || '<p style="color:#999;font-size:12px">Bu e-posta Kuryemi Bul tarafından gönderildi.</p></div>';

  perform net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
    body    := jsonb_build_object('from', from_addr, 'to', to_email, 'subject', subject, 'html', html)
  );

  return new;
end;
$$;

drop trigger if exists on_offer_created on public.offers;
create trigger on_offer_created
  after insert on public.offers
  for each row execute function public.notify_offer_email();

-- Test/teşhis: gönderim yanıtlarını görmek için
--   select * from net._http_response order by created desc limit 5;
