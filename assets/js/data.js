/* ============================================================
   Kuryemi Bul — data.js
   Demo / offline modu için zengin örnek veriler. Gerçek veri değildir.
   ============================================================ */
window.KB_DATA = {

  kuryeler: [
    { id: "k1", ad: "Ahmet Yılmaz", sehir: "İstanbul", bolgeler: ["Kadıköy", "Üsküdar", "Ataşehir"],
      arac: "Motosiklet", deneyim: 5, seviye: "premium", puan: 4.9, tamamlanan: 1240,
      sertifikalar: ["MYK Motorlu Kurye", "Trafik Güvenliği"], lat: 40.9907, lng: 29.0277,
      calistigi: ["Lezzet Burger", "Anadolu Eczanesi"],
      referanslar: [{ ad: "Lezzet Burger", rol: "Restoran", not: "2 yıldır güvenle çalışıyoruz." }],
      aciklama: "İstanbul Anadolu yakasında 5 yıllık deneyimli motokurye. Özellikle yoğun saat trafiğine hakimim." },
    { id: "k2", ad: "Mert Demir", sehir: "İstanbul", bolgeler: ["Şişli", "Beşiktaş"],
      arac: "Motosiklet", deneyim: 3, seviye: "profesyonel", puan: 4.6, tamamlanan: 720,
      sertifikalar: ["MYK Motorlu Kurye"], lat: 41.0602, lng: 28.9877,
      calistigi: ["Mavi Market"], referanslar: [{ ad: "Mavi Market", rol: "Market", not: "Hızlı ve titiz." }],
      aciklama: "Avrupa yakası kuryesi. Beşiktaş ve Şişli'de hızlı teslimat." },
    { id: "k3", ad: "Emre Kaya", sehir: "İstanbul", bolgeler: ["Bağcılar", "Bahçelievler"],
      arac: "Elektrikli Bisiklet", deneyim: 1, seviye: "standart", puan: 4.2, tamamlanan: 130,
      sertifikalar: [], lat: 41.0345, lng: 28.8567, calistigi: [], referanslar: [],
      aciklama: "Çevre dostu elektrikli bisiklet ile kısa mesafe teslimat yapıyorum." },
    { id: "k4", ad: "Selin Aydın", sehir: "Ankara", bolgeler: ["Çankaya", "Kızılay"],
      arac: "Motosiklet", deneyim: 4, seviye: "profesyonel", puan: 4.7, tamamlanan: 880,
      sertifikalar: ["MYK Motorlu Kurye"], lat: 39.9208, lng: 32.8541,
      calistigi: ["Başkent Çiçek"], referanslar: [{ ad: "Başkent Çiçek", rol: "Çiçekçi", not: "Çok güvenilir." }],
      aciklama: "Ankara'nın kalbi Kızılay ve Çankaya'da 4 yıllık tecrübe." },
    { id: "k5", ad: "Burak Şahin", sehir: "İzmir", bolgeler: ["Konak", "Bornova"],
      arac: "Motosiklet", deneyim: 7, seviye: "premium", puan: 4.95, tamamlanan: 2100,
      sertifikalar: ["MYK Motorlu Kurye", "İleri Sürüş"], lat: 38.4189, lng: 27.1287,
      calistigi: ["Ege Su", "Sahil Eczanesi"], referanslar: [{ ad: "Ege Su", rol: "Su Firması", not: "Yıllardır vazgeçilmezimiz." }],
      aciklama: "İzmir'in en deneyimli kurye ağlarından biriyim. 7 yıl, 2100+ teslimat." },
    { id: "k6", ad: "Deniz Çelik", sehir: "İstanbul", bolgeler: ["Maltepe", "Kartal"],
      arac: "Otomobil", deneyim: 2, seviye: "standart", puan: 4.0, tamamlanan: 210,
      sertifikalar: [], lat: 40.9351, lng: 29.1556, calistigi: [], referanslar: [],
      aciklama: "Araçlı kurye olarak büyük kargo teslimatlarında aktifim." }
  ],

  isletmeler: [
    { id: "i1", ad: "Lezzet Burger", tur: "Restoran", sehir: "İstanbul", bolge: "Kadıköy",
      acikIlan: 2, aciklama: "Günlük 200+ paket servisi yapan yoğun bir burger restoranı. Güvenilir ve hızlı kurye arıyoruz.",
      lat: 40.9901, lng: 29.0254, ihtiyac: "Akşam vardiyası motokurye" },
    { id: "i2", ad: "Mavi Market", tur: "Market", sehir: "İstanbul", bolge: "Şişli",
      acikIlan: 1, aciklama: "Mahalle marketi, hızlı teslimat ağı kuruyor. Bisikletli kurye tercihimiz.",
      lat: 41.0588, lng: 28.9862, ihtiyac: "Yarı zamanlı bisikletli kurye" },
    { id: "i3", ad: "Anadolu Eczanesi", tur: "Eczane", sehir: "İstanbul", bolge: "Üsküdar",
      acikIlan: 1, aciklama: "Reçeteli ilaç teslimatı için güvenilir kurye arıyor. Referanslı tercih sebebimiz.",
      lat: 41.0235, lng: 29.0152, ihtiyac: "Güvenilir, referanslı kurye" },
    { id: "i4", ad: "Başkent Çiçek", tur: "Çiçekçi", sehir: "Ankara", bolge: "Çankaya",
      acikIlan: 1, aciklama: "Aynı gün çiçek teslimatı yapan butik çiçekçi. Özenli teslimat şart.",
      lat: 39.9189, lng: 32.8523, ihtiyac: "Özenli teslimat yapan kurye" },
    { id: "i5", ad: "Ege Su", tur: "Su Firması", sehir: "İzmir", bolge: "Konak",
      acikIlan: 3, aciklama: "Bölgesel su dağıtımı, sürekli kurye ihtiyacı var. Fiziksel kondisyon önemli.",
      lat: 38.4170, lng: 27.1281, ihtiyac: "Tam zamanlı dağıtım kuryesi" },
    { id: "i6", ad: "HızlıAl E-Ticaret", tur: "E-Ticaret", sehir: "İstanbul", bolge: "Ataşehir",
      acikIlan: 5, aciklama: "Şehir içi aynı gün teslimat yapan e-ticaret deposu. Çok sayıda kurye pozisyonu mevcut.",
      lat: 40.9923, lng: 29.1244, ihtiyac: "Çok sayıda kurye / firma teklifi" }
  ],

  firmalar: [
    { id: "f1", ad: "Hız Kurye Lojistik", bolgeler: ["İstanbul Anadolu", "İstanbul Avrupa"],
      kapasite: 60, puan: 4.8, aciklama: "150+ kuryelik filosuyla kurumsal teslimat çözümleri sunan köklü firma.",
      lat: 41.0082, lng: 28.9784, hizmetler: ["Aynı gün teslimat", "Kurumsal anlaşma", "Soğuk zincir"] },
    { id: "f2", ad: "Anadolu Express", bolgeler: ["Ankara", "Eskişehir"],
      kapasite: 35, puan: 4.5, aciklama: "İç Anadolu bölgesinde hızlı dağıtım ağı. Şehirler arası lojistikte uzmanız.",
      lat: 39.9334, lng: 32.8597, hizmetler: ["Şehirler arası", "Kurumsal anlaşma"] },
    { id: "f3", ad: "Ege Moto Kurye", bolgeler: ["İzmir", "Manisa"],
      kapasite: 28, puan: 4.7, aciklama: "Ege bölgesinde motokurye ağı. Yoğun bölge desteği ve aynı gün garanti.",
      lat: 38.4237, lng: 27.1428, hizmetler: ["Aynı gün teslimat", "Yoğun bölge desteği"] }
  ],

  /* ── Açık İş İlanları (12+ alan) ───────────────────────────── */
  ilanlar: [
    {
      id: "il1", sahip: "Lezzet Burger", sahipId: "i1", sahipRol: "isletme",
      baslik: "Akşam Vardiyası Motokurye",
      sehir: "İstanbul", bolge: "Kadıköy", tip: "kurye-ilani", tarih: "2026-06-20",
      aciklama: "Yoğun akşam servis saatlerinde çalışacak deneyimli motokurye arıyoruz. Kadıköy ve çevre semtlerde günlük ortalama 40–60 sipariş teslim edilecektir. Güvenilir, iletişimi güçlü adaylar tercih edilir.",
      maas_modeli: "Aylık + Prim",
      maas_aralik: "14.000–18.000 TL/ay",
      calisma_saatleri: "17:00–23:00",
      arac: "Motosiklet",
      teslimat_bolge: "Kadıköy, Üsküdar, Ataşehir",
      faydalar: ["Yakıt yardımı", "Ücretsiz yemek", "Kaza sigortası"],
      oncelik: "acil",
      vardiya_tipi: "Yarı Zamanlı",
      sigorta: "SGK'lı",
      bonus: "Teslimat başına +6 TL prim",
      son_basvuru: "2026-07-05",
      kontenjan: 2
    },
    {
      id: "il2", sahip: "Ege Su", sahipId: "i5", sahipRol: "isletme",
      baslik: "Tam Zamanlı Su Dağıtım Kuryesi",
      sehir: "İzmir", bolge: "Konak", tip: "kurye-ilani", tarih: "2026-06-18",
      aciklama: "İzmir Konak ve çevre mahallelerinde damacana su dağıtımı yapacak tam zamanlı kurye arıyoruz. Haftalık 5 gün, sabah 08:00'den itibaren çalışılacak. Araç firmasına ait olup sürücü adaylar da değerlendirilir.",
      maas_modeli: "Aylık Sabit",
      maas_aralik: "17.000–20.000 TL/ay",
      calisma_saatleri: "08:00–17:00",
      arac: "Kamyonet",
      teslimat_bolge: "Konak, Bornova, Karşıyaka",
      faydalar: ["SGK zorunlu", "Araç firma hizmeti", "Öğle yemeği", "Yol yardımı"],
      oncelik: "normal",
      vardiya_tipi: "Tam Zamanlı",
      sigorta: "SGK'lı",
      bonus: "Aylık 500 TL dolum bonusu",
      son_basvuru: "2026-07-10",
      kontenjan: 3
    },
    {
      id: "il3", sahip: "HızlıAl E-Ticaret", sahipId: "i6", sahipRol: "isletme",
      baslik: "Aynı Gün Teslimat Kuryesi (Sezonluk)",
      sehir: "İstanbul", bolge: "Ataşehir", tip: "kurye-ilani", tarih: "2026-06-22",
      aciklama: "Yaz sezonu yoğunluğu için sezonluk kurye pozisyonları. Depodan alınan paketler İstanbul geneline aynı gün teslim edilecek. Motosiklet veya scooter sahibi adaylar önceliklidir.",
      maas_modeli: "Teslimat Başına",
      maas_aralik: "8–15 TL/teslimat",
      calisma_saatleri: "09:00–19:00 (Esnek)",
      arac: "Motosiklet",
      teslimat_bolge: "İstanbul geneli",
      faydalar: ["Esnek çalışma saati", "Günlük ödeme seçeneği", "Sigorta fırsatı"],
      oncelik: "acil",
      vardiya_tipi: "Esnek",
      sigorta: "Bağımsız",
      bonus: "100+ teslimat/ay için %15 prim",
      son_basvuru: "2026-06-30",
      kontenjan: 5
    },
    {
      id: "il4", sahip: "Mavi Market", sahipId: "i2", sahipRol: "isletme",
      baslik: "Hafta Sonu Bisikletli Kurye",
      sehir: "İstanbul", bolge: "Şişli", tip: "kurye-ilani", tarih: "2026-06-15",
      aciklama: "Cumartesi ve Pazar günleri aktif olacak bisikletli kurye aranıyor. Mahalle içi kısa mesafe teslimat, maksimum 3 km. Genç ve enerjik adaylar tercih edilir.",
      maas_modeli: "Günlük",
      maas_aralik: "1.200–1.600 TL/gün",
      calisma_saatleri: "10:00–20:00",
      arac: "Bisiklet",
      teslimat_bolge: "Şişli, Nişantaşı, Teşvikiye",
      faydalar: ["Kısa mesafe", "Çevre dostu", "Hafta sonu ek gelir"],
      oncelik: "normal",
      vardiya_tipi: "Hafta Sonu",
      sigorta: "Bağımsız",
      bonus: "Yok",
      son_basvuru: "2026-07-15",
      kontenjan: 1
    },
    {
      id: "il5", sahip: "Anadolu Eczanesi", sahipId: "i3", sahipRol: "isletme",
      baslik: "İlaç Teslimatı Motokuryesi",
      sehir: "İstanbul", bolge: "Üsküdar", tip: "kurye-ilani", tarih: "2026-06-19",
      aciklama: "Reçeteli ilaç ve tıbbi malzeme teslimatı yapacak güvenilir kurye arıyoruz. Adayın referans verebilmesi ve sabıka kaydının temiz olması zorunludur. Teslimat rotası önceden planlanır.",
      maas_modeli: "Aylık Sabit",
      maas_aralik: "15.500–17.000 TL/ay",
      calisma_saatleri: "09:00–18:00",
      arac: "Motosiklet",
      teslimat_bolge: "Üsküdar, Çengelköy, Beylerbeyi",
      faydalar: ["SGK zorunlu", "Yakıt firmasından", "Sabit rota"],
      oncelik: "normal",
      vardiya_tipi: "Tam Zamanlı",
      sigorta: "SGK'lı",
      bonus: "Yok",
      son_basvuru: "2026-07-08",
      kontenjan: 1
    },
    {
      id: "il6", sahip: "Hız Kurye Lojistik", sahipId: "f1", sahipRol: "firma",
      baslik: "Premium Kurye Operatörü",
      sehir: "İstanbul", bolge: "Kadıköy", tip: "kurye-ilani", tarih: "2026-06-23",
      aciklama: "Lojistik firmamıza bağlı büyük teslimat ağında görev yapacak deneyimli kurye operatörleri arıyoruz. En az 2 yıl deneyim şart. Kendi aracı olanlar büyük avantaj.",
      maas_modeli: "Aylık + Komisyon",
      maas_aralik: "18.000–25.000 TL/ay",
      calisma_saatleri: "08:00–18:00",
      arac: "Motosiklet",
      teslimat_bolge: "İstanbul Anadolu Yakası tamamı",
      faydalar: ["SGK zorunlu", "Araç giderleri paylaşım", "Performans bonusu", "Kariyer gelişimi"],
      oncelik: "normal",
      vardiya_tipi: "Tam Zamanlı",
      sigorta: "SGK'lı",
      bonus: "Aylık hedef aşımında %8 komisyon",
      son_basvuru: "2026-07-20",
      kontenjan: 4
    },
    {
      id: "il7", sahip: "Başkent Çiçek", sahipId: "i4", sahipRol: "isletme",
      baslik: "Çiçek & Hediye Teslimat Kuryesi",
      sehir: "Ankara", bolge: "Çankaya", tip: "kurye-ilani", tarih: "2026-06-21",
      aciklama: "Özel günlerde çiçek ve hediye teslimatı yapacak özenli kurye arıyoruz. Sunum önemli; paketlerin hasar görmeden teslimi şart. Kibarlık ve temiz görünüm bekliyoruz.",
      maas_modeli: "Aylık + Bahşiş",
      maas_aralik: "13.000–15.000 TL/ay",
      calisma_saatleri: "09:00–20:00",
      arac: "Motosiklet",
      teslimat_bolge: "Çankaya, Kızılay, Oran, Bahçelievler",
      faydalar: ["Yakıt yardımı", "Müşteri bahşişi kurye geliyor", "Düzenli mesai"],
      oncelik: "normal",
      vardiya_tipi: "Tam Zamanlı",
      sigorta: "SGK'lı",
      bonus: "Özel gün yoğunluklarında +500 TL ikramiye",
      son_basvuru: "2026-07-12",
      kontenjan: 1
    },
    {
      id: "il8", sahip: "HızlıAl E-Ticaret", sahipId: "i6", sahipRol: "isletme",
      baslik: "Araçlı Kurye (Büyük Kargo)",
      sehir: "İstanbul", bolge: "Pendik", tip: "kurye-ilani", tarih: "2026-06-17",
      aciklama: "Büyük hacimli e-ticaret kargolarının depodan son noktaya teslimatı için araçlı kurye arıyoruz. Günlük 20–30 büyük kargo. B sınıfı ehliyet ve en az 1 yıl deneyim bekliyoruz.",
      maas_modeli: "Aylık Sabit",
      maas_aralik: "19.000–22.000 TL/ay",
      calisma_saatleri: "07:30–16:30",
      arac: "Otomobil",
      teslimat_bolge: "Pendik, Kartal, Maltepe, Tuzla",
      faydalar: ["SGK zorunlu", "Yakıt tamamen firma", "Fazla mesai ücreti", "Araç bakım desteği"],
      oncelik: "acil",
      vardiya_tipi: "Tam Zamanlı",
      sigorta: "SGK'lı",
      bonus: "Hasarsız teslimat için aylık +1.500 TL",
      son_basvuru: "2026-07-01",
      kontenjan: 2
    }
  ],

  /* ── Offline Konuşmalar ─────────────────────────────────────── */
  konusmalar: [
    {
      profileId: "i1", ad: "Lezzet Burger",
      lastBody: "Müsait olduğunuzda bir başvuru alsak harika olurdu!",
      lastAt: "2026-06-23T18:42:00Z", lastMine: false, unread: 2,
      mesajlar: [
        { id: "m1", from_user: "i1", body: "Merhaba, profilinizi inceledik. Akşam vardiyasında çalışmaya açık mısınız?", created_at: "2026-06-23T18:30:00Z" },
        { id: "m2", from_user: "me", body: "Merhaba! Evet, akşam saatleri benim için çok uygun.", created_at: "2026-06-23T18:35:00Z" },
        { id: "m3", from_user: "i1", body: "Harika! Peki hangi günler müsaitsiniz?", created_at: "2026-06-23T18:38:00Z" },
        { id: "m4", from_user: "me", body: "Pazartesi–Cuma 17:00–23:00 arası çalışabilirim.", created_at: "2026-06-23T18:40:00Z" },
        { id: "m5", from_user: "i1", body: "Müsait olduğunuzda bir başvuru alsak harika olurdu!", created_at: "2026-06-23T18:42:00Z" }
      ]
    },
    {
      profileId: "f1", ad: "Hız Kurye Lojistik",
      lastBody: "Başvurunuzu aldık. Teşekkürler, inceliyoruz.",
      lastAt: "2026-06-22T10:10:00Z", lastMine: false, unread: 0,
      mesajlar: [
        { id: "m6", from_user: "me", body: "Merhaba, firmana başvuruyorum. Anadolu yakasında 5 yıl deneyimim var.", created_at: "2026-06-22T10:00:00Z" },
        { id: "m7", from_user: "f1", body: "Başvurunuzu aldık. Teşekkürler, inceliyoruz.", created_at: "2026-06-22T10:10:00Z" }
      ]
    },
    {
      profileId: "i3", ad: "Anadolu Eczanesi",
      lastBody: "Referans belgenizi bize iletebilir misiniz?",
      lastAt: "2026-06-21T14:05:00Z", lastMine: false, unread: 1,
      mesajlar: [
        { id: "m8", from_user: "i3", body: "Merhaba, ilaç teslimat pozisyonu için referans belgenizi bize iletebilir misiniz?", created_at: "2026-06-21T14:05:00Z" }
      ]
    }
  ],

  /* ── Offline Bildirimler ────────────────────────────────────── */
  bildirimler: [
    { id: "n1", type: "apply", title: "Başvurunuz Alındı", body: "Lezzet Burger ilanına başvurunuz iletildi.", link: "ilanlar.html", read_at: null, created_at: "2026-06-23T09:00:00Z" },
    { id: "n2", type: "offer", title: "Yeni Teklif", body: "Hız Kurye Lojistik size teklif gönderdi. İnceleyin.", link: "eslesme.html", read_at: null, created_at: "2026-06-22T11:30:00Z" },
    { id: "n3", type: "message", title: "Yeni Mesaj", body: "Lezzet Burger: Müsait olduğunuzda bir başvuru alsak harika olurdu!", link: "mesajlar.html", read_at: "2026-06-23T20:00:00Z", created_at: "2026-06-23T18:42:00Z" },
    { id: "n4", type: "system", title: "Profil Yayına Alındı", body: "Profiliniz yayına alındı. Artık havuzda görünüyorsunuz.", link: "profil-duzenle.html", read_at: "2026-06-22T00:00:00Z", created_at: "2026-06-21T16:00:00Z" },
    { id: "n5", type: "apply", title: "Başvuru Güncellendi", body: "Ege Su ilanındaki başvurunuz inceleme aşamasına geçti.", link: "ilanlar.html", read_at: "2026-06-20T00:00:00Z", created_at: "2026-06-19T13:00:00Z" },
    { id: "n6", type: "offer", title: "Teklif Kabul Edildi", body: "Anadolu Eczanesi teklifinizi kabul etti. Mesajlaşmaya başlayabilirsiniz.", link: "mesajlar.html", read_at: "2026-06-18T00:00:00Z", created_at: "2026-06-17T17:00:00Z" }
  ],

  /* ── Demo Teklifler ─────────────────────────────────────────── */
  teklifler: [
    { id: "t1", yon: "isletme-kurye", kimden: "Lezzet Burger", kimeTip: "kurye", kime: "Mert Demir", mesaj: "Akşam vardiyası için seninle çalışmak isteriz.", durum: "pending", tarih: "2026-05-29" }
  ]
};
