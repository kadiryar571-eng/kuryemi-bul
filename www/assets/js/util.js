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

  window.esc      = esc;
  window.escAttr  = escAttr;
  window.escLines = escLines;
  window.escJs    = escJs;
  window.safeUrl  = safeUrl;
  window.whenEl   = whenEl;
})();
