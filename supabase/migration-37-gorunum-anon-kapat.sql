-- ============================================================
-- Kuryemi Bul — Migration 37: iki görünüm misafire açıktı, kapatılıyor
--
-- SORUN (2026-08-19'da anon key ile ÖLÇÜLDÜ, varsayım değil):
--
--   curl .../courier_cv_public?select=id       → HTTP 200   (anon okuyabiliyor)
--   curl .../work_experience_public?select=id  → HTTP 200   (anon okuyabiliyor)
--   curl .../admins?select=user_id             → HTTP 401 / 42501  ← kapalı olan böyle görünür
--
-- NEDEN: Her iki görünüm de `security_invoker = false` ile kuruldu. Bu,
-- görünümün SAHİBİNİN yetkisiyle çalışması demek — yani temel tablonun
-- RLS'i BAYPAS EDİLİR. Görünümün önündeki tek kapı tablo düzeyindeki
-- GRANT'tır.
--
-- migration-34 ve migration-36 yalnız `grant select ... to authenticated`
-- yazdı. Bu bir KISITLAMA DEĞİLDİR — sadece bir yetki ekler. Supabase'in
-- `alter default privileges ... grant select on tables to anon` ayarı yeni
-- görünümlere de uygulandığı için `anon` zaten SELECT yetkisiyle doğdu.
-- Ekleme, var olanı geri almaz. Açığı kapatan tek şey REVOKE'tur.
--
-- ETKİ: Şu an sızan veri YOK — courier_cv boş ve work_experience_public
-- hiç satır döndürmüyor (ikisi de anon ile `[]`). Ama ilk kurye
-- özgeçmişini yayınladığı anda özet, ehliyet sınıfı, eğitim geçmişi,
-- çalışmak istediği bölgeler ve müsaitlik bilgisi giriş yapmamış herkese
-- açılırdı. KVKK açısından bu, veri sorumlusunun amacı dışında bir
-- yayım olurdu.
--
-- profiles_public'e DOKUNULMAZ: orada anon erişimi bilinçlidir
-- (migration-20:111 `grant select ... to anon, authenticated`) ve misafir
-- havuz sayfaları ona dayanır.
--
-- profile_presence'a DOKUNULMAZ: yalnız profile_id + online döndürür,
-- kişisel veri taşımaz, çevrimiçi sayacı ona bağlıdır.
--
-- KULLANIM: Supabase → SQL Editor → Run. Idempotent.
-- ============================================================

-- 1. Görünümler — asıl açık burasıydı (RLS baypas ediliyor).
revoke all on public.courier_cv_public      from anon;
revoke all on public.work_experience_public from anon;

-- Amaç açıkça yeniden yazılsın (revoke'tan sonra, sıra önemli).
grant select on public.courier_cv_public      to authenticated;
grant select on public.work_experience_public to authenticated;

-- 2. Temel tablolar — derinlemesine savunma.
--
-- Bunlar zaten RLS ile korunuyordu: misafirde auth.uid() NULL olduğu için
-- `auth.uid() = user_id` hiçbir satırda tutmaz, anon `[]` alır. Yani burada
-- bilinen bir sızıntı YOKTU. Yine de anon'un bu tablolarda hiç işi yok;
-- ileride biri RLS politikasını gevşetirse ikinci bir kapı kalsın.
--
-- Kırılma riski yok: her iki tabloya da yalnız oturum açmış kullanıcı
-- yazıp okuyor (supabase.js myCv/saveCv/*WorkExperience önce getUser()
-- çağırıyor, oturum yoksa hiç istek atmıyor).
revoke all on public.courier_cv      from anon;
revoke all on public.work_experience from anon;

grant select, insert, update, delete on public.courier_cv      to authenticated;
grant select, insert, update, delete on public.work_experience to authenticated;

-- ============================================================
-- DOĞRULAMA — çalıştırdıktan sonra anon key ile ölçün.
-- Beklenen: 401 ve 42501 (permission denied), 200 DEĞİL.
--
--   U="https://fdszypytpodndtlbuzuz.supabase.co/rest/v1"
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$U/courier_cv_public?select=id&limit=1" -H "apikey: <ANON>"
--   curl -s -o /dev/null -w "%{http_code}\n" \
--     "$U/work_experience_public?select=id&limit=1" -H "apikey: <ANON>"
--
-- profiles_public 200 dönmeye DEVAM etmeli — ona dokunmadık, misafir
-- havuz sayfaları bozulursa bu migration'ın kapsamı aşılmış demektir.
-- ============================================================
