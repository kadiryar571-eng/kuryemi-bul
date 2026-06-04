-- ============================================================
-- Kuryemi Bul — Migration 08: KYC / Kimlik Doğrulama
-- profiles.dogrulama (none|pending|verified|rejected) + korumalı kyc_submissions.
-- Kullanıcı kendini 'verified' YAPAMAZ (guard trigger). Onay: admin / Supabase paneli.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- Profil doğrulama durumu
alter table public.profiles add column if not exists dogrulama text not null default 'none';
do $$ begin
  alter table public.profiles add constraint profiles_dogrulama_chk check (dogrulama in ('none','pending','verified','rejected'));
exception when duplicate_object then null; end $$;

-- KYC başvuruları (hassas PII — yalnız sahip görür)
create table if not exists public.kyc_submissions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  ad_soyad    text not null,
  tc_no       text not null,
  belge_turu  text default '',
  not_text    text default '',
  durum       text not null default 'pending' check (durum in ('pending','verified','rejected')),
  created_at  timestamptz default now(),
  unique (user_id)
);
alter table public.kyc_submissions enable row level security;

drop policy if exists kyc_select_own on public.kyc_submissions;
create policy kyc_select_own on public.kyc_submissions for select using (user_id = auth.uid());
drop policy if exists kyc_insert_own on public.kyc_submissions;
create policy kyc_insert_own on public.kyc_submissions for insert with check (
  user_id = auth.uid() and profile_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists kyc_update_own on public.kyc_submissions;
create policy kyc_update_own on public.kyc_submissions for update using (user_id = auth.uid());

-- KYC eklenince/güncellenince profili 'pending' yap
create or replace function public.on_kyc_submit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set dogrulama = 'pending'
    where id = new.profile_id and dogrulama in ('none','rejected');
  return new;
end $$;
drop trigger if exists kyc_submit_trg on public.kyc_submissions;
create trigger kyc_submit_trg after insert or update on public.kyc_submissions
  for each row execute function public.on_kyc_submit();

-- GUARD: kullanıcı dogrulama'yı kendisi 'verified' yapamasın.
-- İzin: service role / panel (auth.uid() null) her şeyi; kullanıcı yalnız 'pending'e geçişi.
create or replace function public.guard_dogrulama()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.dogrulama is distinct from old.dogrulama then
    if auth.uid() is not null and new.dogrulama <> 'pending' then
      new.dogrulama := old.dogrulama;  -- kullanıcının verified/rejected denemesini geri al
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_dogrulama_trg on public.profiles;
create trigger guard_dogrulama_trg before update on public.profiles
  for each row execute function public.guard_dogrulama();

-- ONAY: kullanıcıyı doğrulamak için (admin/panelden):
--   update public.profiles set dogrulama = 'verified' where id = '<PROFIL_ID>';
--   update public.kyc_submissions set durum = 'verified' where profile_id = '<PROFIL_ID>';
-- Bitti. Yeni tablo: public.kyc_submissions ; yeni sütun: profiles.dogrulama
