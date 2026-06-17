# ADIM 3 — Web Push (VAPID) Kurulum Rehberi

## 3a — VAPID Anahtarı Üret

Terminalde bir kez çalıştır:
```bash
npx web-push generate-vapid-keys
```

Çıktı şuna benzer:
```
Public Key:
BNvTQ1234...abcdef

Private Key:
xYz789...secret
```

Bu iki değeri güvenli bir yere kaydet (şimdilik gerekli).

---

## 3b — Supabase Dashboard'a Ekle

1. Supabase → sol menü → **Project Settings** → **Edge Functions**
2. **"Add new secret"** butonuna tıkla
3. Şu iki secret'ı ekle:

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | 3a'daki Public Key |
| `VAPID_PRIVATE_KEY` | 3a'daki Private Key |

`SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` Supabase tarafından otomatik eklenir — elle girme.

---

## 3c — Supabase CLI Kur ve Deploy Et

### CLI Kur (eğer yoksa)
```bash
npm install -g supabase
```

### Giriş Yap
```bash
supabase login
```
Tarayıcı açılır, Supabase hesabınla giriş yaparsın.

### Project Reference'ı Öğren
Supabase → Project Settings → General → **Reference ID** (örn: `abcdefghijklmnop`)

### Deploy Et
```bash
cd c:\Users\ben\Desktop\websitem
supabase functions deploy send-push --project-ref <REFERENCE_ID>
```

---

## 3d — Veritabanında Ayarları Yapılandır

`migration-14-push.sql` DB-side trigger'ı `app.supabase_url` ve `app.service_role_key` ayarlarını kullanıyor.

Supabase → **SQL Editor** → şunu çalıştır:

```sql
-- <PROJECT_REF> ve <SERVICE_ROLE_KEY> yerine kendi değerlerini yaz
-- Service Role Key: Supabase → Project Settings → API → service_role
ALTER DATABASE postgres SET app.supabase_url = 'https://<PROJECT_REF>.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<SERVICE_ROLE_KEY>';
SELECT pg_reload_conf();
```

---

## 3e — Test Et

### Edge Function Logs
Supabase → Edge Functions → `send-push` → **Logs** sekmesi

### Manuel Test (SQL Editor'da):
```sql
-- Test için önce bir bildirim oluştur (kendi user_id'ni yaz)
INSERT INTO public.notifications (user_id, title, body, type)
VALUES ('<SENIN_USER_ID>', 'Test Push', 'Web push çalışıyor!', 'system');
```

Loglar'da `"sent": 1` görünmeli.

---

## Notlar

- `send-push/index.ts` kodu zaten var: `supabase/functions/send-push/index.ts`
- VAPID Public Key'i frontend'e de eklemen gerekecek (kullanıcı push izni verdiğinde subscription oluşturmak için)
- Push izin kodu şu an frontend'de implement edilmemiş — sonraki aşamada (`@capacitor/push-notifications`) yapılacak
