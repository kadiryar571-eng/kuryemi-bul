/* ============================================================
   Kuryemi Bul — data.js
   Faz 1 prototip için ÖRNEK (mock) veriler. Gerçek veri değildir.
   ============================================================ */
window.KB_DATA = {

  kuryeler: [
    { id: "k1", ad: "Ahmet Yılmaz", sehir: "İstanbul", bolgeler: ["Kadıköy", "Üsküdar", "Ataşehir"],
      arac: "Motosiklet", deneyim: 5, seviye: "premium", puan: 4.9, tamamlanan: 1240,
      sertifikalar: ["MYK Motorlu Kurye", "Trafik Güvenliği"], lat: 40.9907, lng: 29.0277,
      calistigi: ["Lezzet Burger", "Anadolu Eczanesi"],
      referanslar: [{ ad: "Lezzet Burger", rol: "Restoran", not: "2 yıldır güvenle çalışıyoruz." }] },
    { id: "k2", ad: "Mert Demir", sehir: "İstanbul", bolgeler: ["Şişli", "Beşiktaş"],
      arac: "Motosiklet", deneyim: 3, seviye: "profesyonel", puan: 4.6, tamamlanan: 720,
      sertifikalar: ["MYK Motorlu Kurye"], lat: 41.0602, lng: 28.9877,
      calistigi: ["Mavi Market"], referanslar: [{ ad: "Mavi Market", rol: "Market", not: "Hızlı ve titiz." }] },
    { id: "k3", ad: "Emre Kaya", sehir: "İstanbul", bolgeler: ["Bağcılar", "Bahçelievler"],
      arac: "Elektrikli Bisiklet", deneyim: 1, seviye: "standart", puan: 4.2, tamamlanan: 130,
      sertifikalar: [], lat: 41.0345, lng: 28.8567, calistigi: [], referanslar: [] },
    { id: "k4", ad: "Selin Aydın", sehir: "Ankara", bolgeler: ["Çankaya", "Kızılay"],
      arac: "Motosiklet", deneyim: 4, seviye: "profesyonel", puan: 4.7, tamamlanan: 880,
      sertifikalar: ["MYK Motorlu Kurye"], lat: 39.9208, lng: 32.8541,
      calistigi: ["Başkent Çiçek"], referanslar: [{ ad: "Başkent Çiçek", rol: "Çiçekçi", not: "Çok güvenilir." }] },
    { id: "k5", ad: "Burak Şahin", sehir: "İzmir", bolgeler: ["Konak", "Bornova"],
      arac: "Motosiklet", deneyim: 7, seviye: "premium", puan: 4.95, tamamlanan: 2100,
      sertifikalar: ["MYK Motorlu Kurye", "İleri Sürüş"], lat: 38.4189, lng: 27.1287,
      calistigi: ["Ege Su", "Sahil Eczanesi"], referanslar: [{ ad: "Ege Su", rol: "Su Firması", not: "Yıllardır vazgeçilmezimiz." }] },
    { id: "k6", ad: "Deniz Çelik", sehir: "İstanbul", bolgeler: ["Maltepe", "Kartal"],
      arac: "Otomobil", deneyim: 2, seviye: "standart", puan: 4.0, tamamlanan: 210,
      sertifikalar: [], lat: 40.9351, lng: 29.1556, calistigi: [], referanslar: [] }
  ],

  isletmeler: [
    { id: "i1", ad: "Lezzet Burger", tur: "Restoran", sehir: "İstanbul", bolge: "Kadıköy",
      acikIlan: 2, aciklama: "Günlük 200+ paket servisi yapan yoğun bir burger restoranı.",
      lat: 40.9901, lng: 29.0254, ihtiyac: "Akşam vardiyası motokurye" },
    { id: "i2", ad: "Mavi Market", tur: "Market", sehir: "İstanbul", bolge: "Şişli",
      acikIlan: 1, aciklama: "Mahalle marketi, hızlı teslimat ağı kuruyor.",
      lat: 41.0588, lng: 28.9862, ihtiyac: "Yarı zamanlı bisikletli kurye" },
    { id: "i3", ad: "Anadolu Eczanesi", tur: "Eczane", sehir: "İstanbul", bolge: "Üsküdar",
      acikIlan: 1, aciklama: "Reçeteli ilaç teslimatı için güvenilir kurye arıyor.",
      lat: 41.0235, lng: 29.0152, ihtiyac: "Güvenilir, referanslı kurye" },
    { id: "i4", ad: "Başkent Çiçek", tur: "Çiçekçi", sehir: "Ankara", bolge: "Çankaya",
      acikIlan: 1, aciklama: "Aynı gün çiçek teslimatı yapan butik çiçekçi.",
      lat: 39.9189, lng: 32.8523, ihtiyac: "Özenli teslimat yapan kurye" },
    { id: "i5", ad: "Ege Su", tur: "Su Firması", sehir: "İzmir", bolge: "Konak",
      acikIlan: 3, aciklama: "Bölgesel su dağıtımı, sürekli kurye ihtiyacı var.",
      lat: 38.4170, lng: 27.1281, ihtiyac: "Tam zamanlı dağıtım kuryesi" },
    { id: "i6", ad: "HızlıAl E-Ticaret", tur: "E-Ticaret", sehir: "İstanbul", bolge: "Ataşehir",
      acikIlan: 5, aciklama: "Şehir içi aynı gün teslimat yapan e-ticaret deposu.",
      lat: 40.9923, lng: 29.1244, ihtiyac: "Çok sayıda kurye / firma teklifi" }
  ],

  firmalar: [
    { id: "f1", ad: "Hız Kurye Lojistik", bolgeler: ["İstanbul Anadolu", "İstanbul Avrupa"],
      kapasite: 60, puan: 4.8, aciklama: "150+ kuryelik filosuyla kurumsal teslimat çözümleri.",
      lat: 41.0082, lng: 28.9784, hizmetler: ["Aynı gün teslimat", "Kurumsal anlaşma", "Soğuk zincir"] },
    { id: "f2", ad: "Anadolu Express", bolgeler: ["Ankara", "Eskişehir"],
      kapasite: 35, puan: 4.5, aciklama: "İç Anadolu bölgesinde hızlı dağıtım ağı.",
      lat: 39.9334, lng: 32.8597, hizmetler: ["Şehirler arası", "Kurumsal anlaşma"] },
    { id: "f3", ad: "Ege Moto Kurye", bolgeler: ["İzmir", "Manisa"],
      kapasite: 28, puan: 4.7, aciklama: "Ege bölgesinde motokurye ağı.",
      lat: 38.4237, lng: 27.1428, hizmetler: ["Aynı gün teslimat", "Yoğun bölge desteği"] }
  ],

  // Açık ilanlar (havuz/panel için)
  ilanlar: [
    { id: "il1", sahip: "i1", baslik: "Akşam Vardiyası Motokurye", sehir: "İstanbul", bolge: "Kadıköy", tip: "kurye-ilani", tarih: "2026-05-28" },
    { id: "il2", sahip: "i5", baslik: "Tam Zamanlı Su Dağıtım Kuryesi", sehir: "İzmir", bolge: "Konak", tip: "kurye-ilani", tarih: "2026-05-30" },
    { id: "il3", sahip: "i6", baslik: "Kurumsal Kurye Tedarik İhalesi (Yakında)", sehir: "İstanbul", bolge: "Ataşehir", tip: "ihale", tarih: "2026-06-01" }
  ],

  // Başlangıç teklif örnekleri (localStorage'a eklenecek demolar)
  teklifler: [
    { id: "t1", yon: "isletme-kurye", kimden: "Lezzet Burger", kimeTip: "kurye", kime: "Mert Demir", mesaj: "Akşam vardiyası için seninle çalışmak isteriz.", durum: "pending", tarih: "2026-05-29" }
  ]
};
