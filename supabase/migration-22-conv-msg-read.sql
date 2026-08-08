-- ============================================================
-- Kuryemi Bul — Migration 22: conv_messages okundu işaretleme izni
--
-- SORUN:
--   conv_messages tablosunda RLS açık ve yalnız SELECT + INSERT
--   politikaları tanımlı. UPDATE politikası YOK.
--
--   Hem kök site (markThreadRead) hem www/ SPA (markConvRead)
--   şunu çalıştırıyor:
--       update conv_messages set read_at = now()
--       where conversation_id = ... and sender_user <> auth.uid()
--
--   RLS'te UPDATE politikası olmadığı için bu istek HATA VERMEZ,
--   sadece 0 satır etkiler. Sonuç: read_at hiçbir zaman dolmuyor,
--   okundu bilgisi kalıcı olarak kayboluyor.
--
--   (Okunmamış SAYACI conversations.kurye_unread/employer_unread'de
--   tutulduğu ve o tablonun UPDATE politikası olduğu için rozet
--   çalışmaya devam ediyordu — bu yüzden fark edilmemiş.)
--
-- ÇÖZÜM:
--   Konuşmanın tarafı, KENDİSİNE gelen mesajları okundu işaretleyebilir.
--   Kendi gönderdiği mesajın read_at'ini değiştiremez (karşı tarafın
--   okuyup okumadığını uyduramaz).
--
-- KULLANIM: Supabase → SQL Editor → Run.
-- ============================================================

drop policy if exists conv_msg_update_read on public.conv_messages;
create policy conv_msg_update_read on public.conv_messages
  for update
  using (
    -- Yalnız konuşmanın tarafıyım ve mesajı BEN göndermedim
    sender_user is distinct from auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
    )
  )
  with check (
    sender_user is distinct from auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.kurye_user = auth.uid() or c.employer_user = auth.uid())
    )
  );

-- Doğrulama: politika kuruldu mu?
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'conv_messages'
      and policyname = 'conv_msg_update_read'
  ) then
    raise exception 'conv_msg_update_read kurulamadı';
  end if;
  raise notice 'conv_msg_update_read ✓';
end $$;
