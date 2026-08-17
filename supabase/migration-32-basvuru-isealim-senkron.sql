-- ============================================================
-- Kuryemi Bul — Migration 32: başvuru kabulü işe alım kaydı oluşturmuyordu
--
-- SORUN: Kuryeyi işe alıyorsun ama Geri Bildirim sayfasında "Tamamlanan
-- İşe Alımlar" listesi boş kalıyor, değerlendirme yazamıyorsun.
--
-- SEBEP: Değerlendirme yalnız gerçek bir işe alım kaydı varsa yapılabilir
-- (feedback.js → canSubmit, hiring_decisions.status in ('kabul','tamamlandi')).
-- Ama `applications.durum = 'accepted'` yapmak o kaydı OLUŞTURMUYORDU.
-- Senkron tek yönlüydü:
--
--   karar ekranı (karar.html → KBHiring.makeDecision)
--     → hiring_decisions YAZILIR + applications.durum güncellenir  ✓
--
--   başvurular ekranı (basvurular.html, app.js)
--     → yalnız applications.durum güncellenir, karar kaydı YOK      ✗
--
--   mobil uygulama (www/screens/firma.js)
--     → yalnız applications.durum; www/ hiring_decisions'ı HİÇ BİLMİYOR ✗
--
-- Yani işe alımı hangi ekrandan yaptığına göre değerlendirme açılıyor ya
-- da açılmıyordu.
--
-- NEDEN İSTEMCİDE DEĞİL, VERİTABANINDA ÇÖZÜLÜYOR:
-- Üç ayrı kabul yolu var ve biri APK'nın içinde. docs/ düzeltmesi mobil
-- uygulamaya yansımaz (CLAUDE.md: iki bağımsız uygulama); APK'yı yeniden
-- derleyip kullanıcıya güncelleme dağıtmak gerekirdi. Trigger hepsini
-- tek noktadan kapatır — bugünkü, yarınki ve Studio'dan elle yapılan
-- her kabul dahil.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================


-- ============================================================
-- 1. TRIGGER — applications.durum → hiring_decisions
-- ============================================================

create or replace function public.sync_hiring_from_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
  v_hedef    text;
begin
  -- Durum değişmediyse işimiz yok
  if new.durum is not distinct from old.durum then
    return new;
  end if;

  -- Yalnız nihai kararlar karşılık üretir
  if new.durum not in ('accepted', 'rejected') then
    return new;
  end if;

  -- İlansız başvuru olamaz ama savunmacı davran: kısmi index'in yüklemi
  -- (listing_id is not null) aşağıdaki ON CONFLICT için de şart.
  if new.listing_id is null then
    return new;
  end if;

  select owner_id into v_owner_id from public.listings where id = new.listing_id;
  if v_owner_id is null then
    return new;                     -- ilan silinmiş; karar kaydı açmanın anlamı yok
  end if;

  v_hedef := case new.durum when 'accepted' then 'kabul' else 'reddedildi' end;

  -- DİKKAT — KISMI INDEX:
  -- hiring_decisions_pair_idx şöyle tanımlı:
  --   on hiring_decisions(listing_id, applicant_id) where listing_id is not null
  -- Kısmi bir unique index'i ON CONFLICT ile kullanmak için index'in
  -- YÜKLEMİNİ de yazmak zorunludur; yoksa Postgres index'i çıkarsayamaz ve
  -- "there is no unique or exclusion constraint matching the ON CONFLICT
  -- specification" (42P10) hatası verir. migration-29'da bu atlanmıştı ve
  -- değerlendirme gönderimi tamamen çalışmıyordu; aynı tuzağa düşmüyoruz.
  insert into public.hiring_decisions
    (listing_id, application_id, employer_id, applicant_id, status)
  values
    (new.listing_id, new.id, v_owner_id, new.applicant_id, v_hedef)
  on conflict (listing_id, applicant_id) where listing_id is not null
  do update set
    -- 'tamamlandi' bir ilerlemedir; 'kabul' onu geri almasın.
    -- Mevcut satıra ŞEMA ADI OLMADAN erişilir (hiring_decisions.status);
    -- public.hiring_decisions.status yazımı bu bağlamda geçerli değil.
    status = case
               when excluded.status = 'kabul'
                    and hiring_decisions.status = 'tamamlandi'
               then 'tamamlandi'
               else excluded.status
             end,
    application_id = coalesce(hiring_decisions.application_id,
                             excluded.application_id),
    updated_at = now();

  return new;
end $$;

drop trigger if exists kb_sync_hiring_from_application on public.applications;
create trigger kb_sync_hiring_from_application
  after update on public.applications
  for each row execute function public.sync_hiring_from_application();


-- ============================================================
-- 2. GEÇMİŞİ ONAR
--
-- Trigger yalnız bundan sonraki kabulleri yakalar. Halihazırda kabul
-- edilmiş ama karar kaydı olmayan başvurular için de kayıt açılır —
-- yoksa "zaten işe aldığım kurye" hâlâ değerlendirmeye düşmezdi.
-- ============================================================

insert into public.hiring_decisions
  (listing_id, application_id, employer_id, applicant_id, status)
select a.listing_id, a.id, l.owner_id, a.applicant_id,
       case a.durum when 'accepted' then 'kabul' else 'reddedildi' end
  from public.applications a
  join public.listings l on l.id = a.listing_id
 where a.durum in ('accepted', 'rejected')
   and a.listing_id is not null
   and not exists (
     select 1 from public.hiring_decisions hd
      where hd.listing_id = a.listing_id
        and hd.applicant_id = a.applicant_id
   )
on conflict (listing_id, applicant_id) where listing_id is not null
do nothing;


-- ============================================================
-- 3. DOĞRULAMA
-- ============================================================

do $$
declare
  eksik      int;
  kabul_sayi int;
  trg_var    boolean;
begin
  -- Kabul/ret edilmiş her başvurunun karar kaydı olmalı
  select count(*) into eksik
    from public.applications a
   where a.durum in ('accepted', 'rejected')
     and a.listing_id is not null
     and exists (select 1 from public.listings l where l.id = a.listing_id)
     and not exists (
       select 1 from public.hiring_decisions hd
        where hd.listing_id = a.listing_id and hd.applicant_id = a.applicant_id
     );

  if eksik > 0 then
    raise exception 'Karar kaydi olmayan % basvuru kaldi', eksik;
  end if;

  select exists (
    select 1 from pg_trigger
     where tgname = 'kb_sync_hiring_from_application'
       and tgrelid = 'public.applications'::regclass
       and not tgisinternal
  ) into trg_var;

  if not trg_var then
    raise exception 'Trigger kurulmadi';
  end if;

  select count(*) into kabul_sayi from public.hiring_decisions
   where status in ('kabul', 'tamamlandi');

  raise notice 'Trigger kuruldu ✓';
  raise notice 'Karar kaydi eksik basvuru: 0 ✓';
  raise notice 'Degerlendirmeye acik ise alim sayisi: %', kabul_sayi;
  raise notice 'Migration 32 tamam.';
end $$;


-- ============================================================
-- NOT — ÇİFT BİLDİRİM
--
-- Kabul edilen başvuru artık iki bildirim üretiyor:
--   trg_application_update      → "Başvurun kabul edildi ✓"
--   notify_on_decision_insert   → "İşe Kabul! ..."
--
-- Bu YENİ bir davranış değil: karar ekranından karar verildiğinde zaten
-- ikisi birden gidiyordu. Trigger yalnız bunu tutarlı hale getiriyor —
-- artık hangi ekrandan kabul edilirse aynı iki bildirim gidiyor.
--
-- Rahatsız ediciyse doğru çözüm trg_application_update'i susturmak
-- (daha genel olan karar bildirimi kalsın), ama bu ayrı bir karar;
-- burada davranış değiştirilmedi.
-- ============================================================
