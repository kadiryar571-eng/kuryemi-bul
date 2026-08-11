# MapLibre GL + OpenFreeMap Geçişi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Google Maps JS API'yi projeden tamamen kaldırıp yerine anahtar ve ödeme gerektirmeyen MapLibre GL JS + OpenFreeMap koymak.

**Architecture:** İki bağımsız uygulama var. `docs/` (statik web sitesi) içinde tek canlı harita `harita.html`'dedir ve `app.js` içindeki `initMap()` ile kurulur. `www/` (Capacitor SPA) içinde tek canlı harita `shared.js` içindeki `initPremiumMap()`'tir. Ortak modül kurulmaz — tekrarlanan kod yok. MapLibre kütüphanesi CDN'den değil, repoya vendor'lanarak yüklenir.

**Tech Stack:** MapLibre GL JS 5.24.0 (vendored, UMD), OpenFreeMap vektör döşemeleri, Supabase (mevcut), framework yok, build adımı yok.

**Tasarım dökümanı:** [specs/2026-08-11-maplibre-openfreemap-design.md](../2026-08-11-maplibre-openfreemap-design.md)

## Global Constraints

- **`docs/` yayınlanan site köküdür.** İç döküman, spec, plan, test dosyası oraya konmaz.
- **MapLibre koordinat sırası `[lng, lat]`** — Google'ın `{lat, lng}` sırasının tersi. Her dönüşümde kontrol edilecek; ters yazılırsa işaretçiler Türkiye yerine Somali açıklarına düşer.
- **Kütüphane sürümü sabit: `maplibre-gl@5.24.0` (UMD).** `latest` kullanılmaz.
  **6.x KULLANILMAZ:** 6.x UMD build'ini bıraktı, yalnız ESM (`maplibre-gl.mjs`)
  yayınlıyor ve o da `maplibre-gl-shared.mjs` kardeş dosyasına bağımlı. Bu kod
  tabanı baştan sona klasik `<script>` kullanıyor (CLAUDE.md yükleme sırasını
  kural olarak yazmış); `type="module"`'a geçmek global `maplibregl`'i kaybettirir
  ve yükleme sırasını değiştirir. 5.24.0 tek dosya UMD'dir ve aktif sürümdür.
- **WebGL tespiti mesajla yapılır.** 6.x'teki `GPUInitializationError` sınıfı
  5.x'te yoktur; hata `"Failed to initialize WebGL"` mesajıyla gelir.
- **Vendor yolu:** `docs/assets/vendor/maplibre/` ve `www/assets/vendor/maplibre/`.
- **Stil URL'leri:** `docs/` → `https://tiles.openfreemap.org/styles/positron`, `www/` → `https://tiles.openfreemap.org/styles/dark`.
- **CSP'de `worker-src blob:` zorunlu.** MapLibre blob URL'den Web Worker yaratır; eksikse harita hiç açılmaz ve konsoldaki hata başka bir şeyi işaret eder.
- **Kaçış:** başka kullanıcıdan gelen her değer (`ad`, `sehir`, `baslik`, `bolgeler`) DOM'a girmeden `KB.esc()` (kök site) veya `esc()` (SPA) ile kaçırılır. Popup HTML'ine `onclick` yazılmaz — olay dinleyicileri JS tarafında bağlanır. **Yeni yerel `esc()` kopyası tanımlanmaz.**
- **Mock veri yok.** Supabase kapalıysa `loadPool()` boş dizi döner ve harita boş kalır; uydurma işaretçi basılmaz.
- **Attribution kapatılmaz.** MapLibre'ın attribution kontrolü OpenStreetMap + OpenFreeMap atfını gösterir; gizlenmesi politika ihlalidir.
- **Kullanıcıya görünen her metin `KBI18N`'den gelir** (`T("...")`), sabit string yazılmaz.
- Her task sonunda commit.

## Test Yaklaşımı — okumadan başlama

Bu repoda **test çatısı yok** (`package.json`'da test script'i yok, statik site, build adımı yok). Klasik TDD kırmızı-yeşil döngüsü uygulanamaz. Yerine geçen döngü:

1. **Doğrulama harness'ı önce yazılır** — `harita.html`'in CSP'sinin birebir kopyasını taşıyan bir sayfa
2. **Çalıştırılır ve başarısız olduğu görülür** (kütüphane yok / CSP engelliyor)
3. **Uygulama yapılır**
4. **Tekrar çalıştırılır ve geçtiği görülür** — konsol temiz, döşemeler yüklü

Harness scratchpad'e yazılır, repoya **girmez**.

> **`harita.html` giriş ister** (`PUBLIC_PAGES` listesinde yok). Oturumsuz Playwright bu sayfaya giremez, `index.html?auth=login`'e yönlenir. Bu yüzden CSP + döşeme + işaretçi + popup davranışı harness sayfasında doğrulanır; Supabase verisinin gerçekten bağlandığı **giriş yapılmış bir tarayıcıda kullanıcı tarafından** doğrulanır (Task 6, Adım 4).

> **`npx serve` KULLANMAYIN** — `cleanUrls` query string'i düşürür. `npx http-server docs -c-1` kullanılacak.

---

## Task 1: MapLibre kütüphanesini vendor'la

**Files:**
- Create: `docs/assets/vendor/maplibre/maplibre-gl.js`
- Create: `docs/assets/vendor/maplibre/maplibre-gl.css`
- Create: `www/assets/vendor/maplibre/maplibre-gl.js`
- Create: `www/assets/vendor/maplibre/maplibre-gl.css`

**Interfaces:**
- Consumes: —
- Produces: global `window.maplibregl` (UMD, klasik `<script>` ile yüklenir) — `maplibregl.Map`, `maplibregl.Marker`, `maplibregl.Popup`, `maplibregl.NavigationControl`, `maplibregl.LngLatBounds`

- [ ] **Step 1: Paketi indir ve aç**

```bash
mkdir -p /tmp/mlg && cd /tmp/mlg
npm pack maplibre-gl@5.24.0
tar -xzf maplibre-gl-5.24.0.tgz
ls -la package/dist/maplibre-gl.js package/dist/maplibre-gl.css
```

Beklenen: iki dosya da listelenir. `maplibre-gl.js` 1.056.837 bayt (minified UMD), `maplibre-gl.css` 70.024 bayt.

- [ ] **Step 2: Dört hedefe kopyala**

```bash
cd c:/Users/ben/Desktop/websitem
mkdir -p docs/assets/vendor/maplibre www/assets/vendor/maplibre
cp /tmp/mlg/package/dist/maplibre-gl.js  docs/assets/vendor/maplibre/
cp /tmp/mlg/package/dist/maplibre-gl.css docs/assets/vendor/maplibre/
cp /tmp/mlg/package/dist/maplibre-gl.js  www/assets/vendor/maplibre/
cp /tmp/mlg/package/dist/maplibre-gl.css www/assets/vendor/maplibre/
```

- [ ] **Step 3: Sürümü doğrula**

```bash
grep -o '"version":"6\.3\.0"' docs/assets/vendor/maplibre/maplibre-gl.js | head -1
ls -la docs/assets/vendor/maplibre/ www/assets/vendor/maplibre/
```

Beklenen: sürüm eşleşmesi bulunur, dört dosya da yerinde ve boyutları sıfırdan büyük.

- [ ] **Step 4: Commit**

```bash
git add docs/assets/vendor/maplibre www/assets/vendor/maplibre
git commit -m "chore: maplibre-gl 5.24.0 vendor'landi (docs + www)"
```

---

## Task 2: Doğrulama harness'ı — CSP ve döşemeleri kanıtla

Bu task kod değiştirmez. Amacı, uygulamaya başlamadan önce **CSP'nin doğru olduğunu ve OpenFreeMap döşemelerinin gerçekten yüklendiğini** ölçmek. Yanlış CSP ile yazılan harita kodu, hatanın kodda mı CSP'de mi olduğunu belirsizleştirir.

**Files:**
- Create: `<scratchpad>/mlgtest.html` (repoya girmez)

**Interfaces:**
- Consumes: Task 1'in vendor dosyaları
- Produces: doğrulanmış CSP satırları — Task 3 bunları `harita.html`'e birebir kopyalar

- [ ] **Step 1: Harness sayfasını yaz**

`<scratchpad>/mlgtest.html`. CSP, `docs/harita.html`'in mevcut CSP'sinden türetilmiştir: Google host'ları çıkarılmış, OpenFreeMap ve `worker-src` eklenmiştir.

```html
<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src  'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src   'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src    'self' https://fonts.gstatic.com data:;
  img-src     'self' data: blob: https://fdszypytpodndtlbuzuz.supabase.co https://tiles.openfreemap.org;
  media-src   'self' blob: mediastream:;
  connect-src 'self' https://fdszypytpodndtlbuzuz.supabase.co wss://fdszypytpodndtlbuzuz.supabase.co https://tiles.openfreemap.org;
  worker-src  blob:;
  frame-src   'none';
  object-src  'none';
  base-uri    'self';
  form-action 'self';
">
<link rel="stylesheet" href="maplibre-gl.css">
<style>html,body{margin:0;height:100%}#map{height:100%}</style>
</head><body>
<div id="map"></div>
<script src="maplibre-gl.js"></script>
<script>
  window.__t = { loaded: false, gpuError: false, errors: [] };
  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/positron',
    center: [33.5, 39.5],
    zoom: 5.2
  });
  map.on('error', function (e) {
    var msg = (e && e.error && e.error.message) || '';
    if (/webgl/i.test(msg)) { window.__t.gpuError = true; return; }
    window.__t.errors.push(String(msg || e.error));
  });
  map.on('load', function () {
    window.__t.loaded = true;
    var el = document.createElement('div');
    el.style.cssText = 'width:30px;height:30px;border-radius:50%;background:#22D3EE;border:2.5px solid #fff;display:grid;place-items:center';
    el.textContent = '🛵';
    new maplibregl.Marker({ element: el })
      .setLngLat([28.9784, 41.0082])
      .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML('<b>Test</b>'))
      .addTo(map);
  });
</script>
</body></html>
```

- [ ] **Step 2: Vendor dosyalarını harness'ın yanına kopyala ve sunucuyu başlat**

```bash
cp docs/assets/vendor/maplibre/maplibre-gl.js  <scratchpad>/
cp docs/assets/vendor/maplibre/maplibre-gl.css <scratchpad>/
npx http-server <scratchpad> -p 8080 -c-1
```

- [ ] **Step 3: Tarayıcıda ölç**

Playwright ile `http://localhost:8080/mlgtest.html` açılır, harita yüklenmesi beklenir, sonra:

```js
() => ({ t: window.__t, canvas: !!document.querySelector('#map canvas') })
```

Beklenen: `loaded: true`, `gpuError: false`, `errors: []`, `canvas: true`.
Konsolda **CSP ihlali, worker hatası veya 404 olmamalı**.

Ayrıca ağ isteklerinde `tiles.openfreemap.org` adresine giden ve **200** dönen istekler görünmeli.

- [ ] **Step 4: Başarısızlık halinde teşhis**

| Belirti | Sebep | Düzeltme |
|---|---|---|
| Konsolda `worker-src` / `blob:` CSP ihlali | `worker-src blob:` eksik | CSP'ye ekle |
| Döşeme istekleri engellendi | `connect-src`'de `tiles.openfreemap.org` yok | ekle |
| Harita gri, sprite/ikon yok | `img-src`'de `tiles.openfreemap.org` yok | ekle |
| `gpuError: true` | Tarayıcıda WebGL yok | Playwright'ı GPU destekli başlat; gerçek cihazda sorun değil |

**Bu adım geçmeden Task 3'e geçilmez.** Doğrulanan CSP bloğu Task 3'te birebir kullanılır.

- [ ] **Step 5: Commit yok**

Harness scratchpad'de, repoda değil. Commit edilecek bir şey yok.

---

## Task 3: `docs/harita.html` + `app.js` — MapLibre'a geçiş

**Files:**
- Modify: `docs/harita.html` (CSP bloğu; `:154-161` script sırası; `:163-223` Google bloğu)
- Modify: `docs/assets/js/app.js` (`:1396-1479` `initMapGoogle` → yeni `initMap`)
- Modify: `docs/assets/js/i18n.js` (yeni `map.unsupported` anahtarı, tr + en)

**Interfaces:**
- Consumes: `window.maplibregl` (Task 1), doğrulanmış CSP (Task 2), mevcut `loadPool(type)`, `KB.esc()`, `T()`, `KBMotion.showErrorToast()`
- Produces: `KBApp.initMap()` — argümansız, `Promise<void>`; `#map` elemanı yoksa sessizce döner

- [ ] **Step 1: i18n anahtarlarını ekle (üçü birden)**

`docs/assets/js/i18n.js` içindeki `DICT` objesine, `map.viewProfile` anahtarının yanına.

`tr` bloğuna:

```js
"map.unsupported": "Harita bu cihazda gösterilemiyor.",
"map.noGeo":       "Konum desteklenmiyor.",
"map.locFailed":   "Konum alınamadı:",
```

`en` bloğuna:

```js
"map.unsupported": "The map cannot be displayed on this device.",
"map.noGeo":       "Geolocation is not supported.",
"map.locFailed":   "Could not get location:",
```

Üçü de Step 2'deki kodda kullanılıyor — biri eksik kalırsa ekranda anahtar adı görünür.

- [ ] **Step 2: `initMapGoogle`'ı yeni `initMap` ile değiştir**

`docs/assets/js/app.js:1396-1479` arası tamamen silinir, yerine:

```js
  /* ============ HARİTA (MapLibre GL + OpenFreeMap) ============ */
  var MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

  var MAP_PIN = {
    kurye:   { color: "#22D3EE", emoji: "🛵", page: "profil-kurye.html" },
    isletme: { color: "#4f8bff", emoji: "📦", page: "profil-isletme.html" },
    firma:   { color: "#a855f7", emoji: "🏢", page: "profil-firma.html" }
  };

  /* İşaretçi DOM elemanı. MapLibre custom marker'ı bir HTMLElement ister —
     Google'daki SVG symbol path karşılığı budur. */
  function mapPinEl(type) {
    var cfg = MAP_PIN[type];
    var el = document.createElement("div");
    el.className = "kb-map-pin";
    el.style.cssText = "width:30px;height:30px;border-radius:50%;background:" + cfg.color +
      ";border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);" +
      "display:grid;place-items:center;font-size:15px;cursor:pointer";
    el.textContent = cfg.emoji;
    return el;
  }

  /* DİKKAT: item.ad / item.sehir / item.bolgeler başka kullanıcıdan gelir.
     Hepsi KB.esc()'ten geçer. Popup içine onclick YAZILMAZ. */
  function mapPopupHtml(item, type) {
    var cfg = MAP_PIN[type];
    var yer = item.sehir ? item.sehir : (item.bolgeler || []).join(", ");
    return '<div class="map-popup">' +
      '<b>' + cfg.emoji + ' ' + KB.esc(item.ad) + '</b><br>' +
      '<span class="map-popup__sub">' + KB.esc(yer) + '</span><br>' +
      '<a href="' + cfg.page + '?id=' + encodeURIComponent(item.id) + '">' +
        T("map.viewProfile") + '</a>' +
      '</div>';
  }

  async function initMap() {
    var el = document.getElementById("map");
    if (!el || typeof maplibregl === "undefined") return;

    var map = new maplibregl.Map({
      container: el,
      style: MAP_STYLE,
      center: [33.5, 39.5],   /* [lng, lat] — Google'ın {lat,lng} sırasının TERSİ */
      zoom: 5.2
    });

    /* WebGL yoksa MapLibre 5.x "Failed to initialize WebGL" mesajlı bir hata
       fırlatır. 6.x'teki GPUInitializationError sınıfı 5.x'te YOK — mesaja
       bakmak zorundayız. */
    var gpuFailed = false;
    map.on("error", function (e) {
      var msg = (e && e.error && e.error.message) || "";
      if (/webgl/i.test(msg)) {
        gpuFailed = true;
        el.innerHTML = '<div class="empty">' + T("map.unsupported") + '</div>';
        return;
      }
      console.error("Map error:", e.error);
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    var layers = { kurye: [], isletme: [], firma: [] };

    function addMarkers(items, type) {
      items.forEach(function (x) {
        if (x.lat == null || x.lng == null) return;
        var marker = new maplibregl.Marker({ element: mapPinEl(type) })
          .setLngLat([+x.lng, +x.lat])
          .setPopup(new maplibregl.Popup({ offset: 18 }).setHTML(mapPopupHtml(x, type)))
          .addTo(map);
        layers[type].push(marker);
      });
    }

    try {
      var kData = await loadPool("kurye");
      var iData = await loadPool("isletme");
      var fData = await loadPool("firma");
      if (gpuFailed) return;

      addMarkers(kData, "kurye");
      addMarkers(iData, "isletme");
      addMarkers(fData, "firma");

      document.querySelectorAll("[data-layer]").forEach(function (cb) {
        cb.addEventListener("change", function () {
          var type = cb.getAttribute("data-layer");
          layers[type].forEach(function (m) {
            m.getElement().style.display = cb.checked ? "" : "none";
          });
        });
      });
    } catch (e) {
      console.error("Map error:", e);
    }

    initLocateButton(map);
  }

  /* Konum butonu — eskiden harita.html içindeki inline script'teydi.
     Google Circle yerine GeoJSON poligon kullanılıyor: MapLibre'ın circle
     katmanı yarıçapı PİKSEL alır, metre değil; zoom değişince doğruluk
     çemberi yanlış boyutta kalırdı. */
  function accuracyPolygon(lng, lat, meters) {
    var coords = [], steps = 64;
    var dLat = meters / 111320;
    var dLng = meters / (111320 * Math.cos(lat * Math.PI / 180));
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * 2 * Math.PI;
      coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
    }
    return { type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} };
  }

  function initLocateButton(map) {
    var btn = document.getElementById("locateBtn");
    if (!btn) return;
    var locMarker = null;

    btn.addEventListener("click", function () {
      if (!navigator.geolocation) {
        if (window.KBMotion) KBMotion.showErrorToast(T("map.noGeo"));
        return;
      }
      btn.classList.add("locating");
      navigator.geolocation.getCurrentPosition(function (pos) {
        btn.classList.remove("locating");
        var lng = pos.coords.longitude, lat = pos.coords.latitude;

        if (locMarker) locMarker.remove();
        var dot = document.createElement("div");
        dot.style.cssText = "width:18px;height:18px;border-radius:50%;background:#0057FF;" +
          "border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)";
        locMarker = new maplibregl.Marker({ element: dot }).setLngLat([lng, lat]).addTo(map);

        var gj = accuracyPolygon(lng, lat, pos.coords.accuracy || 200);
        if (map.getSource("kb-accuracy")) {
          map.getSource("kb-accuracy").setData(gj);
        } else {
          map.addSource("kb-accuracy", { type: "geojson", data: gj });
          map.addLayer({
            id: "kb-accuracy-fill", type: "fill", source: "kb-accuracy",
            paint: { "fill-color": "#0057FF", "fill-opacity": 0.1 }
          });
          map.addLayer({
            id: "kb-accuracy-line", type: "line", source: "kb-accuracy",
            paint: { "line-color": "#0057FF", "line-opacity": 0.25, "line-width": 1 }
          });
        }

        map.flyTo({ center: [lng, lat], zoom: 13 });
      }, function (err) {
        btn.classList.remove("locating");
        if (window.KBMotion) KBMotion.showErrorToast(T("map.locFailed") + " " + err.message);
      }, { enableHighAccuracy: true, timeout: 8000 });
    });
  }
```

- [ ] **Step 3: `KBApp` export'unu güncelle**

`docs/assets/js/app.js:2781` satırında `initMapGoogle: initMapGoogle,` kaldırılır. `initMap: initMap,` zaten var ve artık yeni fonksiyonu gösteriyor.

- [ ] **Step 4: `harita.html` CSP'sini değiştir**

`:9-21` arasındaki CSP bloğunda:
- `script-src`'den `https://maps.googleapis.com` **silinir**
- `img-src`'den `https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com` **silinir**, `https://tiles.openfreemap.org` **eklenir**
- `connect-src`'den `https://maps.googleapis.com` **silinir**, `https://tiles.openfreemap.org` **eklenir**
- `object-src`'den önce `worker-src  blob:;` satırı **eklenir**

Sonuç Task 2'de doğrulanan blokla birebir aynı olmalı.

- [ ] **Step 5: `harita.html` script'lerini değiştir**

`:27` civarındaki stylesheet satırının altına:

```html
  <link rel="stylesheet" href="assets/vendor/maplibre/maplibre-gl.css">
```

`:163-223` arasındaki **tüm Google bloğu** (`<!-- Google Maps API -->` yorumu, `__gmapsReady` inline script'i ve Google script etiketi) silinir, yerine:

```html
  <script src="assets/vendor/maplibre/maplibre-gl.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      if (window.KBApp && KBApp.initMap) KBApp.initMap();
    });
  </script>
```

`maplibre-gl.js` senkron yüklenir; `async defer` + callback mekanizmasına gerek yok.

- [ ] **Step 6: Sözdizimi kontrolü**

```bash
node --check docs/assets/js/app.js && node --check docs/assets/js/i18n.js && echo "SYNTAX OK"
```

Beklenen: `SYNTAX OK`.

- [ ] **Step 7: Google izi kalmadığını doğrula**

```bash
grep -n "google\|gmaps\|AIzaSy" docs/harita.html
```

Beklenen: **çıktı yok**.

- [ ] **Step 8: Commit**

```bash
git add docs/harita.html docs/assets/js/app.js docs/assets/js/i18n.js
git commit -m "feat: harita.html MapLibre GL + OpenFreeMap'e gecti"
```

---

## Task 4: `docs/` ölü harita kodunu sil

**Files:**
- Modify: `docs/assets/js/app.js` — 4 fonksiyon + 1 çağrı

**Interfaces:**
- Consumes: Task 3'ün bıraktığı `initMap()`
- Produces: `KBApp` export'unda yalnızca `initMap` kalır; `initHomeMap`, `initMapExperience`, `initMapGoogle` artık yok

- [ ] **Step 1: Ölü fonksiyonları sil**

Sıra önemli — satır numaraları silme sırasında kayar, **aşağıdan yukarıya** silinir:

| Sil | Yaklaşık satır | Neden ölü |
|---|---|---|
| `initMapExperience()` | `:1867` – `:2210` | Hiçbir sayfa çağırmıyor; `.mx-*` CSS'i yok; `var map` iki kez tanımlı |
| `initHomeMap()` + `homeMarker()` | `:1586` – `:1627` | `#map` yalnız `harita.html`'de var, orası da artık `initMap()` kullanıyor |
| `initPanelMap()` | `:1482` – `:1583` | `panelMapKurye/Isletme/Firma` id'leri hiçbir HTML'de yok |
| eski Leaflet `initMap()` | `:1357` – `:1393` | Leaflet kütüphanesi hiçbir sayfada yüklenmiyor |

- [ ] **Step 2: `initPanel` içindeki çağrıyı kaldır**

`docs/assets/js/app.js:1775` civarındaki satır silinir:

```js
          setTimeout(function() { initPanelMap(role); }, 100);
```

Etrafındaki `if` bloğu bu çağrıdan başka bir şey içermiyorsa o da silinir.

- [ ] **Step 3: `KBApp` export'unu temizle**

`:2781` satırı şuna iner:

```js
    initMap: initMap, initPanel: initPanel, openOfferModal: openOfferModal,
```

- [ ] **Step 4: Artık referans kalmadığını doğrula**

```bash
grep -n "initMapGoogle\|initPanelMap\|initHomeMap\|initMapExperience\|homeMarker" docs/ -r
grep -rn "typeof L ===\|L\.map(\|L\.tileLayer" docs/
node --check docs/assets/js/app.js && echo "SYNTAX OK"
```

Beklenen: ilk iki komut **çıktı vermez**, üçüncüsü `SYNTAX OK`.

- [ ] **Step 5: Panel sayfalarının bozulmadığını doğrula**

`npx http-server docs -c-1` ile `panel-kurye.html` açılır (giriş gerekiyorsa kullanıcı oturumuyla). Konsolda `initPanelMap is not defined` benzeri bir hata **olmamalı**.

- [ ] **Step 6: Commit**

```bash
git add docs/assets/js/app.js
git commit -m "refactor: olu harita kodu kaldirildi (4 fonksiyon, ~450 satir)"
```

---

## Task 5: Kalan 37 `docs/*.html` dosyasında CSP temizliği

**Files:**
- Modify: `docs/*.html` — `harita.html` ve `auth-callback.html` hariç 37 dosya

**Interfaces:**
- Consumes: —
- Produces: `docs/` altında `maps.googleapis.com` referansı kalmaz

- [ ] **Step 1: Hedef dosyaları listele**

```bash
grep -l "maps.googleapis.com" docs/*.html
```

Beklenen: 37 dosya (Task 3'ten sonra `harita.html` listede olmamalı; `auth-callback.html`'in CSP'si vardır ama en dar biçimdedir — `default-src 'self'`, harita host'ları hiç listelenmemiş — o yüzden listeye girmez).

- [ ] **Step 2: Google host'larını sil**

Bu dosyalarda **yalnızca silme** yapılır, ekleme yok — hiçbirinde harita yok.

`script-src` satırından: ` https://maps.googleapis.com`
`img-src` satırından: ` https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.ggpht.com`
`connect-src` satırından: ` https://maps.googleapis.com`

```bash
for f in $(grep -l "maps.googleapis.com" docs/*.html); do
  sed -i 's| https://maps\.googleapis\.com||g; s| https://maps\.gstatic\.com||g; s| https://\*\.googleapis\.com||g; s| https://\*\.ggpht\.com||g' "$f"
done
```

- [ ] **Step 3: Doğrula**

```bash
grep -rn "googleapis\|gstatic\|ggpht" docs/*.html
```

Beklenen: **yalnızca** `https://fonts.googleapis.com` (style-src) ve `https://fonts.gstatic.com` (font-src) satırları kalmalı. Bunlar Google Fonts'tur, haritayla ilgisi yok, **silinmez**.

`maps.googleapis.com`, `maps.gstatic.com`, `*.ggpht.com` için **sıfır sonuç**.

- [ ] **Step 4: Bir sayfayı tarayıcıda aç**

`npx http-server docs -c-1` → `http://localhost:8080/kvkk.html` (misafire açık bir sayfa). Konsol temiz olmalı; CSP ihlali görünmemeli.

- [ ] **Step 5: Commit**

```bash
git add docs/
git commit -m "chore: Google Maps host'lari 37 sayfanin CSP'sinden temizlendi"
```

---

## Task 6: `www/` SPA — MapLibre'a geçiş, ısı haritası kaldırma

**Files:**
- Modify: `www/index.html` (CSP `:11-21`; script bloğu `:53-55`)
- Modify: `www/assets/js/screens/shared.js` (`initPremiumMap` `:1539` sonrası)
- Modify: `www/assets/js/screens/kurye.js:321`, `firma.js:212`, `isletme.js:204`

**Interfaces:**
- Consumes: `window.maplibregl` (Task 1), mevcut `esc()`, `SB.pool()`, `SB.openListings()`
- Produces: `window.initPremiumMap(role)` — `_spmMapsReady` bayrağına artık ihtiyaç duymaz

- [ ] **Step 1: `www/index.html` CSP'sini güncelle**

Task 3 Step 4'teki aynı düzenleme: Google host'ları silinir, `tiles.openfreemap.org` `img-src` ve `connect-src`'ye eklenir, `worker-src blob:` eklenir.

- [ ] **Step 2: `www/index.html` script bloğunu değiştir**

`:53-55` arasındaki üç satır (`window._spmMapsReady=false`, Google script etiketi, `__spmMapsReady` fonksiyonu) silinir, yerine:

```html
  <link rel="stylesheet" href="assets/vendor/maplibre/maplibre-gl.css">
  <script src="assets/vendor/maplibre/maplibre-gl.js"></script>
```

`<link>` `<head>` içine, `<script>` `util.js`'ten sonraki konuma konur.

- [ ] **Step 3: Ekran dosyalarındaki hazır-bekleme koşulunu sadeleştir**

`kurye.js:321`, `firma.js:212`, `isletme.js:204` — üçünde de aynı desen:

```js
    if (window._spmMapsReady && window.initPremiumMap) {
      setTimeout(function() { window.initPremiumMap('kurye'); }, 200);
    }
```

şuna iner (rol adı her dosyada kendi rolüdür):

```js
    if (window.initPremiumMap) {
      setTimeout(function() { window.initPremiumMap('kurye'); }, 200);
    }
```

> `setTimeout` **korunur** — `renderScreen` 120 ms'lik geçiş gecikmesi kullanıyor; kaldırılırsa `#spm-map` henüz DOM'da olmaz.

- [ ] **Step 4: `shared.js` — harita kurulumunu değiştir**

`:1539-1543` arasındaki Google hazır-kontrolü:

```js
window.initPremiumMap = async function(role) {
  if (typeof google === 'undefined' || !google.maps) {
    window._spmPendingRole = role;
    return;
  }
```

şuna iner:

```js
window.initPremiumMap = async function(role) {
  if (typeof maplibregl === 'undefined') return;
```

`:1556` satırındaki `heatLeg` ve `:1559` satırındaki `heatBtn` değişken tanımları silinir.

`:1563-1590` arasındaki `DARK_STYLE` dizisi ve `new google.maps.Map(...)` çağrısı tamamen silinir, yerine:

```js
  var ISTANBUL = [28.979, 41.015];   /* [lng, lat] */

  var map = new maplibregl.Map({
    container: mapEl,
    style: 'https://tiles.openfreemap.org/styles/dark',
    center: ISTANBUL,
    zoom: 11
  });

  map.on('error', function(e) {
    var msg = (e && e.error && e.error.message) || '';
    if (/webgl/i.test(msg)) {
      mapEl.innerHTML = '<div class="spm-empty">Harita bu cihazda gösterilemiyor.</div>';
      return;
    }
    console.error('Map error:', e.error);
  });
```

- [ ] **Step 5: `pinIcon` → DOM elemanı**

`:1661-1671` arasındaki `pinIcon()` fonksiyonu, Google'ın `{url, scaledSize, anchor}` nesnesi yerine bir `HTMLElement` döndürür:

```js
  function pinEl(it, sel) {
    var cfg = PIN[it.type], s = sel ? 56 : 44, r = sel ? 17 : 13, c = s / 2;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + (r+9) + '" fill="' + cfg.color + '" fill-opacity="0.15"/>' +
      (sel ? '<circle cx="' + c + '" cy="' + c + '" r="' + (r+16) + '" fill="' + cfg.color + '" fill-opacity="0.07"/>' : '') +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="' + cfg.color + '" fill-opacity="' + (sel ? '1' : '0.88') + '"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="white" stroke-opacity="0.85" stroke-width="' + (sel ? '2.5' : '2') + '"/>' +
      '<text x="' + c + '" y="' + c + '" font-size="' + (sel ? 14 : 11) + '" text-anchor="middle" dominant-baseline="central">' + cfg.emoji + '</text>' +
      '</svg>';
    var el = document.createElement('div');
    el.style.cssText = 'width:' + s + 'px;height:' + s + 'px;cursor:pointer';
    el.innerHTML = svg;   /* içerik sabit — kullanıcı verisi YOK, emoji ve renk sabitlerden gelir */
    return el;
  }
```

- [ ] **Step 6: `renderMarkers` ve `select` fonksiyonlarını çevir**

```js
  function renderMarkers(list) {
    Object.keys(markers).forEach(function(k) { markers[k].remove(); });
    markers = {};
    list.forEach(function(it) {
      var m = new maplibregl.Marker({ element: pinEl(it, it.key === selectedKey) })
        .setLngLat([it.lng, it.lat])
        .addTo(map);
      m._it = it;
      m.getElement().addEventListener('click', function() { select(it.key, true); });
      markers[it.key] = m;
    });
  }

  function select(key, fromMap) {
    selectedKey = key;
    /* MapLibre'da ikon değiştirmek yok — işaretçi yeniden çizilir */
    Object.keys(markers).forEach(function(k) {
      var m = markers[k];
      if (!m || !m._it) return;
      var fresh = pinEl(m._it, k === key);
      var old = m.getElement();
      old.style.cssText = fresh.style.cssText;
      old.innerHTML = fresh.innerHTML;
    });
    if (key && markers[key]) map.flyTo({ center: markers[key].getLngLat() });
    if (key && scrollEl) {
      var card = scrollEl.querySelector('[data-mxkey="' + key + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    if (scrollEl) {
      scrollEl.querySelectorAll('.mx-bcard').forEach(function(c) {
        c.classList.toggle('is-selected', c.getAttribute('data-mxkey') === key);
      });
    }
  }
```

- [ ] **Step 7: Isı haritasını kaldır**

Silinecekler:
- `:1623` — `var heatLayer = null, heatmapOn = false;`
- `:1734-1737` — `toggleHeatmap()` fonksiyonunun tamamı
- `:1742` — `refresh()` içindeki `toggleHeatmap(list);` çağrısı
- `:1774` — `heatBtn` olay dinleyicisi satırı
- `:1556` — `heatLeg` tanımı (Step 4'te silindi)

`www/index.html` veya `shared.js` içindeki `spmHeatBtn` / `spmHeatLegend` **HTML elemanları** da silinir:

```bash
grep -rn "spmHeatBtn\|spmHeatLegend\|HeatLegend" www/
```

Bulunan her yer temizlenir.

- [ ] **Step 8: Kullanıcı konumu işaretçisini çevir**

`:1759-1760` arası:

```js
      if (userMarker) userMarker.remove();
      var dot = document.createElement('div');
      dot.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#3b82f6;' +
        'border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)';
      userMarker = new maplibregl.Marker({ element: dot })
        .setLngLat([userLng, userLat]).addTo(map);
```

- [ ] **Step 9: `fitBounds` çağrısını çevir**

`:1787` civarındaki `new google.maps.LatLngBounds()` kullanımı:

```js
    var pts = list.filter(function(it) { return it.lat != null && it.lng != null; });
    if (!pts.length) return;
    var b = new maplibregl.LngLatBounds([pts[0].lng, pts[0].lat], [pts[0].lng, pts[0].lat]);
    pts.forEach(function(it) { b.extend([it.lng, it.lat]); });
    map.fitBounds(b, { padding: 50, maxZoom: 13 });
```

- [ ] **Step 10: Google izi kalmadığını doğrula**

```bash
grep -rn "google\.maps\|_spmMapsReady\|heatmapOn\|toggleHeatmap" www/
node --check www/assets/js/screens/shared.js && echo "SYNTAX OK"
```

Beklenen: ilk komut **çıktı vermez**, ikincisi `SYNTAX OK`.

- [ ] **Step 11: SPA'yı tarayıcıda doğrula**

```bash
npx http-server www -p 8081 -c-1
```

`http://localhost:8081/` açılır, giriş yapılır, harita ekranına gidilir. Kontroller:
- Koyu döşemeler yükleniyor
- İşaretçiler doğru konumda (Türkiye'de, denizde değil — `[lng,lat]` sırası kontrolü)
- İşaretçiye tıklayınca kart seçiliyor, işaretçi büyüyor
- Arama ve katman çipleri çalışıyor
- Isı haritası düğmesi **artık yok**
- Konsol temiz

- [ ] **Step 12: Commit**

```bash
git add www/
git commit -m "feat: www SPA MapLibre GL + OpenFreeMap'e gecti, isi haritasi kaldirildi"
```

---

## Task 7: Dökümantasyon ve son doğrulama

**Files:**
- Modify: `README.md`
- Modify: `docs/gizlilik.html:63`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: Task 1-6 sonuçları
- Produces: —

- [ ] **Step 1: `README.md`**

`:14` satırı:

```
- **Harita:** Leaflet + OpenStreetMap, 3 katmanlı işaretçiler, bölge filtresi
```

→

```
- **Harita:** MapLibre GL + OpenFreeMap (OpenStreetMap verisi), 3 katmanlı işaretçiler, bölge filtresi
```

- [ ] **Step 2: `docs/gizlilik.html:63`**

```html
<li><b>OpenStreetMap / Leaflet</b> — harita gösterimi</li>
```

→

```html
<li><b>OpenFreeMap / MapLibre GL</b> — harita gösterimi (OpenStreetMap verisi)</li>
```

- [ ] **Step 3: `CLAUDE.md`**

İki yer güncellenir:

1. Script yükleme sırası bölümüne not: harita olan sayfalar `assets/vendor/maplibre/maplibre-gl.js` dosyasını `app.js`'ten **önce** yükler.
2. Yeni bir "Harita" alt bölümü:

```markdown
### Harita

MapLibre GL JS 5.24.0 (vendor'lanmış, `assets/vendor/maplibre/`) + OpenFreeMap
vektör döşemeleri. **Anahtar yok, hesap yok, kota yok.**

- `docs/` → `https://tiles.openfreemap.org/styles/positron` (açık tema)
- `www/`  → `https://tiles.openfreemap.org/styles/dark` (koyu tema)

CSP'de `worker-src blob:` **zorunludur** — MapLibre blob URL'den Web Worker
yaratır; eksikse harita hiç açılmaz ve konsoldaki hata başka bir şeyi işaret eder.

**Koordinat sırası `[lng, lat]`** — Google Maps'in `{lat, lng}` sırasının tersi.
Ters yazılırsa işaretçiler Türkiye yerine Somali açıklarına düşer.

Google Maps kaldırıldı: faturalandırma zorunluluğu (Türkiye'de ₺1.500 tek
seferlik ön ödeme) nedeniyle. Gerekçe: `specs/2026-08-11-maplibre-openfreemap-design.md`
```

- [ ] **Step 4: Repo geneli son kontrol**

```bash
grep -rn "maps\.googleapis\.com\|AIzaSy\|google\.maps" --include=*.html --include=*.js --include=*.md . | grep -v node_modules | grep -v "^./specs/"
```

Beklenen: **sıfır sonuç**. (`specs/` altındaki tasarım dökümanı tarihsel kayıt olarak Google'dan bahseder, o hariç tutulur.)

- [ ] **Step 5: Kullanıcı doğrulaması — giriş yapılmış tarayıcı**

Bu adım otomatikleştirilemez; `harita.html` giriş ister.

Kullanıcı `https://kuryemibul.com/harita.html` adresine (veya yerelde giriş yaptıktan sonra) girer ve şunları doğrular:
- Harita açılıyor, döşemeler yükleniyor
- İşaretçiler Türkiye üzerinde, doğru şehirlerde
- İşaretçiye tıklayınca popup açılıyor; ad, şehir ve "Profili Gör" bağlantısı doğru
- Bağlantı doğru profile gidiyor
- Katman kutuları işaretçileri gizleyip gösteriyor
- Konum butonu çalışıyor, mavi nokta ve doğruluk çemberi çiziliyor
- Attribution (OpenStreetMap / OpenFreeMap) sağ altta görünüyor

- [ ] **Step 6: Commit**

```bash
git add README.md docs/gizlilik.html CLAUDE.md
git commit -m "docs: harita yigini MapLibre + OpenFreeMap olarak guncellendi"
```

---

## Task 8: APK yeniden derleme (mobil dağıtım)

`www/` değişiklikleri kullanıcıya ancak yeni APK ile ulaşır.

**Files:** — (kaynak değişikliği yok)

- [ ] **Step 1: Sync**

```bash
npm run cap:sync
```

- [ ] **Step 2: Vendor dosyalarının native tarafa geçtiğini doğrula**

```bash
ls -la android/app/src/main/assets/public/assets/vendor/maplibre/
```

Beklenen: `maplibre-gl.js` ve `maplibre-gl.css` yerinde.

- [ ] **Step 3: Release derleme**

`assembleDebug` **kullanılmaz** — `debuggable="true"` taşır ve herkeste bulunan debug anahtarıyla imzalıdır. CI yalnız `assembleRelease` üretir.

- [ ] **Step 4: Cihazda doğrula**

APK yüklenir, harita ekranına gidilir: koyu döşemeler yükleniyor mu, işaretçiler doğru konumda mı, konum butonu çalışıyor mu.

> İnternet gerektirir — döşemeler ağdan gelir. Çevrimdışı APK'da harita boş kalır; bu beklenen davranıştır.

---

## Sırayla bağımlılıklar

```
Task 1 (vendor)
   └── Task 2 (harness — CSP'yi kanıtla)
          └── Task 3 (harita.html + app.js)
                 ├── Task 4 (ölü kod)
                 └── Task 5 (37 CSP)
   └── Task 6 (www SPA)   ← Task 1'den sonra, Task 3'ten bağımsız
                 └── Task 7 (döküman + son kontrol)
                        └── Task 8 (APK)
```

Task 3 ve Task 6 farklı uygulamalara dokunur, paralel yürütülebilir. Task 7 hepsinin bitmesini bekler.
