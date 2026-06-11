# Brevo + Supabase E-posta Doğrulama Kurulumu

KuryemiBul'un e-posta doğrulaması **Supabase Auth'un yerleşik mekanizması** ile çalışır;
e-postalar **Brevo SMTP relay** üzerinden gönderilir. Token üretimi, 24 saat geçerlilik,
tek-kullanımlık ve doğrulama tamamen Supabase tarafında yapılır. Kod tarafı hazır;
aşağıdaki **panel ayarları** yapıldığında sistem anında çalışır.

> ⚠️ **Hiçbir API anahtarı repoya yazılmaz.** Tüm gizli bilgiler yalnızca Supabase
> Dashboard'un sunucu-tarafı ayarlarında durur.

---

## 1) Brevo SMTP bilgilerini al

1. https://app.brevo.com → hesap aç / giriş yap.
2. Sol üst profil → **SMTP & API** → **SMTP** sekmesi.
3. Şu bilgileri not al:
   - **SMTP Server:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Login:** Brevo'nun verdiği SMTP login (genelde hesap e-postan veya `xxxx@smtp-brevo.com`)
   - **SMTP Key (Password):** "Generate a new SMTP key" ile oluştur — **bu, parola olarak kullanılacak**.
4. **Senders & IP** bölümünden bir **gönderen e-posta** doğrula (örn. `noreply@kuryemibul.com`).
   Domain doğrulaması (SPF/DKIM) yapılması teslimat oranını ciddi artırır.

---

## 2) Supabase'de SMTP'yi Brevo'ya bağla

Supabase Dashboard → **Project Settings** → **Authentication** → **SMTP Settings**:

| Alan | Değer |
|------|-------|
| Enable Custom SMTP | ✅ Açık |
| Sender email | `noreply@kuryemibul.com` (Brevo'da doğruladığın gönderen) |
| Sender name | `Kuryemi Bul` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | Brevo SMTP **Login** |
| Password | Brevo **SMTP Key** |
| Minimum interval | varsayılan bırak |

**Save** → "Send test email" ile doğrula.

---

## 3) URL ayarları (KRİTİK)

Supabase → **Authentication** → **URL Configuration**:

- **Site URL:** `https://kuryemibul.com`
- **Redirect URLs** (allowlist) — şunları ekle:
  - `https://kuryemibul.com/verify-email.html`
  - `https://kuryemibul.com/profil-duzenle.html`
  - `https://kuryemibul.com/sifre-sifirla.html`
  - (geliştirme için) `https://kadiryar571-eng.github.io/kuryemi-bul/verify-email.html`
  - (lokal test için) `http://localhost:3211/verify-email.html`

> ❗ verify-email.html allowlist'te yoksa Supabase yönlendirmeyi **reddeder** ve doğrulama tamamlanmaz.

---

## 4) Doğrulama ayarları

Supabase → **Authentication** → **Providers** → **Email**:

- **Confirm email:** ✅ Açık (kayıt sonrası doğrulama zorunlu olur)
- **Email OTP Expiration:** `86400` (saniye = **24 saat**)

---

## 5) E-posta şablonunu yapıştır

Supabase → **Authentication** → **Email Templates** → **Confirm signup**:

- **Message body** alanına `email-templates/confirm-signup.html` dosyasının içeriğini yapıştır.
- Şablon, `{{ .SiteURL }}` ve `{{ .TokenHash }}` değişkenlerini kullanır; Supabase otomatik doldurur.
- Doğrulama bağlantısı şu formattadır:
  ```
  https://kuryemibul.com/verify-email.html?token_hash=<HASH>&type=signup
  ```

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
