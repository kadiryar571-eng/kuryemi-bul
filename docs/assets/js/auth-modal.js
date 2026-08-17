/* ============================================================
   KuryemiBul — auth-modal.js
   Giriş / kayıt formunu index.html üzerinde modal olarak açar.

   Yalnız index.html yükler. Formun kendisi bu dosyada DEĞİL —
   auth-forms.js'te (tek kaynak). Buradaki iş sadece kabuk:
   overlay, kapatma, ESC, odak yönetimi, arka plan kilidi ve
   sayfadaki giriş bağlantılarının yakalanması.

   Yükleme sırası: util yok — auth-forms.js BUNDAN ÖNCE gelmeli.
   ============================================================ */
(function () {
  'use strict';

  var overlay = null;      // .modal-overlay — bir kez oluşturulur
  var forms   = null;      // KBAuthForms.mount() dönüşü
  var opener  = null;      // modalı açan element; kapanışta odak buraya döner
  var prevOverflow = '';
  var prevPadRight = '';
  var prevHtmlOverflow = '';

  function sbReady() { return !!(window.SB && SB.isOn()); }

  /* ─── Kabuk ────────────────────────────────────────────────── */
  function build() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'modal-overlay auth-modal-overlay';
    overlay.id = 'kbAuthModal';
    /* İki sütunlu kabuk: solda marka paneli, sağda form.
       Buradaki HTML yalnız SUNUMDUR — id'ler (#kbAuthClose, #kbAuthBody),
       ARIA nitelikleri ve kapatma/odak davranışı aynen korunur. Görseller
       göreli yolla veriliyor; çözümleme script'e göre değil DOKÜMANA göre
       yapıldığı için index.html'in yanındaki assets/ doğru hedeftir.
       Sol paneldeki görseller dekoratiftir (alt=""), ekran okuyucu
       modalın aria-label'ını ve form etiketlerini okur. */
    overlay.innerHTML =
      '<div class="modal auth-modal" role="dialog" aria-modal="true" aria-label="Giriş yap veya hesap oluştur">' +
        '<aside class="auth-modal__brand">' +
          '<img class="auth-modal__logo" src="assets/logo-128.png" width="74" height="74" alt="" decoding="async">' +
          '<p class="auth-modal__welcome">KuryemiBul\'a<span>Hoş Geldin!</span></p>' +
          /* Metin bilerek sekmeden bağımsız: sekmeye göre değiştirmek
             auth-forms.js'in showLogin/showRegister mantığını değiştirmeyi
             gerektirirdi. Bu cümle hem giriş hem kayıt sekmesinde doğru. */
          '<p class="auth-modal__lead">Binlerce kurye iş fırsatına ulaşmaya başla.</p>' +
          /* Saydam PNG — hero'daki JPEG sürümün zemini #070C16'ya gömülü ve
             bu panelin ışıltılı zemininde dikdörtgen kenarı belli oluyordu.
             Görsel yalnız modal ilk açıldığında (build) DOM'a girer. */
          '<img class="auth-modal__art" src="assets/kurye-scooter-sm.png" width="360" height="540" alt="" loading="lazy" decoding="async">' +
        '</aside>' +
        '<div class="auth-modal__panel">' +
          '<div class="modal__head auth-modal__head">' +
            '<button type="button" class="modal__close" id="kbAuthClose" aria-label="Kapat">&times;</button>' +
          '</div>' +
          '<div class="auth-modal__body" id="kbAuthBody"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    forms = window.KBAuthForms.mount(overlay.querySelector('#kbAuthBody'), { mode: 'login' });

    overlay.querySelector('#kbAuthClose').addEventListener('click', close);

    /* Arka plan tıklaması yalnız overlay'in KENDİSİNE gelirse kapatır.
       Formun içine tıklamak kapatmaz. */
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    /* Odak tuzağı — Tab modalın dışına çıkmasın */
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var list = overlay.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      /* Gizli sekmenin (display:none) alanları offsetParent'ı null verir;
         onları atlıyoruz ki Tab görünmeyen alanlara gitmesin. */
      var f = Array.prototype.filter.call(list, function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ESC — document seviyesinde, yalnız modal açıkken iş görür */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) close();
  });

  function isOpen() { return !!(overlay && overlay.classList.contains('is-open')); }

  /* ─── Arka plan kilidi ─────────────────────────────────────────
     Sadece overflow:hidden yetmez: kaydırma çubuğu kaybolunca sayfa
     genişler ve içerik yanlamasına zıplar. Çubuk genişliği kadar
     padding eklenerek telafi edilir, kapanışta ikisi de geri alınır. */
  function lockScroll() {
    var barW = window.innerWidth - document.documentElement.clientWidth;
    prevOverflow = document.body.style.overflow;
    prevPadRight = document.body.style.paddingRight;
    prevHtmlOverflow = document.documentElement.style.overflow;
    /* Hem html hem body kilitleniyor. Yalnız body yeterli görünür (html'in
       overflow'u visible olduğunda body'ninki viewport'a yansır) ama bu
       yansıma bazı tarayıcılarda güvenilmez; ikisini birden kilitlemek
       her yerde tutar. */
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    if (barW > 0) {
      var cur = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      document.body.style.paddingRight = (cur + barW) + 'px';
    }
  }
  function unlockScroll() {
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.overflow = prevOverflow;
    document.body.style.paddingRight = prevPadRight;
  }

  /* ─── Aç / kapat ───────────────────────────────────────────── */
  function open(opts) {
    opts = opts || {};
    build();

    /* Dönüş adresi: modal açılırken navigasyon olmadığı için URL'de
       ?next= bulunmaz. Mevcut mekanizmaya (safeNext + sessionStorage)
       yazıyoruz; yeni bir anahtar veya ikinci bir doğrulayıcı yok. */
    if (opts.next && window.KB && KB.setNext) KB.setNext(opts.next);

    opener = opts.opener || document.activeElement || null;

    if (opts.mode === 'register') forms.showRegister(); else forms.showLogin();

    lockScroll();
    overlay.classList.add('is-open');
    /* Geçiş bitmeden odaklamak bazı tarayıcılarda sayfayı kaydırıyor */
    setTimeout(function () { forms.focusFirst(); }, 60);
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    unlockScroll();
    forms.clearAlert();
    if (opener && typeof opener.focus === 'function') {
      try { opener.focus(); } catch (e) {}
    }
    opener = null;
  }

  /* ─── Sayfadaki giriş bağlantılarını yakala ────────────────────
     Bağlantıların href'ini değiştirmiyoruz; tıklama anında okuyoruz.
     Böylece index.html'in gateLinks() fonksiyonu çalışma anında
     href'leri yeniden yazsa bile (data-gated linkler) yakalanırlar. */
  /* YAKALAMA (capture) fazında dinliyoruz. Sayfadaki bazı düğmeler kendi
     işleyicilerinde e.stopPropagation() çağırıyor (ör. index.html'deki rol
     kartı butonları); kabarma fazında dinleseydik o tıklamalar document'a
     hiç ulaşmaz ve modal yerine sayfa değişirdi. Capture hedeften ÖNCE
     çalıştığı için stopPropagation bunu engelleyemez. */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;  // yeni sekmede aç: karışma

    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    if (a.target && a.target !== '' && a.target !== '_self') return;

    var href = a.getAttribute('href') || '';
    if (href.indexOf('index.html?auth=') !== 0) return;

    /* Supabase yüklenemediyse modal işe yaramaz — bağlantı normal
       çalışsın, kullanıcı en azından bir yere gitsin. */
    if (!sbReady()) return;

    e.preventDefault();
    /* components.js aynı tıklamada niyeti sessionStorage'a yazdı (query
       düşüren sunucular için). Burada navigasyon olmadığı için o bayrağı
       tüketiyoruz — yoksa sonraki sayfa yüklemesinde modal kendiliğinden
       açılırdı. */
    if (window.KB && KB.takeAuthRequest) KB.takeAuthRequest();

    var qs = new URLSearchParams(href.split('?')[1] || '');
    rolNiyetiniSakla(qs.get('rol'));
    open({
      mode: qs.get('auth') === 'register' ? 'register' : 'login',
      next: qs.get('next'),
      opener: a
    });
  }, true);

  /* Rol kartlarından gelen ?rol= seçimini saklar.
     Rol kayıt anında yazılamaz (profil e-posta doğrulanınca oluşur), o
     yüzden bayrak bırakılır; components.js ilk oturumda uygular.
     Bkz. components.js → applyPendingRole. */
  function rolNiyetiniSakla(rol) {
    if (['kurye', 'isletme', 'firma'].indexOf(rol) === -1) return;
    try { localStorage.setItem('kb_pending_rol', rol); } catch (e) {}
  }

  /* ─── Adresle açılış: index.html?auth=login|register ───────────
     Korumalı sayfalardan yönlendirilen kullanıcı buraya böyle gelir. */
  function openFromUrl() {
    var qs = new URLSearchParams(location.search);
    if (qs.get('code')) return;          // OAuth dönüşü: oturum akışına karışma
    rolNiyetiniSakla(qs.get('rol'));

    /* next değerini kalıcılaştır — nextParam okurken sessionStorage'a yazar */
    if (window.KB && KB.nextParam) KB.nextParam();

    /* Niyet iki kaynaktan gelebilir:
         1) adresteki ?auth=  — normal durum
         2) sessionStorage bayrağı — query'yi düşüren sunucularda yedek
       Bayrak her hâlükârda tüketilir (takeAuthRequest okurken siler). */
    var flag = (window.KB && KB.takeAuthRequest) ? KB.takeAuthRequest() : null;
    var mode = qs.get('auth') || flag;
    if (!mode) return;

    /* Adresi temizle ki yenilemede modal kendiliğinden açılmasın */
    if (qs.get('auth')) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }

    open({ mode: mode === 'register' ? 'register' : 'login' });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openFromUrl);
  } else {
    openFromUrl();
  }

  window.KBAuthModal = { open: open, close: close, isOpen: isOpen };
}());
