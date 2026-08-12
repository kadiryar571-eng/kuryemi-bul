# Uygulama Kabuğu ve Panel Dili — Uygulama Planı

> **Ajan işçiler için:** GEREKLİ ALT BECERİ: Bu planı görev görev uygulamak için
> `superpowers:subagent-driven-development` (önerilen) veya
> `superpowers:executing-plans` kullanın. Adımlar takip için `- [ ]` kutucuğu
> kullanır.

**Hedef:** Uygulama kabuğunu (topbar + sidebar) ve panel bileşen sözlüğünü
yenileyip 33 sayfada tutarlı hale getirmek; `panel-firma.html`'i bu dile
uydurmak ve yol boyunca doğrulanmış üç hatayı düzeltmek.

**Mimari:** Kabuk ve bileşenler `main.css`'te token'a bağlı tanımlıdır; bu yüzden
sayfaya özel stil bloğu YAZILMAZ — `main.css`'e yapılan değişiklik 33 sayfaya
kendiliğinden yayılır. `components.js` yalnız iki yerde değişir (topbar markup'ı,
footer yılı); tüm render/olay mantığı olduğu gibi kalır.

**Teknoloji:** Framework yok, derleme adımı yok. Düz HTML + CSS + ES5 uyumlu JS.
Doğrulama tarayıcıda elle/Playwright ile yapılır.

**Tasarım dokümanı:** `specs/2026-08-13-app-kabugu-panel-dili-design.md`

## Global Kısıtlar

- Kapsam yalnız `docs/`. `www/` (Capacitor APK) **hiç ellenmez**.
- App tarafı **açık temada kalır**; `[data-theme="dark"]` toggle'ı çalışmaya
  devam eder. Her yeni renk kuralı dark modda da kontrol edilir.
- Yerel sunucu **`npx http-server docs -c-1`**. `npx serve` **YASAK** — query
  string düşürüp `?auth=` parametresini yok ediyor.
- Projede build/lint/typecheck/test **yoktur**. Doğrulama tarayıcıdadır.
- Dokunulmaz: tüm JS iş mantığı, `id` sözleşmeleri, `data-tab`/`data-role`
  kancaları, rotalar, `runSessionGuard`, Supabase şeması ve çağrıları.
- Test hesabı (firma rolü): `oguzhanyar178@gmail.com` / `0123456`
- Her görev sonunda commit atılır. Push yalnız kullanıcı isteyince.

---

### Görev 1: Footer'daki sabit yılı düzelt

En küçük ve bağımsız iş; 33 sayfayı birden etkiliyor.

**Dosyalar:**
- Değiştir: `docs/assets/js/components.js:422-425`

**Arayüzler:**
- Üretir: davranış değişikliği yok, yalnız metin. Sonraki görevler bağımlı değil.

- [ ] **Adım 1: Mevcut hatayı tarayıcıda gör**

```bash
npx http-server docs -c-1 -p 8231 --silent
```

Giriş yap (test hesabı) → `panel-firma.html` → sayfanın en altı.
Beklenen (hatalı hâli): `© 2025 KuryemiBul · KVKK · Gizlilik · Şartlar`

- [ ] **Adım 2: Yılı dinamik yap**

`components.js` içinde `renderFooter()` fonksiyonundaki satırı değiştir:

```js
  function renderFooter() {
    var el = document.getElementById('app-footer');
    if (!el) return;
    if (isAuthPage()) { el.innerHTML = ''; return; }
    /* Yıl çalışma anında üretilir; sabit yazılırsa her yıl başında eskiyor
       ve girişli kullanıcı 33 sayfada yanlış yıl görüyordu. */
    var yil = new Date().getFullYear();
    el.innerHTML =
      '<footer style="background:var(--surface);border-top:1px solid var(--border);padding:20px 24px;text-align:center;font-size:.8125rem;color:var(--text-3);margin-top:auto">' +
        '© ' + yil + ' KuryemiBul · <a href="kvkk.html">KVKK</a> · <a href="gizlilik.html">Gizlilik</a> · <a href="sartlar.html">Şartlar</a>' +
      '</footer>';
  }
```

- [ ] **Adım 3: Tarayıcıda doğrula**

Sayfayı yenile. Beklenen: `© 2026 KuryemiBul · …`
Konsolda yeni hata olmamalı.

- [ ] **Adım 4: Commit**

```bash
git add docs/assets/js/components.js
git commit -m "fix: app footer'inda sabit 2025 yili dinamiklestirildi"
```

---

### Görev 2: `.kb-badge` bileşeni

Rozet stili şu an 4 yerde inline tekrarlanıyor, yalnız rengi değişiyor.

**KRİTİK:** JS rozetleri farklı `display` değerleriyle açıyor —
`notifications.js:107` → `'inline-flex'`, `panel-firma.html:450/455/491` →
`'inline'`. Bu yüzden sınıf **`display` özelliğini TANIMLAMAMALI**; görünüm
`padding` + `line-height` + `border-radius` ile kurulmalı ki her iki değerde de
doğru görünsün. Sınıfa `display` yazılırsa JS'in inline ataması onu ezer.

**Dosyalar:**
- Değiştir: `docs/assets/css/main.css` (§9 BADGE/CHİP bölümünün sonuna ekle)
- Değiştir: `docs/panel-firma.html:138-140`
- Değiştir: `docs/assets/js/components.js:231`

**Arayüzler:**
- Üretir: `.kb-badge` ve varyantları `.kb-badge--primary`, `.kb-badge--error`,
  `.kb-badge--warning`, `.kb-badge--dot`. Görev 3 ve 6 bunları kullanır.

- [ ] **Adım 1: Sınıfı `main.css`'e ekle**

`main.css` §9 (BADGE / CHİP) bölümünün sonuna:

```css
/* Sayaç rozeti — buton içi ve ikon üstü kullanım.
   display TANIMLANMAZ: JS bu rozetleri açarken kimi yerde 'inline',
   kimi yerde 'inline-flex' yazıyor (notifications.js:107,
   panel-firma.html:450). Sınıf display'e bağlanırsa inline atama onu ezer
   ve hizalama bozulur. Görünüm padding + line-height ile kuruluyor. */
.kb-badge {
  padding: 1px 6px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.55;
  color: #fff;
  background: var(--primary);
  margin-left: 4px;
  vertical-align: middle;
}
.kb-badge--primary { background: var(--primary); }
.kb-badge--error   { background: var(--error); }
.kb-badge--warning { background: var(--warning); color: #7A4A00; }

/* İkon üstünde duran sayaç (topbar zil). Konumlandırma burada;
   JS 'inline-flex' yazdığı için ortalama flex ile çalışır. */
.kb-badge--dot {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  margin-left: 0;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  line-height: 1;
  pointer-events: none;
}
```

- [ ] **Adım 2: `panel-firma.html`'deki üç rozeti sınıfa çevir**

`:138-140` satırlarını değiştir. `id` ve `style="display:none"` **KALIR** —
JS başlangıç durumunu ondan okuyor:

```html
          <a href="basvurular.html"  class="btn btn--secondary">Başvurular <span id="panelHiringBadge" class="kb-badge kb-badge--primary" style="display:none"></span></a>
          <a href="mesajlar.html"    class="btn btn--ghost">Mesajlar <span id="panelMsgBadge" class="kb-badge kb-badge--error" style="display:none"></span></a>
          <a href="geri-bildirim.html" class="btn btn--ghost">Geri Bildirim <span id="panelFbBadge" class="kb-badge kb-badge--warning" style="display:none"></span></a>
```

- [ ] **Adım 3: Topbar zil rozetini sınıfa çevir**

`components.js:231` içindeki uzun inline stili sadeleştir:

```js
        '<a class="topbar-ico-btn topbar-ico-btn--rel" href="bildirimler.html" title="Bildirimler">' + SIC.bell + '<span id="kbNotifBadge" class="kb-badge kb-badge--error kb-badge--dot" style="display:none"></span></a>' +
```

Ve `main.css` §12'ye ekle:

```css
#app-topbar .topbar-ico-btn--rel { position: relative; }
```

- [ ] **Adım 4: Rozetlerin gerçekten göründüğünü doğrula**

Tarayıcı konsolunda, panelde:

```js
var b = document.getElementById('panelMsgBadge');
b.textContent = '3'; b.style.display = 'inline';
getComputedStyle(b).backgroundColor;   // rgb(220, 38, 38) bekleniyor
```

Aynısını `kbNotifBadge` için `display='inline-flex'` ile dene; zilin sağ
üstünde yuvarlak kırmızı rozet görünmeli, taşma olmamalı.

- [ ] **Adım 5: Commit**

```bash
git add docs/assets/css/main.css docs/panel-firma.html docs/assets/js/components.js
git commit -m "refactor: rozet stili .kb-badge bilesenine toplandi (4 inline tekrar kaldirildi)"
```

---

### Görev 3: Topbar yenileme

**Dosyalar:**
- Değiştir: `docs/assets/css/main.css:395-475` (§12)
- Değiştir: `docs/assets/js/components.js:221-237` (yalnız `innerHTML` string'i)

**Arayüzler:**
- Tüketir: Görev 2'den `.kb-badge--dot`, `.topbar-ico-btn--rel`
- Üretir: `.topbar-brand` artık `<img>` + metin içerir.

- [ ] **Adım 1: Marka işaretini ve SVG tema ikonunu ekle**

`components.js` `renderTopbar()` içindeki iki satırı değiştir.

Marka (`:223`):

```js
      '<a class="topbar-brand" href="' + panelHr + '">' +
        '<img src="assets/logo-128.png" width="30" height="30" alt="">' +
        '<span>KuryemiBul</span>' +
      '</a>' +
```

Tema düğmesi (`:230`) — emoji yerine SVG. `getTheme()` çağrısı ve
`toggleTheme()` bağlaması **AYNEN KALIR**, yalnız içerik değişir:

```js
        '<button class="topbar-ico-btn theme-toggle-btn" id="topbarThemeToggle" title="' + (getTheme() === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç') + '" aria-label="Tema değiştir">' +
          (getTheme() === 'dark'
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>') +
        '</button>' +
```

- [ ] **Adım 2: Profil çipinin inline stillerini sınıfa taşı**

`components.js:233-236`:

```js
        '<a class="topbar-ico-btn topbar-profile" href="profil-' + (role !== 'guest' ? role : 'kurye') + '.html" title="' + esc(name) + '">' +
          '<span class="topbar-profile__ava">' + esc(initial) + '</span>' +
          '<span class="truncate topbar-profile-name">' + esc(name) + '</span>' +
        '</a>' +
```

- [ ] **Adım 3: Topbar yüksekliğine bağlı gizli kırılmayı önce onar**

`--topbar-h` 56px → 60px yapılacak. Ama iki yerde bu yükseklik **sabit
kodlanmış** ve değişiklikten haberi olmaz — mesajlaşma sayfaları 4px taşar:

- `main.css:3945` → `.msg-layout { height: calc(100vh - 56px); }`
- `main.css:4340` → `.mdt-layout { height: calc(100vh - 56px); }`

Her ikisini değişkene bağla:

```css
  height: calc(100vh - var(--topbar-h));
```

**Dokunma:** `main.css:601`'deki `.auth-header { height: 56px }` — o, auth
sayfalarının kendi header'ı, topbar ile ilgisi yok.

Doğrulama: `grep -n "100vh - 56px" docs/assets/css/main.css` sonuç vermemeli.

- [ ] **Adım 4: `main.css` §12'yi güncelle**

`--topbar-h` değişkenini 56px → 60px yap (§2 CSS DEĞİŞKENLERİ, satır 48), sonra
§12'ye ekle/değiştir:

```css
#app-topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--topbar-h);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
}
#app-topbar .topbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -.02em;
  color: var(--text);
  text-decoration: none;
  white-space: nowrap;
}
#app-topbar .topbar-brand img { display: block; border-radius: 6px; }
#app-topbar .topbar-search input {
  height: 38px;
  border-radius: var(--radius-lg);
  background: var(--surface-2);
  border-color: transparent;
}
#app-topbar .topbar-search input:focus {
  background: var(--surface);
  border-color: var(--border-focus);
}
#app-topbar .topbar-ico-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px; height: 38px;
  border-radius: 10px;
  background: transparent;
  border: none;
  color: var(--text-2);
  cursor: pointer;
  transition: background var(--transition), color var(--transition);
}
#app-topbar .topbar-ico-btn:hover { background: var(--surface-2); color: var(--text); }
#app-topbar .topbar-ico-btn--rel { position: relative; }

#app-topbar .topbar-profile {
  width: auto;
  padding: 0 8px 0 4px;
  gap: 8px;
  font-size: .85rem;
  font-weight: 600;
  color: var(--text-2);
  text-decoration: none;
}
#app-topbar .topbar-profile__ava {
  width: 30px; height: 30px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: .75rem;
  flex-shrink: 0;
}
#app-topbar .topbar-profile-name { max-width: 100px; }
```

**KORUNACAK:** `main.css:449-475` arasındaki dar ekran koruma bloğu
(`flex-shrink: 0` kuralları, 720px'te aramayı gizleme, 480px'te profil adını
gizleme). Oradaki yorum, hamburger'in 0px'e çöküp menüyü erişilemez kıldığı bir
çöküşü anlatıyor — o kurallar silinmez.

- [ ] **Adım 5: Doğrula**

Panelde: logo görünüyor, marka metni okunaklı, tema düğmesi SVG ve tıklayınca
koyu temaya geçiyor (sonra geri al), zil rozeti doğru konumda, profil çipi
taşmıyor. 480px'e küçült: profil adı gizleniyor, hamburger görünür ve
tıklanabilir. Konsolda yeni hata yok.

**Ayrıca `mesajlar.html` ve `mesaj-detay.html`'i aç** — Adım 3'teki düzeltme
sayesinde dikey taşma/çift kaydırma çubuğu olmamalı.

- [ ] **Adım 6: Commit**

```bash
git add docs/assets/css/main.css docs/assets/js/components.js
git commit -m "feat: topbar yenilendi - marka isareti, SVG tema ikonu, sinifa tasinan profil cipi"
```

---

### Görev 4: Sidebar girintili pill

Saf CSS — `renderSidebar()` yalnız `buildNavItems()`'ı sarıyor, JS'e dokunulmaz.

**Dosyalar:**
- Değiştir: `docs/assets/css/main.css:477-537` (§13)

- [ ] **Adım 1: §13'ü güncelle**

```css
#app-sidebar {
  position: fixed;
  top: var(--topbar-h);
  left: 0;
  bottom: 0;
  width: var(--sidebar-w);
  background: var(--surface);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  z-index: 90;
  display: flex;
  flex-direction: column;
  padding: 12px 0 24px;
}
#app-sidebar .sidebar-nav { flex: 1; padding: 0 8px; }
#app-sidebar .sidebar-nav a,
#app-sidebar .sidebar-nav button {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  margin-bottom: 2px;
  color: var(--text-2);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  border-radius: 10px;
  transition: background var(--transition), color var(--transition);
  position: relative;
}
#app-sidebar .sidebar-nav a:hover,
#app-sidebar .sidebar-nav button:hover { background: var(--surface-2); color: var(--text); }
#app-sidebar .sidebar-nav a.active,
#app-sidebar .sidebar-nav button.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 600;
}
#app-sidebar .sidebar-nav svg { width: 18px; height: 18px; flex-shrink: 0; stroke: currentColor; }
#app-sidebar .sidebar-section-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-3);
  padding: 18px 12px 8px;
}
#app-sidebar .sidebar-divider { height: 1px; background: var(--border); margin: 10px 12px; }
```

**Silinecek:** `.sidebar-nav a.active::before` / `button.active::before`
kuralları (eski 3px sol çubuk). Pill zemini onun yerini alıyor.

- [ ] **Adım 2: Doğrula**

Aktif öğe (Dashboard) yuvarlak dolu zeminde, kenarlardan boşluklu. Sol çubuk
yok. Hover diğer öğelerde yumuşak zemin veriyor. "Çıkış Yap" hâlâ kırmızı ve
tıklayınca çıkış yapıyor (sonra tekrar gir). Mobilde (390px) hamburger ile
sidebar açılıp kapanıyor, overlay tıklaması kapatıyor.

- [ ] **Adım 3: Commit**

```bash
git add docs/assets/css/main.css
git commit -m "feat: sidebar girintili pill gezinme diline gecti"
```

---

### Görev 5: Panel bileşen sözlüğü

**Dosyalar:**
- Değiştir: `docs/assets/css/main.css` §17 (DASHBOARD), §39 (DASHBOARD
  HOŞGELDİN BLOĞU), §27 (EMPTY STATE)

**Arayüzler:**
- Üretir: `.dash-welcome` kompakt şerit hâli; `.dash-stat` hover davranışı;
  `.panel-box` yenilenmiş başlık/gövde. Görev 6 bunlara dayanır.

- [ ] **Adım 1: `.dash-welcome`'ı kompakt şeride indir**

§39'da bloğun dikey boşluklarını düşür ve ilerleme sütununu kaldır. Blok artık
yalnız selamlama + avatar taşıyacak (Görev 6 markup'ı sadeleştiriyor):

```css
.dash-welcome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
.dash-welcome__greeting {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -.02em;
  color: var(--text);
}
.dash-welcome__sub { margin-top: 3px; font-size: 0.9rem; color: var(--text-2); }
.dash-welcome__right { display: flex; align-items: center; gap: 12px; }
.dash-welcome__avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--primary);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  overflow: hidden;
  flex-shrink: 0;
}
.dash-welcome__avatar img { width: 100%; height: 100%; object-fit: cover; }
```

**Silinecek:** `.dash-welcome__progress`, `.dash-welcome__prog-bar`,
`.dash-welcome__prog-bar-fill`, `.dash-welcome__prog-label`,
`.dash-welcome__prog-link` kuralları — Görev 6 bu markup'ı kaldırıyor.
Silmeden önce `grep -rn "dash-welcome__prog" docs/` çalıştır; yalnız üç panel
sayfasında çıkmalı.

- [ ] **Adım 2: `.dash-stat` kartlarını tıklanabilir göster**

```css
.dash-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition);
}
a.dash-stat:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
  text-decoration: none;
}
.dash-stat__label { font-size: 0.8125rem; color: var(--text-2); }
.dash-stat__value { font-size: 1.75rem; font-weight: 700; line-height: 1.1; color: var(--text); font-variant-numeric: tabular-nums; }
.dash-stat__delta { font-size: 0.75rem; color: var(--text-3); }
.dash-stat__delta.is-up { color: var(--success); }
.dash-stat__delta.is-neutral { color: var(--text-3); }
```

`transform` yalnız `a.dash-stat`'te — `panel-firma.html:114` gibi
`style="cursor:default"` taşıyan `div.dash-stat` metrik kutuları hareket
etmemeli.

- [ ] **Adım 3: `.panel-box` başlık/gövde ayrımını netleştir**

```css
.panel-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.panel-box__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}
.panel-box__head h3 { font-size: 0.95rem; font-weight: 600; color: var(--text); }
.panel-box__body { padding: 16px 18px; }
```

- [ ] **Adım 4: Dark modda kontrol**

Tema düğmesiyle koyuya geç. Sidebar pill'i, topbar, kartlar ve rozetler
okunaklı mı? `main.css` sonundaki "DARK TEMA — Hardcode renk override'ları"
bloğunda bu bileşenlere ait yama gerekiyorsa ekle. Sonra açık temaya dön.

- [ ] **Adım 5: Commit**

```bash
git add docs/assets/css/main.css
git commit -m "feat: panel bilesen dili yenilendi (dash-welcome, dash-stat, panel-box)"
```

---

### Görev 6: `panel-firma.html` sayfa temizliği

**Dosyalar:**
- Değiştir: `docs/panel-firma.html` (markup + sayfa içi script)

**Arayüzler:**
- Tüketir: Görev 2'den `.kb-badge`, Görev 5'ten `.dash-welcome` / `.dash-stat`

- [ ] **Adım 1: Hoşgeldin bloğundan ilerleme sütununu kaldır**

`:38-53` arasını şununla değiştir:

```html
    <!-- Hoşgeldin şeridi. İlerleme göstergesi BİLEREK yok: profil tamamlanma
         yüzdesi tek yerden, aşağıdaki profil motorundan gelir. Eskiden burada
         profile.profil_guc ile beslenen ikinci bir çubuk vardı ve motorun
         istemcide hesapladığı yüzdeyle çelişiyordu (canlıda %0 vs %17). -->
    <div class="dash-welcome" id="dashWelcome">
      <div class="dash-welcome__left">
        <div class="dash-welcome__greeting" id="welcomeGreeting">Merhaba!</div>
        <div class="dash-welcome__sub" id="welcomeSub">Profil verilerin yükleniyor…</div>
      </div>
      <div class="dash-welcome__right">
        <div class="dash-welcome__avatar" id="welcomeAvatar">—</div>
      </div>
    </div>
```

- [ ] **Adım 2: İlerlemeyi besleyen JS satırlarını kaldır**

`:409-421` civarındaki üç değişken tanımını ve kullanımlarını sil:

Silinecek satırlar:
```js
        var pFill = document.getElementById('welcomeProgFill');
        var pLbl  = document.getElementById('welcomeProgLabel');
        var pLink = document.getElementById('welcomeProgLink');
```
ve
```js
          var guc = Math.min(100, Math.round(profile.profil_guc || 0));
          pFill.style.width = guc + '%';
          pLbl.textContent  = 'Profil %' + guc + ' tamamlandı';
          if (guc < 100) pLink.style.display = '';
```

`greet.textContent`, `sub.textContent`, `renderProfEngine(profile)` ve avatar
kodu **KALIR**.

- [ ] **Adım 3: Emoji ikonu SVG'ye çevir**

`:149`:

```html
          <span class="iv-upcoming__title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Yaklaşan Görüşmeler
          </span>
```

- [ ] **Adım 4: Kalan statik inline stilleri sınıfa taşı**

`:113` (`firmaMetrics`) ve `:114/119/124` (`cursor:default`) için `main.css`'e:

```css
/* Panel içi metrik ızgarası — dış boşluk/kenarlık taşımaz */
.dash-stats-mini--inset { margin: 0; padding: 0; border: none; gap: 8px; }
/* Tıklanamayan metrik kutusu */
.dash-stat--static { cursor: default; }
```

HTML'de:
```html
          <div id="firmaMetrics" class="dash-stats-mini dash-stats-mini--inset">
            <div class="dash-stat dash-stat--static">
```

**Dokunma:** `style="width:0%"` (`:87`) ve `style="display:none"` (`:75`, ve
rozetler) — bunlar sunum değil durum; JS çalışma anında yazıyor.

- [ ] **Adım 5: Boş durumu mevcut `.kb-empty` bileşenine bağla**

`.kb-empty` **zaten tanımlı** (`main.css:1006-1009`) ve `__ic` / `__t` / `__d`
alt öğeleriyle çalışan zengin bir bileşen. Yeniden tanımlama — mevcut yapıyı
`app.js:401-403`'teki kalıba uyarak kullan.

`:154`'ü değiştir:

```html
            <div class="kb-empty">
              <div class="kb-empty__ic">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div class="kb-empty__t">Yaklaşan görüşme yok</div>
              <div class="kb-empty__d">Planlanan görüşmeler burada listelenir.</div>
            </div>
```

`.kb-empty__ic` şu an `font-size: 2rem` ile emoji için ayarlı; SVG ile
kullanılabilmesi için `main.css:1007`'ye renk ekle (boyut SVG'nin kendi
`width/height`'ından gelir):

```css
.kb-empty__ic { font-size: 2rem; margin-bottom: 12px; color: var(--text-3); }
```

Bu değişiklik emoji kullanan mevcut çağrıları etkilemez (emoji kendi rengini
taşır).

- [ ] **Adım 6: Doğrula**

Panelde: tek profil yüzdesi görünüyor (yalnız motorda), hoşgeldin şeridi
kompakt, `📅` yerine SVG takvim ikonu var, metrik kutuları hover'da
hareket etmiyor ama üstteki üç istatistik kartı ediyor. Sekmeler
(`Genel Bakış` / `Filo Yönetimi` / `İşe Alım`) çalışıyor. Konsolda yeni hata
yok — özellikle `pFill is not defined` benzeri bir hata OLMAMALI.

- [ ] **Adım 7: Commit**

```bash
git add docs/panel-firma.html docs/assets/css/main.css
git commit -m "fix: panel-firma'da celisen ikinci profil yuzdesi kaldirildi, inline stiller sinifa tasindi"
```

---

### Görev 7: Regresyon doğrulaması

**Dosyalar:** yok (yalnız doğrulama; çıkan hatalar ilgili görevin dosyasında
düzeltilir)

- [ ] **Adım 1: Diğer iki paneli kontrol et**

`panel-kurye.html` ve `panel-isletme.html` aynı `.dash-welcome__prog-*`
markup'ını taşıyor ama Görev 5 o CSS'i sildi. İki seçenek:
- Bu sayfalarda da markup'ı kaldır (tutarlılık için tercih edilen), **veya**
- Sıraları gelene kadar bozulmadıklarını doğrula.

Karar: markup'ı **kaldır** — aksi hâlde iki sayfada stilsiz artık DOM kalır ve
çelişen yüzde hatası o sayfalarda sürer.

Her iki dosyada Görev 6 Adım 1 ve Adım 2'yi tekrarla.

- [ ] **Adım 2: Kabuğu kullanan diğer sayfaları gözden geçir**

Girişli hâlde şu sayfaları aç, konsolda yeni hata ve yatay taşma olmadığını
doğrula:
`kuryeler.html`, `isletmeler.html`, `ilanlar.html`, `mesajlar.html`,
`bildirimler.html`, `ayarlar.html`, `havuzum.html`

- [ ] **Adım 3: Landing regresyonu**

Çıkış yap → `index.html`. Koyu tasarım bozulmamış olmalı; `main.css`
değişiklikleri landing'in `body` kapsamlı token'larını ezmemeli. Giriş/kayıt
modalı hâlâ açılıp kapanmalı.

- [ ] **Adım 4: Responsive**

1440 / 1024 / 768 / 390 px. Her boyutta: yatay taşma yok, sidebar mobilde
hamburger ile açılıyor, topbar öğeleri çökmüyor.

- [ ] **Adım 5: Ağ denetimi**

Supabase uç noktaları değişmemiş olmalı (`platform_stats`,
`my_dashboard_stats`, `listings`, `profiles` …). Yeni istek eklenmemiş,
mevcut istek kaybolmamış.

- [ ] **Adım 6: Commit**

```bash
git add -A docs/
git commit -m "fix: panel-kurye ve panel-isletme'de de celisen profil yuzdesi kaldirildi"
```

---

## Öz-Denetim Notları

**Spec kapsamı:** Tasarımdaki her madde bir göreve bağlandı — footer yılı (G1),
rozet bileşeni (G2), topbar (G3), sidebar pill (G4), panel bileşenleri (G5),
sayfa temizliği + profil yüzdesi hatası (G6), regresyon + diğer paneller (G7).

**Bilinçli kapsam dışı:** Diğer 30 app sayfasındaki emoji ikonlar. Sayfa sayfa
ilerleme kararı gereği sıraları geldiğinde çevrilecek.

**Risk noktaları:**
1. `.kb-badge` sınıfına `display` yazılmamalı (JS inline atıyor).
2. `main.css:449-475` dar ekran koruma bloğu silinmemeli.
3. `.dash-welcome__prog-*` CSS'i silinince üç panel sayfasının hepsinde markup
   da kaldırılmalı — yoksa stilsiz artık DOM kalır (G7 Adım 1).
4. `--topbar-h` 60px'e çıkarken `.msg-layout` (3945) ve `.mdt-layout` (4340)
   içindeki `calc(100vh - 56px)` önce değişkene bağlanmalı (G3 Adım 3), yoksa
   iki mesajlaşma sayfası 4px taşar. `.auth-header`'daki 56px farklı bir şey,
   dokunulmaz.
5. `.kb-empty` zaten zengin bir bileşen (`main.css:1006`, `__ic/__t/__d`).
   Yeniden tanımlanmaz, mevcut kalıba uyulur.

**Öz-denetimde yakalananlar:** Bu planın ilk taslağı (a) `--topbar-h`
değişikliğinin mesajlaşma düzenlerini kıracağını gözden kaçırmıştı, (b)
`.kb-empty`'yi yokmuş gibi yeniden tanımlıyordu. İkisi de kod doğrulamasıyla
yakalandı ve düzeltildi.
