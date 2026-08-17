-- ============================================================
-- Kuryemi Bul — Migration 33: profiles.acik_ilan hiç güncellenmiyordu
--
-- SORUN: Esnaf havuzu kartlarındaki "N açık ilan" rozeti hiç görünmüyor.
--
-- SEBEP: `profiles.acik_ilan` denormalize bir sayaç (schema.sql:35,
-- `int default 0`) ve şemada onu GÜNCELLEYEN HİÇBİR ŞEY YOK. Ne trigger,
-- ne RPC, ne de istemci tarafı bir yazma. Yani sütun herkes için kalıcı
-- olarak 0:
--
--   isletmeCard()  → (acikIlan > 0 ? '<span class="chip">N açık ilan</span>' : '')
--                    koşul hiçbir zaman sağlanmıyor, rozet hiç basılmıyor
--   profiles_public view'ı da bu ölü sütunu dışarı veriyor (migration-20)
--
-- Karşılaştırma: `listings.sahip_ad` aynı desende denormalize bir kolon
-- ama ONUN trigger'ı var (migration-20 → kb_listing_owner_name). Bu
-- sayaç sadece unutulmuş.
--
-- NEDEN İSTEMCİDE HESAPLANMIYOR: havuzda N profil için N ayrı count
-- sorgusu demek olurdu. Ayrıca misafir `listings`'e join yapamıyor
-- (migration-20 daralttı) — sayacın sunucuda tutulmasının sebebi bu.
--
-- GUARD İLE ÇAKIŞMA YOK: guard_profile_metrics (migration-20) yalnız
-- puan/degerlendirme/tamamlanan/seviye alanlarını kilitliyor; acik_ilan
-- listede değil. Ayrıca `pg_trigger_depth() > 1` olduğunda zaten serbest
-- bırakıyor — bu trigger o yoldan yazıyor.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================


-- ============================================================
-- 1. TRIGGER — listings değişince sahibinin sayacını tazele
-- ============================================================

create or replace function public.sync_profile_acik_ilan()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_eski uuid := null;
  v_yeni uuid := null;
begin
  -- NEW/OLD'a yalnız var oldukları işlemlerde dokunulur; DELETE'te NEW'e
  -- erişmek PL/pgSQL'de hata verir, o yüzden CASE değil açık IF.
  if TG_OP = 'DELETE' or TG_OP = 'UPDATE' then
    v_eski := old.owner_id;
  end if;
  if TG_OP = 'INSERT' or TG_OP = 'UPDATE' then
    v_yeni := new.owner_id;
  end if;

  -- Sahip değişmediyse tek profil, değiştiyse iki profil tazelenir.
  update public.profiles p
     set acik_ilan = (select count(*)::int
                        from public.listings l
                       where l.owner_id = p.id
                         and l.durum = 'acik')
   where p.id in (v_eski, v_yeni);      -- NULL'lar eşleşmez, ayrıca elemeye gerek yok

  return null;                          -- AFTER trigger; dönüş değeri yok sayılır
end $$;

drop trigger if exists kb_profile_acik_ilan on public.listings;
create trigger kb_profile_acik_ilan
  after insert or delete or update of durum, owner_id on public.listings
  for each row execute function public.sync_profile_acik_ilan();


-- ============================================================
-- 2. GEÇMİŞİ ONAR — mevcut tüm profiller için sayacı hesapla
--
-- Trigger yalnız bundan sonraki değişiklikleri yakalar. Halihazırdaki
-- ilanlar için sayaç 0'da kalmış durumda.
-- ============================================================

update public.profiles p
   set acik_ilan = k.adet
  from (
    select p2.id, (select count(*)::int
                     from public.listings l
                    where l.owner_id = p2.id and l.durum = 'acik') as adet
      from public.profiles p2
  ) k
 where k.id = p.id
   and p.acik_ilan is distinct from k.adet;


-- ============================================================
-- 3. DOĞRULAMA
-- ============================================================

do $$
declare
  sapan   int;
  trg_var boolean;
  dolu    int;
begin
  -- Hiçbir profilde sayaç gerçek değerden sapmamalı
  select count(*) into sapan
    from public.profiles p
   where coalesce(p.acik_ilan, -1) <> (
     select count(*)::int from public.listings l
      where l.owner_id = p.id and l.durum = 'acik'
   );

  if sapan > 0 then
    raise exception 'Sayaci hatali % profil kaldi', sapan;
  end if;

  select exists (
    select 1 from pg_trigger
     where tgname = 'kb_profile_acik_ilan'
       and tgrelid = 'public.listings'::regclass
       and not tgisinternal
  ) into trg_var;

  if not trg_var then
    raise exception 'Trigger kurulmadi';
  end if;

  select count(*) into dolu from public.profiles where acik_ilan > 0;

  raise notice 'Trigger kuruldu ✓';
  raise notice 'Sayaci hatali profil: 0 ✓';
  raise notice 'Acik ilani olan profil sayisi: %', dolu;
  raise notice 'Migration 33 tamam.';
end $$;
