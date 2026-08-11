# Google Maps → MapLibre GL + OpenFreeMap Geçişi

**Tarih:** 2026-08-11
**Durum:** Onaylandı, uygulanmayı bekliyor
**Branch:** `feat/maplibre-openfreemap`

> Bu dosya repo kökündeki `specs/` altındadır, `docs/` altında **değildir**.
> `docs/` yayınlanan site köküdür; iç dökümanlar oraya konmaz.

---

## 1. Neden

Google Maps JavaScript API her projede etkin bir faturalandırma hesabı ister.
Türkiye'de faturalandırma hesabı açmak tek seferlik **₺1.500 ön ödeme** gerektiriyor;
bu tutar karttan gerçekten çekiliyor ve kartına değil Google Cloud bakiyesine
yatıyor. Yalnızca faturalandırma hesabı kapatılırsa iade ediliyor.

Yeni bir Cloud projesi + yeni anahtar denendi (`AIzaSyA8oru…`). Sonuç tarayıcıda
ölçüldü:

```
Google Maps JavaScript API error: BillingNotEnabledMapError
```

Anahtar geçerliydi, referrer kısıtlaması doğruydu, Maps JavaScript API etkindi —
tek eksik faturalandırmaydı. Sorun teknik değil, ticari.

**Karar:** Google Maps tamamen kaldırılıyor. Yerine anahtar ve ödeme gerektirmeyen
bir yığın geliyor.

## 2. Seçilen yığın: MapLibre GL JS + OpenFreeMap

| Sağlayıcı | Anahtar | Ticari kullanım | Koyu tema | Sonuç |
|---|---|---|---|---|
| **OpenFreeMap** | yok | ✅ MIT, limit yok | ✅ | **seçildi** |
| OSM standart döşeme | yok | ⚠️ "erişim her an kesilebilir" | ❌ | elendi |
| CARTO | yok | ❌ Enterprise lisans şart | ✅ | elendi |
| Stadia / MapTiler | **var** | ✅ | ✅ | elendi (anahtara dönüş) |

CARTO ilk önerilen seçenekti; dökümanı doğrulanınca elendi:
*"CARTO Basemaps are available exclusively with an Enterprise license."*
KuryemiBul ticari bir platform olduğu için ücretsiz katman kullanılamaz.

OpenFreeMap: kayıt yok, anahtar yok, cookie yok, görüntüleme limiti yok, MIT
lisanslı, ticari kullanım açıkça serbest. Bedeli **vektör** döşeme sunması —
Leaflet raster çizer, bu yüzden çizim kütüphanesi **MapLibre GL JS** olur.
Veri kaynağı yine OpenStreetMap'tir.

### Stil URL'leri

| Uygulama | Stil |
|---|---|
| `docs/` (web sitesi, açık tema) | `https://tiles.openfreemap.org/styles/positron` |
| `www/` (SPA, koyu tema) | `https://tiles.openfreemap.org/styles/dark` |

`dark` stili SPA'nın mevcut `#0f0b1e` paletiyle uyumludur; Google'ın `DARK_STYLE`
dizisinin yerini alır.

## 3. Mevcut durum — harita yüzeyi

Keşifte 6 harita implementasyonu bulundu, **yalnızca 2'si canlı**:

| Fonksiyon | Konum | Kütüphane | Durum |
|---|---|---|---|
| `initMapGoogle()` | `docs/assets/js/app.js:1396` | Google | ✅ **canlı** — `harita.html` |
| `initPremiumMap()` | `www/assets/js/screens/shared.js:1539` | Google | ✅ **canlı** — SPA |
| `initMap()` | `docs/assets/js/app.js:1357` | Leaflet | 💀 ölü — kütüphane hiç yüklenmiyor |
| `initHomeMap()` | `docs/assets/js/app.js:1600` | Leaflet | 💀 ölü — `#map` yalnız `harita.html`'de var |
| `initPanelMap()` | `docs/assets/js/app.js:1482` | Google | 💀 ölü — `panelMapKurye/Isletme/Firma` id'leri hiçbir HTML'de yok |
| `initMapExperience()` | `docs/assets/js/app.js:1867` | Google | 💀 ölü — hiçbir sayfa çağırmıyor |

Proje eskiden Leaflet kullanıyormuş (README hâlâ öyle diyor); Google Maps'e
geçilirken eski kod silinmemiş.

### Neden ölü kod canlandırılmıyor

**`initMapExperience()`** değerlendirildi, reddedildi:

- `app.js:1908` ve `:1928` — `var map = new google.maps.Map(...)` iki kez
  tanımlanmış, ikincisi birincisini eziyor. `DARK_STYLE`, İstanbul merkezi,
  zoom 12, `gestureHandling`, arkaplan rengi hiç uygulanmıyor. Kod tarayıcıda
  bir kez bile açılmamış.
- `.mx-bcard`, `.mx-ai`, `#mxSearch` → `main.css`'te **sıfır eşleşme**. Arayüzün
  CSS'i hiç yazılmamış.
- Beklediği DOM elemanları `harita.html`'de yok.

**`initPanelMap()`** silinir: panel sayfalarında harita hiç görünmemiş, kullanıcı
kaybı yok. Panellere harita eklemek yeni bir özelliktir, bu geçişin kapsamı dışında.

Silinen kod git geçmişinde kalır; ileride zengin harita sayfası yapılırsa referans
olarak çıkarılabilir.

## 4. Hedef mimari

docs/ tarafında **tek** harita kaldığı için ayrı bir ortak modül kurulmuyor —
tekrarlanan kod yok, ekstra katman fazlalık olur.

| Uygulama | Fonksiyon | Konum |
|---|---|---|
| `docs/` | `initMap()` — MapLibre | `docs/assets/js/app.js`, `KBApp.initMap` olarak export |
| `www/` | `initPremiumMap()` — MapLibre | `www/assets/js/screens/shared.js`, yerinde çevrilir |

`www/` SPA'nın katı yükleme sırası var (`util.js` en önce); oraya yeni bir
paylaşılan modül sokmak bu spec'in kapsamı dışında bir risktir.

### 4.1 Vendor'lama

MapLibre GL JS `assets/vendor/maplibre/` altına kopyalanır, CDN'den çekilmez:

- `docs/assets/vendor/maplibre/maplibre-gl.js` + `maplibre-gl.css`
- `www/assets/vendor/maplibre/maplibre-gl.js` + `maplibre-gl.css`

Gerekçe: CSP'nin `style-src` direktifi jsdelivr'a kapalı (kütüphane CSS'i CDN'den
yüklenemez); APK'nın CDN'e bağımlı olmaması gerekiyor; SRI hash bakımı ortadan
kalkıyor.

Kütüphane (~250 KB) yalnız harita olan sayfalara eklenir, her sayfaya değil.

### 4.2 CSP değişiklikleri

**Kritik:** MapLibre GL, blob URL'den Web Worker yaratır. `worker-src blob:`
eksikse harita hiç açılmaz ve konsoldaki hata bambaşka bir şeyi işaret eder.

`docs/harita.html` ve `www/index.html` — silme **ve** ekleme:

```
connect-src ... https://tiles.openfreemap.org;
img-src     ... https://tiles.openfreemap.org;
worker-src  blob:;
```

Kalan **37** `docs/*.html` dosyasında yalnızca **silme** yapılır, ekleme yok:
`https://maps.googleapis.com`, `https://maps.gstatic.com`,
`https://*.googleapis.com`, `https://*.ggpht.com`.

Sayım: `docs/` altında 39 HTML var; 38'inde Google host'ları geçiyor
(`auth-callback.html`'de CSP yok). Bunlardan `harita.html` ekleme de alır → 37 dosya
sadece silme.

## 5. Dosya bazında değişiklikler

### Yeni

- `docs/assets/vendor/maplibre/maplibre-gl.{js,css}`
- `www/assets/vendor/maplibre/maplibre-gl.{js,css}`

### Değişen

| Dosya | Değişiklik |
|---|---|
| `docs/assets/js/app.js` | Tek `initMap()` (MapLibre) yazılır; `initMapGoogle`, eski Leaflet `initMap`, `initPanelMap`, `initHomeMap`, `initMapExperience` silinir; `KBApp` export'u temizlenir; `initPanel` içindeki `initPanelMap` çağrısı (`:1775`) kalkar |
| `docs/harita.html` | Google script etiketi çıkar, maplibre vendor girer; `__gmapsReady` callback'i kalkar (MapLibre senkron yüklenir, `DOMContentLoaded` yeterli); `#locateBtn` yeni konum mantığına bağlanır; CSP |
| Diğer 37 `docs/*.html` | Yalnızca CSP'den Google host'ları silinir |
| `www/index.html` | Google script etiketi → maplibre vendor; `window._spmMapsReady` ve `__spmMapsReady` kalkar; CSP |
| `www/assets/js/screens/shared.js` | `initPremiumMap` MapLibre'a çevrilir; ısı haritası kaldırılır |
| `www/assets/js/screens/{kurye,firma,isletme}.js` | `_spmMapsReady` bekleme koşulu kalkar, doğrudan `initPremiumMap(role)` çağrılır |
| `README.md` | "Leaflet + OpenStreetMap" → "MapLibre GL + OpenFreeMap" |
| `docs/gizlilik.html` | Üçüncü taraf listesindeki "OpenStreetMap / Leaflet" satırı |
| `CLAUDE.md` | Harita bölümü + script yükleme sırası notu |

### Silinen

- Google Maps API anahtarı (`docs/harita.html:223`, `www/index.html:54`)
- Isı haritası: `heatBtn`, `toggleHeatmap()`, gradyan tanımı, `spmHeatLegend`
- 4 ölü harita fonksiyonu

## 6. Korunan davranış

Kullanıcı açısından hiçbir şey kaybolmaz (ısı haritası hariç — bilinçli karar):

**`docs/harita.html`:**
- `#map` konteyneri, 3 katman kutusu (`[data-layer]` — kurye/isletme/firma)
- İşaretçi renkleri ve emojileri: kurye `#22D3EE` 🛵, isletme `#4f8bff` 📦,
  firma `#a855f7` 🏢
- Popup: ad, şehir veya bölgeler, "Profili Gör" bağlantısı (`profil-*.html?id=`)
- `#locateBtn` — konum, kullanıcı işaretçisi, doğruluk çemberi

**`www/` SPA:**
- Koyu tema, işaretçi renkleri (`ilan` `#f59e0b` 💼, `kurye` `#22d3ee` 🛵,
  `isletme` `#4f8bff` 🏪, `firma` `#a855f7` 🏢)
- Arama, katman çipleri, kart↔harita senkronu, seçim durumu (büyüyen işaretçi)
- Konum butonu, 5 km "yakın" filtresi, `fitBounds`

## 7. Attribution

OpenStreetMap ve OpenFreeMap attribution'ı zorunludur. MapLibre'ın kendi
attribution kontrolü bunu otomatik gösterir; **kapatılmayacak, gizlenmeyecek,
bir toggle arkasına alınmayacak.**

## 8. Güvenlik

`CLAUDE.md`'deki kaçış kuralı aynen geçerlidir. Popup HTML'i başka kullanıcıdan
gelen veri içerir (`ad`, `sehir`, `baslik`) — hepsi `KB.esc()` (kök site) veya
`esc()` (SPA) ile kaçırılır. Popup içine `onclick` yazılmaz; olay dinleyicileri
JS tarafında bağlanır. Yeni bir yerel `esc()` kopyası **tanımlanmaz**.

## 9. Riskler ve azaltma

| Risk | Azaltma |
|---|---|
| MapLibre WebGL gerektirir; desteklemeyen cihazda harita açılmaz | Harita kurulumu WebGL yokluğunu yakalar, harita yerine boş durum mesajı gösterilir — sayfa çökmez |
| APK ~250 KB büyür | Kabul edildi; kütüphane yalnız harita sayfalarına yüklenir |
| `www/` değişikliği kullanıcıya ancak APK güncellemesiyle ulaşır | Beklenen davranış; `docs/` tarafı push ile anında canlıya çıkar |
| OpenFreeMap tek bir gönüllü projesi — kesinti riski | Stil URL'i tek noktada sabit; sağlayıcı değişimi tek satırlık düzenleme olur |
| 38 dosyada CSP düzenlemesi — biri atlanırsa sessizce bozulur | Uygulama sonunda repo geneli `maps.googleapis.com` araması; **0 sonuç** beklenir |

## 10. Doğrulama

Her adım tarayıcıda ölçülür (Playwright), "çalışıyor olmalı" kabul edilmez:

1. `npx http-server docs -c-1` → `http://localhost:8080/harita.html`
2. Konsol **temiz** — CSP ihlali, worker hatası, 404 yok
3. Harita döşemeleri görünüyor, attribution görünür durumda
4. İşaretçi sayısı Supabase'den gelen kayıt sayısıyla eşleşiyor
5. Popup açılıyor, "Profili Gör" bağlantısı doğru `?id=` taşıyor
6. Katman kutuları işaretçileri gizleyip gösteriyor
7. Konum butonu çalışıyor (izin verilince)
8. Repo geneli `maps.googleapis.com` araması → **0 sonuç**
9. `npm run cap:sync` → APK derleme → cihazda SPA haritası

> `harita.html` giriş ister (`PUBLIC_PAGES` listesinde değil). Yerel testte önce
> giriş yapılmalı, yoksa `index.html?auth=login`'e yönlenir.

## 11. Kapsam dışı

- Zengin harita sayfası (arama + kart listesi + ısı haritası) — ayrı iş
- Panel sayfalarına harita eklemek — yeni özellik
- Isı haritası — bilinçli olarak kaldırıldı
- İşaretçi kümeleme (clustering) — mevcut kayıt sayısında gerekmiyor
- Eski Google Cloud projesindeki `AIzaSyDIs6NXw…` ve yeni `AIzaSyA8oru…`
  anahtarlarının silinmesi — konsol işi, kod işi değil; geçiş bitince yapılacak
