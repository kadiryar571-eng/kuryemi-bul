# KuryemiBul — State, Session & Behavioral Architecture
> MASTER PROMPT 05. "Uygulamanın nasıl düşündüğü." UI/wireframe/renk YOK. Eşlik: `DESIGN-SYSTEM.md` (görsel dil), `PRODUCT-ARCHITECTURE.md` (yapı+navigasyon), plan dosyası (MP01 SPA mimarisi).
> **Çerçeve:** SPA kabuk · Home=Dashboard · hibrit guest · roller {guest, kurye, işletme, firma, admin} · İletişim/İhaleler kaldırıldı.

## Mevcut temel (gerçek kod, yeniden kullanılacak)
`components.js` → `KB`+`SESSION{loaded,user,profile}`, bir kez `loadSession()` (oturum okuma artık `getSession` = ağsız), `READY` promise, `KB.ready/isAuthed/currentRole/isOnline/roleToPanel/getRole`. localStorage: `sb-*-auth-token`, `kb_rol/kb_theme/kb_lang/kb_fontscale/kb_contrast/kb_saved_jobs/kb_recent_searches/kb_teklifler/kb_cookie_ok`. Realtime: `subscribeNotifications/subscribeMessages`, `unreadCount/unreadMessageCount`. Native auth: `initNativeAuth` (deep-link).
**Eksik (bu mimarinin getireceği):** merkezi store, navigasyon hafızası, taslak koruma, mantıksal geri, hata kurtarma, oturum-süresi yönetimi.

## 1) USER JOURNEY MAPS (hiçbiri landing'e düşmez)
- **Guest→Üye:** Landing → Giriş/Kayıt → Onboarding → **Dashboard**. Aksiyon denerse: giriş duvarı `?next=` → sonra aksiyona döner.
- **Kurye:** Dashboard → İlan Keşfet → Detay → Başvur → Durum(timeline) → (eşleşince) Chat → Profil → Dashboard.
- **İşletme:** Dashboard → İlan Ver → Yayınla → İlanlarım → Başvuranlar → Mesaj → İşe Al → Dashboard.
- **Firma:** Dashboard → Aday/Personel Havuzu → Değerlendir → İletişim → İşe alım → (Rapor) → Dashboard.
- **Admin:** Dashboard → Rapor/KYC → Kullanıcı Yönetimi → Moderasyon → Analitik → Dashboard.

## 2) GLOBAL APPLICATION STATE — tek store `KB.state`
Navigasyonda KORUNUR (SPA'da bellek; MPA köprüsünde localStorage+restore):
```
KB.state = {
  auth:    { status:'guest'|'authed'|'expired', userId, email },
  user:    { name, avatar, role, verification },
  role:    'guest'|'kurye'|'isletme'|'firma'|'admin',
  context: { currentRoute, prevRoute, currentModule, history[], recent[] },
  session: { notifications, messages, unread:{notif,msg}, favorites, filters, drafts, lastRoute },
  prefs:   { lang, theme, fontScale, contrast }
}
```
Boot: `getSession()` → auth+user+role; realtime abonelik (unread). Tüm view'lar okur → "her zaman hesabımdayım". Değişimde reaktif UI (basit pub/sub): rozet, nav, bağlam başlığı.

## 3) SESSION MANAGEMENT
- **Kalıcılık:** Supabase `persistSession+autoRefreshToken`; okuma `getSession` (ağsız). Tercih+hafıza = `kb_*` localStorage; geçici (filtre/scroll/taslak) = sessionStorage+bellek.
- **Süre dolumu:** `onAuthStateChange` (`TOKEN_REFRESHED`/`SIGNED_OUT`); refresh başarısız → `auth.status='expired'` → nazik "tekrar giriş" modalı (`?next=` ile kaldığı yer), **landing'e atmadan**.
- **Çıkış:** store temizlenir (tercihler kalır) → Landing (tek bilinçli dönüş).
- **Çok-sekme:** `storage` event senkronu (ileride).

## 4) NAVIGATION MEMORY (sessionStorage `kb_nav`)
Son ekran (`lastRoute`) · son arama+filtreler (ilan/havuz/harita) · liste scroll pozisyonu · son görüntülenen ilan/profil + `recent[]`. TTL = oturum/sekme; kalıcı son aramalar = `kb_recent_searches` (mevcut). → "kaldığın yerden devam".

## 5) AUTHENTICATION FLOW
- **Guest rotaları:** Landing, Giriş, Kayıt, Hakkında, SSS, Yasal + hibrit göz-at (ilan/profil/harita).
- **Giriş sonrası:** daima Dashboard (`?next=` öncelikli). authed landing'e gelirse → Dashboard redirect (auth sonrası pazarlama YASAK).
- **Guard:** route meta `public|auth|role:[…]`; guest→auth route = giriş duvarı; yanlış-rol = kendi Dashboard'ı.
- **Native:** Google = sistem tarayıcı + deep-link.

## 6) ROLE-BASED STATE LOGIC
`role` deneyimi belirler: nav, izin, Dashboard içeriği, quick-actions, öneriler. **Tek rol/hesap** (canlı switch yok); rol `profiles.role`'dan; değişimi profil-düzenle'den → store+nav yeniden kurulur, çıkış gerekmez. (Çok-rollü gelecek için `role` switch noktası store'da hazır.)

## 7) DRAFT PRESERVATION
İlan Ver / profil düzenleme / yazılan mesaj / başvuru-teklif notu: input'lar `kb_draft:<formId>` (sessionStorage) debounce ile yazılır, dönünce geri yüklenir, gönderim/iptalde temizlenir; "kaydedilmemiş taslak" ipucu. Veri kaybı YOK.

## 8) ERROR RECOVERY (dead-end yerine çıkış yolu)
| Durum | Davranış |
|---|---|
| Oturum doldu | "Tekrar giriş" modalı + `?next=` (landing'e atmadan) |
| Bağlantı yok | "Çevrimdışı — tekrar dene" + yeniden-çek |
| Yetkisiz | Kendi Dashboard'ı + toast |
| Süresi geçmiş rol/izin | Aksiyonu gizle/pasifle + açıklama |
| Silinmiş içerik | "Artık yok" boş-durumu + İlanlar'a dön (jobNotFound deseni) |
| Yarıda kesilen aksiyon | Taslak korunur + retry |
Genel: her hata CTA'lı; ham hata/boş ekran yok (`KB.toast` + `.kb-empty`).

## 9) SCALABILITY
**Premium** → `user.plan` + guard `plan:`; **AI eşleşme/öneri** → `session` cache + Dashboard widget; **rozet/puan/sertifika/kariyer** → `user.verification/score/certs` (kısmen var); **kampanya** → ilan tipi; **çok-dil** ✅. Modüler store + route-meta → yeniden yapılandırma gerektirmez.

## 10) BEHAVIORAL BLUEPRINT (özet)
Kullanıcı bir kez girer, çıkışa kadar tek ekosistemde kalır. Navigasyon **view** değiştirir, **state** değil. Tek `KB.state` boot'ta `getSession` ile dolar, navigasyonda korunur, realtime ile canlı. Home daima Dashboard; authed asla landing'e atılmaz. Navigasyon hafızası + taslak = "kaldığın yerden devam"; her hata kurtarma sunar. → "tek bina, odalar arası geçiş."

## Uygulama fazında dokunulacak (şimdi DEĞİL)
`components.js`: `KB.state` store + pub/sub + nav-memory + draft + expired-session modal + `onAuthStateChange` genişletme. `supabase.js`: değişmez. View'lar (SPA fazı): store-okuma + scroll/filter restore + draft bağlama. Uygulama MP01 **Faz A** (SPA shell + store) ile başlar.

## Doğrulama (uygulama fazında)
Giriş→gez→geri: filtre/scroll/son-ekran korunuyor mu · İlan-ver yarıda bırak→dön: taslak duruyor mu · oturum-expire: landing'e atmadan modal+next · yanlış-rol/silinmiş içerik: kurtarma CTA · authed landing→Dashboard · çıkış→landing+temiz store.
