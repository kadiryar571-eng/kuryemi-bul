-- ============================================================
-- Kuryemi Bul — Migration 39: profil formlarının kalan 12 kolonu
--                              + şehir değerlerinin tek seferlik temizliği
--
-- 1) SORUN (canlıda ölçüldü, 2026-10-13):
--    docs/profil-duzenle.html'deki "Çalışma Bilgileri" (wiCollect) ve
--    "Araç Bilgileri" (abCollect) formları aşağıdaki 12 alanı
--    public.profiles'a yazıyor ama kolonlar YOK. migration-35 aynı
--    formlar için 7 kolon eklemişti; bu 12'si gözden kaçmıştı.
--    PostgREST tek UPDATE'i bütünüyle reddediyor (PGRST204) — aynı
--    istekteki VAR olan gunluk_saat / arac_marka / plaka da yazılmıyor,
--    hata arayüzde yutuluyordu. İki form hiç kaydetmiyordu.
--
--    Tipler arayüzden: çoklu seçimler (teslimat_turu, vardiya_tercihi,
--    ehliyet_sinifi) JSON.stringify edilmiş METİN gönderiliyor; tekli
--    seçimler düz metin; belge_* onay kutuları boolean.
--
-- 2) ŞEHİR: profil ve ilan formlarında şehir artık 81 il listesinden
--    seçiliyor (www/assets/js/util.js, docs/assets/js/components.js).
--    Eski serbest metin kayıtları ("istanbul", "Mugla", "dsadad") burada
--    bir kez resmi il adına çevrilir; tanınmayanlar boşaltılır.
--    Anahtar fonksiyonu util.js'teki _ilAnahtar ile birebir aynı sonucu
--    verir (252 yazım üzerinde karşılaştırıldı). Eşleme tablosu util.js
--    listesinden üretildi — elle yazılmadı.
--    Ölçülen etki: profiles 2 satır, listings 3 satır.
--    Sadece sehir değişiyor: hiçbir bildirim tetikleyicisi bu kolona
--    bağlı değil (kb_listing_match yalnız INSERT, diğerleri ad/owner_id/
--    durum/dogrulama).
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent (tekrar çalıştırılabilir).
-- ============================================================

begin;

-- ── 1) Eksik profil kolonları ───────────────────────────────────────
alter table public.profiles
  add column if not exists calisma_modeli   text default '',
  add column if not exists teslimat_turu    text default '[]',
  add column if not exists deneyim_seviye   text default '',
  add column if not exists mevcut_durum     text default '',
  add column if not exists vardiya_tercihi  text default '[]',
  add column if not exists arac_tipi        text default '',
  add column if not exists ehliyet_sinifi   text default '[]',
  add column if not exists arac_sahiplik    text default '',
  add column if not exists sigorta_durumu   text default '',
  add column if not exists belge_ruhsat     boolean not null default false,
  add column if not exists belge_sigorta    boolean not null default false,
  add column if not exists belge_ehliyet    boolean not null default false;

-- NOT: public.profiles_public görünümü açık kolon listesi kullanıyor
-- (migration-20) — bu kolonlar misafire açılmaz.

-- ── 2) Şehir temizliği ─────────────────────────────────────────────
create or replace function pg_temp.il_anahtar(s text) returns text
language sql immutable as $$
  select regexp_replace(
           lower(translate(coalesce(s, ''), 'İIıÇĞÖŞÜÂÎÛçğöşüâîû', 'iiicgosuaiucgosuaiu')),
           '[^a-z]', '', 'g')
$$;

create temp table il_esleme (anahtar text primary key, il text not null) on commit drop;
insert into il_esleme (anahtar, il) values
    ('adana', 'Adana'),
    ('adiyaman', 'Adıyaman'),
    ('afyonkarahisar', 'Afyonkarahisar'),
    ('agri', 'Ağrı'),
    ('aksaray', 'Aksaray'),
    ('amasya', 'Amasya'),
    ('ankara', 'Ankara'),
    ('antalya', 'Antalya'),
    ('ardahan', 'Ardahan'),
    ('artvin', 'Artvin'),
    ('aydin', 'Aydın'),
    ('balikesir', 'Balıkesir'),
    ('bartin', 'Bartın'),
    ('batman', 'Batman'),
    ('bayburt', 'Bayburt'),
    ('bilecik', 'Bilecik'),
    ('bingol', 'Bingöl'),
    ('bitlis', 'Bitlis'),
    ('bolu', 'Bolu'),
    ('burdur', 'Burdur'),
    ('bursa', 'Bursa'),
    ('canakkale', 'Çanakkale'),
    ('cankiri', 'Çankırı'),
    ('corum', 'Çorum'),
    ('denizli', 'Denizli'),
    ('diyarbakir', 'Diyarbakır'),
    ('duzce', 'Düzce'),
    ('edirne', 'Edirne'),
    ('elazig', 'Elazığ'),
    ('erzincan', 'Erzincan'),
    ('erzurum', 'Erzurum'),
    ('eskisehir', 'Eskişehir'),
    ('gaziantep', 'Gaziantep'),
    ('giresun', 'Giresun'),
    ('gumushane', 'Gümüşhane'),
    ('hakkari', 'Hakkari'),
    ('hatay', 'Hatay'),
    ('igdir', 'Iğdır'),
    ('isparta', 'Isparta'),
    ('istanbul', 'İstanbul'),
    ('izmir', 'İzmir'),
    ('kahramanmaras', 'Kahramanmaraş'),
    ('karabuk', 'Karabük'),
    ('karaman', 'Karaman'),
    ('kars', 'Kars'),
    ('kastamonu', 'Kastamonu'),
    ('kayseri', 'Kayseri'),
    ('kilis', 'Kilis'),
    ('kirikkale', 'Kırıkkale'),
    ('kirklareli', 'Kırklareli'),
    ('kirsehir', 'Kırşehir'),
    ('kocaeli', 'Kocaeli'),
    ('konya', 'Konya'),
    ('kutahya', 'Kütahya'),
    ('malatya', 'Malatya'),
    ('manisa', 'Manisa'),
    ('mardin', 'Mardin'),
    ('mersin', 'Mersin'),
    ('mugla', 'Muğla'),
    ('mus', 'Muş'),
    ('nevsehir', 'Nevşehir'),
    ('nigde', 'Niğde'),
    ('ordu', 'Ordu'),
    ('osmaniye', 'Osmaniye'),
    ('rize', 'Rize'),
    ('sakarya', 'Sakarya'),
    ('samsun', 'Samsun'),
    ('sanliurfa', 'Şanlıurfa'),
    ('siirt', 'Siirt'),
    ('sinop', 'Sinop'),
    ('sirnak', 'Şırnak'),
    ('sivas', 'Sivas'),
    ('tekirdag', 'Tekirdağ'),
    ('tokat', 'Tokat'),
    ('trabzon', 'Trabzon'),
    ('tunceli', 'Tunceli'),
    ('usak', 'Uşak'),
    ('van', 'Van'),
    ('yalova', 'Yalova'),
    ('yozgat', 'Yozgat'),
    ('zonguldak', 'Zonguldak'),
    ('afyon', 'Afyonkarahisar'),
    ('maras', 'Kahramanmaraş'),
    ('kmaras', 'Kahramanmaraş'),
    ('urfa', 'Şanlıurfa'),
    ('antep', 'Gaziantep'),
    ('icel', 'Mersin'),
    ('izmit', 'Kocaeli'),
    ('adapazari', 'Sakarya'),
    ('antakya', 'Hatay');

-- Tanınan yazımlar → resmi ad
update public.profiles p set sehir = e.il
  from il_esleme e
 where pg_temp.il_anahtar(p.sehir) = e.anahtar and p.sehir is distinct from e.il;

update public.listings l set sehir = e.il
  from il_esleme e
 where pg_temp.il_anahtar(l.sehir) = e.anahtar and l.sehir is distinct from e.il;

-- Tanınmayan, boş olmayan değerler ("dsadad") → boş
update public.profiles set sehir = ''
 where coalesce(sehir, '') <> ''
   and pg_temp.il_anahtar(sehir) not in (select anahtar from il_esleme);

update public.listings set sehir = ''
 where coalesce(sehir, '') <> ''
   and pg_temp.il_anahtar(sehir) not in (select anahtar from il_esleme);

commit;

-- ── Doğrulama (ayrı çalıştırın) ─────────────────────────────────────
-- select sehir, count(*) from public.profiles group by 1 order by 2 desc;
-- select sehir, count(*) from public.listings group by 1 order by 2 desc;
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='profiles'
--    and column_name in ('calisma_modeli','arac_tipi','belge_ehliyet');   -- 3 satır
