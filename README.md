# Kuryemi Bul

**Kurye Ekosisteminin Buluşma Noktası** — kuryeleri, kurye firmalarını ve kuryeye
ihtiyaç duyan işletmeleri tek platformda buluşturan kurye ekosistem platformu.

> **Durum:** Faz 1 — Statik interaktif **prototip**. Tüm veriler örnektir (mock);
> backend yoktur. Amaç akışı/UX'i göstermek. Faz 2'de gerçek altyapı (Next.js + Supabase)
> eklenecektir.

## Özellikler (Faz 1)
- 3 kullanıcı rolü: **Kurye / İşletme / Kurye Firması** (sağ üstten rol değiştirme)
- **Havuz + arama/filtre:** kurye, işletme ve firma havuzları
- **Profiller:** seviye (Standart/Profesyonel/Premium) ve yıldız puanı, referanslar, sertifikalar
- **Harita:** Leaflet + OpenStreetMap, 3 katmanlı işaretçiler, bölge filtresi
- **Teklif sistemi:** çok yönlü teklif akışı (modal) — `localStorage`'a kaydedilir, panelde listelenir
- **Paneller:** role özel dashboard (özet, ilanlar, başvurular, teklifler; firma için ihale "Yakında")
- Mobil uyumlu (responsive), hamburger menü, tamamen statik (build adımı yok)

## Dosya Yapısı
| Yol | Açıklama |
|-----|----------|
> **Site kökü `docs/`'tur.** GitHub Pages yalnız o klasörü yayınlar; `supabase/`,
> `store/`, `www/`, `android/` ve `.md` dosyaları repoda kalır ama yayınlanmaz.
> Ayrıntı: [CLAUDE.md](CLAUDE.md#yayınlanan-sadece-docs-önce-bunu-oku)

| `docs/index.html` | Landing (tanıtım) + giriş/kayıt modalı |
| `docs/index.html?auth=login` | Giriş / kayıt — ayrı sayfa yok, modal açılır |
| `docs/kuryeler|isletmeler|firmalar.html` | Havuz listeleme + filtre |
| `docs/profil-*.html` | Profil detayları (`?id=` ile) |
| `docs/harita.html` | Google Maps haritası |
| `docs/panel-*.html` | Role özel paneller |
| `docs/assets/css/main.css` | Tasarım sistemi (tek CSS dosyası) |
| `docs/assets/js/components.js` | Header/footer, rol anahtarı, helper'lar |
| `docs/assets/js/supabase.js` | Tüm veri katmanı (mock veri YOKTUR) |
| `docs/assets/js/auth-forms.js` | Giriş/kayıt formu — tek kaynak |
| `docs/assets/js/app.js` | Havuz/filtre, profil, harita, panel, teklif mantığı |

## Çalıştırma
```bash
npx http-server docs -c-1
```
> `npx serve` kullanmayın: cleanUrls varsayılan olarak açıktır ve 301'de query
> string'i düşürür (`?id=`, `?next=`, `?auth=` kaybolur). GitHub Pages böyle
> davranmaz — `http-server` üretimle birebir uyar.

## Yol Haritası
- **Faz 1 (mevcut):** Statik interaktif prototip
- **Faz 2:** Supabase ile gerçek MVP (auth + DB + gerçek havuz/teklif)
- **Faz 3:** Kurumsal ihale, gelişmiş itibar/performans sistemi
- **Faz 4:** Topluluk entegrasyonu, uluslararası, mobil

---
2026 © Kuryemi Bul (Demo)
