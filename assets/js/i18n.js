/* ============================================================
   Kuryemi Bul — i18n.js
   Türkçe / İngilizce çeviri altyapısı.
   En önce yüklenir; t(), setLang(), applyStatic() sağlar.
   ============================================================ */
(function () {
  'use strict';

  var DICT = {
    tr: {
      "demo.banner": "🧪 Demo prototip — tüm veriler örnektir, gerçek değildir.",
      "nav.home": "Ana Sayfa", "nav.couriers": "Kuryeler", "nav.businesses": "İşletmeler",
      "nav.firms": "Firmalar", "nav.map": "Harita", "nav.contact": "İletişim",
      "role.label": "Rol:", "role.ziyaretci": "Ziyaretçi", "role.kurye": "Kurye",
      "role.isletme": "İşletme", "role.firma": "Kurye Firması",
      "cta.signin": "Giriş Yap", "cta.panel": "Panelim", "cta.signout": "Çıkış",
      "wa.tooltip": "WhatsApp'tan yaz",
      "lang.aria": "Dili değiştir",
      "theme.label": "Tema:", "theme.turuncu": "Turuncu", "theme.mavi": "Mavi",
      "theme.mor": "Mor", "theme.yesil": "Yeşil", "theme.pembe": "Pembe",
      "title.index": "Kuryemi Bul · Kurye Ekosisteminin Buluşma Noktası",
      "title.kuryeler": "Kurye Havuzu · Kuryemi Bul", "title.isletmeler": "İşletme Havuzu · Kuryemi Bul",
      "title.firmalar": "Kurye Firması Havuzu · Kuryemi Bul", "title.harita": "Harita · Kuryemi Bul",
      "title.giris": "Giriş / Katıl · Kuryemi Bul",
      "title.profilKurye": "Kurye Profili · Kuryemi Bul", "title.profilIsletme": "İşletme Profili · Kuryemi Bul",
      "title.profilFirma": "Firma Profili · Kuryemi Bul",
      "title.panelKurye": "Kurye Paneli · Kuryemi Bul", "title.panelIsletme": "İşletme Paneli · Kuryemi Bul",
      "title.panelFirma": "Firma Paneli · Kuryemi Bul", "title.notfound": "Sayfa Bulunamadı · Kuryemi Bul",
      "nf.title": "Sayfa bulunamadı", "nf.text": "Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.",
      "nf.home": "Ana Sayfaya Dön", "backtop.aria": "Yukarı çık",
      "contact.eyebrow": "Bize Ulaşın", "contact.title": "Sorularını WhatsApp'tan Yanıtlayalım",
      "contact.lead": "Formu doldur, mesajın WhatsApp'a hazır gelsin; ya da doğrudan e-posta/telefon ile ulaş.",
      "contact.name": "Adın", "contact.role": "Rolün", "contact.msg": "Mesajın",
      "contact.namePh": "Örn. Ahmet Yılmaz", "contact.msgPh": "Nasıl yardımcı olabiliriz?",
      "contact.send": "WhatsApp'tan Gönder", "contact.or": "veya", "contact.email": "E-posta", "contact.phone": "Telefon",

      "footer.tagline": "Kurye ekosisteminin buluşma noktası. Kuryeleri, firmaları ve işletmeleri tek platformda birleştiriyoruz.",
      "footer.discover": "Keşfet", "footer.couriersPool": "Kurye Havuzu",
      "footer.businessesPool": "İşletme Havuzu", "footer.firmsPool": "Firma Havuzu",
      "footer.map": "Harita", "footer.contact": "İletişim",
      "footer.rights": "© Kuryemi Bul. Tüm hakları saklıdır. (Demo)",

      "level.standart": "Standart", "level.profesyonel": "Profesyonel", "level.premium": "Premium",

      "btn.viewProfile": "Profili Gör", "btn.offer": "Teklif", "btn.sendOffer": "Teklif Gönder",
      "common.all": "Tümü", "common.results": "{n} sonuç gösteriliyor",
      "common.noResult": "Sonuç bulunamadı. Filtreleri değiştir.", "common.back": "Geri",

      "hero.badge": "🛵 Kurye Ekosisteminin Buluşma Noktası",
      "hero.title": "Kuryeni bul,<br><span class=\"accent\">yükünü yola çıkar.</span>",
      "hero.subtitle": "KuryemiBul; kuryeleri, kurye firmalarını ve kuryeye ihtiyaç duyan işletmeleri tek platformda buluşturur. Kurye istihdamı, tedariki, performans yönetimi ve kurumsal süreçleri dijitalleştiren kapsamlı bir kurye ekosistemi.",
      "hero.cta1": "🚀 Hemen Başla", "hero.cta2": "🗺️ Haritada Keşfet",
      "stats.couriers": "Aktif Kurye", "stats.businesses": "İşletme", "stats.firms": "Kurye Firması",

      "how.eyebrow": "Basit 3 adım", "how.title": "Nasıl Çalışır?",
      "how.lead": "Kayıttan teslimata kadar her şey tek platformda.",
      "how.s1t": "Kaydol", "how.s1d": "Kurye, işletme ya da firma olarak profilini oluştur.",
      "how.s2t": "Eşleş", "how.s2d": "Havuz ve harita üzerinden en uygun tarafla eşleş.",
      "how.s3t": "Teslim Et", "how.s3d": "Teklif, takip, değerlendirme ve performans tek ekranda.",

      "who.eyebrow": "Tek platform, üç çözüm", "who.title": "Kimler İçin?",
      "who.k.title": "Kuryeler İçin", "who.k.sub": "Dijital kariyer alanın.",
      "who.k.l1": "Profil & referans geçmişi", "who.k.l2": "Seviye sistemi (Standart/Pro/Premium)",
      "who.k.l3": "Yakınındaki ilanlar", "who.k.l4": "Firma teklifleri", "who.k.btn": "Kurye Havuzu",
      "who.i.tag": "En çok tercih edilen", "who.i.title": "İşletmeler İçin", "who.i.sub": "Kuryeni dakikalar içinde bul.",
      "who.i.l1": "Havuzda arama & filtre", "who.i.l2": "İlan ve teklif yönetimi",
      "who.i.l3": "Kurye geçmişi & performans", "who.i.l4": "Firmalardan teklif al", "who.i.btn": "İşletme Havuzu",
      "who.f.title": "Kurye Firmaları İçin", "who.f.sub": "Filonu yönet, müşteri bul.",
      "who.f.l1": "Personel havuzu", "who.f.l2": "İşletmelere teklif",
      "who.f.l3": "Hizmet bölgesi yönetimi", "who.f.l4": "Kurumsal ihale (yakında)", "who.f.btn": "Firma Havuzu",

      "why.eyebrow": "Avantajlar", "why.title": "Neden KuryemiBul?",
      "why.f1t": "Hızlı Eşleşme", "why.f1d": "Havuz + harita ile en uygun tarafı saniyeler içinde bul.",
      "why.f2t": "Konum Bazlı", "why.f2d": "Bölgesel yoğunluk ve yakınlık mantığıyla değerlendir.",
      "why.f3t": "İtibar & Seviye", "why.f3d": "Objektif metriklerle kurye kariyer ve puan sistemi.",
      "why.f4t": "Çok Yönlü Teklif", "why.f4d": "Kurye, işletme ve firma arasında dört yönlü teklif akışı.",
      "why.f5t": "Kurumsal İhale", "why.f5d": "Çok şubeli işletmeler için toplu kurye tedarik süreçleri.",
      "why.f6t": "Tek Çatı", "why.f6d": "Dağınık sektörü tek dijital buluşma noktasında topla.",

      "faq.eyebrow": "Aklına takılanlar", "faq.title": "Sık Sorulan Sorular",
      "faq.q1": "KuryemiBul'a üyelik ücretli mi?", "faq.a1": "Kayıt ücretsizdir. Yalnızca tamamlanan işlerde şeffaf bir hizmet bedeli uygulanır.",
      "faq.q2": "Kurye seviyeleri nasıl belirlenir?", "faq.a2": "Deneyim, süreklilik, referanslar ve değerlendirmeler gibi objektif kriterlerle Standart, Profesyonel ve Premium seviyeleri oluşur.",
      "faq.q3": "Kurye firmaları nasıl katılır?", "faq.a3": "Firma profili oluşturup hizmet bölgelerini tanımlar, personel havuzunu yönetir ve işletmelere teklif gönderir.",
      "faq.q4": "Bu bir demo mu?", "faq.a4": "Evet, şu an gördüğünüz Faz 1 prototipidir; tüm veriler örnektir. Gerçek altyapı sonraki fazda eklenecektir.",

      "pool.kurye.title": "🛵 Kurye Havuzu", "pool.kurye.lead": "Bölge, şehir ve seviyeye göre kurye ara; profilini incele ve teklif gönder.", "pool.kurye.search": "İsim, şehir veya bölge ara…",
      "pool.isletme.title": "📦 İşletme Havuzu", "pool.isletme.lead": "Kurye ihtiyacı olan işletmeleri keşfet; türüne göre filtrele ve teklif gönder.", "pool.isletme.search": "İşletme, şehir veya tür ara…",
      "pool.firma.title": "🏢 Kurye Firması Havuzu", "pool.firma.lead": "Hizmet sağlayıcı kurye firmalarını incele; bölge ve kapasiteye göre değerlendir.", "pool.firma.search": "Firma veya bölge ara…",

      "pcard.exp": "{n} yıl deneyim", "pcard.deliveries": "{n} teslimat",
      "pcard.openListings": "{n} açık ilan", "pcard.capacity": "{n} kurye kapasitesi",

      "prof.general": "📋 Genel Bilgiler", "prof.certs": "🎓 Sertifikalar", "prof.worked": "🏢 Çalıştığı İşletmeler",
      "prof.refs": "⭐ Referanslar", "prof.bizInfo": "📋 İşletme Bilgileri", "prof.about": "📝 Hakkında",
      "prof.need": "🚀 Kurye İhtiyacı", "prof.firmInfo": "📋 Firma Bilgileri", "prof.services": "🧰 Hizmetler",
      "prof.noCert": "Henüz sertifika eklenmemiş.", "prof.noHistory": "Kayıtlı geçmiş yok.", "prof.noRef": "Henüz referans yok.",
      "kv.city": "Şehir", "kv.vehicle": "Araç", "kv.exp": "Deneyim", "kv.completed": "Tamamlanan",
      "kv.regions": "Aktif Bölgeler", "kv.type": "Tür", "kv.cityRegion": "Şehir / Bölge",
      "kv.openListing": "Açık İlan", "kv.serviceRegions": "Hizmet Bölgeleri", "kv.capacity": "Kapasite",
      "unit.years": "yıl", "unit.deliveries": "teslimat", "unit.couriers": "kurye",

      "map.title": "🗺️ Harita", "map.lead": "Kuryeleri, işletmeleri ve firmaları harita üzerinde gör; katmanları aç/kapat.",
      "map.layers": "Katmanlar", "layer.couriers": "Kuryeler", "layer.businesses": "İşletmeler", "layer.firms": "Firmalar",
      "map.hint": "İşaretçiye tıklayıp profile gidebilirsin.", "map.viewProfile": "Profili Gör →",

      "modal.title": "Teklif Gönder", "modal.msgLabel": "Mesajın", "modal.msgPh": "Teklifini kısaca yaz...",
      "modal.send": "Teklifi Gönder", "modal.success": "🎉 Teklif kaydedildi (demo). Panelinden takip edebilirsin.",
      "modal.guest": "Teklif göndermek için önce sağ üstten bir rol seç (Kurye / İşletme / Kurye Firması).",
      "modal.close": "Kapat",

      "panel.kurye.title": "🛵 Kurye Paneli", "panel.kurye.lead": "Profilin, başvuruların ve gelen teklifler tek ekranda. (Demo)",
      "panel.isletme.title": "📦 İşletme Paneli", "panel.isletme.lead": "İlanlarını yönet, havuzda kurye ara, başvuruları incele. (Demo)",
      "panel.firma.title": "🏢 Kurye Firması Paneli", "panel.firma.lead": "Personel havuzu, işletmelere teklif ve kurumsal ihaleler. (Demo)",
      "tab.summary": "📊 Özet", "tab.myApplications": "📨 Başvurularım", "tab.incomingOffers": "✉️ Gelen Teklifler",
      "tab.myProfile": "👤 Profilim", "tab.myListings": "📋 İlanlarım", "tab.searchPool": "🔎 Havuzda Ara",
      "tab.applications": "📨 Başvurular", "tab.personnelPool": "👥 Personel Havuzu",
      "tab.businessOffers": "✉️ İşletme Teklifleri", "tab.tenders": "🏛️ İhaleler",
      "box.myApplications": "📨 Başvurularım", "box.incomingOffers": "✉️ Gelen Teklifler",
      "box.myProfile": "👤 Profilim", "box.myListings": "📋 İlanlarım", "box.searchPool": "🔎 Havuzda Kurye Ara",
      "box.applications": "📨 Gelen Başvurular & Teklifler", "box.personnelPool": "👥 Personel Havuzu",
      "box.businessOffers": "✉️ İşletmelere/İşletmelerden Teklifler",
      "m.score": "Puan", "m.level": "Seviye", "m.deliveries": "Teslimat", "m.offers": "Teklif",
      "m.openListings": "Açık İlan", "m.meetings": "Görüşme", "m.satisfaction": "Memnuniyet",
      "m.capacity": "Kapasite", "m.tenders": "İhale",
      "panel.welcome.t": "👋 Hoş geldin!", "panel.welcome.d": "Buradan başvurularını ve sana gelen teklifleri yönetebilirsin. Yeni iş bulmak için işletme havuzuna göz at.",
      "panel.quick.t": "🚀 Hızlı İşlem", "panel.quick.iz": "Yeni kurye bulmak için havuzda arama yap veya firmalardan toplu teklif al.",
      "panel.quick.fz": "İşletmelere teklif gönder ya da personel havuzunu güçlendir.",
      "panel.searchPool.d": "Tüm kurye havuzuna git, filtrele ve doğrudan teklif gönder.",
      "panel.myProfile.d": "Örnek profilin nasıl göründüğünü incele:",
      "btn.goCourierPool": "Kurye Havuzuna Git →", "btn.viewMyProfile": "Genel Profilimi Gör →",
      "btn.courierPool": "Kurye Havuzu", "btn.firmPool": "Firma Havuzu", "btn.businessPool": "İşletme Havuzu",
      "state.applied": "Başvuruldu", "state.active": "Aktif", "state.published": "Yayında", "state.pending": "Beklemede",
      "state.accepted": "Kabul edildi", "state.rejected": "Reddedildi",
      "offer.accept": "Kabul Et", "offer.reject": "Reddet", "offer.incoming": "Gelen", "offer.outgoing": "Giden",
      "offer.actErr": "İşlem yapılamadı, tekrar dene.",
      "empty.offers": "Henüz kayıt yok. Havuzdan teklif göndererek başlayabilirsin.", "empty.generic": "Kayıt yok.",
      "soon.tender.t": "Kurumsal İhale Sistemi — Yakında", "soon.tender.d": "Zincir restoranlar, market zincirleri ve e-ticaret şirketlerinin toplu kurye ihtiyaçları ihale olarak yayınlanacak; firmalar teklif verecek. Bu modül Faz 3'te aktifleşecek.",
      "soon.published": "Yayında",

      "giris.title": "Platforma Katıl", "giris.lead": "Rolünü seç, panele anında giriş yap. (Demo — gerçek kayıt yapılmaz.)",
      "giris.intro.kurye": "Kurye olarak devam etmek için bilgilerini gir.",
      "giris.intro.isletme": "İşletmen için kurye bulmak üzere bilgilerini gir.",
      "giris.intro.firma": "Kurye firman için platforma katıl.",
      "giris.label.kurye": "Ad Soyad", "giris.label.isletme": "İşletme / Yetkili Adı", "giris.label.firma": "Firma Adı",
      "giris.tel": "Telefon", "giris.email": "E-posta", "giris.city": "Şehir",
      "giris.ph.ad": "Örn. Ahmet Yılmaz", "giris.ph.tel": "05XX XXX XX XX", "giris.ph.email": "ornek@eposta.com", "giris.ph.city": "Örn. İstanbul",
      "giris.submit": "Panele Gir →", "giris.ok": "🎉 Hoş geldin! Paneline yönlendiriliyorsun…",
      "giris.exploreText": "Sadece keşfetmek mi istiyorsun?", "giris.exploreLink": "Havuzlara göz at",
      "auth.login": "Giriş", "auth.register": "Kayıt Ol", "auth.email": "E-posta", "auth.password": "Şifre",
      "auth.passPh": "En az 6 karakter", "auth.loginBtn": "Giriş Yap", "auth.registerBtn": "Hesap Oluştur",
      "auth.role": "Rolün", "auth.name": "Ad Soyad / Firma Adı", "auth.namePh": "Örn. Ahmet Yılmaz",
      "auth.errGeneric": "Bir hata oluştu. Bilgileri kontrol et.",
      "auth.okRegister": "🎉 Hesabın oluşturuldu! Profilini tamamlayalım…",
      "auth.okRegisterConfirm": "🎉 Hesabın oluşturuldu! Devam etmek için e-postana gönderdiğimiz doğrulama bağlantısına tıkla.",
      "auth.okLogin": "🎉 Giriş başarılı, yönlendiriliyorsun…",
      "auth.forgot": "Şifremi unuttum?",
      "auth.resetEmailFirst": "Önce e-posta adresini gir, sonra 'Şifremi unuttum'a bas.",
      "auth.resetSent": "📧 Sıfırlama bağlantısı e-postana gönderildi. Gelen kutunu kontrol et.",
      "sr.title": "Yeni Şifre Belirle", "sr.lead": "Hesabın için yeni bir şifre oluştur.",
      "sr.newPass": "Yeni Şifre", "sr.newPass2": "Yeni Şifre (tekrar)", "sr.save": "Şifreyi Güncelle",
      "sr.saved": "✓ Şifren güncellendi. Giriş sayfasına yönlendiriliyorsun…",
      "sr.mismatch": "Şifreler eşleşmiyor.", "sr.short": "Şifre en az 6 karakter olmalı.",
      "sr.invalid": "Bağlantı geçersiz veya süresi dolmuş. Sıfırlamayı tekrar başlat.",
      "pe.title": "Profilim", "pe.lead": "Bilgilerini doldur; havuzda böyle görüneceksin.",
      "pe.save": "Kaydet", "pe.saved": "✓ Profil kaydedildi.", "pe.viewPublic": "Herkese açık profilimi gör →",
      "pe.name": "Ad / İşletme / Firma Adı", "pe.city": "Şehir", "pe.phone": "Telefon", "pe.about": "Hakkında / Açıklama",
      "pe.vehicle": "Araç", "pe.regions": "Bölgeler (virgülle ayır)", "pe.exp": "Deneyim (yıl)", "pe.level": "Seviye",
      "pe.certs": "Sertifikalar (virgülle ayır)", "pe.completed": "Tamamlanan teslimat",
      "pe.type": "Tür", "pe.openListing": "Açık ilan sayısı", "pe.need": "Kurye ihtiyacı",
      "pe.capacity": "Kapasite (kurye)", "pe.services": "Hizmetler (virgülle ayır)",
      "pe.loginRequired": "Bu sayfa için giriş yapmalısın."
    },

    en: {
      "demo.banner": "🧪 Demo prototype — all data is sample data, not real.",
      "nav.home": "Home", "nav.couriers": "Couriers", "nav.businesses": "Businesses",
      "nav.firms": "Firms", "nav.map": "Map", "nav.contact": "Contact",
      "role.label": "Role:", "role.ziyaretci": "Guest", "role.kurye": "Courier",
      "role.isletme": "Business", "role.firma": "Courier Firm",
      "cta.signin": "Sign In", "cta.panel": "My Panel", "cta.signout": "Sign out",
      "wa.tooltip": "Chat on WhatsApp",
      "lang.aria": "Change language",
      "theme.label": "Theme:", "theme.turuncu": "Orange", "theme.mavi": "Blue",
      "theme.mor": "Purple", "theme.yesil": "Green", "theme.pembe": "Pink",
      "title.index": "Kuryemi Bul · The Meeting Point of the Courier Ecosystem",
      "title.kuryeler": "Courier Pool · Kuryemi Bul", "title.isletmeler": "Business Pool · Kuryemi Bul",
      "title.firmalar": "Courier Firm Pool · Kuryemi Bul", "title.harita": "Map · Kuryemi Bul",
      "title.giris": "Sign In / Join · Kuryemi Bul",
      "title.profilKurye": "Courier Profile · Kuryemi Bul", "title.profilIsletme": "Business Profile · Kuryemi Bul",
      "title.profilFirma": "Firm Profile · Kuryemi Bul",
      "title.panelKurye": "Courier Panel · Kuryemi Bul", "title.panelIsletme": "Business Panel · Kuryemi Bul",
      "title.panelFirma": "Firm Panel · Kuryemi Bul", "title.notfound": "Page Not Found · Kuryemi Bul",
      "nf.title": "Page not found", "nf.text": "The page you are looking for may have moved or never existed.",
      "nf.home": "Back to Home", "backtop.aria": "Back to top",
      "contact.eyebrow": "Contact Us", "contact.title": "Let's Answer Your Questions on WhatsApp",
      "contact.lead": "Fill in the form and your message arrives ready on WhatsApp; or reach us directly by e-mail/phone.",
      "contact.name": "Your name", "contact.role": "Your role", "contact.msg": "Your message",
      "contact.namePh": "e.g. Ahmet Yılmaz", "contact.msgPh": "How can we help?",
      "contact.send": "Send via WhatsApp", "contact.or": "or", "contact.email": "E-mail", "contact.phone": "Phone",

      "footer.tagline": "The meeting point of the courier ecosystem. We bring couriers, firms and businesses together on a single platform.",
      "footer.discover": "Discover", "footer.couriersPool": "Courier Pool",
      "footer.businessesPool": "Business Pool", "footer.firmsPool": "Firm Pool",
      "footer.map": "Map", "footer.contact": "Contact",
      "footer.rights": "© Kuryemi Bul. All rights reserved. (Demo)",

      "level.standart": "Standard", "level.profesyonel": "Professional", "level.premium": "Premium",

      "btn.viewProfile": "View Profile", "btn.offer": "Offer", "btn.sendOffer": "Send Offer",
      "common.all": "All", "common.results": "Showing {n} results",
      "common.noResult": "No results found. Try changing the filters.", "common.back": "Back",

      "hero.badge": "🛵 The Meeting Point of the Courier Ecosystem",
      "hero.title": "Find your courier,<br><span class=\"accent\">get your load moving.</span>",
      "hero.subtitle": "KuryemiBul brings couriers, courier firms and businesses that need couriers together on a single platform. A comprehensive courier ecosystem that digitalizes courier hiring, supply, performance management and corporate processes.",
      "hero.cta1": "🚀 Get Started", "hero.cta2": "🗺️ Explore the Map",
      "stats.couriers": "Active Couriers", "stats.businesses": "Businesses", "stats.firms": "Courier Firms",

      "how.eyebrow": "Simple 3 steps", "how.title": "How It Works?",
      "how.lead": "Everything from sign-up to delivery on one platform.",
      "how.s1t": "Sign Up", "how.s1d": "Create your profile as a courier, business or firm.",
      "how.s2t": "Match", "how.s2d": "Match with the best party via the pool and the map.",
      "how.s3t": "Deliver", "how.s3d": "Offers, tracking, ratings and performance in one screen.",

      "who.eyebrow": "One platform, three solutions", "who.title": "Who Is It For?",
      "who.k.title": "For Couriers", "who.k.sub": "Your digital career space.",
      "who.k.l1": "Profile & reference history", "who.k.l2": "Level system (Standard/Pro/Premium)",
      "who.k.l3": "Nearby listings", "who.k.l4": "Firm offers", "who.k.btn": "Courier Pool",
      "who.i.tag": "Most preferred", "who.i.title": "For Businesses", "who.i.sub": "Find your courier in minutes.",
      "who.i.l1": "Search & filter the pool", "who.i.l2": "Listing and offer management",
      "who.i.l3": "Courier history & performance", "who.i.l4": "Get offers from firms", "who.i.btn": "Business Pool",
      "who.f.title": "For Courier Firms", "who.f.sub": "Manage your fleet, find clients.",
      "who.f.l1": "Personnel pool", "who.f.l2": "Offers to businesses",
      "who.f.l3": "Service area management", "who.f.l4": "Corporate tenders (soon)", "who.f.btn": "Firm Pool",

      "why.eyebrow": "Advantages", "why.title": "Why KuryemiBul?",
      "why.f1t": "Fast Matching", "why.f1d": "Find the best party in seconds with the pool + map.",
      "why.f2t": "Location Based", "why.f2d": "Evaluate by regional density and proximity.",
      "why.f3t": "Reputation & Level", "why.f3d": "Courier career and rating system with objective metrics.",
      "why.f4t": "Multi-way Offers", "why.f4d": "Four-way offer flow between courier, business and firm.",
      "why.f5t": "Corporate Tenders", "why.f5d": "Bulk courier supply processes for multi-branch businesses.",
      "why.f6t": "Single Roof", "why.f6d": "Gather the fragmented sector at one digital meeting point.",

      "faq.eyebrow": "On your mind", "faq.title": "Frequently Asked Questions",
      "faq.q1": "Is membership to KuryemiBul paid?", "faq.a1": "Registration is free. A transparent service fee applies only on completed jobs.",
      "faq.q2": "How are courier levels determined?", "faq.a2": "Standard, Professional and Premium levels are formed by objective criteria such as experience, continuity, references and ratings.",
      "faq.q3": "How do courier firms join?", "faq.a3": "They create a firm profile, define service areas, manage their personnel pool and send offers to businesses.",
      "faq.q4": "Is this a demo?", "faq.a4": "Yes, what you see now is the Phase 1 prototype; all data is sample data. The real infrastructure will be added in the next phase.",

      "pool.kurye.title": "🛵 Courier Pool", "pool.kurye.lead": "Search couriers by region, city and level; review profiles and send offers.", "pool.kurye.search": "Search name, city or region…",
      "pool.isletme.title": "📦 Business Pool", "pool.isletme.lead": "Discover businesses that need couriers; filter by type and send offers.", "pool.isletme.search": "Search business, city or type…",
      "pool.firma.title": "🏢 Courier Firm Pool", "pool.firma.lead": "Review courier service providers; evaluate by region and capacity.", "pool.firma.search": "Search firm or region…",

      "pcard.exp": "{n} yrs experience", "pcard.deliveries": "{n} deliveries",
      "pcard.openListings": "{n} open listings", "pcard.capacity": "{n} courier capacity",

      "prof.general": "📋 General Info", "prof.certs": "🎓 Certificates", "prof.worked": "🏢 Businesses Worked With",
      "prof.refs": "⭐ References", "prof.bizInfo": "📋 Business Info", "prof.about": "📝 About",
      "prof.need": "🚀 Courier Need", "prof.firmInfo": "📋 Firm Info", "prof.services": "🧰 Services",
      "prof.noCert": "No certificates added yet.", "prof.noHistory": "No recorded history.", "prof.noRef": "No references yet.",
      "kv.city": "City", "kv.vehicle": "Vehicle", "kv.exp": "Experience", "kv.completed": "Completed",
      "kv.regions": "Active Regions", "kv.type": "Type", "kv.cityRegion": "City / Region",
      "kv.openListing": "Open Listings", "kv.serviceRegions": "Service Regions", "kv.capacity": "Capacity",
      "unit.years": "yrs", "unit.deliveries": "deliveries", "unit.couriers": "couriers",

      "map.title": "🗺️ Map", "map.lead": "See couriers, businesses and firms on the map; toggle layers.",
      "map.layers": "Layers", "layer.couriers": "Couriers", "layer.businesses": "Businesses", "layer.firms": "Firms",
      "map.hint": "Click a marker to go to its profile.", "map.viewProfile": "View Profile →",

      "modal.title": "Send Offer", "modal.msgLabel": "Your message", "modal.msgPh": "Write your offer briefly...",
      "modal.send": "Send Offer", "modal.success": "🎉 Offer saved (demo). You can track it from your panel.",
      "modal.guest": "To send an offer, first pick a role from the top right (Courier / Business / Courier Firm).",
      "modal.close": "Close",

      "panel.kurye.title": "🛵 Courier Panel", "panel.kurye.lead": "Your profile, applications and incoming offers in one screen. (Demo)",
      "panel.isletme.title": "📦 Business Panel", "panel.isletme.lead": "Manage your listings, search the pool, review applications. (Demo)",
      "panel.firma.title": "🏢 Courier Firm Panel", "panel.firma.lead": "Personnel pool, offers to businesses and corporate tenders. (Demo)",
      "tab.summary": "📊 Summary", "tab.myApplications": "📨 My Applications", "tab.incomingOffers": "✉️ Incoming Offers",
      "tab.myProfile": "👤 My Profile", "tab.myListings": "📋 My Listings", "tab.searchPool": "🔎 Search Pool",
      "tab.applications": "📨 Applications", "tab.personnelPool": "👥 Personnel Pool",
      "tab.businessOffers": "✉️ Business Offers", "tab.tenders": "🏛️ Tenders",
      "box.myApplications": "📨 My Applications", "box.incomingOffers": "✉️ Incoming Offers",
      "box.myProfile": "👤 My Profile", "box.myListings": "📋 My Listings", "box.searchPool": "🔎 Search Couriers in Pool",
      "box.applications": "📨 Incoming Applications & Offers", "box.personnelPool": "👥 Personnel Pool",
      "box.businessOffers": "✉️ Offers To/From Businesses",
      "m.score": "Score", "m.level": "Level", "m.deliveries": "Deliveries", "m.offers": "Offers",
      "m.openListings": "Open Listings", "m.meetings": "Meetings", "m.satisfaction": "Satisfaction",
      "m.capacity": "Capacity", "m.tenders": "Tenders",
      "panel.welcome.t": "👋 Welcome!", "panel.welcome.d": "Manage your applications and incoming offers here. To find new work, check out the business pool.",
      "panel.quick.t": "🚀 Quick Action", "panel.quick.iz": "Search the pool to find new couriers or get bulk offers from firms.",
      "panel.quick.fz": "Send offers to businesses or strengthen your personnel pool.",
      "panel.searchPool.d": "Go to the full courier pool, filter and send offers directly.",
      "panel.myProfile.d": "Review how your sample profile looks:",
      "btn.goCourierPool": "Go to Courier Pool →", "btn.viewMyProfile": "View My Public Profile →",
      "btn.courierPool": "Courier Pool", "btn.firmPool": "Firm Pool", "btn.businessPool": "Business Pool",
      "state.applied": "Applied", "state.active": "Active", "state.published": "Published", "state.pending": "Pending",
      "state.accepted": "Accepted", "state.rejected": "Rejected",
      "offer.accept": "Accept", "offer.reject": "Reject", "offer.incoming": "Incoming", "offer.outgoing": "Outgoing",
      "offer.actErr": "Action failed, please try again.",
      "empty.offers": "No records yet. Start by sending an offer from the pool.", "empty.generic": "No records.",
      "soon.tender.t": "Corporate Tender System — Soon", "soon.tender.d": "Bulk courier needs of chain restaurants, market chains and e-commerce companies will be published as tenders; firms will bid. This module will go live in Phase 3.",
      "soon.published": "Published",

      "giris.title": "Join the Platform", "giris.lead": "Pick your role and sign into the panel instantly. (Demo — no real registration.)",
      "giris.intro.kurye": "Enter your details to continue as a courier.",
      "giris.intro.isletme": "Enter your details to find couriers for your business.",
      "giris.intro.firma": "Join the platform for your courier firm.",
      "giris.label.kurye": "Full Name", "giris.label.isletme": "Business / Contact Name", "giris.label.firma": "Firm Name",
      "giris.tel": "Phone", "giris.email": "E-mail", "giris.city": "City",
      "giris.ph.ad": "e.g. Ahmet Yılmaz", "giris.ph.tel": "05XX XXX XX XX", "giris.ph.email": "example@email.com", "giris.ph.city": "e.g. Istanbul",
      "giris.submit": "Enter Panel →", "giris.ok": "🎉 Welcome! Redirecting you to your panel…",
      "giris.exploreText": "Just want to explore?", "giris.exploreLink": "Browse the pools",
      "auth.login": "Sign In", "auth.register": "Register", "auth.email": "E-mail", "auth.password": "Password",
      "auth.passPh": "At least 6 characters", "auth.loginBtn": "Sign In", "auth.registerBtn": "Create Account",
      "auth.role": "Your role", "auth.name": "Full Name / Business Name", "auth.namePh": "e.g. Ahmet Yılmaz",
      "auth.errGeneric": "Something went wrong. Check your details.",
      "auth.okRegister": "🎉 Account created! Let's complete your profile…",
      "auth.okRegisterConfirm": "🎉 Account created! Click the confirmation link we sent to your e-mail to continue.",
      "auth.okLogin": "🎉 Signed in, redirecting…",
      "auth.forgot": "Forgot password?",
      "auth.resetEmailFirst": "Enter your e-mail first, then click 'Forgot password'.",
      "auth.resetSent": "📧 A reset link has been sent to your e-mail. Check your inbox.",
      "sr.title": "Set New Password", "sr.lead": "Create a new password for your account.",
      "sr.newPass": "New Password", "sr.newPass2": "New Password (again)", "sr.save": "Update Password",
      "sr.saved": "✓ Your password has been updated. Redirecting to sign in…",
      "sr.mismatch": "Passwords do not match.", "sr.short": "Password must be at least 6 characters.",
      "sr.invalid": "Link is invalid or expired. Please restart the reset.",
      "pe.title": "My Profile", "pe.lead": "Fill in your details; this is how you'll appear in the pool.",
      "pe.save": "Save", "pe.saved": "✓ Profile saved.", "pe.viewPublic": "View my public profile →",
      "pe.name": "Name / Business / Firm", "pe.city": "City", "pe.phone": "Phone", "pe.about": "About / Description",
      "pe.vehicle": "Vehicle", "pe.regions": "Regions (comma separated)", "pe.exp": "Experience (years)", "pe.level": "Level",
      "pe.certs": "Certificates (comma separated)", "pe.completed": "Completed deliveries",
      "pe.type": "Type", "pe.openListing": "Open listings", "pe.need": "Courier need",
      "pe.capacity": "Capacity (couriers)", "pe.services": "Services (comma separated)",
      "pe.loginRequired": "You must sign in for this page."
    }
  };

  var lang = localStorage.getItem("kb_lang") || "tr";
  if (!DICT[lang]) lang = "tr";

  // Arka plan renk temasını olabildiğince erken uygula (parlama olmasın)
  document.documentElement.setAttribute("data-theme", localStorage.getItem("kb_theme") || "turuncu");

  function t(key, vars) {
    var s = (DICT[lang] && DICT[lang][key]);
    if (s == null) s = (DICT.tr[key] != null ? DICT.tr[key] : key);
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function setLang(l) {
    if (!DICT[l]) return;
    localStorage.setItem("kb_lang", l);
    location.reload();
  }
  function applyStatic(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    root.querySelectorAll("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    root.querySelectorAll("[data-i18n-ph]").forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
  }

  function onReady() {
    document.documentElement.setAttribute("lang", lang);
    applyStatic();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();

  window.KBI18N = {
    t: t, setLang: setLang, applyStatic: applyStatic,
    get lang() { return lang; },
    other: function () { return lang === "tr" ? "en" : "tr"; }
  };
})();
