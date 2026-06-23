# ADIM 10 — Google Play Data Safety Formu Rehberi

Google Play Console → Uygulama içeriği → **Data safety** bölümü.
Aşağıdaki yanıtları kullan.

---

## Bölüm 1: Veri Toplama

**"Bu uygulama, kullanıcılardan veri topluyor mu?"**
→ **Evet**

**"Tüm kullanıcı verileri uygulama içinde şifreli iletiliyor mu?"**
→ **Evet** (HTTPS — Supabase TLS 1.2+, cleartext false)

**"Kullanıcılar, veri silinmesini talep edebilir mi?"**
→ **Evet** *(Hesap silme akışı `ayarlar.html`'e eklenecek — şu an eksik, eklenmeden önce "Hayır" seçilebilir)*

---

## Bölüm 2: Toplanan Veri Türleri

Her satır için: **"Uygulama tarafından topluyor"** seçeneğini işaretle.

### Kişisel Bilgiler
| Veri Türü | Toplanıyor | Paylaşılıyor | Şifrelenmiş |
|-----------|-----------|-------------|-------------|
| Ad-soyad | Evet | Hayır | Evet |
| E-posta adresi | Evet | Hayır | Evet |
| Telefon numarası | Evet | Hayır* | Evet |
| Kullanıcı ID | Evet | Hayır | Evet |

*Telefon: Yalnızca kabul edilmiş teklif/eşleşme olan karşı tarafla paylaşılır (KVKK gereği RLS korumalı)

### Fotoğraf & Video
| Veri Türü | Toplanıyor | Paylaşılıyor | Şifrelenmiş |
|-----------|-----------|-------------|-------------|
| Profil fotoğrafı | Evet | Evet (herkese açık profil) | Evet |

### Konum
| Veri Türü | Toplanıyor | Paylaşılıyor | Şifrelenmiş |
|-----------|-----------|-------------|-------------|
| Şehir / Bölge (metin) | Evet | Evet (profilde görünür) | Evet |
| Hassas konum (GPS) | **Hayır** | — | — |

### Uygulama Aktivitesi
| Veri Türü | Toplanıyor | Paylaşılıyor | Şifrelenmiş |
|-----------|-----------|-------------|-------------|
| Mesajlar | Evet | Hayır (yalnız taraflar) | Evet |
| Uygulama içi bildirimler | Evet | Hayır | Evet |

### Hesap Bilgileri
| Veri Türü | Toplanıyor | Paylaşılıyor | Şifrelenmiş |
|-----------|-----------|-------------|-------------|
| Hesap oluşturma bilgileri | Evet | Hayır | Evet |

---

## Bölüm 3: Veri Kullanım Amaçları

Her veri türü için amaç seç:

| Amaç | Veri Türleri |
|------|-------------|
| **Uygulama işlevselliği** | Tümü |
| **Hesap yönetimi** | E-posta, ad-soyad, User ID |
| **Kişiselleştirme** | Profil fotoğrafı, şehir, rol |
| **İletişim (uygulama içi)** | Mesajlar, bildirimler |

---

## Bölüm 4: Üçüncü Taraf Paylaşımı

**Google OAuth (Google Sign-In):**
- Google'dan alınan: e-posta adresi, ad, profil fotoğrafı
- Amaç: Hesap kimlik doğrulama
- Google Play'de "Sign in with Google" açıklaması ekle

**Supabase:**
- Tüm kullanıcı verilerinin saklandığı altyapı (supabase.com)
- AB/ABD sunucuları (AWS us-east-1)
- Bu bir "veri işleyici (processor)" — üçüncü taraf değil

**Resend (Transactional Email):**
- Sadece e-posta adresi iletilir (bildirim göndermek için)
- Veri depolanmaz, yalnızca iletim aracı

---

## Bölüm 5: Güvenlik Uygulamaları

**"Veriler aktarım sırasında şifreleniyor mu?"** → **Evet** (TLS 1.2+)
**"Veriler beklemedeyken şifreleniyor mu?"** → **Evet** (Supabase AES-256)
**"SOC 2 / ISO 27001 uyumlu musunuz?"** → Supabase SOC 2 Type 2 sertifikalı — bu soruya **Evet** diyebilirsin

---

## Önemli Not: Hesap Silme

Google Play, Kasım 2023'ten itibaren hesap silme mekanizması zorunlu kılıyor.

Şu an `ayarlar.html`'de hesap silme yok. İki seçenek:

**Seçenek A (Hızlı):** Data Safety formunda "Hayır, kullanıcılar veri silemez" işaretle → açıklama kutusuna yaz:
> "Hesap silme talebi için destek@kuryemibul.com ile iletişime geçin. 30 gün içinde tüm veriler silinir."

**Seçenek B (Doğru):** `ayarlar.html`'e hesap silme butonu ekle → `SB.deleteAccount()` işlevi oluştur. (Sonraki sprint'e ekle)

---

## Form Doldurma Sırası

1. Google Play Console → Uygulama seç → **Uygulama içeriği**
2. **Data safety** → Düzenle
3. Yukarıdaki tabloları takip ederek doldur
4. Önizleme → gözden geçir → Kaydet
5. Yayınla (store listing gönderimi ile birlikte)
