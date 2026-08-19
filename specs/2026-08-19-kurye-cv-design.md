# Kurye Özgeçmişi (CV) — Tasarım

**Tarih:** 2026-08-19
**Kapsam:** `docs/` web sitesi. Mobil uygulama (`www/`) bu turda değişmez.
**Önkoşul:** `profiles` tablosundaki yedi eksik kolon (aşağıda ölçüldü)

---

## Bağlam

Kurye profili bugün şunları gösteriyor: puan, doğrulama merkezi, aktivite
sayaçları (teslimat / deneyim / bölge / sertifika), genel bilgiler, sertifikalar,
çalışma geçmişi etiketleri ve migration-34 ile gelen ayrıntılı iş deneyimi.

Eksik olan, bunları **işverenin karar verebileceği tek bir anlatıya** çeviren
katman. İşveren `basvurular.html` üzerinden adayı inceliyor ve "Profil Sayfası"
bağlantısıyla `profil-kurye.html?id=`'ye gidiyor; orada dağınık bölümler var,
özgeçmiş yok.

### Ölçülen engel: yedi kolon veritabanında yok

`profil-duzenle.html` şu alanları `profiles` tablosuna yazıyor — hiçbiri mevcut
değil:

```
dogum_tarihi   ilce   gunluk_saat   arac_marka   arac_model   plaka   plaka_gizli
```

PostgREST'e doğrudan sorulduğunda (anon anahtar, eşleşmeyen satır):

```
PATCH /profiles?id=eq.<yok>   {"dogum_tarihi":null}
  → HTTP 400  PGRST204  "Could not find the 'dogum_tarihi' column of 'profiles'"

PATCH /profiles?id=eq.<yok>   {"sehir":"x"}
  → HTTP 204
```

Sonuç tek bir alanla sınırlı değil: `savePersonal()` tek bir `UPDATE` gönderdiği
için aynı istekteki `ad`, `sehir`, `aciklama` da yazılmıyor. Yani **Kişisel
Bilgiler ve Araç Bilgileri formları şu an hiç kaydetmiyor.** `updateMyProfile`
hatayı fırlatıyor ve arayüz bunu artık kullanıcıya gösteriyor (daha önceki
sessiz-hata temizliğinden), yani veri kaybı sessiz değil — ama form işlevsiz.

CV bu alanların (doğum tarihi, ilçe, araç, plaka) üstüne kurulacağı için bu
düzeltme önkoşuldur ve **önce, ayrı bir yama olarak** çıkar.

### Mevzuat girdisi: motokurye belgeleri 2026'da değişti

Dış kaynaklara göre Türkiye'de motokuryelik için:

- A1/A2/A sınıfı **motosiklet** ehliyeti zorunlu; B sınıfı otomobil ehliyetiyle
  ticari motokuryelik yapılamıyor
- **SRC Kurye Belgesi 15 Mayıs 2026'dan itibaren zorunlu** (25 saatlik MEB
  onaylı eğitim + sınav), 5 yılda bir yenileniyor
- Yaş aralığı 18-69, sağlık raporu ve temiz adli sicil isteniyor
- İşe alımda firmalar "ehliyet + SRC + psikoteknik" üçlüsünü birlikte görmek
  istiyor

Bugün 2026-08-19 olduğuna göre SRC zorunluluğu **yürürlükte**. CV'yi genel bir
özgeçmişten ayıran en değerli kısım bu: işverenin ilk baktığı üç şey.

Kaynaklar:
[srckurye.com.tr — Moto Kurye Olma Şartları](https://srckurye.com.tr/moto-kurye-sartlari/) ·
[etspsikoteknik.com — Motokurye Belgeleri](https://www.etspsikoteknik.com/motokurye-belgeleri) ·
[srcmerkezi.org — Moto Kurye Belge](https://srcmerkezi.org/moto-kurye-belge/)

---

## Kararlar

| Soru | Karar |
|---|---|
| CV nerede kullanılacak? | **Platform içi** — işveren başvuruyu incelerken görür. PDF yok, paylaşılabilir genel bağlantı yok. |
| Nasıl dolacak? | **Melez** — profilde olan otomatik gelir, yalnız CV'ye özgü eksikler sorulur |
| Belgeler nasıl gösterilecek? | **Beyan + mevcut KYC rozeti** — yeni onay hattı kurulmaz |
| Eksik kolonlar ne zaman? | **Önce ayrı yama**, sonra CV |
| Hangi uygulamalar? | **Yalnız `docs/`**; `www/` sonraya |

---

## Saklanmayan üç alan — adli sicil, sağlık raporu, psikoteknik

**Karar (onaylandı):** bu üçü CV'de yer almaz. Platformun ilgi alanına
girmiyorlar.

İki gerekçe aynı yöne işaret ediyor. Birincisi kapsam: bunlar işveren ile kurye
arasındaki görüşmenin konusu, platformun tutacağı bir kayıt değil. İkincisi
hukuki: üçü de KVKK m.6 kapsamında **özel nitelikli kişisel veri** (sağlık
bilgisi ve ceza mahkûmiyeti); işlenmeleri açık rıza, ayrı saklama ve ek güvenlik
tedbiri gerektirir.

Yerine CV'de nötr bir satır: **"İşveren görüşmede belge talep edebilir."**

Sonradan eklenmek istenirse kolon eklemek yeterli değildir; rıza akışının da
tasarlanması gerekir.

---

## Veri modeli

### Yeni tablo: `public.courier_cv`

Kurye başına tek satır. `profiles`'a kolon eklemek yerine ayrı tablo, çünkü
`profiles` zaten 30+ kolonla üç rolü birden taşıyor ve CV alanları yalnız
kuryeyi ilgilendiriyor. Desen migration-34'ün `work_experience` için kurduğu
desenin aynısı: sahip RLS'i + işverene açılan `security_invoker = false` görünüm.

| Alan | Tip | Not |
|---|---|---|
| `id` | uuid pk | |
| `profile_id` | uuid → profiles(id) **unique** | tek satır kısıtı |
| `user_id` | uuid → auth.users(id) | RLS için |
| `ozet` | text | CV başındaki kısa anlatım |
| `ehliyet_sinifi` | text[] | A1 / A2 / A / B |
| `ehliyet_tarihi` | date | "kaç yıllık ehliyet" |
| `src_belge` | boolean | 2026'dan beri zorunlu |
| `src_gecerlilik` | date | 5 yılda bir yenilenir |
| `egitim` | jsonb `'[]'` | `[{okul, derece, yil}]` — hiç sorgulanmayacak |
| `tercih_bolgeler` | text[] | çalışmak **istediği** bölgeler |
| `musaitlik` | text | tam/yarı zamanlı, vardiya tercihi |
| `yayinlandi` | boolean default false | önizlemeden sonra açılır |
| `created_at` / `updated_at` | timestamptz | |

`egitim` neden ayrı tablo değil: kurye başına 1-2 kayıt, hiçbir zaman
filtrelenmeyecek/join'lenmeyecek. Ayrı tablo üçüncü bir RLS yüzeyi açar,
karşılığında hiçbir şey kazandırmaz.

### RLS — tek katman

```
cv_owner_all : auth.uid() = user_id     (kuryenin kendi satırı; tam yetki)
```

Başka politika yok. Okuma, aşağıdaki görünüm üzerinden yapılır.

`work_experience` iki katman kullanıyor (`we_owner_all` + `we_employer_select`)
çünkü orada bir **gizlilik kademesi** var: `referans_ad` / `referans_tel`
görünümün dışında tutuluyor ve yalnız gerçek başvurusu olan işverene açılıyor.
CV'de böyle bir alan yok — özel nitelikli üç alan zaten bilerek dışarıda
bırakıldı. Kademe olmadığı için ikinci bir politika ikinci bir okuma yolu açar
ve karşılığında hiçbir şey kazandırmaz; tek katman daha az yüzey demek.

### Görünüm: `public.courier_cv_public`

`security_invoker = false`, yalnız `profiles.yayinda = true` **ve**
`courier_cv.yayinlandi = true` olan kayıtları döndürür. `user_id` dışarıda
kalır. `grant select … to authenticated` — misafire kapalı, `profiles` select
politikasıyla aynı sınır (migration-20).

Açık kolon listesiyle yazılır; `profiles_public`'te olduğu gibi, sonradan
eklenen bir kolonun sessizce dışarı sızmaması için.

---

## Kurye tarafı — CV sihirbazı

**Yeni sayfa `docs/cv-olustur.html` + yeni modül `docs/assets/js/cv.js`
(`window.KBCV`).**

`profil-duzenle.html`'e sekme olarak eklenmiyor: o dosya 2790 satır ve dört ayrı
`<script>` bloğu taşıyor. Blokların ayrı kapsam olması bugün gerçek bir hataya
yol açtı (plaka düzeltmesinde `esc()` başka bloktaydı, `KB.esc` kullanmak
gerekti). Büyüyen dosyayı büyütmek yerine kendi sınırı olan bir birim.

### Altı adım

| # | Adım | Kaynak |
|---|------|--------|
| 1 | Özet | Boşsa `profiles.aciklama`'dan ön-doldurulur |
| 2 | Ehliyet & Belge | Yeni veri — sihirbaz sorar |
| 3 | Eğitim | Yeni veri, eklenebilir satırlar |
| 4 | Deneyim | **Tam düzenleme** — `work_experience` üzerinde ekle/düzenle/sil |
| 5 | Tercih & Müsaitlik | Kısmen profilden |
| 6 | Önizleme | İşverenin göreceği hâl + "Yayınla" |

### 4. adım — tek sihirbazda her şey, ama tek kaynak

Sihirbaz iş deneyimini **tam düzenler**: ekle, düzenle, sil. Kurye CV'yi
tamamlamak için başka bir sayfaya gitmez.

Ayrışma riski şuradan kalkıyor: sihirbaz veriyi **kopyalamaz**. Doğrudan
`work_experience` tablosuna, `supabase.js`'te zaten var olan fonksiyonlarla
yazar:

```
SB.myWorkExperience()      SB.addWorkExperience(data)
SB.workExperienceFor(pid)  SB.updateWorkExperience(id, data)
                           SB.deleteWorkExperience(id)
```

Yeni bir yazma yolu, yeni bir tablo, yeni bir kolon yok. `profil-duzenle.html`
ve `cv-olustur.html` aynı satırları düzenler; hangisinden girilirse girilsin
sonuç aynı yerdedir ve profil sayfasındaki "İş Deneyimi" bölümü ikisini de
gösterir.

**Bilinçli ödünç:** form arayüzü iki yerde durur (o sayfadaki mevcut form
çalışıyor, onu sökmek gereksiz risk). Çoğaltma yalnız **sunumda**; veri
mantığı tek yerde. Ayrışmanın gerçekten zarar verdiği yer veri katmanıdır ve
orası tek. Üçüncü bir yüzey ihtiyaç duyarsa form o zaman ortak modüle çıkarılır
— şimdi çıkarmak, çalışan bir sayfayı sebepsiz elden geçirmek olur.

Adımlar arası taslak `sessionStorage` → `kb_draft:cv` (projede kullanılan
kalıp). Veritabanına yazma yalnız "Kaydet"te.

Giriş noktaları: `panel-kurye.html`'de bir kart, ve kendi profilinde
"CV'mi düzenle".

---

## İşveren tarafı ve görünürlük

CV, `app.js` içindeki `type === "kurye"` dalına yeni bir
`prfSection("Özgeçmiş", …)` olarak girer — yani `profil-kurye.html?id=`
üzerinde. İşverenin bugünkü yolu (`basvurular.html` → "Profil Sayfası") değişmez.

### Görünürlük kuralları

- Bölüm yalnız `role === 'kurye'` dalında var — esnaf/firma profillerinde kod
  olarak bile çalışmaz. ("Sadece kurye profillerinde görünsün" isteğinin
  karşılığı budur.)
- `courier_cv` satırı yoksa veya `yayinlandi = false` ise bölüm **hiç
  basılmaz** — "CV yok" kutusu da yok
- Kendi profiline bakan kurye her zaman görür; eksikse "Tamamla" çağrısıyla

Bu, projenin boş durum ilkesiyle uyumlu: uydurma da yok, sahte boşluk da yok.

### Aday listesine iki çip

`basvurular.html`'deki aday kartına `SRC ✓` ve `A2 ehliyet` çipleri. İşveren
asıl triyajı orada yapıyor; CV'nin değerini listede görünür kılan en ucuz yer.

---

## Önkoşul yaması — `migration-35-profil-eksik-kolonlar.sql`

Idempotent, yedi kolon:

```sql
alter table public.profiles
  add column if not exists dogum_tarihi date,
  add column if not exists ilce         text,
  add column if not exists gunluk_saat  int,
  add column if not exists arac_marka   text,
  add column if not exists arac_model   text,
  add column if not exists plaka        text,
  add column if not exists plaka_gizli  boolean not null default true;
```

`plaka_gizli` varsayılanı bilinçli olarak **true**: plaka kişisel veridir,
varsayılan gizli olmalıdır.

**Sızıntı kontrolü — yapıldı.** `profiles_public` (migration-20:97) `select *`
değil **açık kolon listesi** kullanıyor. Dolayısıyla yeni eklenen yedi kolon
misafire otomatik olarak açılmaz; görünümü değiştirmeye gerek yok. `plaka` ve
`dogum_tarihi` gibi alanların dışarıda kalması bu sayede kod değişikliği
gerektirmiyor.

---

## Dokunulacak dosyalar

**Yeni**
`supabase/migration-35-profil-eksik-kolonlar.sql` ·
`supabase/migration-36-kurye-cv.sql` ·
`docs/cv-olustur.html` · `docs/assets/js/cv.js`

**Değişecek**
`docs/assets/js/supabase.js` (`myCv` / `cvFor` / `saveCv`) ·
`docs/assets/js/app.js` (Özgeçmiş bölümü) ·
`docs/panel-kurye.html` (giriş kartı) ·
`docs/basvurular.html` (aday çipleri) ·
`docs/assets/js/i18n.js` · `docs/assets/css/main.css` ·
`docs/sitemap.xml` · `CLAUDE.md`

**Dokunulmayacak**
`www/` · `android/` — kapsam kararı gereği

---

## Doğrulama

İddia değil ölçüm:

1. **Idempotency** — her iki migration iki kez çalıştırılır, ikincisi hatasız
2. **Kolon probe'u** — yedi kolonun her birine bugünkü `PATCH` denemesi; hepsi
   **204** dönmeli (şu an 400 PGRST204)
3. **RLS matrisi** (curl, dört durum) — kurye kendi CV'sini yazar ✓ / başka
   kuryeninkini yazamaz ✗ / aday olduğu ilanın sahibi okur ✓ / misafir okuyamaz ✗
4. **Uçtan uca** (Playwright) — sihirbazı doldur → kaydet → `profil-kurye.html?id=`
   üzerinde göründüğünü doğrula
5. **XSS** — CV metin alanlarına `<img src=x onerror=…>`; düz metin basılmalı,
   `img` elemanı oluşmamalı (2026-08-19'da uygulanan testin aynısı)
6. **Boş durum** — CV yokken bölümün hiç basılmadığı doğrulanır
7. **Kişisel bilgi formu** — önkoşul yamasından sonra gerçekten kaydettiği
   tarayıcıda doğrulanır (bugün kaydetmiyor)

---

## Kapsam dışı

- **PDF / yazdırma çıktısı** — platform içi karar verildi
- **Paylaşılabilir genel bağlantı** (`/cv/<id>`) — KVKK yükü ayrı tasarım ister
- **Mobil uygulama** — `www/` bu turda değişmez, APK derlemesi yok
- **Belge yükleme + yönetici onayı** — beyan + mevcut KYC rozeti yeterli görüldü
- **`work_experience` formunun ortak modüle çıkarılması** — iki yüzey için erken
- **Adli sicil / sağlık raporu / psikoteknik alanları** — KVKK m.6 gerekçesiyle
- **Dil / yetenek matrisi** — kurye işi için karşılığı yok (YAGNI)
