/* ============================================================
   KuryemiBul — app.js
   Init, auth guard, role dispatch, layout helpers
   ============================================================ */
(function () {
  'use strict';

  /* ── SVG icon library ─────────────────────────────────────── */
  window.ICON = {
    map:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>',
    list:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    check:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    msg:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    user:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    bell:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    back:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevron:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    search:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    plus:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    star:      '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    send:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    shield:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    settings:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    logout:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    doc:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    pin:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    clock:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    users:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    flag:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
    chart:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    heart:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    help:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    eye:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeoff:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
    home:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    crown:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M4 20L2 8l6 4 4-6 4 6 6-4-2 12"/></svg>',
    menu:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    x:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    camera:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    id:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    ref:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    filter:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>'
  };

  /* ── State ─────────────────────────────────────────────── */
  window.APP = {
    user    : null,
    profile : null,
    role    : null   /* kurye | firma | isletme | admin */
  };

  /* ── DOM refs ─────────────────────────────────────────── */
  var $splash  = document.getElementById('splash');
  var $layout  = document.getElementById('kb-layout');
  var $appbar  = document.getElementById('kb-appbar');
  var $screen  = document.getElementById('kb-screen');
  var $bottomnav = document.getElementById('kb-bottomnav');

  /* ── Helpers ──────────────────────────────────────────── */
  window.renderScreen = function (html) {
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
      '<div class="kb-appbar__title">' + (title || '') + '</div>' +
      (rightHtml || '');
  };

  /* Dashboard greeting bar — greeting left, bell+hamburger right */
  window.showDashboardBar = function () {
    var profile = APP.profile || {};
    var name = profile.ad || 'Kullanıcı';
    var firstName = name.split(' ')[0];
    $appbar.className = 'kb-appbar kb-appbar--dash';
    $appbar.style.display = '';
    $appbar.innerHTML =
      '<button class="dash-icon-btn" onclick="toggleDrawer()">' +
        ICON.menu +
      '</button>' +
      '<div class="kb-appbar__greet">' +
        '<div class="kb-appbar__greet-name">Merhaba, ' + firstName + ' 👋</div>' +
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
    var name = profile.ad || 'Kullanıcı';
    var roleLabels = { kurye: 'Kurye', firma: 'Firma', isletme: 'Esnaf / İşletme', admin: 'Admin' };
    var roleLabel = roleLabels[role] || role;
    var profilRoute = '/' + role + '/profil';

    var quickLinks = role === 'kurye' ? [
      { icon: 'check',   label: 'Başvurularım',     route: '/kurye/basvurular' },
      { icon: 'heart',   label: 'Favori İlanlarım', route: '/favoriler'         },
      { icon: 'map',     label: 'Yakın İlanlar',    route: '/kurye/harita'     },
      { icon: 'bell',    label: 'Bildirimler',       route: '/bildirimler'      }
    ] : role === 'firma' ? [
      { icon: 'list',    label: 'İlanlarım',         route: '/firma/ilanlarim'  },
      { icon: 'check',   label: 'Başvurular',        route: '/firma/basvurular' },
      { icon: 'heart',   label: 'Kaydedilenler',     route: '/favoriler'         },
      { icon: 'bell',    label: 'Bildirimler',       route: '/bildirimler'      }
    ] : [
      { icon: 'list',    label: 'İlanlarım',         route: '/isletme/basvurular' },
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
          '<div class="kb-drawer__name">' + name + '</div>' +
          '<div class="kb-drawer__rating">' + ICON.star + '&nbsp;4.8 puan</div>' +
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
    if (overlay) overlay.style.display = isOpen ? '' : 'none';
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
  var NAV_ADMIN = [
    { key: 'panel',         label: 'Komuta',      icon: 'crown',  route: '/admin/panel'         },
    { key: 'kullanicilar',  label: 'Kullanıcılar', icon: 'users', route: '/admin/kullanicilar'  },
    { key: 'ilanlar',       label: 'İlanlar',      icon: 'list',  route: '/admin/ilanlar'       },
    { key: 'raporlar',      label: 'Raporlar',     icon: 'chart', route: '/admin/raporlar'      },
    { key: 'ayarlar',       label: 'Ayarlar',      icon: 'settings', route: '/admin/ayarlar'    }
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
    var map = { kurye: NAV_KURYE, firma: NAV_FIRMA, isletme: NAV_ISLETME, admin: NAV_ADMIN };
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

      var profile = await SB.myProfile();
      APP.profile = profile;
      APP.role    = (profile && profile.role) || 'kurye';

      document.body.setAttribute('data-role', APP.role);
      renderNav(APP.role);

      hideSplash();

      var dest = '/' + APP.role + '/panel';
      Router.go(dest);

    } catch (e) {
      console.warn('[App] boot error:', e);
      hideSplash();
      Router.go('/login');
    }
  }

  function hideSplash() {
    $splash.style.display = 'none';
    showLayout();
  }

  /* ── Route guard for admin routes ─────────────────────── */
  window.requireAdmin = function () {
    if (APP.role !== 'admin') {
      Router.go('/' + (APP.role || 'kurye') + '/panel');
      return false;
    }
    return true;
  };

  /* ── Sign out ─────────────────────────────────────────── */
  window.signOut = async function () {
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

    /* Firma */
    Router.define('/firma/panel',       FirmaScreens.panel);
    Router.define('/firma/harita',      FirmaScreens.harita);
    Router.define('/firma/ilanlarim',         FirmaScreens.ilanlarim);
    Router.define('/firma/ilan/yeni',         FirmaScreens.ilanYeni);
    Router.define('/firma/ilan/:id/duzenle',  FirmaScreens.ilanDuzenle);
    Router.define('/firma/basvurular',        FirmaScreens.basvurular);
    Router.define('/firma/aday/:id',    FirmaScreens.adayDetay);
    Router.define('/firma/mesajlar',    FirmaScreens.mesajlar);
    Router.define('/firma/mesaj/:id',   FirmaScreens.mesajChat);
    Router.define('/firma/profil',      FirmaScreens.profil);

    /* İşletme */
    Router.define('/isletme/panel',             IsletmeScreens.panel);
    Router.define('/isletme/harita',            IsletmeScreens.harita);
    Router.define('/isletme/ilanlarim',         IsletmeScreens.ilanlarim);
    Router.define('/isletme/ilan/yeni',         IsletmeScreens.ilanYeni);
    Router.define('/isletme/ilan/:id/duzenle',  IsletmeScreens.ilanDuzenle);
    Router.define('/isletme/basvurular',  IsletmeScreens.basvurular);
    Router.define('/isletme/aday/:id',    IsletmeScreens.adayDetay);
    Router.define('/isletme/mesajlar',    IsletmeScreens.mesajlar);
    Router.define('/isletme/mesaj/:id',   IsletmeScreens.mesajChat);
    Router.define('/isletme/profil',      IsletmeScreens.profil);

    /* Shared */
    Router.define('/bildirimler',    SharedScreens.bildirimler);
    Router.define('/favoriler',      SharedScreens.favoriler);
    Router.define('/ayarlar',        SharedScreens.ayarlar);
    Router.define('/yardim',         SharedScreens.yardim);
    Router.define('/profil-duzenle', SharedScreens.profilDuzenle);
    Router.define('/sifre-sifirla', SharedScreens.sifreSifirla);
    Router.define('/verify-email',  SharedScreens.verifyEmail);

    /* Admin */
    Router.define('/admin/panel',        AdminScreens.panel);
    Router.define('/admin/kullanicilar', AdminScreens.kullanicilar);
    Router.define('/admin/ilanlar',      AdminScreens.ilanlar);
    Router.define('/admin/raporlar',     AdminScreens.raporlar);
    Router.define('/admin/sikayetler',   AdminScreens.sikayetler);
    Router.define('/admin/ayarlar',      AdminScreens.ayarlar);
  }

  /* ── DOMContentLoaded ─────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    window.renderNav = renderNav; /* demo mode için expose */
    registerRoutes();
    boot();
  });

})();
