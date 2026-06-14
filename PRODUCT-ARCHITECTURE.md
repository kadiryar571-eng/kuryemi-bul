# KuryemiBul — Product Architecture & Navigation Blueprint
> MASTER PROMPT 03 (Sitemap & Screen Architecture) + 04 (Dashboard & Navigation Logic) birleşik referansı.
> UI/wireframe/renk YOK — yapı, akış, navigasyon, durum mantığı. Eşlik eden dokümanlar: `DESIGN-SYSTEM.md` (görsel dil), plan dosyası (MP01 SPA mimarisi).
> **Durum etiketleri:** ✅ var · 🔧 kısmen var · 🆕 planlı (eksik).
> **Onaylı çerçeve:** SPA kabuk · Hibrit guest erişimi · Home = Dashboard · İletişim & İhaleler KALDIRILDI.

---

## 1) COMPLETE PRODUCT SITEMAP
```
KuryemiBul
│
├── PUBLIC (yalnız guest; giriş sonrası buraya dönülmez)
│   ├── Landing ✅                 (pazarlama — yalnız guest)
│   ├── Giriş ✅
│   ├── Kayıt ✅
│   ├── Onboarding ✅              (kayıt sonrası: rol + temel bilgi)
│   ├── Hakkında 🆕               (şu an landing bölümü; ayrı route'a çıkabilir)
│   ├── SSS / FAQ 🆕              (şu an landing bölümü)
│   ├── Yasal: KVKK ✅ · Gizlilik ✅ · Şartlar ✅ · Çerez ✅
│   └── PUBLIC BROWSE (hibrit — guest görür, aksiyon giriş ister)
│       ├── İlanlar ✅ · İlan Detay ✅
│       ├── Kurye/İşletme/Firma Havuzları ✅ · Profil Detay ✅
│       └── Harita ✅
│
└── PRIVATE (yalnız authed; merkez = Dashboard)
    ├── Dashboard 🔧               (rol panelleri var; "hub" konsept netleşecek)
    ├── İlanlar ✅ / İlan Detay ✅
    ├── Global Arama 🆕            (ilan+profil birleşik)
    ├── Mesajlar ✅
    ├── Bildirimler ✅
    ├── Favoriler (Havuzum) ✅     (kayıtlı profiller + kayıtlı ilanlar)
    ├── Profil: Görünüm ✅ · Düzenle ✅ · Doküman/KYC 🔧
    ├── Ayarlar 🆕 · Destek 🆕 · Aktivite 🆕
    ├── [Rol-özel alanlar → §3]
    └── Admin Console 🔧           (admin.html var; alt modüller 🆕)
```
> Not: **İletişim (Contact)** kullanıcı kararıyla kaldırıldı (sitemap'te yok); iletişim = WhatsApp yüzen buton + yasal sayfalar. **İhaleler (Tenders)** kaldırıldı.

## 2) SCREEN INVENTORY
| Ekran | Ortam | Rol | Durum | Dosya/route |
|---|---|---|---|---|
| Landing | Public | guest | ✅ | index.html |
| Giriş / Kayıt | Public | guest | ✅ | giris.html |
| Onboarding | Public→Priv | yeni | ✅ | onboarding.html |
| Yasal (4) | Public | herkes | ✅ | kvkk/gizlilik/sartlar/cerez |
| İlanlar | Her ikisi | herkes | ✅ | ilanlar.html |
| İlan Detay | Her ikisi | herkes | ✅ | ilan.html |
| Havuzlar (3) | Her ikisi | herkes | ✅ | kuryeler/isletmeler/firmalar |
| Profil Detay (3) | Her ikisi | herkes | ✅ | profil-kurye/isletme/firma |
| Harita | Her ikisi | herkes | ✅ | harita.html |
| Dashboard (3 rol) | Private | k/i/f | 🔧 | panel-kurye/isletme/firma |
| Profil Düzenle + KYC | Private | authed | ✅/🔧 | profil-duzenle.html |
| Mesajlar | Private | authed | ✅ | mesajlar.html |
| Bildirimler | Private | authed | ✅ | bildirimler.html |
| Favoriler | Private | authed | ✅ | havuzum.html |
| Admin | Private | admin | 🔧 | admin.html |
| Global Arama · Ayarlar · Destek · Aktivite | Private | authed | 🆕 | — |

## 3) ROLE-BASED ARCHITECTURE
**Kurye:** Dashboard · Önerilen İlanlar · Başvurularım ✅ · Favoriler ✅ · Mesajlar ✅ · Profil/Doküman(KYC) 🔧 · Ayarlar 🆕 · (Kazanç — opsiyonel/ileride).
**İşletme:** Dashboard · İlanlarım ✅ · İlan Ver ✅ · Başvuranlar ✅ · Kayıtlı Kuryeler ✅ · Mesajlar ✅ · İşletme Profili ✅ · Ayarlar 🆕 · (Faturalama 🆕/ileride).
**Kurye Firması:** Dashboard · Personel Havuzu ✅ · İşe Alım/İlan Ver 🔧 · Aday Havuzu ✅ · Mesajlar ✅ · Profil ✅ · (Şubeler 🆕 · Ekip Yönetimi 🆕 · Raporlar 🆕).
**Admin:** Dashboard 🔧 · Kullanıcı Yönetimi 🆕 · İşletme/Kurye Yönetimi 🆕 · KYC Moderasyon 🔧 · Şikayetler 🆕 · Raporlar/Analitik 🆕 · Sistem Ayarları 🆕.

## 4) NAVIGATION HIERARCHY
- **Header (kalıcı):** Logo → (authed=Dashboard · guest=Landing) · Global Arama · [authed] 🔔 · 💬 · Hesap menüsü · Dil · Tema · [guest] Giriş/Kayıt.
- **Desktop sidebar (rol-bazlı):** Dashboard · İlanlar · (İlan Ver/Başvurularım) · Havuzlar · Harita · Mesajlar · Bildirimler · Favoriler · Profil · Ayarlar · Destek · (Admin).
- **Mobil bottom-nav (5, rol-bazlı):** 🏠 Dashboard · 🔍 İlanlar · ➕ Oluştur(rol) · 💬 Mesajlar · 👤 Profil → kalan "Menü".
- **Kural:** Home = Dashboard (authed) / Landing (guest) — logo + ana-nav + bottom 🏠 hepsi buna uyar. Tek nav uygulaması, her ekranda aynı.

## 5) USER JOURNEY MAPS
- **Guest→Üye:** Landing → İlan/Profil gez → (aksiyon) → Giriş duvarı → Kayıt → Onboarding → **Dashboard**.
- **Kurye:** Dashboard → Önerilen İlanlar → İlan Detay → Başvur → Başvuru Durumu (timeline) → (eşleşince) Mesaj → Profil/Doğrulama → Dashboard.
- **İşletme:** Dashboard → İlan Ver → Yayınla → Başarı → İlanlarım → Başvuranlar → Mesaj → İşe Al → Yönet.
- **Firma:** Dashboard → Aday/Kurye Havuzu → İşletmelere ulaş/işe alım → Mesaj → Personel Yönet → İzle.
- **Admin:** Dashboard → KYC Kuyruğu/Kullanıcılar → İncele/Moderasyon → Raporlar.
- Hepsi ekosistem içinde; hiçbir adım landing'e düşmez.

## 6) FEATURE HIERARCHY (modüller, deduped)
1. **Kimlik & Onboarding** — kayıt/giriş/Google/şifre sıfırla ✅, rol seçimi+onboarding ✅, oturum (getSession) ✅.
2. **Keşif** — ilanlar (arama/filtre/autocomplete/chip) ✅, havuzlar ✅, harita (senkron liste+harita) ✅, global arama 🆕.
3. **Başvuru/Teklif** — ilana başvuru (onay→başarı) ✅, kurye/işletme/firma teklifi ✅, durum yönetimi ✅.
4. **Mesajlaşma** — eşleşenler arası chat + realtime ✅.
5. **Bildirimler** — in-app + e-posta (push_to_profile) ✅, realtime rozet ✅.
6. **Favoriler** — kayıtlı profiller (pool) + kayıtlı ilanlar ✅.
7. **Profil & Doğrulama** — profil/düzenle ✅, KYC 🔧, seviye/puan/değerlendirme ✅.
8. **Dashboard** — rol-bazlı hub 🔧.
9. **Yönetim (Admin)** — KYC onay 🔧, kullanıcı/moderasyon/rapor 🆕.
10. **Ayarlar/Destek/Aktivite** 🆕.
11. **Yatay servisler** — i18n ✅, tema ✅, erişilebilirlik paneli ✅, toast ✅.

## 7) SCREEN RELATIONSHIP MAP (anahtar ekranlar)
| Ekran | Parent | Children | Related | Entry | Exit |
|---|---|---|---|---|---|
| Dashboard | (kök/private) | tüm modüller | Bildirim/Mesaj | giriş/logo/🏠 | herhangi modül |
| İlanlar | Dashboard | İlan Detay | Harita, Favoriler | nav/arama | İlan Detay |
| İlan Detay | İlanlar | Başvuru modalı | İşletme Profili | ilan kartı/derin-link | Başvurularım/Mesaj |
| Mesajlar | Dashboard | Konuşma thread | Profil, Başvuru | nav/💬/profil "Mesaj" | profil/dashboard |
| Favoriler | Dashboard | (sekmeler) | İlanlar/Havuz | nav | ilan/profil |
| Profil Detay | Havuz/arama | — | Mesaj, Teklif | kart/link | Mesaj/Teklif |
| Admin | (private/admin) | alt modüller | — | giriş(admin) | modül |
- **Kural:** izole ekran yok; her ekranın net giriş+çıkışı ve Dashboard'a dönüş yolu var.

## 8) DASHBOARD ARCHITECTURE (MP04)
Dashboard = ekosistemin kalbi; her özellik buraya bağlı, her şey buraya döner.
- **Kurye:** Önerilen İlanlar · Son Başvurular(timeline) · Kayıtlı İlanlar · Mesaj/Bildirim özeti · Profil Tamamlama · Hızlı Aksiyonlar.
- **İşletme:** Aktif İlanlar · Yeni Başvuranlar · Kayıtlı Kuryeler · Mesajlar · Analitik · Hızlı "İlan Ver".
- **Firma:** Aktif İşe Alımlar · Aday/Personel Havuzu · (Şube Aktivitesi) · Ekip Özeti · Mesajlar · Raporlar.
- **Admin:** Platform İstatistik · Kullanıcı/İşletme/Kurye Yönetimi · Moderasyon Kuyruğu · Şikayet · Rapor.
- Ortak: kullanıcı bağlamı ("Merhaba Kadir · Kurye · 3 başvuru · 5 mesaj"), bildirim/mesaj kısayolu.

## 9) NAVIGATION LOGIC & PERSISTENT STATE (MP04)
- **Global state (bir kez yüklenir, her yerde):** auth durumu · rol · aktif ekran · önceki rota · okunmamış bildirim/mesaj · oturum. (Mevcut `KB`/`SESSION` genişletilir; `getSession` ile ağsız.)
- **Home logic:** authed→/dashboard, guest→/landing. authed `/` veya landing'e gelirse → /dashboard redirect (giriş sonrası pazarlama YASAK).
- **Route guard'ları:** `public` / `auth` / `role:[…]`. Hibrit: içerik açık; aksiyon (başvur/teklif/mesaj/kaydet/ilan ver) → giriş duvarı (`?next=`), sonra kaldığı aksiyona döner.
- **SPA geçiş:** sekme = yalnız içerik değişir; shell/oturum sabit → "binadaki odalar arası geçiş" hissi, "farklı binalara gitmek" değil.

## 10) UX PROBLEMS → IMPROVEMENTS
1. Home=Landing herkese → tek Home=Dashboard kuralı + router. 2. Landing ayrı dünya → tek shell, authed redirect. 3. Rol-IA yok → rol-bazlı nav/state. 4. Guest sınırı yok → guard + hibrit duvar. 5. Hub yok → Dashboard merkez + Ayarlar/Destek. 6. MPA reload → SPA içerik-swap, oturum bir kez. 7. Yinelenen akış → tek başvuru/teklif/mesaj bileşeni. 8. İzole ekran/dead-end → her ekran Dashboard'a bağlı, net entry/exit.

## 11) MISSING SCREENS ANALYSIS (öncelik)
- **Yüksek:** Dashboard hub (rol-bazlı, gerçek "ana sayfa"), Ayarlar, Global Arama.
- **Orta:** Destek/Yardım, Aktivite/geçmiş, KYC Doküman görünümü, Admin alt modülleri (kullanıcı/moderasyon/rapor/şikayet).
- **Rol-özel (ileride):** İşletme Faturalama; Firma Şubeler/Ekip/Raporlar; Kurye Kazanç (opsiyonel).
- **About/FAQ:** şu an landing bölümü — gerekirse ayrı public route.

## 12) DASHBOARD BEST PRACTICES
Net kullanıcı bağlamı · en önemli 3-5 aksiyon öne · veri-yoksa anlamlı boş durum+CTA · skeleton yükleme · her widget bir modüle derin-link · rol-bazlı içerik · bildirim/mesaj her zaman erişilebilir · mobilde dikey öncelik.

## 13) SCALABILITY (yeniden yapılandırma gerektirmeden)
- **Premium üyelik** → role/plan alanı + route guard'a `plan:` ekle. **AI eşleşme/öneri** → mevcut talentScore yerini alan servis, Dashboard "Önerilenler" widget'ı hazır. **Puan/Değerlendirme** ✅ (reviews). **Doğrulama/Sertifika** ✅/🔧 (KYC, sertifikalar). **Kariyer ilerleme** ✅ (seviye/track). **İşe alım kampanyaları** → ilan modülünün üstüne kampanya tipi. Modüler IA + token'lı tasarım + route-meta sayesinde eklemeler izole.

## 14) FINAL PRODUCT BLUEPRINT
KuryemiBul = tek SPA ekosistemi: **Public** (guest: landing/giriş/kayıt/yasal + hibrit göz-at) ve **Private** (authed: Dashboard merkezli her modül). Kalıcı header + rol-bazlı sidebar/bottom-nav + global state ile kullanıcı her an "hesabımdayım" hisseder; Home daima Dashboard. Tüm ekranlar Dashboard'a bağlı, izole/dead-end yok, akışlar ekosistem içinde. Görsel dil `DESIGN-SYSTEM.md`'ye, davranış bu blueprint'e uyar.
- **İnşa sırası (MP01 fazları):** Faz A: SPA shell + router + state + Home=Dashboard + auth redirect. Faz B: view göçü (Dashboard→İlanlar→Profil→Mesajlar→Havuz→Harita→Admin) + eksik ekranlar (Ayarlar/Arama/Destek). Faz C: landing guest-route + eski MPA sayfalarını kaldır + SEO (prerender/meta).

> Sonraki MASTER PROMPT'lar (05+) muhtemelen ekran UI'ı getirecek; bu blueprint + DESIGN-SYSTEM onları yönetir.
