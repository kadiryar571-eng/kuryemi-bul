-- ============================================================
-- Kuryemi Bul — Migration 15: Admin KYC geçmişi RPC
-- Onaylanmış ve reddedilmiş KYC başvurularını listeler.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ÖN KOŞUL: migration-09 (is_admin fonksiyonu) çalışmış olmalı.
-- ============================================================

create or replace function public.list_kyc_history()
returns table (
  profile_id  uuid,
  ad          text,
  role        text,
  ad_soyad    text,
  tc_no       text,
  belge_turu  text,
  durum       text,
  created_at  timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'yetki yok'; end if;
  return query
    select k.profile_id, p.ad, p.role, k.ad_soyad, k.tc_no, k.belge_turu, k.durum, k.created_at
    from public.kyc_submissions k
    join public.profiles p on p.id = k.profile_id
    where k.durum in ('verified', 'rejected')
    order by k.created_at desc;
end $$;

revoke all on function public.list_kyc_history() from public;
grant execute on function public.list_kyc_history() to authenticated;

-- Bitti. Yeni RPC: list_kyc_history()
