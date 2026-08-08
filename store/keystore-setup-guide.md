# Release İmzalama Anahtarı — Kurulum Rehberi

> **Neden gerekli?** Site üzerinden dağıtılan APK, Android'in herkese açık
> *debug* anahtarıyla imzalanıyordu (`CN=Android Debug, O=Android, C=US`).
> Bu anahtar herkeste var; üçüncü bir kişi Android'in "güncelleme" olarak
> kabul edeceği kötücül bir APK üretebilirdi. Ayrıca `assembleDebug`
> çıktısı `android:debuggable="true"` taşıdığı için ADB ile WebView'e
> bağlanıp canlı Supabase oturum jetonu okunabiliyordu.
>
> Artık CI yalnız **imzalı release** derliyor. Aşağıdaki 4 secret olmadan
> workflow bilerek başarısız oluyor — yanlışlıkla debug APK yayınlanmasın diye.

---

## 1. Anahtar deposunu oluştur (tek seferlik, kendi bilgisayarında)

JDK ile gelen `keytool` kullanılır. Android Studio kuruluysa zaten vardır.

```bash
keytool -genkeypair -v \
  -keystore release.keystore \
  -alias kuryemibul \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storetype PKCS12
```

Soracağı bilgiler (ad/soyad, kurum, şehir, ülke kodu `TR`) sertifikaya
gömülür; kullanıcıya görünmez ama sonradan **değiştirilemez**.

Parolayı sorduğunda güçlü bir parola gir ve **kaydet**.

> ### ⚠️ Bu dosyayı kaybetme
> Play Store'a bir kez yüklendikten sonra, uygulamanın tüm güncellemeleri
> **aynı** anahtarla imzalanmak zorundadır. Kaybedersen uygulamayı bir daha
> güncelleyemezsin — yeni paket adıyla sıfırdan yayınlaman gerekir ve mevcut
> kullanıcılar taşınmaz.
>
> - Şifreli bir yedeğini en az iki ayrı yerde tut (ör. parola yöneticisi + harici disk).
> - `.gitignore`'a eklendi; **asla** repoya commit'leme.
> - Play Console'da *Play App Signing*'i etkinleştirirsen Google upload key'i
>   kaybetme riskini de üstlenir — şiddetle önerilir.

---

## 2. base64'e çevir

GitHub Secrets binary dosya tutamaz, bu yüzden base64 metne çeviriyoruz.

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) | Set-Clipboard
```

**macOS / Linux:**
```bash
base64 -w0 release.keystore | pbcopy      # macOS
base64 -w0 release.keystore               # Linux (çıktıyı kopyala)
```

---

## 3. GitHub Secrets'a ekle

`GitHub → repo → Settings → Secrets and variables → Actions → New repository secret`

| Secret adı | Değer |
|---|---|
| `KEYSTORE_BASE64` | 2. adımdaki base64 metin (tek satır) |
| `KEYSTORE_PASSWORD` | anahtar deposu parolası |
| `KEY_ALIAS` | `kuryemibul` (1. adımda verdiğin `-alias`) |
| `KEY_PASSWORD` | anahtar parolası (PKCS12'de genelde depo parolasıyla aynı) |

---

## 4. Derlemeyi çalıştır

`Actions → Android APK Derle → Run workflow`

Workflow şunları otomatik yapar:

1. Dört secret'ın varlığını doğrular (eksikse **durur**, debug APK yayınlamaz).
2. `assembleRelease` + `bundleRelease` (APK ve Play Store için AAB).
3. **İmza doğrulaması** — çıktı hâlâ "Android Debug" ile imzalıysa iş başarısız olur.
4. **debuggable doğrulaması** — bayrak açıksa iş başarısız olur.
5. Keystore'u runner'dan siler.
6. `downloads/kuryemibul.apk`'yı günceller.

---

## 5. Yerelde imzasız derleme

Secret'lar yoksa `signingConfig` otomatik devre dışı kalır ve derleme
imzasız çıktı üretir (yalnız test amaçlı, kurulamaz):

```bash
cd android && ./gradlew assembleRelease
```

Debug derleme artık `com.kuryemibul.app.debug` paket adıyla kurulur,
yani release sürümünün üstüne yazmaz.

---

## Sürüm numarası

`versionCode`/`versionName` artık kökteki [`version.json`](../version.json)
dosyasından okunuyor. Önceden `build.gradle` içinde `1` / `"1.0"` sabitti;
her derleme sürüm 1 olarak çıktığı için Play Store güncellemeyi reddederdi.
`version-bump.yml` her push'ta `build` alanını artırır, dolayısıyla
`versionCode` kendiliğinden ilerler.
