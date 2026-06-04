-- ============================================================
-- Kuryemi Bul — Migration 09: Admin & KYC onay paneli
-- admins tablosu + is_admin() + review_kyc()/list_pending_kyc() RPC.
-- guard_dogrulama adminlere izin verecek şekilde güncellenir.
-- KULLANIM: Supabase → SQL Editor → Run. Sonra KENDİNİ admin yap (en altta).
-- ============================================================

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
drop policy if exists admins_self on public.admins;
create policy admins_self on public.admins for select using (user_id = auth.uid());

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = uid);
$$;

-- Guard: adminler dogrulama'yı değiştirebilir (kullanıcılar yine yapamaz)
create or replace function public.guard_dogrulama()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dogrulama is distinct from old.dogrulama then
    if auth.uid() is not null and new.dogrulama <> 'pending' and not public.is_admin(auth.uid()) then
      new.dogrulama := old.dogrulama;
    end if;
  end if;
  return new;
end $$;

-- KYC kararı (yalnız admin)
create or replace function public.review_kyc(p_profile_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'yetki yok'; end if;
  if p_decision not in ('verified','rejected') then raise exception 'gecersiz karar'; end if;
  update public.profiles set dogrulama = p_decision where id = p_profile_id;
  update public.kyc_submissions set durum = p_decision where profile_id = p_profile_id;
end $$;
revoke all on function public.review_kyc(uuid, text) from public;
grant execute on function public.review_kyc(uuid, text) to authenticated;

-- Bekleyen KYC listesi (yalnız admin; PII döner)
create or replace function public.list_pending_kyc()
returns table (profile_id uuid, ad text, role text, ad_soyad text, tc_no text, belge_turu text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'yetki yok'; end if;
  return query
    select k.profile_id, p.ad, p.role, k.ad_soyad, k.tc_no, k.belge_turu, k.created_at
    from public.kyc_submissions k
    join public.profiles p on p.id = k.profile_id
    where k.durum = 'pending'
    order by k.created_at asc;
end $$;
revoke all on function public.list_pending_kyc() from public;
grant execute on function public.list_pending_kyc() to authenticated;

-- ============================================================
-- KENDİNİ ADMİN YAP:
-- 1) Sitede bir hesapla kayıt ol + e-postanı doğrula (ya da mevcut hesabın).
-- 2) Supabase → Authentication → Users → o kullanıcının ID'sini kopyala.
-- 3) Şunu çalıştır:
--    insert into public.admins (user_id) values ('BURAYA_USER_ID') on conflict do nothing;
-- ============================================================
