/* ============================================================
   KuryemiBul — app.js
   Init, auth guard, role dispatch, layout helpers
   ============================================================ */
(function () {
  'use strict';

  /* ── SVG icon library ─────────────────────────────────────── */
  window.ICON = {
    map:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
    list:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    check:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    msg:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    user:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    bell:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    back:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevron:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    search:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    plus:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    star:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    send:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    shield:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    settings:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    logout:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    doc:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    pin:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    briefcase: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    users:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    flag:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    chart:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    heart:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    help:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    eye:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeoff:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    home:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    menu:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    x:         '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    camera:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    id:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    ref:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    filter:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>'
  };

  /* ── State ─────────────────────────────────────────────── */
  window.APP = {
    user    : null,
    profile : null,
    role    : null   /* kurye | firma | isletme */
  };

  /* ── DOM refs ─────────────────────────────────────────── */
  var $splash  = document.getElementById('splash');
  var $layout  = document.getElementById('kb-layout');
  var $appbar  = document.getElementById('kb-appbar');
  var $screen  = document.getElementById('kb-screen');
  var $bottomnav = document.getElementById('kb-bottomnav');

  /* ── Helpers ──────────────────────────────────────────── */
  /* Ekran degisiminde ACIK KALMIS ust katmanlari temizle.
     BULUNAN HATA: modal ve drawer document.body'ye ekleniyor, renderScreen ise
     yalniz #kb-screen icerigini degistiriyordu. Basvuru modali veya menu acikken
     ALT MENUDEN baska bir sayfaya gecince katman body'de asili kaliyor; tam ekran
     kaplayici (position:fixed; inset:0) butun dokunuslari yutuyor ve uygulama
     KAYDIRILAMAZ hale geliyordu. Uygulamayi tamamen kapatip acmak temizledigi
     icin "kapatinca duzeliyor, bir sure sonra tekrar donuyor" seklinde
     goruluyordu. Geri tusu icin closeTopLayer() ile cozulmustu, ama programatik
     gezinme (Router.go / alt menu) o yoldan gecmiyor.
     kb-call-overlay BILEREK haric: aktif gorusme ekran degisince kapanmamali. */
  window.closeAllLayers = function () {
    ['apply-overlay', 'apply-success-overlay'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    var drawer = document.getElementById('kb-drawer');
    if (drawer && drawer.classList.contains('open') && window.closeDrawer) window.closeDrawer();
  };

  window.renderScreen = function (html) {
    /* Ekran degisiminde acik haritayi YIK.
       innerHTML'i degistirmek MapLibre nesnesini oldurmez: WebGL baglami,
       render dongusu ve worker'lari yasamaya devam eder. Olculdu — 14
       harita ziyaretinde 20 baglam olusup 12'si tarayici tarafindan zorla
       kaybettirildi. Ayrinti: screens/shared.js -> destroyPremiumMap. */
    if (window.destroyPremiumMap) window.destroyPremiumMap();

    /* Acik kalmis modal/menu katmanlarini da temizle — yoksa dokunuslari yutar. */
    window.closeAllLayers();

    /* Sohbet ekrani #kb-screen e kb-screen--chat ekler; o sinif CSS de
       overflow:hidden !important demek, yani uygulamanin TEK kaydirma kabini
       kapatir. Sinif 130 ms gecikmeli ekleniyor ve temizligi tek seferlik bir
       hashchange dinleyicisine bagliydi: sohbete girip 130 ms dolmadan baska
       sayfaya gecilirse dinleyici bosa tetiklenip tukeniyor, ardindan bekleyen
       zamanlayici sinifi YENI ekrana ekliyordu. Sonuc: hicbir sayfa kaydirilamiyor,
       yalnizca uygulamayi tamamen kapatip acmak duzeltiyordu.
       Her ekran degisiminde sifirla; ihtiyaci olan ekran kendisi geri ekler. */
    $screen.classList.remove('kb-screen--chat');
    /* Harita ekrani ayni isi SATIR ICI stille yapiyordu ve geri almiyordu;
       o da her ekrani kaydirilamaz birakiyordu. Ikisini de sifirla. */
    $screen.style.overflow = '';

    $screen.classList.add('fading');
    setTimeout(function () {
      $screen.innerHTML = html;
      $screen.scrollTop = 0;
      $screen.classList.remove('fading');
    }, 120);
  };

  window.showAppBar = function (title, showBack, rightHtml) {
    $appbar.className = 'kb-appbar'; /* reset dash variant */
    $appbar.style.display = '';
    $appbar.innerHTML =
      (showBack
        ? '<button class="kb-appbar__back" onclick="Router.back()">' + ICON.back + '</button>'
        : '') +
      /* Başlık kaçırılır: çağıranların çoğu sabit metin geçiyor ama aday
         detayı ekranı adayın ADINI geçiyor (firma.js/isletme.js →
         showAppBar(name, true)). Kaynakta kaçırmak tüm çağıranları kapsar.
         rightHtml bilerek kaçırılmıyor — o zaten HTML parçası. */
      '<div class="kb-appbar__title">' + esc(title || '') + '</div>' +
      (rightHtml || '');
  };

  /* Dashboard greeting bar — greeting left, bell+hamburger right */
  window.showDashboardBar = function () {
    var profile = APP.profile || {};
    // profiles tablosundaki alan `ad`. Burada eskiden full_name /
    // company_name / business_name okunuyordu — bu üç kolon şemada YOK,
    // dolayısıyla selamlama her kullanıcı için 'Kullanıcı'ya düşüyordu.
    var name = profile.ad || 'Kullanıcı';
    var firstName = name.split(' ')[0];
    $appbar.className = 'kb-appbar kb-appbar--dash';
    $appbar.style.display = '';
    $appbar.innerHTML =
      '<button class="dash-icon-btn" onclick="toggleDrawer()">' +
        ICON.menu +
      '</button>' +
      '<div class="kb-appbar__greet">' +
        '<div class="kb-appbar__greet-name">Merhaba, ' + esc(firstName) + ' 👋</div>' +
        '<div class="kb-appbar__greet-sub">Bugün seni bekleyen fırsatları keşfet</div>' +
      '</div>' +
      '<div class="kb-appbar__actions">' +
        '<button class="dash-icon-btn" onclick="Router.go(\'/ayarlar\')">' +
          ICON.settings +
        '</button>' +
        '<button class="dash-icon-btn" onclick="Router.go(\'/bildirimler\')">' +
          ICON.bell +
          '<span class="dash-icon-btn__dot"></span>' +
        '</button>' +
      '</div>';
  };

  window.hideAppBar = function () {
    $appbar.style.display = 'none';
    $appbar.innerHTML = '';
  };

  window.showLayout = function () {
    $layout.style.display = '';
  };

  window.hideLayout = function () {
    $layout.style.display = 'none';
  };

  window.showBottomNav = function () {
    $bottomnav.style.display = '';
  };

  window.hideBottomNav = function () {
    $bottomnav.style.display = 'none';
  };

  window.setActiveNav = function (key) {
    var items = $bottomnav.querySelectorAll('.kb-bottomnav__item');
    items.forEach(function (el) {
      el.classList.toggle('active', el.dataset.nav === key);
    });
  };

  window.toast = function (msg, dur) {
    var el = document.createElement('div');
    el.className = 'kb-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, dur || 2500);
  };

  /* ── Drawer system ────────────────────────────────────── */
  function _buildDrawer() {
    var role = APP.role || 'kurye';
    var profile = APP.profile || {};
    var name = profile.ad || 'Kullanıcı';   // şemadaki alan `ad` (bkz. showDashboardBar)
    var roleLabels = { kurye: 'Kurye', firma: 'Kurye Firması', isletme: 'Esnaf' };
    var roleLabel = roleLabels[role] || role;
    var profilRoute = '/' + role + '/profil';

    var quickLinks = role === 'kurye' ? [
      { icon: 'check',   label: 'Başvurularım',     route: '/kurye/basvurular' },
      { icon: 'heart',   label: 'Favori İlanlarım', route: '/favoriler'         },
      { icon: 'map',     label: 'Yakın İlanlar',    route: '/kurye/harita'     },
      { icon: 'bell',    label: 'Bildirimler',       route: '/bildirimler'      }
    ] : role === 'firma' ? [
      { icon: 'list',    label: 'İlanlarım',         route: '/firma/ilanlarim'  },
      { icon: 'search',  label: 'Tüm İlanlar',       route: '/ilanlar-tumu'     },
      { icon: 'check',   label: 'Başvurular',        route: '/firma/basvurular' },
      { icon: 'heart',   label: 'Kaydedilenler',     route: '/favoriler'         },
      { icon: 'bell',    label: 'Bildirimler',       route: '/bildirimler'      }
    ] : [
      { icon: 'list',    label: 'İlanlarım',         route: '/isletme/ilanlarim' },
      { icon: 'search',  label: 'Tüm İlanlar',       route: '/ilanlar-tumu'      },
      { icon: 'check',   label: 'Başvurular',        route: '/isletme/basvurular' },
      { icon: 'heart',   label: 'Kaydedilenler',     route: '/favoriler'           },
      { icon: 'map',     label: 'Yakın Kuryeler',    route: '/isletme/harita'     },
      { icon: 'bell',    label: 'Bildirimler',       route: '/bildirimler'        }
    ];

    function item(icon, label, route) {
      return '<div class="kb-drawer__item" onclick="closeDrawer();Router.go(\'' + route + '\')">' +
        '<div class="kb-drawer__item__icon">' + ICON[icon] + '</div>' +
        '<span class="kb-drawer__item__label">' + label + '</span>' +
        ICON.chevron +
      '</div>';
    }

    return (
      '<div class="kb-drawer__head">' +
        '<div class="kb-drawer__profile">' +
          '<div class="kb-avatar kb-avatar--lg" style="background:var(--c-accent)">' + initials(name) + '</div>' +
          '<div class="kb-drawer__name">' + esc(name) + '</div>' +
          /* Puan GERÇEK profilden. Burada sabit "4.8 puan" yazıyordu:
             hiç değerlendirilmemiş bir hesap bile menüsünde 4.8 görüyordu.
             Değerlendirme yoksa rozet hiç basılmaz — uydurma sayı yerine
             yokluk gösterilir (CLAUDE.md: mock veri yok). */
          (Number(profile.degerlendirme) > 0
            ? '<div class="kb-drawer__rating">' + ICON.star + '&nbsp;' +
                esc(Number(profile.puan).toFixed(1)) + ' puan · ' +
                esc(profile.degerlendirme) + ' değerlendirme</div>'
            : '<div class="kb-drawer__rating">' + ICON.star + '&nbsp;Henüz değerlendirme yok</div>') +
          '<div class="kb-drawer__role-badge">' + roleLabel + '</div>' +
        '</div>' +
        '<button class="kb-drawer__view-btn" onclick="closeDrawer();Router.go(\'' + profilRoute + '\')">Profili Görüntüle →</button>' +
      '</div>' +
      '<div class="kb-drawer__body">' +
        '<div class="kb-drawer__section">' +
          '<div class="kb-drawer__section-title">Hızlı Erişim</div>' +
          quickLinks.map(function (l) { return item(l.icon, l.label, l.route); }).join('') +
        '</div>' +
        '<div class="kb-drawer__section" style="margin-top:8px">' +
          '<div class="kb-drawer__section-title">Hesabım</div>' +
          item('user',    'Profil Düzenle',    profilRoute) +
          item('camera',  'Profil Fotoğrafı',  profilRoute) +
          item('id',      'Kimlik Bilgilerim', profilRoute) +
          item('ref',     'Referanslarım',     profilRoute) +
          item('settings','Ayarlar',           '/ayarlar')  +
        '</div>' +
        '<div class="kb-drawer__section" style="margin-top:8px">' +
          '<div class="kb-drawer__section-title">Destek</div>' +
          item('help', 'Yardım Merkezi',         '/yardim') +
          item('help', 'Sık Sorulan Sorular',    '/yardim') +
          item('msg',  'Bize Ulaşın',            '/yardim') +
          item('doc',  'Gizlilik Politikası',    '/ayarlar') +
          item('doc',  'Kullanım Şartları',      '/ayarlar') +
        '</div>' +
      '</div>' +
      '<div class="kb-drawer__footer">' +
        '<button class="btn btn--danger btn--sm w-full" onclick="closeDrawer();signOut()">' + ICON.logout + '&nbsp;Çıkış Yap</button>' +
      '</div>'
    );
  }

  window.toggleDrawer = function () {
    var drawer = document.getElementById('kb-drawer');
    if (!drawer) {
      var ov = document.createElement('div');
      ov.id = 'kb-drawer-overlay';
      ov.className = 'kb-drawer-overlay';
      ov.style.display = 'none';
      ov.onclick = closeDrawer;
      var dr = document.createElement('div');
      dr.id = 'kb-drawer';
      dr.className = 'kb-drawer';
      dr.innerHTML = _buildDrawer();
      document.body.appendChild(ov);
      document.body.appendChild(dr);
      drawer = dr;
    }
    var overlay = document.getElementById('kb-drawer-overlay');
    var isOpen = drawer.classList.toggle('open');
    /* İçerik her AÇILIŞTA yeniden kurulur. Menü eskiden yalnız ilk kez
       kurulup önbellekte kalıyordu; artık başlıkta gerçek puan/değerlendirme
       sayısı olduğu için bayat veri göstermesi kabul edilemez (kullanıcı
       profilini düzenleyip menüyü açtığında eski adını görürdü). */
    if (isOpen) drawer.innerHTML = _buildDrawer();
    if (overlay) overlay.style.display = isOpen ? '' : 'none';
  };

  /* Açık olan üst katman var mı? (geri tuşu önce onu kapatmalı)
     Sırayla en üstteki kapatılır: modal → drawer. */
  window.closeTopLayer = function () {
    var ov = document.getElementById('apply-success-overlay') ||
             document.getElementById('apply-overlay');
    if (ov) { ov.remove(); return true; }
    var drawer = document.getElementById('kb-drawer');
    if (drawer && drawer.classList.contains('open')) { closeDrawer(); return true; }
    /* CV sihirbazi tek route'tur (/kurye/cv), adim ekranin icinde tutulur.
       Kanca olmadan geri tusu 4. adimdayken sihirbazdan TAMAMEN cikardi.
       Modal ve drawer'dan SONRA gelir: sihirbaz uzerinde acik bir katman
       varsa once o kapanmali. Sihirbaz ekranda degilse false doner. */
    if (window.CvScreens && CvScreens.geriAdim && CvScreens.geriAdim()) return true;
    return false;
  };

  window.closeDrawer = function () {
    var drawer = document.getElementById('kb-drawer');
    var overlay = document.getElementById('kb-drawer-overlay');
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.style.display = 'none';
  };

  window.initials = function (name) {
    if (!name) return '?';
    var parts = String(name).trim().split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  };

  /* ── Bottom Nav renderers ─────────────────────────────── */
  var NAV_KURYE = [
    { key: 'panel',    label: 'Ana Sayfa', icon: 'home',  route: '/kurye/panel'   },
    { key: 'harita',   label: 'Harita',    icon: 'map',   route: '/kurye/harita'  },
    { key: 'ilanlar',  label: 'İlanlar',   icon: 'list',  route: '/kurye/ilanlar' },
    { key: 'mesajlar', label: 'Mesajlar',  icon: 'msg',   route: '/kurye/mesajlar'},
    { key: 'profil',   label: 'Profil',    icon: 'user',  route: '/kurye/profil'  }
  ];
  var NAV_FIRMA = [
    { key: 'panel',      label: 'Ana Sayfa', icon: 'home',  route: '/firma/panel'     },
    { key: 'harita',     label: 'Harita',    icon: 'map',   route: '/firma/harita'    },
    { key: 'ilanlarim',  label: 'İlanlarım', icon: 'list',  route: '/firma/ilanlarim' },
    { key: 'mesajlar',   label: 'Mesajlar',  icon: 'msg',   route: '/firma/mesajlar'  },
    { key: 'profil',     label: 'Profil',    icon: 'user',  route: '/firma/profil'    }
  ];
  var NAV_ISLETME = [
    { key: 'panel',    label: 'Ana Sayfa',    icon: 'home',  route: '/isletme/panel'    },
    { key: 'harita',   label: 'Harita',       icon: 'map',   route: '/isletme/harita'   },
    { key: 'yeni',     label: 'İlan Oluştur', icon: 'plus',  route: '/isletme/ilan/yeni'},
    { key: 'mesajlar', label: 'Mesajlar',     icon: 'msg',   route: '/isletme/mesajlar' },
    { key: 'profil',   label: 'Profil',       icon: 'user',  route: '/isletme/profil'   }
  ];

  function buildNav(items) {
    return items.map(function (item) {
      return '<button class="kb-bottomnav__item" data-nav="' + item.key + '" ' +
        'onclick="Router.go(\'' + item.route + '\')">' +
        ICON[item.icon] +
        '<span>' + item.label + '</span>' +
        '</button>';
    }).join('');
  }

  function renderNav(role) {
    var map = { kurye: NAV_KURYE, firma: NAV_FIRMA, isletme: NAV_ISLETME };
    $bottomnav.innerHTML = buildNav(map[role] || NAV_KURYE);
    showBottomNav();
  }

  /* ── Auth guard + init ───────────────────────────────── */
  async function boot() {
    try {
      var user = await SB.getUser();
      if (!user) {
        hideSplash();
        Router.go('/login');
        return;
      }
      APP.user = user;

      /* Profil okunamazsa ROLU TAHMIN ETME. Eskiden hata sessizce yutulup
         'kurye' varsayiliyordu: isletme/firma kullanicisi yanlis panele dusuyor,
         adi bos goruluyordu. Oturum gecerli oldugu icin /login'e de atmiyoruz —
         o da "cikis yapmis" gibi gorunurdu. Bilgilendir + tekrar deneme sun. */
      var profile;
      try {
        profile = await SB.myProfile();
      } catch (e) {
        console.warn('[App] profil okunamadi:', e);
        hideSplash();
        showBootError();
        return;
      }
      APP.profile = profile;
      APP.role    = (profile && profile.role) || 'kurye';

      document.body.setAttribute('data-role', APP.role);
      renderNav(APP.role);

      hideSplash();

      startPresence();          // oturum açık → çevrimiçi işaretle

      var dest = '/' + APP.role + '/panel';
      Router.go(dest);

    } catch (e) {
      console.warn('[App] boot error:', e);
      hideSplash();
      Router.go('/login');
    }
  }

  /* ── PRESENCE — gerçek çevrimiçi durumu ────────────────
     Giriş yapılınca ve uygulama önplandayken heartbeat atılır.
     Çıkış, arka plana alma ve kapanışta offline'a düşülür.
     Sunucuda 2 dk heartbeat gelmezse otomatik offline sayılır. */
  /* Oturum var ama profil cekilemedi (ag yok / token yenilenemedi).
     Kullaniciyi cikis yapmis gibi gostermeden tekrar deneme sunar.
     UYARI: bu dosya UTF-8; buraya emoji YAZMA, HTML entity kullan. */
  function showBootError() {
    hideBottomNav();
    $screen.innerHTML =
      '<div class="kb-empty" style="padding:48px 24px;text-align:center">' +
        '<div style="font-size:44px;margin-bottom:12px">&#9888;</div>' +
        '<div style="font-weight:700;margin-bottom:8px">Profil bilgileri al&#305;namad&#305;</div>' +
        '<div style="opacity:.7;margin-bottom:20px">&#304;nternet ba&#287;lant&#305;n&#305;z&#305; kontrol edip tekrar deneyin. Oturumunuz a&#231;&#305;k kald&#305;.</div>' +
        '<button class="btn btn--primary" onclick="location.reload()">Tekrar dene</button>' +
      '</div>';
  }

  var _hb = null;
  function startPresence() {
    if (!window.SB || !SB.isOn() || !SB.presencePing) return;
    stopPresence();
    SB.presencePing();
    _hb = setInterval(function () {
      if (document.hidden) return;          // arka planda pil/veri harcama
      SB.presencePing();
    }, 45000);
  }
  function stopPresence() {
    if (_hb) { clearInterval(_hb); _hb = null; }
  }
  async function goOffline() {
    stopPresence();
    if (window.SB && SB.isOn() && SB.presenceOffline) {
      try { await SB.presenceOffline(); } catch (e) {}
    }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { goOffline(); }
    else if (APP.user) { startPresence(); }
  });
  window.addEventListener('pagehide', goOffline);
  window.KBPresenceApp = { start: startPresence, stop: goOffline };

  function hideSplash() {
    $splash.style.display = 'none';
    showLayout();
  }

  /* ── Sign out ─────────────────────────────────────────── */
  window.signOut = async function () {
    await goOffline();                       // önce çevrimdışı işaretle
    try { await SB.signOut(); } catch (e) {}
    APP.user = APP.profile = APP.role = null;
    document.body.removeAttribute('data-role');
    Router.go('/login');
  };

  /* ── Register all routes ─────────────────────────────── */
  function registerRoutes() {
    /* Auth */
    Router.define('/login',    LoginScreens.entry);
    Router.define('/register', LoginScreens.register);

    /* Kurye */
    Router.define('/kurye/panel',       KuryeScreens.panel);
    Router.define('/kurye/harita',      KuryeScreens.harita);
    Router.define('/kurye/ilanlar',     KuryeScreens.ilanlar);
    Router.define('/kurye/ilan/:id',    KuryeScreens.ilanDetay);
    Router.define('/kurye/basvurular',  KuryeScreens.basvurular);
    Router.define('/kurye/mesajlar',    KuryeScreens.mesajlar);
    Router.define('/kurye/mesaj/:id',   KuryeScreens.mesajChat);
    Router.define('/kurye/profil',      KuryeScreens.profil);
    Router.define('/kurye/cv',          CvScreens.sihirbaz);

    /* Kurye Firması */
    Router.define('/firma/panel',       FirmaScreens.panel);
    Router.define('/firma/harita',      FirmaScreens.harita);
    Router.define('/firma/ilanlarim',   FirmaScreens.ilanlarim);
    Router.define('/firma/ilan/yeni',   FirmaScreens.ilanYeni);
    Router.define('/firma/ilan/duzenle/:id', FirmaScreens.ilanYeni);
    Router.define('/firma/basvurular',  FirmaScreens.basvurular);
    Router.define('/firma/aday/:id',    FirmaScreens.adayDetay);
    Router.define('/firma/mesajlar',    FirmaScreens.mesajlar);
    Router.define('/firma/mesaj/:id',   FirmaScreens.mesajChat);
    Router.define('/firma/profil',      FirmaScreens.profil);
    Router.define('/firma/calisanlar',  FirmaScreens.calisanlar);
    Router.define('/firma/bilgiler',    FirmaScreens.bilgiler);
    Router.define('/firma/puanlamalar', FirmaScreens.puanlamalar);

    /* Esnaf */
    Router.define('/isletme/panel',       IsletmeScreens.panel);
    Router.define('/isletme/harita',      IsletmeScreens.harita);
    Router.define('/isletme/ilanlarim',   IsletmeScreens.ilanlarim);
    Router.define('/isletme/ilan/yeni',   IsletmeScreens.ilanYeni);
    Router.define('/isletme/ilan/duzenle/:id', IsletmeScreens.ilanYeni);
    Router.define('/isletme/basvurular',  IsletmeScreens.basvurular);
    Router.define('/isletme/aday/:id',    IsletmeScreens.adayDetay);
    Router.define('/isletme/mesajlar',    IsletmeScreens.mesajlar);
    Router.define('/isletme/mesaj/:id',   IsletmeScreens.mesajChat);
    Router.define('/isletme/profil',      IsletmeScreens.profil);

    /* Shared */
    /* İşveren profili — üç rol de görüntüleyebilir.
       Mobilde bu ekran HİÇ YOKTU: haritada Esnaf/Firma işaretçisine
       dokunan kullanıcı adından başka bir şey göremiyordu. */
    Router.define('/isveren/:id',    SharedScreens.isverenProfil);

    /* Kurye profili — haritadaki kurye isaretcisi buraya gelir.
       Eskiden /firma/aday/:id ve /isletme/aday/:id kullaniliyordu; o ekran
       BASVURU id'si bekliyor, harita ise PROFIL id'si yolluyordu -> ekran
       'Aday bulunamadi' deyip geri firlatiyordu. */
    Router.define('/aday/:id',       SharedScreens.kuryeProfil);

    /* Tum acik ilanlar — firma/esnaf mobilde yalniz KENDI ilanlarini
       gorebiliyordu; sitede (ilanlar.html) tum ilanlar listeleniyor. */
    Router.define('/ilanlar-tumu',   SharedScreens.tumIlanlar);
    Router.define('/ilan/:id',       SharedScreens.ilanDetayGenel);

    Router.define('/bildirimler',    SharedScreens.bildirimler);
    Router.define('/favoriler',      SharedScreens.favoriler);
    Router.define('/ayarlar',        SharedScreens.ayarlar);
    Router.define('/yardim',         SharedScreens.yardim);
    Router.define('/profil-duzenle', SharedScreens.profilDuzenle);
    Router.define('/sifre-sifirla', SharedScreens.sifreSifirla);
    Router.define('/sifre-degistir', SharedScreens.sifreDegistir);
    Router.define('/bildirim-ayarlari', SharedScreens.bildirimAyarlari);
    Router.define('/verify-email',  SharedScreens.verifyEmail);

    /* Yönetim arayüzü uygulamada YOKTUR — Supabase Studio üzerinden yapılır.
       Eski sürümlerde /admin/* route'ları vardı; bir kısayol, bildirim ya da
       tarayıcı geçmişi hâlâ oraya işaret edebilir. Aşağıdaki yedek, bilinmeyen
       her adresi kullanıcının kendi paneline yollar (oturum yoksa girişe). */
    Router.setFallback(function () {
      return APP.role ? '/' + APP.role + '/panel' : '/login';
    });
  }

  /* ── Native push notifications (Capacitor) ───────────────── */
  function initNativePush() {
    try {
      if (!window.Capacitor || !Capacitor.isNativePlatform()) return;
      var PushNotifications = Capacitor.Plugins.PushNotifications;
      if (!PushNotifications) return;

      PushNotifications.requestPermissions().then(function (result) {
        if (result.receive !== 'granted') return;
        PushNotifications.register();
      }).catch(function () {});

      PushNotifications.addListener('registration', function (token) {
        if (!token || !token.value) return;
        if (window.SB && SB.isOn()) {
          SB.getUser().then(function (u) {
            if (!u) return;
            return SB.savePushToken(token.value);
          }).catch(function () {});
        }
      });

      PushNotifications.addListener('pushNotificationReceived', function (notif) {
        var title = (notif.title || 'KuryemiBul');
        var body  = (notif.body  || '');
        toast(title + (body ? ' — ' + body : ''), 4000);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', function (action) {
        var data = action.notification && action.notification.data;
        if (data && data.route) Router.go(data.route);
      });
    } catch (e) {
      /* Firebase henüz yapılandırılmamış — sessizce geç */
    }
  }

  /* ── Bildirim Ayarları ekranından çağrılır ────────────────── */
  function _timeout(ms) {
    return new Promise(function (resolve) { setTimeout(function () { resolve('unsupported'); }, ms); });
  }
  window.KBPushStatus = async function () {
    if (!window.Capacitor || !Capacitor.isNativePlatform()) return 'unsupported';
    var P = Capacitor.Plugins.PushNotifications;
    if (!P) return 'unsupported';
    try {
      var r = await Promise.race([P.checkPermissions(), _timeout(4000).then(function () { return { receive: 'unsupported' }; })]);
      return r.receive;
    } catch (e) { return 'unsupported'; }
  };
  window.KBRequestPush = async function () {
    var P = window.Capacitor && Capacitor.isNativePlatform() && Capacitor.Plugins.PushNotifications;
    if (!P) return 'unsupported';
    var r = await P.requestPermissions();
    if (r.receive === 'granted') P.register();
    return r.receive;
  };

  /* ── DOMContentLoaded ─────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    window.renderNav = renderNav;
    registerRoutes();
    boot().then(function () { initNativePush(); });
  });

})();
