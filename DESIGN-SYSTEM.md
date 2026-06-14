# KuryemiBul — Design System & Brand Identity
> Tek görsel dil. Her ekran, bileşen ve etkileşim bu sisteme uyar. Bu doküman gelecekteki tüm UI'ın temelidir.
> Kaynak token'lar canlı CSS'te yaşıyor: `assets/css/design-system.css` (`--ds-*`), `assets/css/landing.css` (görsel DNA), `assets/css/talent.css`, `assets/css/styles.css`. Bu doküman onları kanonikleştirir.

---

## 1) BRAND IDENTITY
- **Ne DEĞİL:** teslimat / kargo / lojistik şirketi. Kutu, paket, kamyon, motor-kuryesi-teslimat görselleri **YASAK**.
- **Ne:** kuryeleri, işletmeleri ve kurye firmalarını **profesyonel eşleşme ve kariyer** ile birleştiren dijital ekosistem. Konumlandırma: **"Kurye sektörünün Kariyer.net'i."**
- **İletmesi gereken duygular:** Güven · Teknoloji · Ağ · Bağlantı · Profesyonellik · Fırsat.
- **Kişilik:** premium, sakin, net, insan-merkezli; "SaaS / kariyer platformu", "tüketici teslimat app'i" değil.
- **Görsel metafor:** **ağ / düğüm / bağlantı** (nodes & links), büyüme grafiği, eşleşme. (Landing'deki canlı ağ canvas'ı + orb'lar bu DNA'dır.)

## 2) VISUAL LANGUAGE
- **Stil:** premium dark glassmorphism — derin siyah zemin (#050505), cam yüzeyler (yarı saydam beyaz + blur), elektrik **cyan→mavi→mor** gradyan vurgu, yumuşak ışıma (glow), ince hairline kenarlıklar.
- **Aydınlık tema:** `[data-theme="light"]` ile desteklenir (token'lar otomatik döner).
- **İlkeler:** çok boşluk, az süs, tek vurgu rengi ailesi, gürültü yok. Her yüzey aynı cam + gradyan dilini paylaşır → "tek ürün" hissi.
- **Arka plan katmanı:** `bg-fx` (nokta-grid + 3 orb) + `#kb-canvas` (ağ animasyonu) her sayfada (components.js enjekte eder). Reduced-motion'da kapanır.

## 3) COLOR STRATEGY (kanonik token'lar)
| Rol | Token | Değer | Kullanım |
|---|---|---|---|
| Background | `--ds-bg` | `#050505` | Sayfa zemini (tek) |
| Surface | `--ds-panel` / `--ds-panel2` | `rgba(255,255,255,.032/.055)` | Kart/panel cam yüzeyleri |
| Border | `--ds-stroke` / `--ds-stroke2` | `rgba(255,255,255,.09/.17)` | Hairline kenarlık / hover |
| **Primary** | `--ds-blue` | `#4f8bff` | Birincil eylem, linkler, vurgu |
| **Accent** | `--ds-cyan` | `#22d3ee` | İkincil vurgu, skor, aktif durum, odak |
| **Secondary** | `--ds-violet` | `#a855f7` | Premium/öne çıkan, üçüncü vurgu |
| **Brand grad** | `--ds-grad` | `linear-gradient(120deg,#22d3ee,#4f8bff,#a855f7)` | Logo işareti, primary buton, başlık vurgusu, skor pill |
| Grad-soft | `--ds-grad-soft` | yumuşak %8-13 gradyan | Avatar/ikon zeminleri, etiket fonları |
| Success | — | `#34d399` | Onaylandı, doğrulanmış, açık durum |
| Warning | — | `#f59e0b / #fbbf24` | İnceleniyor, "Yeni", kaydet (yıldız) |
| Error/Danger | — | `#ef4444 / #fca5a5` | Hata, reddedildi, sil |
| Text | — | `#f4f6fb` | Birincil metin |
| Muted | `--ds-muted` | `rgba(233,238,250,.45)` | İkincil metin |
| Faint | `--ds-faint` | `rgba(233,238,250,.30)` | Üçüncül/ipucu metin |

**Kurallar:** Vurgu = cyan/blue/violet ailesi; başka renk eklenmez. Success/warning/error YALNIZ durum bildirir, dekorasyon için kullanılmaz. Gradyan ölçülü (logo, primary buton, başlık kelimesi, skor) — her yere değil. Metin kontrastı AA (muted ≥ 4.5:1 hedef; yüksek-kontrast modu a11y panelinde mevcut).

## 4) TYPOGRAPHY SYSTEM
- **Aileler:** Display = **Space Grotesk** (başlıklar, sayılar, marka), Body = **Inter** (her şey). Token: `--ds-display`, `--ds-font`.
- **Ölçek (clamp ile akışkan):**
  | Stil | font | boyut | ağırlık | satır |
  |---|---|---|---|---|
  | Display (hero) | Space Grotesk | `clamp(2rem,5.2vw,4rem)` | 700 | 1.05 |
  | H1/Section | Space Grotesk | `clamp(1.6rem,3vw,2.4rem)` | 700 | 1.1 |
  | H2/Card title | Space Grotesk | `1.05–1.2rem` | 700 | 1.25 |
  | Subheading | Inter | `1–1.16rem` | 600 | 1.5 |
  | Body | Inter | `0.92–0.97rem` | 400/500 | 1.6 |
  | Caption | Inter | `0.8–0.84rem` | 500 | 1.45 |
  | Label/eyebrow | Inter | `0.7–0.76rem`, `letter-spacing .1–.15em`, UPPERCASE | 700 | — |
- **Kurallar:** Başlıklarda `letter-spacing:-.02/-.04em`. Vurgu kelimesi `.grad` ile gradyan-clip. Bir ekranda en fazla 1 display başlık.

## 5) ICON RULES
- **Tek stil:** **outline / line ikonlar**, `stroke-width: 2`, `viewBox 24`, `currentColor`, yuvarlak uçlar (stroke-linecap/join round) — auth sayfasındaki SVG seti referans.
- Filled/sharp/farklı set **karıştırılmaz**. Renk daima `currentColor` (token rengini alır).
- Emoji'ler bugün hızlı placeholder olarak kullanılıyor (🛵🏪🏢💼🗺️💬🔔); **hedef:** tutarlı tek line-icon setine (ör. Lucide) kademeli geçiş. Yeni ekranda mümkünse line-icon, emoji yalnız geçici.

## 6) COMPONENT LIBRARY (kanonik — `kb-*` + temel sınıflar)
Hepsi tek cam+gradyan dilini paylaşır. Yeni bileşen icat etmeden önce buradan kullan:
- **Buttons** `.btn` + `.btn--primary` (gradyan), `.btn--ghost` (cam), `.btn--light`, `.btn--sm/lg/block`. Durumlar: hover (`translateY(-2px)`+glow), pressed, `:focus-visible` (cyan ring), `.is-loading` (spinner, metin gizli), disabled (opacity .45). Danger = ghost + danger metin.
- **Cards** `.kb-card` (+`__inner/__head/__name/__sub/__score/__av/__chips/__actions/__save`); türevler: `.kb-job__*` (ilan), `.kb-tender__*` (artık kullanılmıyor — kaldırıldı), `.talent-card`, `.job-card` (ilan), `.mx-card` (harita), `.app-card` (başvuru). **Hover:** `translateY(-5/-7px)` + sol-kenar gradyan glow + shadow.
- **Badges/Chips** `.kb-chip` (+`--accent/--violet`), `.chip` (+`--open/--new/--ok`), `.kb-level` (std/pro/prem), `.kb-verified` (✓ doğrulanmış), `.app-badge` (review/accepted/rejected).
- **Avatars** `.kb-card__av` (+`--blue/--violet`), `.avatar` (+`--blue/--navy`), foto yoksa baş harf.
- **Forms** `.kb-search-wrap`, `.kb-select`, `.kb-filter-pill`, `.auth-inp/auth-field` (+`.invalid`+`.field-err`), parola gücü ölçer, toggle/checkbox/radio (accent-color: cyan). Odak: cyan border + `0 0 0 4px rgba(cyan,.16)`.
- **Navigation** header (`.header`+nav), footer, `.bottom-nav` (mobil), `.fav-tabs`/`.auth-tabs` (pill sekme), a11y fab+panel.
- **Search + Filters** `.toolbar`/`.search--suggest`+`.suggest` (autocomplete), `.active-chips`/`.active-chip` (kaldırılabilir filtre).
- **Stats** `.kb-stat` (ikon+değer+etiket), statband, metric.
- **Lists/rows** `.list-row`, `.candidate-row`.
- **Dialogs** `.modal-overlay`+`.modal` (`.is-open`), apply onay/başarı modalı deseni.
- **Snackbar/Toast** `KB.toast(msg,type)` + `.kb-toast` (ok/err).
- **Empty states** `.kb-empty` (ikon+başlık+açıklama+CTA) — boş sayfa YASAK.
- **Loading** `.kb-skeleton`/`.skel-card` shimmer + `skeletonCards(n)`; buton `.is-loading`.
- **Timeline** `.app-timeline` (başvuru durumu), `.career-track`/`.clp` (kariyer seviyesi).

## 7) LAYOUT RULES
- **Spacing ölçeği (4px tabanlı, tek skala):** `4 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24 · 28 · 32 · 40 · 48 · 64`. Rastgele değer YOK. Bölüm dikey: `clamp(44px,6vw,72px)`.
- **Radius:** `--ds-r 20px` (kart/dialog), `--ds-r-sm 12px` (input/select/küçük), `999px` (pill/chip/avatar-dot), buton `999px`. Görseller `12–16px`. Tek sistem.
- **Shadows (hiyerarşi, az kullan):** sm `0 8px 22px -8px rgba(0,0,0,.5)` · md `0 18px 44px -12px rgba(0,0,0,.6)` · lg/overlay `--ds-shadow 0 28px 72px -24px rgba(0,0,0,.86)` · glow (vurgu) `--ds-glow`/`--ds-glow-b`. Gölge dekorasyon için değil, yükseklik için.
- **Grid:** `.kb-grid` `repeat(auto-fill,minmax(310px,1fr))` gap 20; `--wide 380`, `--2`. Container max `1200px`, padding `0 24px`.
- **Breakpoints:** `≤620` (mobil tek sütun + bottom-nav) · `≤900/980` (tablet) · `≥1180` (geniş). Bottom-nav `≤680`.

## 8) MOTION GUIDELINES
- **Easing:** `--ds-ease cubic-bezier(.22,.61,.36,1)` (tek standart). Süreler: micro 150–250ms, kart/geçiş 350–480ms, sayaç ~1.3s.
- **Hover:** `translateY(-2/-7px)` + glow/border. **Loading:** spinner (0.7s linear) + skeleton shimmer (2s). **Success:** ✓ pop (scale .6→1). **Error:** inline kırmızı, sarsma yok. **Modal:** fade + hafif yukarı kayma. **Page/view transition (SPA):** içerik fade/slide 300ms.
- **Kural:** ölçülü, premium, asla zıplayan/abartılı değil. `prefers-reduced-motion` her animasyonu kapatır.

## 9) DESIGN PRINCIPLES
1. **Tek ekosistem** — her ekran aynı cam+gradyan dilini taşır. 2. **Sadelik** — gürültü yok, tek vurgu ailesi. 3. **Güven** — net hiyerarşi, doğrulama rozetleri, premium dokunuş. 4. **Hız hissi** — skeleton + optimistik + ağsız oturum. 5. **İnsan-merkezli** — boş durumlarda yönlendirme, hata mesajları net+çözüm odaklı. 6. **Ölçeklenebilir** — bileşen yeniden kullanılır, token'a bağlı; sayfa-özel hack yok. 7. **Erişilebilir** — focus-visible, ≥44px dokunma, kontrast/font paneli, AA hedefi.

## 10) FUTURE UI GUIDELINES
- Yeni ekran = mevcut `kb-*` bileşenleri + token'larla kur; yeni renk/radius/gölge **icat etme**.
- Her interaktif öğe: hover + focus-visible + loading + disabled + empty + error durumlarını tanımla.
- Asla boş/ölü sayfa: `.kb-empty` + CTA. Asla ham `alert()`: `KB.toast`.
- Teslimat/kargo imgesi kullanma; ağ/eşleşme/kariyer/büyüme görseli kullan.
- i18n: tüm metin `t()`/`data-i18n` üzerinden (TR+EN).
- Mobil-önce düşün; bottom-nav + dokunma hedefleri. Capacitor (server.url) ile app=web → ekstra iş yok.
- SPA kabuğa geçişte (MASTER PROMPT 01): bileşenler view modüllerinde yeniden kullanılır, tek tasarım dili korunur.

---
> **Sonraki adım:** Bu sistem onaylanınca, ekranlar (MASTER PROMPT 03+) bu token + bileşen sözlüğüne göre tasarlanır. Token'lar zaten canlı CSS'te; gerekirse tek `tokens.css` altında konsolide edilebilir.
