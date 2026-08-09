-- ============================================================================
-- migration-24-webrtc-call.sql   (idempotent)
--
-- !! GÜNCEL DEĞİL: aşağıdaki 2. madde (aramayı yalnız işveren başlatır)
--    migration-25-call-all-roles.sql ile KALDIRILDI. Artık konuşmanın her
--    iki tarafı da arama başlatabilir. 1. madde (CHECK kısıtına
--    'webrtc_call' eklenmesi) geçerliliğini koruyor — o olmadan arama
--    hiç çalışmaz. Bu dosya tarihsel kayıt olarak duruyor.
--
-- 1) SESLİ/GÖRÜNTÜLÜ ARAMA HİÇ ÇALIŞMIYORDU
--
--    webrtc.js aramayı başlatırken teklifi (SDP offer) conv_messages tablosuna
--    `message_type = 'webrtc_call'` olarak yazıyor. Ama tablodaki CHECK kısıtı
--    yalnız şunlara izin veriyordu:
--
--      'text', 'system', 'profile_card', 'action', 'document'
--
--    'webrtc_call' listede olmadığı için her arama denemesi kısıt ihlaliyle
--    reddediliyordu. startCall()'daki .catch() _cleanup() çağırıyor, arama
--    ekranı açılır açılmaz kapanıyordu. Kullanıcının gördüğü belirti:
--    "arıyorum, 2 saniye sonra ekran kendiliğinden kapanıyor".
--
--    Emülatör ↔ telefon testinde yakalandı: karşı tarafa hiçbir sinyal
--    ulaşmıyor, veritabanında tek bir webrtc_call satırı bile yok.
--
-- 2) ARAMAYI YALNIZ İŞVEREN BAŞLATABİLİR
--
--    Ürün kuralı: aramayı esnaf ve kurye firması başlatır; kurye yalnız
--    gelen aramayı alır. Sadece teklif conv_messages'tan geçtiği için
--    (cevap ve ICE trafiği Realtime broadcast ile akar) bu kuralı tek bir
--    INSERT politikasıyla uygulamak yeterli.
--
--    İstemci tarafında da kuryenin arama butonu kaldırıldı; buradaki kural
--    onun yedeği: arayüz atlansa bile veritabanı reddeder.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1) message_type kısıtına 'webrtc_call' ekle
--
-- Kısıt satır içinde tanımlandığı için adı otomatik üretilmiş olabilir;
-- sabit ada güvenmek yerine katalogdan bulup düşürüyoruz.
-- ---------------------------------------------------------------------------
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
  check (message_type in ('text','system','profile_card','action','document','webrtc_call'));


-- ---------------------------------------------------------------------------
-- 2) INSERT politikası: webrtc_call yalnız konuşmanın işvereninden
--
-- Diğer mesaj tipleri için davranış değişmiyor — iki taraf da yazabilir.
-- ---------------------------------------------------------------------------
drop policy if exists conv_msg_insert_party on public.conv_messages;
create policy conv_msg_insert_party on public.conv_messages for insert with check (
  sender_user = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
  )
  -- Arama başlatma yalnız işverende (esnaf / kurye firması).
  and (
    message_type <> 'webrtc_call'
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.employer_user = auth.uid()
    )
  )
);


-- ---------------------------------------------------------------------------
-- 3) Doğrulama
--
--   select * from public.webrtc_diag();
--
-- 'webrtc_call izinli' satırı ok değilse arama yine çalışmaz.
-- ---------------------------------------------------------------------------
create or replace function public.webrtc_diag()
returns table (kontrol text, durum text, detay text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_def text;
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.conv_messages'::regclass
    and conname = 'conv_messages_message_type_check';

  kontrol := 'webrtc_call izinli';
  durum   := case when v_def ilike '%webrtc_call%' then 'ok' else 'EKSIK' end;
  detay   := coalesce(v_def, 'kisit bulunamadi');
  return next;

  kontrol := 'INSERT politikasi';
  durum   := case when exists (
                    select 1 from pg_policies
                    where schemaname = 'public' and tablename = 'conv_messages'
                      and policyname = 'conv_msg_insert_party'
                  ) then 'ok' else 'EKSIK' end;
  detay   := 'arama baslatma yalniz employer_user';
  return next;

  kontrol := 'Bugune kadarki arama sayisi';
  durum   := 'bilgi';
  detay   := (select count(*)::text from public.conv_messages where message_type = 'webrtc_call');
  return next;
end;
$$;

revoke all on function public.webrtc_diag() from public, anon, authenticated;
