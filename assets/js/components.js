/* ================================================================
   KuryemiBul — components.js
   Paylaşılan KB global nesnesi: helper'lar, auth state,
   header/sidebar/nav render.
   i18n.js bu dosyadan ÖNCE yüklenmelidir.
   ================================================================ */
(function () {
  'use strict';

  var T = (window.KBI18N && window.KBI18N.t) || function (k) { return k; };
  function lang() { return window.KBI18N ? window.KBI18N.lang : 'tr'; }

  var WA_NUMBER  = '905455960360';
  var TEL_DISPLAY = '0545 596 0360';
  var EMAIL       = 'kadiryar571@gmail.com';

  /* ─── SESSION & STATE ──────────────────────────────────────── */
  var SESSION = { user: null, profile: null };

  var _stateListeners = [];
  var STATE = {
    auth:    { status: 'guest' },
    user:    null,
    role:    'guest',
    context: { route: '', prevRoute: '' },
    prefs:   { lang: 'tr', theme: 'light' }
  };
  function setState(patch) {
    Object.assign(STATE, patch);
    _stateListeners.forEach(function (cb) { try { cb(STATE); } catch (e) {} });
  }
  function onState(cb) { _stateListeners.push(cb); }

  /* ─── SESSION PROMISE ──────────────────────────────────────── */
  var _readyResolve;
  var _readyPromise = new Promise(function (res) { _readyResolve = res; });
  function resolveReady(sess) {
    SESSION.user = (sess && sess.user) || null;
    SESSION.profile = (sess && sess.profile) || null;
    if (SESSION.user) setState({ auth: { status: 'authed' }, user: SESSION.user, role: (SESSION.profile && SESSION.profile.role) || 'guest' });
    _readyResolve(SESSION);
  }
  function session() { return SESSION; }

  /* ─── THEME ────────────────────────────────────────────────── */
  function getTheme() {
    return localStorage.getItem('kb_theme') === 'dark' ? 'dark' : 'light';
  }
  function setTheme(theme) {
    var t = theme === 'dark' ? 'dark' : 'light';
    localStorage.setItem('kb_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    /* Sync tüm tema toggle butonlarını güncelle */
    document.querySelectorAll('.theme-toggle-btn').forEach(function (btn) {
      btn.textContent = t === 'dark' ? '☀️' : '🌙';
      btn.title = t === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';
    });
  }
  function toggleTheme() { setTheme(getTheme() === 'dark' ? 'light' : 'dark'); }

  /* ─── ROLE / PANEL ─────────────────────────────────────────── */
  var ROLE_LABELS = { guest: 'Ziyaretçi', ziyaretci: 'Ziyaretçi', kurye: 'Kurye', isletme: 'Esnaf', firma: 'Kurye Firması', admin: 'Admin' };

  function getRole() {
    var p = SESSION.profile;
    if (p && p.role) return p.role;
    return localStorage.getItem('kb_rol') || 'guest';
  }
  function currentRole() { return getRole(); }

  function roleToPanel(role) {
    /* Yönetim Supabase Studio'dan yapılır; uygulama içi admin sayfası yoktur. */
    var map = { kurye: 'panel-kurye.html', isletme: 'panel-isletme.html', firma: 'panel-firma.html' };
    return map[role] || 'index.html?auth=login';
  }
  function panelHref() { return roleToPanel(getRole()); }

  /* ─── AUTH ─────────────────────────────────────────────────── */
  function isOnline() { return !!(window.SB && window.SB.isOn && window.SB.isOn()); }
  function isAuthed() {
    if (isOnline()) return !!(SESSION.user);
    return getRole() !== 'guest';
  }

  /* admin check */
  var _adminChecked = false;
  async function amIAdmin() {
    if (!isOnline() || !SESSION.user) return false;
    if (window._kbIsAdmin !== undefined) return window._kbIsAdmin;
    try {
      var res = await window.SB._sb.from('admins').select('user_id').eq('user_id', SESSION.user.id).maybeSingle();
      window._kbIsAdmin = !!(res && res.data);
    } catch (e) { window._kbIsAdmin = false; }
    return window._kbIsAdmin;
  }

  /* ─── HELPERS ──────────────────────────────────────────────── */
  /* Projedeki TEK kaçış (escape) kaynağı; diğer modüller buraya delege eder.
     ' (tek tırnak) de kaçırılır — eskiden atlanıyordu ve
     onclick="fn('...')" kalıbında attribute enjeksiyonuna açık kapı
     bırakıyordu. */
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    var i = parts[0][0] || '?';
    if (parts.length > 1) i += parts[parts.length - 1][0];
    return i.toUpperCase();
  }
  function getParam(key) {
    try { return new URLSearchParams(location.search).get(key); } catch (e) { return null; }
  }
  function findById(arr, id) {
    if (!arr) return null;
    var sid = String(id);
    return arr.find(function (x) { return String(x.id) === sid; }) || null;
  }
  function stars(val) {
    var n = Math.round(Number(val) || 0);
    var s = '';
    for (var i = 1; i <= 5; i++) s += (i <= n ? '★' : '☆');
    return '<span class="stars">' + s + '</span>';
  }
  function toast(msg, type) {
    if (window.KBMotion && KBMotion.showToast) { KBMotion.showToast(msg, type); return; }
    alert(msg);
  }

  /* ─── DRAFT (sessionStorage) ───────────────────────────────── */
  function bindDraft(form, key) {
    if (!form) return;
    var saved;
    try { saved = JSON.parse(sessionStorage.getItem('kb_draft:' + key)); } catch (e) {}
    if (saved) {
      [].forEach.call(form.elements, function (el) {
        if (el.name && saved[el.name] !== undefined) {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = saved[el.name];
          else el.value = saved[el.name];
        }
      });
    }
    form.addEventListener('input', function () {
      var data = {};
      [].forEach.call(form.elements, function (el) {
        if (el.name) data[el.name] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
      });
      sessionStorage.setItem('kb_draft:' + key, JSON.stringify(data));
    });
  }
  function clearDraft(key) { sessionStorage.removeItem('kb_draft:' + key); }

  /* ─── VIEW STATE (sessionStorage) ──────────────────────────── */
  function saveView(key, val) { try { sessionStorage.setItem('kb_view:' + key, JSON.stringify(val)); } catch (e) {} }
  function loadView(key) { try { return JSON.parse(sessionStorage.getItem('kb_view:' + key)); } catch (e) { return null; } }

  /* ─── TEKLİF (offline) ─────────────────────────────────────── */
  function getTeklifler() { try { return JSON.parse(localStorage.getItem('kb_teklifler')) || []; } catch (e) { return []; } }
  function addTeklif(t) { var arr = getTeklifler(); arr.push(t); localStorage.setItem('kb_teklifler', JSON.stringify(arr)); }

  /* ─── SIDEBAR SVG İKONLARI ─────────────────────────────────── */
  var SIC = {
    dashboard:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    couriers:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg>',
    businesses:   '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M9 9h1m5 0h1M9 13h1m5 0h1"/></svg>',
    firms:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M6 20V9l5-5 5 5v11"/><rect x="9" y="14" width="6" height="6"/></svg>',
    jobs:         '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    map:          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    pool:         '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    messages:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    applications: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    profile:      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    settings:     '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    admin:        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    hamburger:    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    search:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    bell:         '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    logout:       '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };

  /* ─── SAYFA TİPİ ───────────────────────────────────────────── */
  /* GEÇİCİ: 'giris.html' burada, çünkü dosya henüz silinmedi. Giriş artık
     index.html üzerinde modal olarak açılıyor ve hiçbir yerden giris.html'e
     link verilmiyor; dosya yalnız kaçış kapısı olarak duruyor (canlıda Google
     girişi doğrulanana kadar). Listede olmasa oturum kapısı onu "korumalı
     sayfa" sayıp ana sayfaya yönlendirirdi ve elle bile açılamazdı.
     giris.html silindiğinde BU SATIRDAN DA ÇIKARILACAK. */
  var AUTH_PAGES    = ['giris.html', 'verify-email.html', 'sifre-sifirla.html', 'onboarding.html', 'app-onboarding.html'];
  var LANDING_PAGES = ['index.html', '', '/'];
  /* Giriş GEREKTİRMEYEN herkese açık sayfalar.
     Yasal metinler burada olmak ZORUNDA: gizlilik.html Google Play Data Safety
     formunda herkese açık URL olarak verildi; giriş isterse o bağlantı kırılır.
     KVKK/şartlar/çerez sayfalarının da kimlik doğrulaması istemesi yanlış olur. */
  var PUBLIC_PAGES  = ['404.html', 'kvkk.html', 'gizlilik.html', 'sartlar.html',
                       'cerez.html', 'guvenlik.html'];

  /* Sayfa adını HER ZAMAN ".html" uzantılı döndür.
     serve.json'daki cleanUrls yerelde uzantıyı düşürüyor (/ilanlar.html → /ilanlar);
     normalize etmezsek AUTH_PAGES / PUBLIC_PAGES / LANDING_PAGES eşleşmez ve
     giriş sayfası bile "korumalı" sayılıp sonsuz yönlendirmeye girer. */
  function currentPage() {
    var path = location.pathname.split('/').pop() || 'index.html';
    if (!path) return 'index.html';
    if (path.indexOf('.') === -1) path += '.html';
    return path;
  }
  function isAuthPage()    { return AUTH_PAGES.indexOf(currentPage()) !== -1; }
  function isLandingPage() { return LANDING_PAGES.indexOf(currentPage()) !== -1; }
  function isPublicPage()  { return PUBLIC_PAGES.indexOf(currentPage()) !== -1; }

  /* ─── TOPBAR RENDER ────────────────────────────────────────── */
  function renderTopbar() {
    var el = document.getElementById('app-topbar');
    if (!el) return;

    var role = getRole();
    var profile = SESSION.profile;
    var name = (profile && profile.ad) || 'Hesabım';
    var initial = initials(name);
    var panelHr = roleToPanel(role);

    el.innerHTML =
      '<button class="topbar-ico-btn hamburger-btn" id="sidebar-toggle" aria-label="Menü">' + SIC.hamburger + '</button>' +
      '<a class="topbar-brand" href="' + panelHr + '">KuryemiBul</a>' +
      '<div class="topbar-search">' +
        '<span class="search-ico">' + SIC.search + '</span>' +
        '<input type="search" placeholder="Kurye, ilan, firma ara…" autocomplete="off">' +
      '</div>' +
      '<div class="topbar-spacer"></div>' +
      '<div class="topbar-actions">' +
        '<button class="theme-toggle-btn" id="topbarThemeToggle" title="' + (getTheme() === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç') + '">' + (getTheme() === 'dark' ? '☀️' : '🌙') + '</button>' +
        '<a class="topbar-ico-btn" href="bildirimler.html" title="Bildirimler" style="position:relative">' + SIC.bell + '<span id="kbNotifBadge" style="display:none;position:absolute;top:4px;right:4px;min-width:16px;height:16px;border-radius:99px;background:var(--error);color:#fff;font-size:0.65rem;font-weight:700;align-items:center;justify-content:center;padding:0 3px;pointer-events:none"></span></a>' +
        '<a class="topbar-ico-btn" href="mesajlar.html" title="Mesajlar">' + SIC.messages + '</a>' +
        '<a class="topbar-ico-btn" href="profil-' + (role !== 'guest' ? role : 'kurye') + '.html" title="' + esc(name) + '" style="width:auto;padding:0 8px;gap:6px;font-size:.85rem;font-weight:600;color:var(--text-2)">' +
          '<span style="width:30px;height:30px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem;flex-shrink:0">' + esc(initial) + '</span>' +
          '<span class="truncate topbar-profile-name" style="max-width:100px">' + esc(name) + '</span>' +
        '</a>' +
      '</div>';

    /* hamburger toggle */
    var toggleBtn = el.querySelector('#sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        var sb = document.getElementById('app-sidebar');
        var ov = document.getElementById('sidebar-overlay');
        if (sb) sb.classList.toggle('is-open');
        if (ov) ov.classList.toggle('is-open');
      });
    }

    /* Tema toggle */
    var themeBtn = el.querySelector('#topbarThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () { toggleTheme(); });
    }

    /* Bildirim rozeti — gerçek okunmamış sayısı (veritabanından) */
    if (window.KBNotif) {
      try { KBNotif.updateBadge(); } catch (e) {}
    }
  }

  /* ─── SIDEBAR RENDER ───────────────────────────────────────── */
  function buildNavItems(role, activePage) {
    var panel = roleToPanel(role);

    var items = [
      { href: panel, label: 'Dashboard', ic: SIC.dashboard },
      { href: 'kuryeler.html',  label: 'Kuryeler',  ic: SIC.couriers },
      { href: 'isletmeler.html', label: 'Esnaflar', ic: SIC.businesses },
      { href: 'firmalar.html',  label: 'Kurye Firmaları',  ic: SIC.firms },
      { href: 'ilanlar.html',   label: 'İlanlar',   ic: SIC.jobs },
      { href: 'harita.html',    label: 'Harita',    ic: SIC.map },
      { href: 'havuzum.html',   label: 'Havuzum',   ic: SIC.pool },
      { href: 'mesajlar.html',  label: 'Mesajlar',  ic: SIC.messages },
    ];

    /* Uygulama içi admin sayfası kaldırıldı — yönetim Supabase Studio'dan yapılır. */

    var footer = [
      { href: 'profil-' + (role !== 'guest' ? role : 'kurye') + '.html', label: 'Profilim', ic: SIC.profile },
      { href: 'ayarlar.html', label: 'Ayarlar', ic: SIC.settings },
    ];

    var active = activePage || currentPage();

    function li(item) {
      var isActive = active === item.href.split('?')[0];
      return '<a href="' + item.href + '" class="' + (isActive ? 'active' : '') + '">' +
        item.ic + '<span>' + esc(item.label) + '</span></a>';
    }

    return '<div class="sidebar-section-label">Ana Menü</div>' +
      items.map(li).join('') +
      '<div class="sidebar-divider"></div>' +
      '<div class="sidebar-section-label">Hesap</div>' +
      footer.map(li).join('') +
      '<div class="sidebar-divider"></div>' +
      '<button class="sidebar-logout-btn" id="sidebar-logout" style="display:flex;align-items:center;gap:10px;padding:9px 16px;color:var(--error);font-size:.9rem;font-weight:500;border:none;background:transparent;width:100%;text-align:left;cursor:pointer">' +
        SIC.logout + '<span>Çıkış Yap</span>' +
      '</button>';
  }

  function renderSidebar() {
    var el = document.getElementById('app-sidebar');
    if (!el) return;

    var role = getRole();
    el.innerHTML = '<nav class="sidebar-nav">' + buildNavItems(role) + '</nav>';

    /* logout */
    var logoutBtn = el.querySelector('#sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async function () {
        if (window.SB && SB.signOut) { try { await SB.signOut(); } catch (e) {} }
        SESSION.user = null; SESSION.profile = null;
        localStorage.removeItem('kb_rol');
        gotoAuth('login');
      });
    }

    /* overlay kapatma */
    var overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.addEventListener('click', function () {
        el.classList.remove('is-open');
        overlay.classList.remove('is-open');
      });
    }
  }

  /* ─── HEADER DISPATCH ──────────────────────────────────────── */
  /* ─── PUBLIC NAV (yasal/statik sayfalar) ──────────────────────
     Yasal metinler herkese açık. Bu sayfalarda uygulama kabuğu (sidebar +
     topbar) gösterilirse ziyaretçi giriş yapmış gibi hisseder — landing ile
     aynı public navbar kullanılır. Sağdaki butonlar oturum durumuna göre
     "Giriş Yap / Kayıt Ol" ya da "Panelim" olur. */
  var PUBLIC_NAV_LINKS = [
    { href: 'kuryeler.html',   label: 'Kuryeler' },
    { href: 'isletmeler.html', label: 'Esnaflar' },
    { href: 'firmalar.html',   label: 'Kurye Firmaları' },
    { href: 'ilanlar.html',    label: 'İlanlar' }
  ];

  function renderPublicNav() {
    var nav = document.getElementById('kb-public-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'public-nav';
      nav.id = 'kb-public-nav';
      document.body.prepend(nav);
    }
    var authed = isAuthed();
    var links = PUBLIC_NAV_LINKS.map(function (l) {
      /* Havuz/ilan sayfaları giriş ister; oturumsuz ziyaretçiyi doğrudan
         giriş sayfasına gönder (önce açılıp sonra yönlendirilme olmasın). */
      var href = authed ? l.href : 'index.html?auth=login&next=' + encodeURIComponent(l.href);
      return '<a href="' + href + '">' + esc(l.label) + '</a>';
    }).join('');

    var actions = authed
      ? '<a href="' + panelHref() + '" class="btn btn--primary btn--sm">Panelim</a>'
      : '<a href="index.html?auth=login" class="btn btn--ghost btn--sm">Giriş Yap</a>' +
        '<a href="index.html?auth=register" class="btn btn--primary btn--sm">Kayıt Ol</a>';

    nav.innerHTML =
      '<a class="nav-brand" href="index.html">KuryemiBul</a>' +
      '<div class="nav-links">' + links + '</div>' +
      '<div class="nav-actions">' + actions + '</div>';
  }

  function renderHeader() {
    /* Kullanıcı tercihini uygula (i18n.js zaten erken apply eder, bu sadece garanti) */
    document.documentElement.setAttribute('data-theme', getTheme());

    if (isAuthPage() || isLandingPage()) return;

    /* Yasal/statik sayfa: uygulama kabuğu YOK, public navbar VAR */
    if (isPublicPage()) {
      document.body.classList.add('kb-public-view');
      ['app-topbar', 'app-sidebar', 'sidebar-overlay'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.remove();
      });
      renderPublicNav();
      return;
    }

    /* Uygulama sayfası: topbar + sidebar + overlay */
    var body = document.body;

    /* Topbar */
    if (!document.getElementById('app-topbar')) {
      var tb = document.createElement('div');
      tb.id = 'app-topbar';
      body.prepend(tb);
    }

    /* Sidebar */
    if (!document.getElementById('app-sidebar')) {
      var sb = document.createElement('nav');
      sb.id = 'app-sidebar';
      body.insertBefore(sb, body.firstChild.nextSibling);
    }

    /* Overlay (mobil) */
    if (!document.getElementById('sidebar-overlay')) {
      var ov = document.createElement('div');
      ov.className = 'sidebar-overlay';
      ov.id = 'sidebar-overlay';
      body.appendChild(ov);
    }

    renderTopbar();
    renderSidebar();
  }

  /* ─── FOOTER ───────────────────────────────────────────────── */
  function renderFooter() {
    var el = document.getElementById('app-footer');
    if (!el) return;
    if (isAuthPage()) { el.innerHTML = ''; return; }
    el.innerHTML =
      '<footer style="background:var(--surface);border-top:1px solid var(--border);padding:20px 24px;text-align:center;font-size:.8125rem;color:var(--text-3);margin-top:auto">' +
        '© 2025 KuryemiBul · <a href="kvkk.html">KVKK</a> · <a href="gizlilik.html">Gizlilik</a> · <a href="sartlar.html">Şartlar</a>' +
      '</footer>';
  }

  /* ─── SESSION GUARD ────────────────────────────────────────────
     Giriş yapmamış ziyaretçi uygulama sayfalarına (havuzlar, ilanlar,
     paneller, mesajlar ...) erişemez; index.html?auth=login'e yönlendirilir ve
     giriş sonrası gitmek istediği sayfaya döner (?next=).
     Landing, auth ve yasal/statik sayfalar bu korumanın dışındadır. */

  /* Açık yönlendirme (open redirect) koruması: yalnız aynı site içindeki
     .html sayfalarına dönülür. Protokol, host veya dizin kaçışı reddedilir. */
  function safeNext(value) {
    if (!value) return '';
    var v = String(value).trim();
    if (v.indexOf('//') !== -1 || v.indexOf(':') !== -1 || v.indexOf('\\') !== -1) return '';
    if (v.charAt(0) === '/' || v.indexOf('..') !== -1) return '';
    if (!/^[A-Za-z0-9._-]+\.html(\?[^#]*)?$/.test(v)) return '';
    return v;
  }
  /* Dönüş adresi URL'de taşınır; Google OAuth dönüşünde URL temizlendiği için
     (Google index.html'e sade döner) ayrıca sessionStorage'a da yazılır.
     Böylece hem guard hem giriş modalı aynı değeri görür. */
  var NEXT_KEY = 'kb_auth_next';
  function nextParam() {
    try {
      var fromUrl = safeNext(new URLSearchParams(location.search).get('next'));
      if (fromUrl) { try { sessionStorage.setItem(NEXT_KEY, fromUrl); } catch (e) {} return fromUrl; }
      return safeNext(sessionStorage.getItem(NEXT_KEY));
    } catch (e) { return ''; }
  }
  function clearNext() { try { sessionStorage.removeItem(NEXT_KEY); } catch (e) {} }
  /* Giriş modalı navigasyonsuz açıldığı için dönüş adresi URL'de taşınamaz;
     değer doğrudan buraya yazılır. Doğrulayıcı aynı safeNext'tir — açık
     yönlendirme koruması modalda da aynen geçerli. Yeni anahtar açmayın. */
  function setNext(value) {
    var v = safeNext(value);
    if (!v) return '';
    try { sessionStorage.setItem(NEXT_KEY, v); } catch (e) {}
    return v;
  }

  /* ─── Giriş modalı niyeti ──────────────────────────────────────
     Giriş artık index.html üzerinde modal olarak açılıyor; adres
     "index.html?auth=login" biçiminde taşınıyor. Ama bazı statik
     sunucular (ör. `serve` cleanUrls) .html uzantısını atarken query
     string'i de düşürüyor — ?next= için zaten yapıldığı gibi niyeti
     sessionStorage'a da yazıyoruz ki modal karşı tarafta yine açılsın.
     takeAuthRequest okurken siler: bayrak tek kullanımlıktır. */
  var AUTH_OPEN_KEY = 'kb_auth_open';
  function requestAuth(mode) {
    try { sessionStorage.setItem(AUTH_OPEN_KEY, mode === 'register' ? 'register' : 'login'); } catch (e) {}
  }
  function takeAuthRequest() {
    try {
      var v = sessionStorage.getItem(AUTH_OPEN_KEY);
      sessionStorage.removeItem(AUTH_OPEN_KEY);
      return v;
    } catch (e) { return null; }
  }
  function gotoAuth(mode) {
    requestAuth(mode);
    location.href = 'index.html?auth=' + (mode === 'register' ? 'register' : 'login');
  }

  /* Giriş bağlantılarına tıklandığında niyeti kaydet ve navigasyonun
     kendi yoluna devam etmesine izin ver. index.html'de bu tıklamayı
     auth-modal.js ayrıca yakalayıp navigasyonsuz açar ve bayrağı tüketir.
     YAKALAMA fazı: sayfadaki bazı düğmeler e.stopPropagation() çağırıyor
     (ör. index.html rol kartları); kabarma fazında bu tıklamalar buraya
     hiç ulaşmazdı. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('index.html?auth=') !== 0) return;
    requestAuth(h.indexOf('auth=register') !== -1 ? 'register' : 'login');
    var m = h.match(/[?&]next=([^&]*)/);
    if (m) { try { setNext(decodeURIComponent(m[1])); } catch (err) {} }
  }, true);

  async function runSessionGuard() {
    /* Supabase yüklenemediyse yönlendirme yapma — aksi halde bağlantı
       sorununda kullanıcı giriş sayfasına hapsolur. */
    if (!isOnline()) return;
    await _readyPromise;
    var page = currentPage();

    /* Auth sayfasındayken oturum açıksa içeri al */
    if (isAuthPage() && page !== 'onboarding.html') {
      if (SESSION.user) {
        var role = (SESSION.profile && SESSION.profile.role) || null;
        if (!role) { location.href = 'onboarding.html'; return; }
        var nx = nextParam();
        if (nx) clearNext();
        location.href = nx || roleToPanel(role);
      }
      return;
    }

    /* Uygulama sayfasındayken oturum yoksa giriş/kayıt sayfasına.
       Dönüş adresi hem URL'e hem sessionStorage'a yazılır: bazı statik
       sunucular (ör. `serve` cleanUrls) .html uzantısını atarken query
       string'i de düşürüyor; sessionStorage bu durumda yedek görevi görür. */
    if (!isAuthPage() && !isLandingPage() && !isPublicPage()) {
      if (!SESSION.user) {
        var hedef = safeNext(page + location.search);
        if (hedef) { try { sessionStorage.setItem(NEXT_KEY, hedef); } catch (e) {} }
        requestAuth('login');
        location.replace('index.html?auth=login' + (hedef ? '&next=' + encodeURIComponent(hedef) : ''));
      }
    }
  }

  /* ─── INIT ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    renderHeader();
    renderFooter();
    initSession();
    runSessionGuard();
  });

  async function initSession() {
    if (!isOnline()) {
      resolveReady({ user: null, profile: null });
      return;
    }
    try {
      var user = await window.SB.getUser();
      var profile = null;
      if (user) {
        try { profile = await window.SB.myProfile(); } catch (e) {}
        /* Admin kontrolü */
        try {
          window._kbIsAdmin = await window.SB.amIAdmin();
        } catch (e) { window._kbIsAdmin = false; }
      }
      resolveReady({ user: user, profile: profile });
      /* Oturum çözülünce arayüzü tazele. Public sayfalarda yalnız navbar var:
         ilk çizim "misafir" varsayar (yasal sayfa ziyaretçisi çoğunlukla öyle),
         oturum doğrulanınca butonlar "Panelim"e döner. */
      if (isPublicPage()) { renderPublicNav(); }
      else { renderTopbar(); renderSidebar(); }
    } catch (e) {
      resolveReady({ user: null, profile: null });
    }
  }

  /* ─── EXPORT: window.KB ────────────────────────────────────── */
  window.KB = {
    /* state */
    SESSION:        SESSION,
    STATE:          STATE,
    setState:       setState,
    onState:        onState,
    session:        session,
    ready:          function () { return _readyPromise; },
    resolveReady:   resolveReady,

    /* auth */
    isOnline:       isOnline,
    isAuthed:       isAuthed,
    amIAdmin:       amIAdmin,
    getRole:        getRole,
    currentRole:    currentRole,
    roleToPanel:    roleToPanel,
    panelHref:      panelHref,
    runSessionGuard: runSessionGuard,
    safeNext:       safeNext,     // açık yönlendirme korumalı ?next= doğrulayıcı
    nextParam:      nextParam,
    clearNext:      clearNext,
    setNext:        setNext,      // modal navigasyonsuz açıldığında dönüş adresi
    requestAuth:    requestAuth,  // giriş modalı niyeti (query düşse de yaşar)
    takeAuthRequest: takeAuthRequest,
    gotoAuth:       gotoAuth,

    /* helpers */
    esc:            esc,
    initials:       initials,
    getParam:       getParam,
    findById:       findById,
    stars:          stars,
    toast:          toast,

    /* draft / view state */
    bindDraft:      bindDraft,
    clearDraft:     clearDraft,
    saveView:       saveView,
    loadView:       loadView,

    /* offline teklif */
    getTeklifler:   getTeklifler,
    addTeklif:      addTeklif,

    /* tema */
    getTheme:       getTheme,
    setTheme:       setTheme,
    toggleTheme:    toggleTheme,

    /* render (dahili, ihtiyaç halinde yeniden tetiklemek için) */
    renderTopbar:   renderTopbar,
    renderSidebar:  renderSidebar,
  };

}());
