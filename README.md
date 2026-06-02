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
| `index.html` | Landing (tanıtım) |
| `giris.html` | Rol seçimli sahte giriş |
| `kuryeler/isletmeler/firmalar.html` | Havuz listeleme + filtre |
| `profil-*.html` | Profil detayları (`?id=` ile) |
| `harita.html` | Leaflet haritası |
| `panel-*.html` | Role özel paneller |
| `assets/css/styles.css` | Tasarım sistemi |
| `assets/js/components.js` | Header/footer, rol anahtarı, helper'lar |
| `assets/js/data.js` | Örnek (mock) veriler |
| `assets/js/app.js` | Havuz/filtre, profil, harita, panel, teklif mantığı |

## Çalıştırma
```bash
npx serve .
```
> Not: `serve.json` (`cleanUrls:false`) yalnızca yerel sunucunun `?id=` query'lerini
> korumasını sağlar; GitHub Pages'i etkilemez.

## Yol Haritası
- **Faz 1 (mevcut):** Statik interaktif prototip
- **Faz 2:** Supabase ile gerçek MVP (auth + DB + gerçek havuz/teklif)
- **Faz 3:** Kurumsal ihale, gelişmiş itibar/performans sistemi
- **Faz 4:** Topluluk entegrasyonu, uluslararası, mobil

---
2026 © Kuryemi Bul (Demo)
