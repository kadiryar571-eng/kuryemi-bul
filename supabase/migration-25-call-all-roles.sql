-- ============================================================================
-- migration-25-call-all-roles.sql   (idempotent)
--
-- ARAMA BAŞLATMA KISITI KALDIRILDI
--
-- migration-24 ürün kuralı gereği `webrtc_call` eklemeyi konuşmanın
-- işverenine (employer_user) sınırlamıştı: aramayı yalnız esnaf ve kurye
-- firması başlatabiliyor, kurye yalnız gelen aramayı alabiliyordu.
--
-- Bu karar değişti: artık konuşmanın HER İKİ tarafı da arama başlatabilir.
-- Kurye de işvereni arayabilir.
--
-- Politika, migration-24 öncesindeki haline döndürülüyor: tek şart,
-- gönderenin kendisi olması ve konuşmanın tarafı olması. `webrtc_call`
-- artık özel bir muamele görmüyor.
--
-- NOT: migration-24'ün DİĞER yarısı (CHECK kısıtına 'webrtc_call'
-- eklenmesi) YERİNDE KALIYOR — o olmadan arama hiç çalışmaz.
-- Bu dosya yalnız rol kısıtını kaldırır.
-- ============================================================================

drop policy if exists conv_msg_insert_party on public.conv_messages;
create policy conv_msg_insert_party on public.conv_messages for insert with check (
  sender_user = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
  )
);


-- ---------------------------------------------------------------------------
-- Doğrulama
--
--   select * from public.webrtc_diag();
--
-- 'webrtc_call izinli' satırı ok olmalı (CHECK kısıtı yerinde),
-- 'INSERT politikasi' satırının detayı artık "her iki taraf" demeli.
-- ---------------------------------------------------------------------------
create or replace function public.webrtc_diag()
returns table (kontrol text, durum text, detay text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_def text;
  v_pol text;
begin
  select pg_get_constraintdef(oid) into v_def
  from pg_constraint
  where conrelid = 'public.conv_messages'::regclass
    and conname = 'conv_messages_message_type_check';

  kontrol := 'webrtc_call izinli';
  durum   := case when v_def ilike '%webrtc_call%' then 'ok' else 'EKSIK' end;
  detay   := coalesce(v_def, 'kisit bulunamadi');
  return next;

  select with_check into v_pol
  from pg_policies
  where schemaname = 'public' and tablename = 'conv_messages'
    and policyname = 'conv_msg_insert_party';

  kontrol := 'INSERT politikasi';
  durum   := case when v_pol is null then 'EKSIK' else 'ok' end;
  detay   := case
               when v_pol is null then 'politika yok'
               when v_pol ilike '%webrtc_call%' then 'arama baslatma SINIRLI (employer_user)'
               else 'arama baslatma her iki tarafta'
             end;
  return next;

  kontrol := 'Bugune kadarki arama sayisi';
  durum   := 'bilgi';
  detay   := (select count(*)::text from public.conv_messages where message_type = 'webrtc_call');
  return next;
end;
$$;

revoke all on function public.webrtc_diag() from public, anon, authenticated;
