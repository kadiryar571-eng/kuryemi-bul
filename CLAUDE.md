# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Local dev server (gerekli — query params ve cleanUrls için)
npx serve .

# Capacitor (sadece Android build gerektiğinde)
npm run cap:sync        # www/ → native sync
npm run cap:add:android # ilk kez Android platform ekle
```

Derleme adımı yoktur. Dosyayı kaydet → tarayıcıyı yenile.

## İKİ AYRI UYGULAMA (önce bunu oku)

Bu repo **iki bağımsız uygulama** barındırır. Karıştırma:

| | Web sitesi | Mobil uygulama |
|---|---|---|
| Konum | Kök dizin | `www/` |
| Yapı | 44 ayrı `.html` sayfası | Tek sayfa (SPA), kendi router'ı |
| Yayın | GitHub Pages, `main` dalı → kuryemibul.com | Capacitor APK (paketlenmiş) |
| Ekranlar | `kuryeler.html`, `panel-kurye.html`, … | `www/assets/js/screens/*.js` |

`capacitor.config.json` → `"webDir": "www"`, **`server.url` YOK**. APK yerel
`www/` klasörünü paketler; canlı siteyi yüklemez. Bu **bilinçli bir karardır**:
çevrimdışı çalışsın ve Play Store'un *minimum functionality* politikasında
"web sarmalayıcı" sayılmasın diye.

**Sonuç:** kök dizinde yapılan bir düzeltme mobil uygulamaya YANSIMAZ. Aynı
davranış gerekiyorsa `www/` içinde ayrıca uygulanmalı, sonra `npm run cap:sync`
→ APK yeniden derleme → kullanıcı güncellemesi gerekir.

Ortak olan tek şey **Supabase şemasıdır**. Bir migration çalıştırırken her iki
istemcinin de etkileneceğini varsay. (Örn. migration-20 `profiles` tablosunu
`authenticated`'a daralttı; `www/` SPA'sı zaten girişten sonra sorgu attığı
için etkilenmedi — ama bu şans değil, kontrol edilmesi gereken bir şeydi.)

## Architecture Overview

**Tamamen statik bir web uygulaması** — framework yok, build adımı yok.

### Kullanıcı Rolleri ve Routing

Üç rol vardır: `kurye`, `isletme`, `firma`. Rol belirleyince her şey değişir:

| Alan | Kurye | İşletme | Firma |
|------|-------|---------|-------|
| Panel | `panel-kurye.html` | `panel-isletme.html` | `panel-firma.html` |
| Profil | `profil-kurye.html?id=` | `profil-isletme.html?id=` | `profil-firma.html?id=` |
| Bottom Nav | Ana/Fırsatlar/Eşleşmeler/Mesajlar/Profil | Ana/Talepler/Eşleşmeler/Mesajlar/İşletme | Ana/Havuz/İlanlar/Mesajlar/Firma |

### JS Yüklenme Sırası (kritik)

Her sayfa şu sırayı korumak zorunda:

```html
<script src="assets/js/i18n.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/dist/umd/supabase.js"
        integrity="sha384-OUpie84zd1LdwNlK9uJJQRwab0BLqo3eKYKFh7hSVL58FSk7wPp2l0kfUMIIoaQd"
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="assets/js/supabase.js"></script>
<script src="assets/js/presence.js"></script>
<script src="assets/js/components.js"></script>
<script src="assets/js/app.js"></script>
<script src="assets/js/motion.js"></script>
```

> **CDN sürümü SABİTTİR, `@2` kısayolu kullanmayın.** SRI hash'i tam dosyaya
> bağlıdır; `@2` her yeni 2.x sürümünde değişir ve hash tutmayınca script
> yüklenmez. Sürüm yükseltirken hash'i yeniden hesaplayın:
> `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`

`i18n.js` en önce çalışır (DOM hazır olmadan). `supabase.js` CDN'den sonra gelir.
`presence.js` `supabase.js`'e bağımlıdır (SB.presencePing / SB.raw kullanır).
`components.js` global `KB` nesnesini oluşturur; `app.js` buna bağımlıdır.

> **`data.js` KALDIRILDI.** Eskiden demo/mock veri (`window.KB_DATA`) sağlıyordu.
> Üretimde mock veri yoktur; tek veri kaynağı Supabase'dir. Bağlantı yoksa
> sayfalar boş durum gösterir, asla uydurma içerik göstermez.

**`www/` SPA** — `util.js` MUTLAKA en önce:

```html
<script src="assets/js/util.js"></script>   <!-- esc/escAttr/escJs -->
<script src="https://maps.googleapis.com/..."></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.2/..."></script>
<script src="assets/js/supabase.js"></script>
<script src="assets/js/router.js"></script>
<script src="assets/js/screens/shared.js"></script>
<script src="assets/js/screens/{login,kurye,firma,isletme}.js"></script>
<script src="assets/js/native.js"></script>
<script src="assets/js/webrtc.js"></script>
<script src="assets/js/app.js"></script>
```

`util.js` en başta olmalı — tüm `screens/*` modülleri render sırasında `esc()` çağırır.

### CSS

Tek dosya: `assets/css/main.css` (kök site) ve `www/assets/css/app.css` (SPA).
Ayrı bir yükleme sırası yoktur.

### Global Nesneler

- `window.KB` — `components.js` tarafından export edilir. Tüm paylaşılan helper'lar burada: `KB.isOnline()`, `KB.SESSION`, `KB.STATE`, `KB.esc()`, `KB.initials()`, `KB.ready()` (Promise — Supabase session yüklenince resolve)
- `window.SB` — `supabase.js` tarafından export edilir. Tüm Supabase işlemleri: `SB.isOn()`, `SB.getUser()`, `SB.myProfile()`, `SB.pool(type)`, `SB.myOffers()`, `SB.addToPool()`, vb.
- `window.KBPresence` — `presence.js` tarafından export edilir. Gerçek çevrimiçi durumu:
  `KBPresence.onCount(cb)`, `KBPresence.count()`, `KBPresence.refresh()`, `KBPresence.signOut()`.
  `[data-online-count]` taşıyan elementleri otomatik günceller.
- `window.KBNotif` — `notifications.js`. **Yalnız okuma** — bildirimleri istemci üretmez, DB trigger'ları üretir.
- `window.KBInterview` / `window.KBHiring` — `interviews`, `hiring_decisions`, `onboarding` tablolarına bağlı (localStorage değil).
- `window.KBI18N` — `i18n.js` tarafından export edilir. `KBI18N.t(key)`, `KBI18N.lang`, `KBI18N.setLang()`
- `window.KBMotion` — `motion.js` tarafından export edilir. `KBMotion.showSuccess()`, `KBMotion.showError()`, `KBMotion.showErrorToast()`, `KBMotion.showInAppNotif()`, `KBMotion.initPTR()`

### Veri Kaynağı — YALNIZ Supabase (mock yok)

Üretim kuralı: **görünen her şey veritabanından gelir.** Demo/mock fallback yoktur.
`SB.isOn()` false döndüğünde (CDN yüklenemezse veya ANON key yoksa) veri katmanı
boş döner ve çağıran taraf **boş durum (empty state)** gösterir — uydurma veri asla basılmaz.

```js
async function loadPool(type) {
  if (!online()) return [];                       // fallback veri YOK
  try { return await SB.pool(type); } catch (e) { return []; }
}
```

Bilinmeyen bir sayı/oran varsa `—` gösterilir; hash'ten türetilmiş sahte
"uyum skoru" veya "başvuru sayısı" üretmek yasaktır.

> **Sayaç animasyonu uyarısı:** `requestAnimationFrame` sekme arka plandayken
> çalışmaz. Sayı animasyonu yazarken `document.hidden` ise hedef değeri doğrudan
> bas — yoksa sayaç `—` olarak kalır.

### Canlı Sistem (migration-18)

- **Presence:** `presence_ping()` / `presence_offline()` RPC'leri + `user_presence` tablosu.
  İstemci 45 sn'de bir heartbeat atar; 2 dk sessizlikte sunucu otomatik offline sayar.
  Sayaç Supabase Realtime presence kanalıyla anlık gelir (polling yok).
- **İstatistikler:** `platform_stats()` (ana sayfa/havuz) ve `my_dashboard_stats()`
  (kullanıcıya özel) tek RPC'de tüm sayaçları döndürür.
- **Realtime:** `SB.subscribeListings / subscribeApplications / subscribeProfiles /
  subscribeConversations` — yeni ilan, başvuru, kayıt ve mesajda sayfa yenilemeden güncelleme.
- **Gerçek olay sayaçları:** `listing_views`, `profile_views`, `listing_application_counts()`.

### Auth Akışı ve Giriş Kapısı

1. Kayıt: `giris.html` → `SB.signUp()` → email doğrulama → `verify-email.html`
2. Google OAuth: Web'de aynı sekmede redirect; Native Capacitor'da `Capacitor.Plugins.Browser` ile sistem tarayıcısı açılır, deep-link `com.kuryemibul.app://callback` ile geri döner
3. Giriş sonrası: `runSessionGuard()` otomatik olarak rol'e göre panel sayfasına yönlendirir
4. Rol ilk girişte `handle_new_user` Supabase trigger'ı ile `kurye` olarak atanır; kullanıcı `profil-duzenle.html`'de değiştirebilir
5. Profil tamamlanmadan `yayinda: false` — havuzda görünmez

**Giriş kapısı** `components.js` içinde:
- `PUBLIC_PAGES` — misafire açık sayfalar (`index.html`, yasal sayfalar, `404.html`).
  Bunlarda uygulama kabuğu (sidebar/topbar) değil `renderPublicNav()` render edilir.
- Listede olmayan her sayfa giriş ister; `runSessionGuard()` `giris.html?next=…`'e yollar.
- `safeNext()` yalnız aynı origin'deki `.html` yollarına izin verir (açık yönlendirme koruması).
- `currentPage()` uzantısız yol gelirse `.html` ekler — `serve` `cleanUrls: true` ile
  uzantıyı düşürdüğü için şart. Ayrıca cleanUrls 301'i query string'i düşürdüğünden
  `?next=` değeri yönlendirmeden ÖNCE sessionStorage'a yazılır.

### Component Render Sistemi

`components.js` sayfaya inject ederek çalışır — HTML sayfasında placeholder elementler gerekir:

- `<div id="app-header"></div>` — Sayfa tipine göre farklı şey render eder:
  - Landing (`index.html`) ve yasal sayfalar: public navbar
  - Auth sayfaları (`giris.html` vb.): hiçbir şey (kendi header'larını yönetirler)
  - Diğer tüm sayfalar: sidebar + topbar
- `<div id="app-footer"></div>` — Footer (auth flow'da gereksiz)
- `<nav id="kb-bottomnav">` — `renderBottomNav()` tarafından body'ye append edilir, placeholder gerekmez
- `<header id="mob-app-bar">` — Panel olmayan sayfalarda `renderMobileAppBar()` tarafından eklenir

### State Yönetimi

Merkezi `KB.STATE` nesnesi (components.js içinde):
```js
{ auth: { status: "guest"|"authed" }, user: null|{...}, role: "guest"|"kurye"|"isletme"|"firma", context: { route, prevRoute }, prefs: { lang, theme, fontScale, contrast } }
```

`KB.onState(cb)` ile abone ol, `KB.setState(patch)` ile güncelle.

Kalıcı tercihler `localStorage`'da: `kb_theme`, `kb_rol`, `kb_fontscale`, `kb_contrast`, `kb_sidebar_collapsed`, `kb_cookie_ok`.

Form taslakları ve view state'i `sessionStorage`'da: `kb_draft:<key>`, `kb_view:<key>`.

## Güvenlik Kuralları (ihlal etmeyin)

### 1. HTML kaçışı zorunlu

Başka bir kullanıcıdan gelen HİÇBİR değer (`ad`, mesaj `content`, ilan `baslik`, `metadata.*`) kaçırılmadan DOM'a girmez. `www/` SPA bir Capacitor WebView'de çalıştığı için XSS yalnız DOM'u değil, Capacitor köprüsünü (Camera/Geolocation/Filesystem) ve oturum jetonunu da ele geçirir.

Bağlama göre doğru fonksiyonu seçin — hepsi aynı değildir:

```js
'<div>' + esc(v) + '</div>'                      // metin
'<div style="color:' + escAttr(v) + '">'         // attribute
'onclick="go(\'' + escJs(v) + '\')"'             // attribute İÇİNDE JS string
'<img src="' + escAttr(safeUrl(v)) + '">'        // URL
esc(v).replace(/\n/g,'<br>')  →  escLines(v)     // çok satırlı metin
```

**`onclick` içinde `esc()` KULLANMAYIN.** HTML parser `&#39;`'i JS'e geçmeden çözer; kaçış boşa gider ve enjeksiyon çalışır. O bağlam `escJs()` ister (`'` üretir).

Kök sitede karşılığı `KB.esc()`'tir (components.js). Yeni bir yerel `esc()` kopyası TANIMLAMAYIN — eskiden 7 kopya vardı ve hepsi `'` karakterini atlıyordu.

### 2. Sırlar

- `release.keystore`, `google-services.json`, `.env` → `.gitignore`'da. Repo **public**.
- İmzalama secret'ları yalnız GitHub Actions'ta. Kurulum: `store/keystore-setup-guide.md`
- Supabase `anon` key istemcide olabilir (RLS korur); `service_role` **asla**.

### 3. APK derleme

`assembleDebug` çıktısı ASLA yayınlanmaz — `debuggable="true"` taşır (ADB ile oturum jetonu okunabilir) ve herkeste bulunan debug anahtarıyla imzalıdır. CI yalnız `assembleRelease` üretir ve çıktıyı iki kez doğrular.

### 4. OAuth deep link

Native dönüş adresi `https://kuryemibul.com/auth-callback.html` — **doğrulanmış App Link**. Özel şemaya (`com.kuryemibul.app://`) geri DÖNMEYİN: sahipliği doğrulanamaz, herhangi bir uygulama kaydedip authorization code'u yakalayabilir. Doğrulama `.well-known/assetlinks.json` + `.nojekyll` ile çalışır (Jekyll dotfile klasörlerini yayınlamaz).

### Veritabanı Yapısı

Supabase projesi `fdszypytpodndtlbuzuz`. `supabase/schema.sql` — dokunma;
değişiklikler numaralı `migration-NN-*.sql` dosyalarıyla yapılır (idempotent).

Üç kritik tablo:
- `profiles` — her kullanıcının tek profili; `role` alanı kurye/isletme/firma; `yayinda` false iken havuzda görünmez
- `offers` — çok yönlü teklif sistemi; herhangi bir rol herhangi bir role teklif gönderebilir
- `profile_contacts` — telefon/email KVKK gereği ayrı tabloda, RLS ile korunur

**RLS (migration-20 sonrası):**
- `profiles` select **yalnız `authenticated`**. Misafir tabloyu okuyamaz.
  Misafir için `public.profiles_public` view'ı var (`security_invoker = false`) —
  `adres`, `lat`, `lng`, `belgeler`, `fotograflar`, `user_id`, `created_at` **dışarıda**.
  `supabase.js` içindeki `_profileSource()` oturuma göre kaynağı seçer.
- `listings.sahip_ad` denormalize kolondur (`sahip_rol` ile aynı desen). Misafir
  `profiles`'a join yapamadığı için ilan kartındaki işveren adı buradan gelir;
  trigger'lar ilan ekleme/güncelleme ve profil adı değişiminde senkron tutar.
- `puan`, `degerlendirme`, `tamamlanan`, `seviye` kullanıcıya **kapalıdır**
  (`guard_profile_metrics` BEFORE UPDATE trigger'ı). Yalnız trigger zinciri
  (`pg_trigger_depth() > 1`), admin ve Studio değiştirebilir.
- `offers` yalnız taraflar görebilir.

**Yönetim arayüzü yoktur.** `admin.html` kaldırıldı; tüm yönetim işlemleri
Supabase Studio → SQL Editor üzerinden yapılır. Hazır sorgular:
[supabase/ADMIN-REHBERI.md](supabase/ADMIN-REHBERI.md).

### CSS Breakpoint'leri

- `max-width: 680px` — bottom nav, touch targets, card overrides (mobil)
- `max-width: 640px` — dashboard feed (tab nav gizle), topbar safe-area
- `max-width: 390px` — küçük ekran tipografi
- `min-width: 681px` — desktop toolbar filtreleri, mobil butonları gizle

### Sayfa Kategorileri

- **Landing:** `index.html` — klasik header, space-bg, landing.js (misafire açık)
- **Auth flow:** `giris.html`, `verify-email.html`, `sifre-sifirla.html`, `onboarding.html` — sidebar yok, bottom nav yok, kendi header'ları var
- **Paneller:** `panel-kurye.html`, `panel-isletme.html`, `panel-firma.html` — `.mob-dash` class'ı ile kendi mobil header'larını yönetir
- **Havuzlar:** `kuryeler.html`, `isletmeler.html`, `firmalar.html` — arama + filtre + harita entegrasyonu (giriş gerekir)
- **Profiller:** `profil-kurye.html?id=`, `profil-isletme.html?id=`, `profil-firma.html?id=` — `?id=` query param ile profil yüklenir
- **Yardımcı:** `mesajlar.html`, `bildirimler.html`, `eslesme.html`, `havuzum.html`, `harita.html`, `ilanlar.html`, `ayarlar.html`
- **Statik/Yasal:** `kvkk.html`, `gizlilik.html`, `sartlar.html`, `cerez.html`, `teslimat.html` vb. (misafire açık)

### i18n

Tüm kullanıcıya görünen metinler `KBI18N.t("key")` ile çekilir. Çift dil: `tr` (varsayılan) ve `en`. Key'ler `i18n.js` içindeki `DICT` objesinde. HTML'de statik metin içeren elementler `data-i18n="key"` attribute'u alır, `applyStatic()` ile otomatik güncellenir.

### Motion Sistemi

`motion.js` sayfa yüklenince otomatik init olur (`DOMContentLoaded`). Manuel kullanım için:
```js
KBMotion.showSuccess("Başarılı!", "Alt metin", 2200);
KBMotion.showError(inputEl, "Hata mesajı");
KBMotion.showErrorToast("Ağ hatası");
KBMotion.showInAppNotif("Başlık", "Alt metin", onTapFn);
KBMotion.initPTR(containerEl, refreshFn); // pull-to-refresh
```

CSS sınıfları: `.kb-shake`, `.kb-anim-pop`, `.kb-anim-fade-in`, `.kb-anim-page-in`, `.btn--loading`, `.is-success-state`, `.kb-badge-new`.
