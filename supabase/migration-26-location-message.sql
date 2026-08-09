-- ============================================================================
-- migration-26-location-message.sql   (idempotent)
--
-- KONUM PAYLAŞIMI GERÇEK BİR MESAJ TİPİ OLUYOR
--
-- "Konum Paylaş" butonu bugüne kadar sahteydi: cihazın konumunu hiç okumuyor,
-- yalnızca sabit bir metin gönderiyordu ("📍 Konumumu paylaştım"). Karşı taraf
-- düz yazı görüyor, dokunacak bir şey yok, harita açılmıyordu.
-- Kurye tarafındaki kopyası daha da eksikti — mesajı veritabanına hiç
-- göndermiyor, sadece ekrana bir balon çiziyordu; sayfa yenilenince kayboluyor,
-- işveren hiçbir şey almıyordu.
--
-- Artık koordinatlar mesajın metadata'sında taşınıyor:
--   message_type = 'location'
--   metadata     = { "lat": 41.0082, "lng": 28.9784 }
-- ve istemci bunu haritada açılabilen bir kart olarak çiziyor.
--
-- Bu migration yalnız CHECK kısıtına 'location' ekler. Kısıt olmadan
-- gönderim 23514 (check constraint violation) ile reddedilir — sesli aramada
-- yaşadığımız hatanın aynısı (bkz. migration-24).
-- ============================================================================

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.conv_messages'::regclass
      and contype  = 'c'
      and pg_get_constraintdef(oid) ilike '%message_type%'
  loop
    execute format('alter table public.conv_messages drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.conv_messages
  add constraint conv_messages_message_type_check
  check (message_type in (
    'text','system','profile_card','action','document','webrtc_call','location'
  ));


-- ---------------------------------------------------------------------------
-- Doğrulama
--
--   select pg_get_constraintdef(oid)
--   from pg_constraint
--   where conname = 'conv_messages_message_type_check';
--
-- Çıktıda hem 'webrtc_call' hem 'location' görünmeli.
-- ---------------------------------------------------------------------------
