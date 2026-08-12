# Uygulama Kabuğu ve Panel Dili — Tasarım

**Tarih:** 2026-08-13
**Kapsam:** `docs/` — uygulama kabuğu (topbar + sidebar) ve panel bileşen sözlüğü
**Tetikleyen sayfa:** `panel-firma.html`

---

## Bağlam

Site sayfa sayfa görsel olarak yenileniyor. İlk adımda `index.html` koyu premium
tasarıma geçti ([bkz. commit 909c09e]). Sıradaki sayfa `panel-firma.html`.

Ama bu sayfa `index.html`'den yapısal olarak farklı: landing izole bir sayfaydı
(`.lp-`, `.sp-`, `.hiw-`, `.rs-`, `.fin-` namespace'leri `main.css`'te yoktu, bu
yüzden 1191 satırlık stil bloğu serbestçe baştan yazılabildi). Panel ise
**uygulama kabuğunun** bir örneği: topbar ve sidebar `components.js` tarafından
basılıyor, stiller `main.css`'ten geliyor ve **33 sayfa** aynı kabuğu paylaşıyor.

Kullanıcının açık isteği: *"tüm sayfalar birbirinin aynı olmak şartıyla."*
Bu, mimarinin zaten doğal sonucu — kabuk token'a bağlı olduğu için doğru yerden
yapılan tek bir değişiklik 33 sayfaya birden yayılır.

---

## Kararlar (kullanıcı onayıyla)

| Konu | Karar | Gerekçe |
|---|---|---|
| App teması | **Açık kalır, dark toggle korunur** | Panel/liste/form ekranları yoğun veri taşır; açık tema uzun oturumlarda okunaklı. Landing "vitrin", app "çalışma alanı" — bilinçli ayrım. Ayrıca `main.css`'te 550 sabit kodlanmış hex var; koyuya çevirmek 33 sayfada renk avcılığı demekti. |
| Gezinme dili | **Girintili yuvarlak pill** | Aktif öğe dolu yuvarlak zemin; sert 3px sol çubuk kalkar. |
| Profil ilerlemesi | **Tek gösterge: profil motoru** | Aşağıdaki hata kaydına bakınız. |

---

## Düzeltilecek Hata: Çelişen Profil Yüzdesi

Üç panel sayfasının (`panel-firma`, `panel-isletme`, `panel-kurye`) hepsinde,
aynı ekranda ~30px arayla **iki farklı profil tamamlanma yüzdesi** gösteriliyor:

- **Hoşgeldin bloğu** (`panel-firma.html:418-420`) → `profile.profil_guc`
  okuyor, yani **veritabanı kolonundan** geliyor.
- **Profil motoru** (`panel-firma.html:265-274`) → 6 alanı istemcide tek tek
  kontrol edip (`ad`, `sehir`, `hakkinda`, `kurye_sayisi`, `avatar_url`,
  `web/telefon`) **kendi yüzdesini hesaplıyor**.

Bu iki sayının eşit olmasını sağlayan hiçbir mekanizma yok.

**Canlı ortamda doğrulandı** (firma test hesabı, 2026-08-13): hoşgeldin bloğu
**"Profil %0 tamamlandı"** derken, hemen altındaki motor **"%17 TAMAMLANDI"**
gösteriyor. Yani hata teorik değil, şu an üretimde görünüyor.

**Çözüm:** Profil motoru tek kaynak olur. Hoşgeldin bloğundaki ilerleme çubuğu,
etiketi ve "Profili Tamamla →" linki kaldırılır; blok sade bir selamlama +
avatar şeridine döner. Motor tercih edildi çünkü yüzdeyle birlikte **hangi
adımın eksik olduğunu** da söylüyor — aksiyona dönük olan o.

---

## Düzeltilecek Hata: Footer'da Yanlış Yıl

`components.js:424` uygulama footer'ını basıyor ve metin sabit: **"© 2025
KuryemiBul"**. `index.html`'in kendi footer'ı ise "© 2026" diyor. Yani girişli
kullanıcı **33 sayfada** bir önceki yılı görüyor.

**Çözüm:** Yıl çalışma anında üretilir (`new Date().getFullYear()`), böylece
bir daha eskimez.

---

## Gözlem: Hoşgeldin Bloğu Alan İsrafı

Canlı görünümde blok, iki satır metin (selamlama + alt başlık) için ~190px
dikey alan kaplıyor ve neredeyse tamamen boş. Sayfanın en büyük kutusu, en az
bilgiyi taşıyor. İlerleme çubuğu da kaldırılınca (yukarıdaki hata kaydı) blok
daha da boşalacak.

**Çözüm:** Blok kompakt bir **selamlama şeridine** iner — tek satır selamlama +
alt başlık solda, avatar sağda. Kazanılan dikey alan, asıl işi taşıyan profil
motoru ve istatistik kartlarına gider.

---

## Mimari: Değişiklik Nerede Yaşar

`index.html`'in aksine burada **sayfaya özel stil bloğu yazılmaz.** Kabuk ve
bileşenler zaten token'a bağlı; doğru katmana dokunmak tutarlılığı otomatik
sağlar.

| Katman | Dosya / bölüm | Etkilenen |
|---|---|---|
| Kabuk | `main.css` §12 (topbar), §13 (sidebar), §14 (içerik) + `components.js` render fonksiyonları | **33 sayfa** |
| Panel bileşenleri | `main.css` §17, §35, §39, §40 | 3 panel + `panel-box` kullanan 6 sayfa |
| Sayfa içi temizlik | `panel-firma.html` | yalnız bu sayfa |

---

## Tasarım

### Topbar

Yükseklik 56 → 60px. Marka, düz mavi metin yerine **logo işareti + isim**
(`assets/logo-128.png` — landing ile aynı marka işareti; `components.js:223`
şu an yalnız metin basıyor). Arama kutusu ve ikon butonları yumuşatılır.

**Korunacak:** `main.css:449-475`'teki dar ekran koruma kuralları. Oradaki uzun
yorum, hamburger butonunun 0px'e çöküp menüyü erişilemez hale getirdiği bir
çöküş zincirini anlatıyor; `flex-shrink: 0` kuralları ve 720px/480px eşikleri
aynen kalır.

### Sidebar

Öğeler `8px` yanal boşlukla içeri alınır, `10px` yuvarlatılır. Aktif öğe dolu
zemin + `600` ağırlık alır; `main.css:519-527`'deki `::before` 3px çubuk
kaldırılır. Bölüm etiketleri (`.sidebar-section-label`) arasına nefes eklenir.
Genişlik `--sidebar-w: 240px` sabit kalır (mobil açılır davranışı değişmez).

### Paylaşılan bileşen sözlüğü

- **`.panel-box`** — başlık/gövde ayrımı netleşir, kenarlık yumuşar, başlıktaki
  aksiyon butonu hizası düzelir.
- **`.dash-stat`** — tıklanabilir olduğu görsel olarak belli olur (hover
  yükselme), sayı hiyerarşisi güçlenir.
- **`.kb-badge`** *(yeni sınıf)* — şu an `panel-firma.html:138-140`'ta üç kez
  inline tekrarlanan rozet tek sınıfa iner. Varyantlar: `--primary`, `--error`,
  `--warning`. Aynı kalıp diğer panellerde de var.
- **`.skel`** — 11 sayfadaki iskelet yükleyiciler yeni yüzeylerle uyumlanır.
- **Emoji → SVG** — landing'de uygulanan kararın devamı. **Kapsam bu adımda
  yalnız `panel-firma.html`'dir** (`:149`'daki `📅`). Diğer app sayfalarındaki
  emoji ikonlar sıraları geldiğinde çevrilir; 33 sayfayı tek seferde taramak
  bu adımın kapsamını şişirir ve sayfa sayfa ilerleme kararına aykırı olur.

### `panel-firma.html` özelinde

1. Hoşgeldin bloğu kompakt selamlama şeridine iner (yukarıdaki iki kayıt).
2. **Inline `style=` temizliği (35 adet).** Yalnız *statik sunum* kararları
   sınıfa taşınır (rozet renkleri, kutu boşlukları, `cursor:default` vb.).
   **JS'in çalışma anında yazdığı stiller yerinde kalır** — `style="width:0%"`
   (ilerleme çubuğu dolgusu, `:278`/`:419`) ve `style="display:none"`
   (motorun ve rozetlerin görünürlük anahtarı, `:275-276`). Bunlar sunum
   değil, durum taşıyor; sınıfa çevirmek JS'i kırar.
3. Boş durumlar (`Yaklaşan görüşme yok.` gibi düz metinler) mevcut
   `.kb-empty` bileşenine bağlanır — 4 sayfada zaten var, burada
   kullanılmamış.
4. Sekme çubuğu, panel sıralaması ve tüm işlevler **aynı kalır**.

---

## Dokunulmayacaklar

Tüm JS mantığı (`switchTab`, `renderProfEngine`, Supabase çağrıları, rozet
sayaçları, realtime abonelikleri), `data-tab` kancaları, `id` sözleşmeleri,
rotalar, oturum koruması (`runSessionGuard`), dark tema toggle'ı, `www/`
klasörünün tamamı, Supabase şeması.

`profil_guc` kolonu veritabanında kalır — yalnız bu sayfadaki görsel kullanımı
kaldırılır. Başka sayfalar kullanıyorsa etkilenmez (uygulama öncesi taranacak).

---

## Doğrulama

Panel sayfaları oturum ister. Kullanıcı **firma rolünde bir test hesabı**
sağlayacak; doğrulama onunla yapılır:

1. `npx http-server docs -c-1` (asla `npx serve` — query string düşürüyor)
2. Test hesabıyla giriş → `panel-firma.html`
3. Konsolda yeni hata olmaması
4. Sekme geçişleri (`Genel Bakış` / `Filo Yönetimi` / `İşe Alım`) çalışıyor
5. Profil motoru tek yüzde gösteriyor, hoşgeldin bloğunda çubuk yok
6. Rozet sayaçları (mesaj, başvuru, geri bildirim) doğru basılıyor
7. Sidebar aktif öğe işaretlemesi doğru sayfada doğru öğede
8. Responsive: 1440 / 1024 / 768 / 390 px — yatay taşma yok, sidebar mobilde
   açılıp kapanıyor, hamburger görünür
9. Regresyon: `panel-kurye.html`, `panel-isletme.html`, `kuryeler.html`,
   `mesajlar.html` ve `index.html` bozulmamış
10. Ağ denetimi: Supabase uç noktaları değişmemiş

Projede build/lint/typecheck **yoktur** (CLAUDE.md: "Derleme adımı yoktur").

---

## Doğrulama Erişimi

Firma rolünde test hesabı sağlandı ve çalıştığı doğrulandı (giriş →
`panel-firma.html` yönlendirmesi başarılı). Görsel doğrulama bu hesapla
yapılacak.

> **Not:** Test bittiğinde hesabın şifresi değiştirilmeli — kimlik bilgileri
> geliştirme oturumu kaydında yer alıyor.
