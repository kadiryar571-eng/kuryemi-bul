# ADIM 7 — Google Play Ekran Görüntüsü Rehberi

## Teknik Gereksinimler

| Alan | Değer |
|------|-------|
| Format | PNG veya JPEG |
| Boyut | Min 320px, max 3840px (her kenar) |
| En-boy oranı | Max 2:1 |
| Önerilen (portrait) | **1080 × 1920px** |
| Önerilen (landscape) | **1920 × 1080px** |
| Minimum | 2 görüntü |
| Maksimum | 8 görüntü |
| Zorunlu: hi-res icon | 512 × 512px PNG |
| Zorunlu: feature graphic | 1024 × 500px (Play Store banner) |

---

## Çekilecek 8 Ekran (Önerilen Sıra)

Her ekranın üstünde kısa bir başlık overlay'i ekle.

### Kurye Rolü (3 ekran)

**Ekran 1 — Dashboard**
- URL: `panel-kurye.html` (giriş yapmış kurye hesabıyla)
- Başlık: **"İş fırsatlarını tek yerden keşfet"**
- EN: **"Discover job opportunities in one place"**
- Bölüm: Yeni ilanlar, eşleşmeler, son aktivite

**Ekran 2 — İlanlar Listesi**
- URL: `ilanlar.html`
- Başlık: **"Binlerce ilan, anlık filtrele"**
- EN: **"Thousands of listings, filter instantly"**
- Bölüm: Filtre chip'leri + dolu ilan kartları görünmeli

**Ekran 3 — Doğrulanmış Profil**
- URL: `profil-kurye.html?id=...`
- Başlık: **"Doğrulanmış kimlik, güven kazan"**
- EN: **"Verified identity, earn trust"**
- Bölüm: KYC verified badge + yıldız puanı + yorumlar

### İşletme Rolü (2 ekran)

**Ekran 4 — Kurye Ara**
- URL: `kuryeler.html`
- Başlık: **"Doğrulanmış kurye bul, hemen çalıştır"**
- EN: **"Find verified couriers, hire instantly"**
- Bölüm: Kurye kartları, filtreler, harita butonu

**Ekran 5 — Mesajlaşma**
- URL: `mesajlar.html` (aktif konuşma açık)
- Başlık: **"Güvenli, sadece eşleşenler iletişime geçer"**
- EN: **"Secure messaging — only matched users"**
- Bölüm: Sohbet listesi + açık konuşma

### Ortak (3 ekran)

**Ekran 6 — Kayıt / Onboarding**
- URL: `giris.html` veya `onboarding.html`
- Başlık: **"3 dakikada başla — Kurye, İşletme, Firma"**
- EN: **"Start in 3 minutes — Courier, Business, Company"**
- Bölüm: 3 rol seçim kartı

**Ekran 7 — Firma Dashboard**
- URL: `panel-firma.html`
- Başlık: **"Kurye filosunu yönet, performansı takip et"**
- EN: **"Manage your courier fleet, track performance"**

**Ekran 8 — Bildirimler**
- URL: `bildirimler.html` (dolu bildirim listesi)
- Başlık: **"Anlık bildirimler — hiçbir fırsatı kaçırma"**
- EN: **"Real-time notifications — never miss an opportunity"**

---

## Ekran Görüntüsü Alma Yöntemi

### Seçenek A — Chrome DevTools (Önerilen, hızlı)
1. `npx serve .` ile local server başlat
2. Chrome → F12 → Toggle Device Toolbar (Ctrl+Shift+M)
3. Device: **Samsung Galaxy S20 Ultra** veya özel: **1080 × 2400**
4. Sayfayı istenen duruma getir
5. DevTools → üç nokta → **"Capture screenshot"** → Full size

### Seçenek B — Android Emülatör
1. Android Studio → AVD Manager → Pixel 7 emülatör
2. Uygulamayı debug mode'da çalıştır
3. Side panel → kamera ikonuna tıkla → screenshot al

---

## Feature Graphic (1024×500px)

Google Play'de uygulamanın banner görseli. En kritik tasarım materyali.

**Öneri:**
- Arka plan: Electric Blue gradient (`#1d4ed8` → `#3b82f6`)
- Sol: Uygulama logosu + "Kuryemi Bul" yazısı
- Sağ: Telefon mockup içinde uygulama ekranı
- Alt: "Kuryelerin iş bulduğu, işletmelerin kurye bulduğu platform"

**Araçlar:** Figma, Canva, Adobe Express (ücretsiz)

---

## Hi-Res Icon (512×512px)

Mevcut `assets/logo.png`'yi 512×512px'e export et.
Format: PNG, şeffaf arka plan veya düz renk arka plan.

---

## Klasör Yapısı

```
store/
  play-store-screenshots/
    tr/
      01-kurye-dashboard-tr.png
      02-ilanlar-tr.png
      03-profil-tr.png
      04-kurye-ara-tr.png
      05-mesajlar-tr.png
      06-onboarding-tr.png
      07-firma-dashboard-tr.png
      08-bildirimler-tr.png
    en/
      01-courier-dashboard-en.png
      ...
    feature-graphic-1024x500.png
    hi-res-icon-512x512.png
```
