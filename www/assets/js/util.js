/* ============================================================
   KuryemiBul — util.js
   HTML kaçış (escaping) katmanı. index.html'de EN ÖNCE yüklenir,
   böylece tüm screens/* modülleri render anında erişebilir.

   GÜVENLİK NOTU:
   Bu SPA bir Capacitor WebView içinde çalışır. Kaçırılmamış bir
   innerHTML enjeksiyonu yalnız DOM'u değil, Capacitor köprüsünü
   (Camera / Geolocation / Filesystem) ve localStorage'daki Supabase
   oturum jetonunu da ele geçirir. Başka kullanıcıdan gelen HER
   değer (ad, mesaj, ilan başlığı, metadata) DOM'a girmeden önce
   esc() veya escAttr() ile geçmek ZORUNDADIR.
   ============================================================ */
(function () {
  'use strict';

  var HTML_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /* Metin (text-node) bağlamı için. */
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) { return HTML_MAP[c]; });
  }

  /* Attribute bağlamı için: esc() + backtick ve boşluk karakterleri.
     Tırnaksız attribute yazımına karşı da korur. */
  function escAttr(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"'`=\/]/g, function (c) {
      return HTML_MAP[c] || ('&#' + c.charCodeAt(0) + ';');
    });
  }

  /* Kullanıcı metnini <br>'li güvenli HTML'e çevirir (chat balonları). */
  function escLines(s) {
    return esc(s).replace(/\r?\n/g, '<br>');
  }

  /* JS string literal bağlamı için — onclick="fn('...')" kalıbı.
     Not: tercih edilen çözüm addEventListener'dır; bu yalnız
     mevcut inline-handler kalıbını güvenli hale getirmek içindir. */
  function escJs(s) {
    if (s == null) return '';
    return String(s).replace(/[\\'"<>&\r\n]/g, function (c) {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  /* Yalnız http(s) ve data:image şemalarına izin verir.
     javascript: / vbscript: gibi şemaları boşa düşürür. */
  function safeUrl(u) {
    var s = String(u == null ? '' : u).trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(s)) return s;
    if (/^\/(?!\/)/.test(s)) return s;   // site-içi kök yollar
    return '';
  }

  /* renderScreen() ekranı HEMEN basmaz — fade geçişi için innerHTML'i 120 ms
     sonra yazar (app.js). Render'ın hemen ardından başlayan bir Supabase
     sorgusu bundan hızlı dönerse, .then() içindeki getElementById henüz
     olmayan bir elemanı arar, null alır ve kod sessizce vazgeçer. Sonuç:
     bölüm bazen çizilir bazen çizilmez — ağ hızına bağlı bir yarış.

     whenEl() elemanı bekler: varsa hemen, yoksa kısa aralıklarla yeniden
     dener. Böylece hangi sıra gerçekleşirse gerçekleşsin sonuç aynı olur.
     Sabit bir gecikme (setTimeout 130) yazmayın — yavaş cihazda tutmaz. */
  function whenEl(id, cb, timeoutMs) {
    var waited = 0, step = 25, max = (timeoutMs == null ? 1500 : timeoutMs);
    (function tick() {
      var el = document.getElementById(id);
      if (el) { cb(el); return; }
      if (waited >= max) return;          // ekran değişmiş olabilir: sessizce bırak
      waited += step;
      setTimeout(tick, step);
    })();
  }

  /* KBPickPhoto'nun verdiği data: URL'yi yüklenebilir JPEG File'a çevirir.
     fetch(dataUrl) KULLANMAYIN: CSP connect-src data:'yı içermez, istek
     "Failed to fetch" ile düşer (emülatörde ölçüldü — avatar ve firma
     fotoğrafı yüklemesi bu yüzden hiç çalışmıyordu). Burada ağ yok; görüntü
     canvas'a çizilir (img-src data: izinli), uzun kenar maxSide'a küçültülür.
     Telefon fotoğrafları 5-10 MB olabilir; 1600 px JPEG ~300-600 KB. */
  function imageToFile(dataUrl, name, maxSide) {
    maxSide = maxSide || 1600;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (blob) {
          if (!blob) { reject(new Error('görüntü işlenemedi')); return; }
          resolve(new File([blob], name || 'foto.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { reject(new Error('görüntü okunamadı')); };
      img.src = dataUrl;
    });
  }

  /* ── İller ─────────────────────────────────────────────────────────
     Şehir eskiden serbest metindi: veritabanında "İstanbul", "Istanbul",
     "istanbul" ve "dsadad" yan yana duruyordu; filtreler ve haritanın il
     merkezi eşleştirmesi bu yüzden kaçırıyordu. Artık profil ve ilan
     formlarında yalnız bu 81 il seçilebilir.
     docs/assets/js/components.js'te (KB.ILLER) aynı liste var — iki
     uygulama bilinçli olarak ayrı; değiştirirseniz ikisini birden. */
  var ILLER = ['Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya',
    'Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis',
    'Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne',
    'Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay',
    'Iğdır','Isparta','İstanbul','İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu',
    'Kayseri','Kilis','Kırıkkale','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya',
    'Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya',
    'Samsun','Şanlıurfa','Siirt','Sinop','Şırnak','Sivas','Tekirdağ','Tokat','Trabzon','Tunceli',
    'Uşak','Van','Yalova','Yozgat','Zonguldak'];
  /* Halk arasındaki eski/kısa adlar → resmi il adı */
  var IL_TAKMA = { afyon: 'Afyonkarahisar', maras: 'Kahramanmaraş', kmaras: 'Kahramanmaraş',
    urfa: 'Şanlıurfa', antep: 'Gaziantep', icel: 'Mersin', izmit: 'Kocaeli',
    adapazari: 'Sakarya', antakya: 'Hatay' };

  /* "İstanbul" / "ISTANBUL" / "istanbul " → "istanbul" (ı/i, şapka, boşluk duyarsız) */
  function _ilAnahtar(s) {
    return String(s == null ? '' : s).toLocaleLowerCase('tr-TR').replace(/ı/g, 'i')
      .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  }
  var _IL_INDEX = {};
  ILLER.forEach(function (il) { _IL_INDEX[_ilAnahtar(il)] = il; });
  Object.keys(IL_TAKMA).forEach(function (k) { _IL_INDEX[k] = IL_TAKMA[k]; });

  /* Serbest metni resmi il adına çevirir; tanınmıyorsa '' ("dsadad" → '') */
  function ilBul(s) { return _IL_INDEX[_ilAnahtar(s)] || ''; }

  /* <select> içeriği. Eski kayıt tanınırsa seçili gelir, tanınmazsa boş kalır
     ve kullanıcı yeniden seçer. */
  function ilOptions(secili) {
    var cur = ilBul(secili);
    return '<option value="">Şehir seçin</option>' + ILLER.map(function (il) {
      return '<option' + (il === cur ? ' selected' : '') + '>' + il + '</option>';
    }).join('');
  }

  window.ILLER    = ILLER;
  window.ilBul    = ilBul;
  window.ilOptions = ilOptions;
  window.esc      = esc;
  window.escAttr  = escAttr;
  window.escLines = escLines;
  window.escJs    = escJs;
  window.safeUrl  = safeUrl;
  window.whenEl   = whenEl;
  window.imageToFile = imageToFile;
})();
