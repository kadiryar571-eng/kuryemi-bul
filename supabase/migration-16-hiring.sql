-- ============================================================
-- Kuryemi Bul — Migration 16: İşe alım omurgası
-- interviews + hiring_decisions + onboarding
-- ÖN KOŞUL: migration-06 (listings, applications) ÖNCE çalıştırılmalı.
-- KULLANIM: Supabase → SQL Editor → Run. İdempotent.
-- ============================================================

-- ── 1) GÖRÜŞMELER (interviews) ──────────────────────────────────
create table if not exists public.interviews (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid references public.listings(id) on delete set null,
  application_id  uuid references public.applications(id) on delete set null,
  interviewer_id  uuid not null references public.profiles(id) on delete cascade,
  interviewee_id  uuid not null references public.profiles(id) on delete cascade,
  date            date,
  time            text,
  type            text default 'yüz yüze' check (type in ('yüz yüze','online')),
  location        text default '',
  status          text not null default 'bekliyor'
                  check (status in ('bekliyor','onaylandi','yeniden_planlandi','tamamlandi','iptal')),
  reschedule_req  jsonb,         -- { date, time, type, location, reason }
  post_note       text,
  decision        text,          -- 'kabul' | 'red' | 'sonraki_asama'
  reminder_sent   boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists interviews_interviewer_idx  on public.interviews(interviewer_id);
create index if not exists interviews_interviewee_idx  on public.interviews(interviewee_id);
create index if not exists interviews_status_idx       on public.interviews(status);
alter table public.interviews enable row level security;

-- Taraflar görebilir
drop policy if exists interviews_select on public.interviews;
create policy interviews_select on public.interviews for select using (
  interviewer_id = (select id from public.profiles where user_id = auth.uid())
  or
  interviewee_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists interviews_insert on public.interviews;
create policy interviews_insert on public.interviews for insert with check (
  interviewer_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists interviews_update on public.interviews;
create policy interviews_update on public.interviews for update using (
  interviewer_id = (select id from public.profiles where user_id = auth.uid())
  or
  interviewee_id = (select id from public.profiles where user_id = auth.uid())
);

-- ── 2) İŞE ALIM KARARLARI (hiring_decisions) ─────────────────────
create table if not exists public.hiring_decisions (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid references public.listings(id) on delete set null,
  application_id  uuid references public.applications(id) on delete set null,
  interview_id    uuid references public.interviews(id) on delete set null,
  employer_id     uuid not null references public.profiles(id) on delete cascade,
  applicant_id    uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'beklemede'
                  check (status in ('beklemede','kisa_listede','mulakat_planli','kabul','reddedildi','tamamlandi')),
  note            text,
  reason          text,       -- red gerekçesi
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create unique index if not exists hiring_decisions_pair_idx
  on public.hiring_decisions(listing_id, applicant_id) where listing_id is not null;
alter table public.hiring_decisions enable row level security;

drop policy if exists hd_select on public.hiring_decisions;
create policy hd_select on public.hiring_decisions for select using (
  employer_id = (select id from public.profiles where user_id = auth.uid())
  or
  applicant_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists hd_insert on public.hiring_decisions;
create policy hd_insert on public.hiring_decisions for insert with check (
  employer_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists hd_update on public.hiring_decisions;
create policy hd_update on public.hiring_decisions for update using (
  employer_id = (select id from public.profiles where user_id = auth.uid())
);

-- ── 3) ONBOARDING ────────────────────────────────────────────────
create table if not exists public.onboarding (
  id              uuid primary key default gen_random_uuid(),
  decision_id     uuid not null references public.hiring_decisions(id) on delete cascade,
  employer_id     uuid not null references public.profiles(id) on delete cascade,
  applicant_id    uuid not null references public.profiles(id) on delete cascade,
  start_date      date,
  start_point     text,
  contact_person  text,
  contact_phone   text,
  work_details    text,
  first_day_notes text,
  completed       boolean default false,
  completed_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.onboarding enable row level security;

drop policy if exists onboarding_select on public.onboarding;
create policy onboarding_select on public.onboarding for select using (
  employer_id = (select id from public.profiles where user_id = auth.uid())
  or
  applicant_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists onboarding_insert on public.onboarding;
create policy onboarding_insert on public.onboarding for insert with check (
  employer_id = (select id from public.profiles where user_id = auth.uid())
);
drop policy if exists onboarding_update on public.onboarding;
create policy onboarding_update on public.onboarding for update using (
  employer_id = (select id from public.profiles where user_id = auth.uid())
  or
  applicant_id = (select id from public.profiles where user_id = auth.uid())
);

-- ── 4) Realtime ──────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.interviews;
exception when duplicate_object then null; when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.hiring_decisions;
exception when duplicate_object then null; when others then null; end $$;

-- ── 5) Trigger: updated_at otomatik güncelle ──────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists interviews_updated_at on public.interviews;
create trigger interviews_updated_at
  before update on public.interviews for each row execute function public.set_updated_at();

drop trigger if exists hd_updated_at on public.hiring_decisions;
create trigger hd_updated_at
  before update on public.hiring_decisions for each row execute function public.set_updated_at();

-- ── 6) Bildirim trigger: karar verilince adaya bildir ────────────
create or replace function public.notify_on_decision()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body  text;
  v_type  text := 'karar';
begin
  if new.status = old.status then return new; end if;
  if new.status = 'kabul' then
    v_title := 'İşe Kabul!';
    v_body  := 'Başvurunuz kabul edildi. İşe başlangıç bilgilerinizi kontrol edin.';
  elsif new.status = 'reddedildi' then
    v_title := 'Başvuru Sonucu';
    v_body  := 'Başvurunuz değerlendirildi ve bu pozisyon için uygun görülmedi.';
  elsif new.status = 'mulakat_planli' then
    v_title := 'Mülakat Daveti';
    v_body  := 'Sizi bir görüşmeye davet ettik. Görüşmeler sayfasını kontrol edin.';
    v_type  := 'gorusme';
  else
    return new;
  end if;
  perform public.push_to_profile(new.applicant_id, v_type, v_title, v_body, '/gorusmeler.html');
  return new;
end $$;

drop trigger if exists notify_decision on public.hiring_decisions;
create trigger notify_decision
  after update on public.hiring_decisions for each row execute function public.notify_on_decision();

-- ── 7) Bildirim trigger: görüşme onaylandığında ──────────────────
create or replace function public.notify_on_interview()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body  text;
begin
  if new.status = old.status then return new; end if;
  if new.status = 'onaylandi' then
    v_title := 'Görüşme Onaylandı';
    v_body  := 'Görüşme davetiniz onaylandı. Tarih: ' || coalesce(new.date::text, '—');
  elsif new.status = 'yeniden_planlandi' then
    v_title := 'Yeniden Planlama Talebi';
    v_body  := 'Görüşme için yeni tarih talebi geldi.';
  elsif new.status = 'tamamlandi' then
    v_title := 'Görüşme Tamamlandı';
    v_body  := 'Görüşmeniz tamamlandı. Karar bekleniyor.';
  else
    return new;
  end if;
  perform public.push_to_profile(new.interviewee_id, 'gorusme', v_title, v_body, '/gorusmeler.html');
  return new;
end $$;

drop trigger if exists notify_interview on public.interviews;
create trigger notify_interview
  after update on public.interviews for each row execute function public.notify_on_interview();
