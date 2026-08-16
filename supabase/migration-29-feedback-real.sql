-- ============================================================
-- Kuryemi Bul — Migration 29: Geri bildirim sistemi gerçek veriye bağlanıyor
--
-- SORUN: docs/assets/js/feedback.js (349 satır) Supabase'e HİÇ dokunmuyordu.
-- Her şey localStorage'daydı:
--   • Şikayetler yalnız kullanıcının kendi tarayıcısına yazılıyordu.
--     Kullanıcıya "Şikayet İletildi — Admin ekibi inceleyecektir" deniyor
--     ama hiçbir yöneticiye ulaşmıyordu. Çalıştığı söylenen bir özellik
--     hiç çalışmıyordu.
--   • İtibar puanı ve rozetler localStorage'daki kayıtlardan hesaplanıp
--     ekranda gösteriliyordu (geri-bildirim.html). Yani uydurma veri —
--     CLAUDE.md'deki "YALNIZ Supabase, mock yok" kuralının ihlali.
--
-- KARAR: Yeni bir değerlendirme sistemi KURULMUYOR. Zaten çalışan
-- `reviews` tablosu genişletiliyor; böylece recompute_profile_rating
-- trigger'ı, bildirimler ve RLS aynen devralınıyor. İki paralel sistem
-- yerine tek sistem.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================


-- ============================================================
-- 1. reviews: çok kriterli puanlama + iş bağlantısı + gizleme
--
-- kriterler: feedback.js beş kriterle puanlıyor (dakiklik, iletişim,
--   iş disiplini, bölge hakimiyeti, genel performans — işveren tarafı;
--   kurye tarafında ayrı beş kriter). `puan` bunların ortalamasıdır ve
--   profil ortalamasını besleyen tek alan olarak kalır; kriter kırılımı
--   burada saklanır.
--
-- hiring_id: aynı iki kişi birden fazla iş yapabilir ve her iş ayrı
--   değerlendirilmeli. Eski `unique (reviewer_user, target_id)` buna
--   izin vermiyordu.
--
-- gizli: bir şikayet haklı bulunursa değerlendirme silinmez (denetim izi
--   kalsın) ama gizlenir; ortalamaya da girmez.
-- ============================================================

alter table public.reviews
  add column if not exists kriterler jsonb not null default '{}'::jsonb;

alter table public.reviews
  add column if not exists hiring_id uuid references public.hiring_decisions(id) on delete set null;

alter table public.reviews
  add column if not exists gizli boolean not null default false;

-- Eski tekil kısıt kalkıyor. Adı sürüme göre değişebildiği için
-- kısıtı adıyla değil, tanımıyla buluyoruz.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace ns on ns.oid = rel.relnamespace
     where ns.nspname = 'public' and rel.relname = 'reviews' and con.contype = 'u'
  loop
    execute format('alter table public.reviews drop constraint %I', c.conname);
    raise notice 'reviews üzerindeki eski unique kısıt kaldırıldı: %', c.conname;
  end loop;
end $$;

-- Yeni tekillik: kişi + hedef + İŞ başına tek değerlendirme.
-- hiring_id NULL olabilir (iş bağlantısı olmayan eski/serbest değerlendirme).
-- NULL'lar unique index'te birbirinden farklı sayıldığı için coalesce ile
-- sabit bir sentinel'e indiriyoruz; yoksa aynı çift sınırsız NULL kayıt açardı.
create unique index if not exists reviews_reviewer_target_hiring_idx
  on public.reviews (
    reviewer_user,
    target_id,
    coalesce(hiring_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists reviews_hiring_idx on public.reviews (hiring_id);


-- ============================================================
-- 2. INSERT politikası: hiring_decisions da geçerli sayılsın
--
-- Eski politika YALNIZ kabul edilmiş bir `offers` kaydı arıyordu. Ama
-- geri bildirim akışı `hiring_decisions` üzerinden çalışıyor: kullanıcı
-- işe alınmış (kabul/tamamlandi) ama arada bir teklif kaydı olmayabilir.
-- O durumda RLS değerlendirmeyi reddederdi ve "gönder" sessizce
-- başarısız olurdu.
--
-- Artık iki yoldan biri yeterli: kabul edilmiş teklif VEYA işe alım kararı.
-- ============================================================

drop policy if exists reviews_insert_party on public.reviews;
create policy reviews_insert_party on public.reviews for insert with check (
  reviewer_user = auth.uid()
  and reviewer_profile = (select id from public.profiles where user_id = auth.uid())
  and target_id <> reviewer_profile
  and (
    -- (a) kabul edilmiş teklif
    exists (
      select 1 from public.offers o
      join public.profiles me on me.user_id = auth.uid()
      where o.durum = 'accepted'
        and ((o.from_user = me.id and o.to_user = target_id)
          or (o.to_user = me.id and o.from_user = target_id))
    )
    or
    -- (b) gerçekleşmiş işe alım
    exists (
      select 1 from public.hiring_decisions hd
      join public.profiles me on me.user_id = auth.uid()
      where hd.status in ('kabul', 'tamamlandi')
        and ((hd.employer_id  = me.id and hd.applicant_id = target_id)
          or (hd.applicant_id = me.id and hd.employer_id  = target_id))
    )
  )
);

-- Kullanıcı kendi değerlendirmesini güncelleyebilir ama `gizli` alanını
-- DEĞİŞTİREMEZ — yoksa şikayet üzerine gizlenen yorumu geri açardı.
create or replace function public.guard_review_gizli()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.gizli is distinct from old.gizli then
    -- auth.uid() NULL ise yönetim erişimi (service_role) → serbest.
    -- Gerçek bir kullanıcı oturumu varsa yalnız admin değiştirebilir.
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      new.gizli := old.gizli;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_review_gizli_trg on public.reviews;
create trigger guard_review_gizli_trg
  before update on public.reviews
  for each row execute function public.guard_review_gizli();


-- ============================================================
-- 3. Profil ortalaması gizli değerlendirmeleri saymasın
-- ============================================================

create or replace function public.recompute_profile_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare tgt uuid;
begin
  tgt := coalesce(new.target_id, old.target_id);
  update public.profiles set
    puan = coalesce((
      select round(avg(puan)::numeric, 2) from public.reviews
       where target_id = tgt and gizli = false
    ), 0),
    degerlendirme = (
      select count(*) from public.reviews
       where target_id = tgt and gizli = false
    )
  where id = tgt;
  return coalesce(new, old);
end $$;

-- Trigger zaten var (on_review_change); create or replace function onu
-- yerinde günceller. Yine de varlığını doğrulayalım.
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgname = 'on_review_change'
       and tgrelid = 'public.reviews'::regclass
       and not tgisinternal
  ) then
    create trigger on_review_change
      after insert or update or delete on public.reviews
      for each row execute function public.recompute_profile_rating();
    raise notice 'on_review_change yeniden kuruldu';
  end if;
end $$;


-- ============================================================
-- 4. ŞİKAYETLER — public.review_reports
--
-- Kullanıcı bir değerlendirmeyi şikayet ettiğinde buraya yazılır.
-- Yönetici panelden okur (admin-api → service_role) ve karara bağlar.
-- ============================================================

create table if not exists public.review_reports (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid not null references public.reviews(id) on delete cascade,
  reporter_user    uuid not null references auth.users(id) on delete cascade,
  reporter_profile uuid references public.profiles(id) on delete set null,
  reason           text not null check (length(btrim(reason)) > 0),
  durum            text not null default 'pending'
                   check (durum in ('pending', 'resolved', 'dismissed')),
  admin_note       text,
  resolved_by      uuid references auth.users(id) on delete set null,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now(),
  -- Aynı kişi aynı değerlendirmeyi bir kez şikayet eder
  unique (review_id, reporter_user)
);

create index if not exists review_reports_durum_idx
  on public.review_reports (durum, created_at asc);
create index if not exists review_reports_review_idx
  on public.review_reports (review_id);

alter table public.review_reports enable row level security;

-- Şikayet eden kendi kaydını görür ve oluşturur. Başkasınınkini göremez;
-- karar verme yetkisi yok (durum'u yalnız yönetim değiştirir).
drop policy if exists review_reports_insert_own on public.review_reports;
create policy review_reports_insert_own on public.review_reports for insert with check (
  reporter_user = auth.uid()
  and reporter_profile = (select id from public.profiles where user_id = auth.uid())
  and durum = 'pending'
);

drop policy if exists review_reports_select_own on public.review_reports;
create policy review_reports_select_own on public.review_reports for select using (
  reporter_user = auth.uid()
);

-- UPDATE/DELETE politikası YOK → kullanıcı kendi şikayetini sonradan
-- değiştiremez/silemez. Yönetim service_role ile erişir (RLS baypas).


-- ============================================================
-- 5. DOĞRULAMA
-- ============================================================

do $$
declare n int;
begin
  select count(*) into n from information_schema.columns
   where table_schema = 'public' and table_name = 'reviews'
     and column_name in ('kriterler', 'hiring_id', 'gizli');
  if n <> 3 then
    raise exception 'reviews üzerinde beklenen 3 kolon yok (bulunan: %)', n;
  end if;
  raise notice 'reviews: kriterler + hiring_id + gizli ✓';

  select count(*) into n from pg_policies
   where schemaname = 'public' and tablename = 'review_reports';
  if n <> 2 then
    raise exception 'review_reports üzerinde 2 policy olmalı (bulunan: %)', n;
  end if;
  raise notice 'review_reports: insert + select policy ✓ (update/delete yok)';

  raise notice 'Migration 29 tamam.';
end $$;
