# Havuz Kartı — Boş Durum Temizliği

**Tarih:** 2026-08-13
**Kapsam:** `docs/assets/js/app.js` kart render fonksiyonları + 4 havuz sayfası

---

## Bağlam

Site sayfa sayfa yenileniyor. Kabuk (topbar/sidebar) ve paylaşılan bileşen dili
tamamlandı; sıra sayfaların kendi içerik tasarımında. Denetimde havuz/liste
sayfalarının en çok gerçek kusur taşıdığı görüldü.

`kuryeler.html` canlı ortamda incelendi (firma test hesabı). Havuzdaki tek
kaydın çoğu alanı boş ve kart bunu **yüksek sesle** gösteriyor.

Ölçülen gerçek çıktı:

```html
<div class="pcard__sub"> · </div>          <!-- şehir/bölge boş, ayraç kaldı -->
<span class="stars">☆☆☆☆☆</span>           <!-- puan yok, 5 boş yıldız -->
<div class="career-score-mini">
  <span>Puan</span><b>—</b>
  <div class="xp-bar__fill" style="width:0%"></div>   <!-- boş çubuk -->
</div>
<span class="chip">🛵 Motosiklet</span>
```

Ayrıca "1 sonuç gösteriliyor" ifadesi ekranda **iki kez** görünüyor
(`#psBanner` ve `#resultCount`).

---

## İlke

**Veri yoksa o parça hiç basılmaz.**

Boşluğu göstermek yerine bölümü atlamak hem daha sakin hem daha dürüst.
Bu, projenin "uydurma veri üretme" kuralıyla çelişmez — hiçbir şey
uydurulmuyor, yalnız **olmayan şeyin yer kaplaması** engelleniyor.

---

## Düzeltilecekler

| # | Kusur | Kaynak | Çözüm |
|---|---|---|---|
| 1 | İsim altında yalnız `" · "` | `app.js:890` | Dolu parçaları birleştir; hiçbiri yoksa satırı basma |
| 2 | 5 boş yıldız | `app.js:891` | Puan yoksa yıldız satırı yok |
| 3 | "Puan —" + boş çubuk | `app.js:892-895` | Değerlendirme yoksa blok tamamen yok |
| 4 | "0 teslimat" rozeti | `app.js:898` | Sıfırsa rozet yok |
| 5 | Bozuk görünen `✉️` | `app.js:862` | SVG zarf ikonu |
| 6 | Emoji ikonlar 🛵 📍 👥 | `app.js:896, 909, 922` | SVG |
| 7 | Boş açıklama paragrafı | `app.js:908, 920` | `aciklama` boşsa `<p>` basma |
| 8 | Çift sonuç sayacı | `#psBanner` + `#resultCount` | Şeritteki özet kalsın, alttaki kalksın |

Aynı mantık üç kart fonksiyonuna da uygulanır: `kuryeCard`, `isletmeCard`,
`firmaCard`. Dört sayfa (`kuryeler`, `isletmeler`, `firmalar`, `ilanlar`) bu
fonksiyonları paylaştığı için düzeltme tek yerde yapılır.

---

## Dokunulmayacaklar

Kart yapısı ve sınıf adları (`.talent-card`, `.pcard__*`, `.chip`),
`data-teklif` / `data-id` kancaları, `poolStar`, `onlineBadge`, presence
rozeti, filtreleme/sıralama/arama mantığı, Supabase çağrıları.

**Bu bir yeniden yazma değil, koşullu render eklemesidir.**

---

## Doğrulama

1. `npx http-server docs -c-1` (asla `npx serve`)
2. Firma test hesabıyla giriş → `kuryeler.html`
3. Boş veri durumu: kartta yıldız satırı, puan bloğu, "0 teslimat" ve yalnız
   ayraçtan ibaret alt satır **görünmemeli**
4. Dolu veri durumu: bir alan geçici doldurulup ilgili parçanın **geri
   geldiği** doğrulanmalı — koşul yanlış tarafa kapanmasın
5. `isletmeler`, `firmalar`, `ilanlar` sayfaları da açılıp bozulmadığı
   görülmeli
6. Konsolda yeni hata olmamalı
7. Teklif ve "Profili Gör" butonları çalışmaya devam etmeli
