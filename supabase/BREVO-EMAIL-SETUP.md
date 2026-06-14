# Brevo + Supabase E-posta Doğrulama Kurulumu

KuryemiBul'un e-posta doğrulaması **Supabase Auth'un yerleşik mekanizması** ile çalışır;
e-postalar **Brevo SMTP relay** üzerinden gönderilir. Token üretimi, 24 saat geçerlilik,
tek-kullanımlık ve doğrulama tamamen Supabase tarafında yapılır. Kod tarafı hazır;
aşağıdaki **panel ayarları** yapıldığında sistem anında çalışır.

> ⚠️ **Hiçbir API anahtarı repoya yazılmaz.** Tüm gizli bilgiler yalnızca Supabase
> Dashboard'un sunucu-tarafı ayarlarında durur.

---

## 1) Brevo SMTP bilgileri (bu hesap için doğrulandı)

Bu KuryemiBul Brevo hesabının SMTP relay'i **zaten aktif**. Kesin değerler:

   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login (Username):** `ae662c001@smtp-brevo.com`
   - **Password:** Brevo **SMTP key** (Master Password) — ⚠️ Bu, `xkeysib-…` ile başlayan **API anahtarı DEĞİLDİR**.
     API anahtarı SMTP'de çalışmaz (`535 Authentication failed`). SMTP key'i şuradan al:
     **app.brevo.com → SMTP & API → "SMTP" sekmesi → "Your SMTP key" / "Generate a new SMTP key"**.
   - **Plan:** Free → günlük **300 e-posta** limiti (doğrulama için fazlasıyla yeterli).

> Gönderen (sender) için Brevo'da **doğrulanmış** bir adres gerekir. Hesap e-postan
> `kadiryar571@gmail.com` zaten doğrulu; hemen çalışması için onu kullanabilirsin.
> İleride **Senders & IP** → `noreply@kuryemibul.com` ekleyip domain (SPF/DKIM)
> doğrulaması yapman teslimat/markalaşma için önerilir.

---

## 2) Supabase'de SMTP'yi Brevo'ya bağla

Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**
(veya Authentication → Emails → SMTP):

| Alan | Değer |
|------|-------|
| Enable Custom SMTP | ✅ Açık |
| Sender email | `kadiryar571@gmail.com` (Brevo'da doğrulanmış) |
| Sender name | `Kuryemi Bul` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | `ae662c001@smtp-brevo.com` |
| Password | Brevo **SMTP key** (SMTP sekmesinden — `xkeysib-…` API anahtarı DEĞİL) |
| Minimum interval | varsayılan bırak |

**Save** → "Send test email" ile doğrula.

> 🔐 Bu anahtar yalnızca Supabase panelinde durur; repoya/koda **yazılmaz**.

---

## 3) URL ayarları (KRİTİK)

Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://kuryemibul.com`
- **Redirect URLs** (allowlist) — şunları ekle:
  - `https://kuryemibul.com/giris.html` ← **Google OAuth dönüşü için ZORUNLU**
  - `https://kuryemibul.com/verify-email.html`
  - `https://kuryemibul.com/profil-duzenle.html`
  - `https://kuryemibul.com/sifre-sifirla.html`
  - (geliştirme için) `https://kadiryar571-eng.github.io/kuryemi-bul/verify-email.html`
  - (lokal test için) `http://localhost:3211/giris.html` ← **Google OAuth yerel test için**
  - (lokal test için) `http://localhost:3211/verify-email.html`

> ⚠️ `giris.html` allowlist'te olmazsa Google OAuth sonrası kod kaybolur ve giriş tamamlanmaz.

> ❗ verify-email.html allowlist'te yoksa Supabase yönlendirmeyi **reddeder** ve doğrulama tamamlanmaz.

---

## 4) Doğrulama ayarları

Supabase → **Authentication** → **Providers** → **Email**:

- **Confirm email:** ✅ Açık (kayıt sonrası doğrulama zorunlu olur)
- **Email OTP Expiration:** `86400` (saniye = **24 saat**)

---

## 5) E-posta şablonlarını yapıştır

Her şablon için: Supabase → **Authentication** → **Email Templates** → ilgili tür → **Message body** alanına HTML içeriğini yapıştır.

### Confirm signup
- **Şablon:** `email-templates/confirm-signup.html`
- **Konu:** `E-postanı Doğrula · Kuryemi Bul`
- **Değişkenler:** `{{ .SiteURL }}`, `{{ .TokenHash }}`
- Doğrulama bağlantısı: `https://kuryemibul.com/verify-email.html?token_hash=<HASH>&type=signup`

### Reset password
- **Şablon:** `email-templates/reset-password.html`
- **Konu:** `Şifreni Sıfırla · Kuryemi Bul`
- **Değişkenler:** `{{ .SiteURL }}`, `{{ .TokenHash }}`
- Sıfırlama bağlantısı: `https://kuryemibul.com/sifre-sifirla.html?token_hash=<HASH>&type=recovery`
- Token geçerlilik süresi: **1 saat** (Supabase varsayılanı)

### Change email address
- **Şablon:** `email-templates/change-email.html`
- **Konu:** `E-posta Adresini Onayla · Kuryemi Bul`
- **Değişken:** `{{ .ConfirmationURL }}` (Supabase tam URL'i üretir)
- Yeni adrese gönderilir; kullanıcı onaylayana kadar eski adres aktif kalır.

---

## Akış (nasıl çalışır)

1. Kullanıcı `giris.html`'de kayıt olur → `SB.signUp` çağrılır (`emailRedirectTo = /verify-email.html`).
2. Supabase güvenli bir token üretir, **Brevo SMTP** üzerinden dark temalı doğrulama e-postası gönderir.
3. Kullanıcı butona tıklar → `verify-email.html` açılır → `SB.verifyEmail(token_hash, type)` → `auth.verifyOtp`.
4. Token geçerliyse: oturum açılır, e-posta doğrulanır (tek-kullanım), `profil-duzenle.html`'e yönlendirilir.
5. Token süresi dolmuş/kullanılmışsa: hata gösterilir + **"Yeni doğrulama linki gönder"** (`SB.resendVerification` → `auth.resend`).

## Retry / hata yönetimi

- **Teslim retry:** Brevo SMTP kendi içinde teslim denemesi yapar.
- **Süresi dolmuş/başarısız doğrulama:** `verify-email.html` üzerindeki resend formu yeni bağlantı gönderir.
- **Rate limit:** Supabase'in yerleşik e-posta gönderim limitleri geçerlidir (Auth → Rate Limits'ten ayarlanabilir).

## Kod tarafı (zaten hazır — değişiklik gerekmez)

- `verify-email.html` — doğrulama açılış sayfası (3 durum: yükleniyor / başarılı / hata+resend)
- `assets/js/supabase.js` — `signUp` (emailRedirectTo), `verifyEmail()`, `resendVerification()`
- `assets/js/i18n.js` — `verify.*` metinleri (TR + EN)
- `email-templates/confirm-signup.html` — premium dark e-posta şablonu
