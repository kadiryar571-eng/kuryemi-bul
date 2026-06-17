# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Local dev server (gerekli — query params ve cleanUrls için)
npx serve .

# Capacitor (sadece Android build gerektiğinde)
npm run cap:sync        # web → native sync
npm run cap:add:android # ilk kez Android platform ekle
```

Derleme adımı yoktur. Dosyayı kaydet → tarayıcıyı yenile.

## Architecture Overview

**Tamamen statik bir web uygulaması** — framework yok, build adımı yok. Capacitor 6 native kabuk olarak kullanılır; `capacitor.config.json`'da `"url": "https://kuryemibul.com"` ile canlı siteyi WebView'de yükler (yerel `www/` değil).

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
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/supabase.js"></script>
<script src="assets/js/data.js"></script>
<script src="assets/js/components.js"></script>
<script src="assets/js/app.js"></script>
<script src="assets/js/motion.js"></script>
```

`i18n.js` en önce çalışır (DOM hazır olmadan). `supabase.js` CDN'den sonra gelir. `components.js` global `KB` nesnesini oluşturur; `app.js` buna bağımlıdır.

### CSS Yüklenme Sırası (kritik)

```html
<link rel="stylesheet" href="assets/css/styles.css">
<link rel="stylesheet" href="assets/css/talent.css">
<link rel="stylesheet" href="assets/css/design-system.css">
<link rel="stylesheet" href="assets/css/mobile-ux.css">
<link rel="stylesheet" href="assets/css/mobile-design-system.css">
<link rel="stylesheet" href="assets/css/mobile-screens.css">
<link rel="stylesheet" href="assets/css/mobile-motion.css">
```

`mobile-motion.css` her zaman en son yüklenir.

### Global Nesneler

- `window.KB` — `components.js` tarafından export edilir. Tüm paylaşılan helper'lar burada: `KB.isOnline()`, `KB.SESSION`, `KB.STATE`, `KB.esc()`, `KB.initials()`, `KB.ready()` (Promise — Supabase session yüklenince resolve)
- `window.SB` — `supabase.js` tarafından export edilir. Tüm Supabase işlemleri: `SB.isOn()`, `SB.getUser()`, `SB.myProfile()`, `SB.pool(type)`, `SB.myOffers()`, `SB.addToPool()`, vb.
- `window.KB_DATA` — `data.js` tarafından tanımlanır. Demo/offline modu için mock veriler.
- `window.KBI18N` — `i18n.js` tarafından export edilir. `KBI18N.t(key)`, `KBI18N.lang`, `KBI18N.setLang()`
- `window.KBMotion` — `motion.js` tarafından export edilir. `KBMotion.showSuccess()`, `KBMotion.showError()`, `KBMotion.showErrorToast()`, `KBMotion.showInAppNotif()`, `KBMotion.initPTR()`

### Online vs Demo Modu

`SB.isOn()` false döndüğünde (Supabase CDN yüklenemezse veya ANON key yoksa) tüm veri katmanı `KB_DATA` mock verisine düşer. `app.js` içindeki her async fonksiyon bu pattern'ı kullanır:

```js
if (online()) { try { return await SB.pool(type); } catch (e) {} }
return KB_DATA.kuryeler; // fallback
```

### Auth Akışı

1. Kayıt: `giris.html` → `SB.signUp()` → email doğrulama → `verify-email.html`
2. Google OAuth: Web'de aynı sekmede redirect; Native Capacitor'da `Capacitor.Plugins.Browser` ile sistem tarayıcısı açılır, deep-link `com.kuryemibul.app://callback` ile geri döner
3. Giriş sonrası: `runSessionGuard()` otomatik olarak rol'e göre panel sayfasına yönlendirir
4. Rol ilk girişte `handle_new_user` Supabase trigger'ı ile `kurye` olarak atanır; kullanıcı `profil-duzenle.html`'de değiştirebilir
5. Profil tamamlanmadan `yayinda: false` — havuzda görünmez

### Component Render Sistemi

`components.js` sayfaya inject ederek çalışır — HTML sayfasında placeholder elementler gerekir:

- `<div id="app-header"></div>` — Sayfa tipine göre farklı şey render eder:
  - Landing (`index.html`): klasik navbar
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

### Veritabanı Yapısı

`supabase/schema.sql` — dokunma. Üç kritik tablo:
- `profiles` — her kullanıcının tek profili; `role` alanı kurye/isletme/firma; `yayinda` false iken havuzda görünmez
- `offers` — çok yönlü teklif sistemi; herhangi bir rol herhangi bir role teklif gönderebilir
- `profile_contacts` — telefon/email KVKK gereği ayrı tabloda, RLS ile korunur

RLS: `profiles` herkese açık (select); insert/update/delete yalnız kendi satırı. `offers` yalnız taraflar görebilir.

### CSS Breakpoint'leri

- `max-width: 680px` — bottom nav, touch targets, card overrides (mobil)
- `max-width: 640px` — dashboard feed (tab nav gizle), topbar safe-area
- `max-width: 390px` — küçük ekran tipografi
- `min-width: 681px` — desktop toolbar filtreleri, mobil butonları gizle

### Sayfa Kategorileri

- **Landing:** `index.html` — klasik header, space-bg, landing.js
- **Auth flow:** `giris.html`, `verify-email.html`, `sifre-sifirla.html`, `onboarding.html` — sidebar yok, bottom nav yok, kendi header'ları var
- **Paneller:** `panel-kurye.html`, `panel-isletme.html`, `panel-firma.html` — `.mob-dash` class'ı ile kendi mobil header'larını yönetir
- **Havuzlar:** `kuryeler.html`, `isletmeler.html`, `firmalar.html` — arama + filtre + harita entegrasyonu
- **Profiller:** `profil-kurye.html?id=`, `profil-isletme.html?id=`, `profil-firma.html?id=` — `?id=` query param ile profil yüklenir
- **Yardımcı:** `mesajlar.html`, `bildirimler.html`, `eslesme.html`, `havuzum.html`, `harita.html`, `ilanlar.html`, `ayarlar.html`
- **Statik/Yasal:** `kvkk.html`, `gizlilik.html`, `sartlar.html`, `cerez.html`, `teslimat.html` vb.

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
