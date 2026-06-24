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
  function getTheme() { return 'light'; }
  function setTheme()  {}

  /* ─── ROLE / PANEL ─────────────────────────────────────────── */
  var ROLE_LABELS = { guest: 'Ziyaretçi', ziyaretci: 'Ziyaretçi', kurye: 'Kurye', isletme: 'İşletme', firma: 'Kurye Firması', admin: 'Admin' };

  function getRole() {
    var p = SESSION.profile;
    if (p && p.role) return p.role;
    return localStorage.getItem('kb_rol') || 'guest';
  }
  function currentRole() { return getRole(); }

  function roleToPanel(role) {
    var map = { kurye: 'panel-kurye.html', isletme: 'panel-isletme.html', firma: 'panel-firma.html', admin: 'admin.html' };
    return map[role] || 'giris.html';
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
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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
  function levelBadge(level) {
    var cls = { standart: 'standart', profesyonel: 'profesyonel', premium: 'premium' }[level] || 'standart';
    var ico = { standart: '🥉', profesyonel: '🥈', premium: '🥇' }[level] || '';
    var lbl = T('level.' + level) || level || 'Standart';
    return '<span class="level-badge level-badge--' + cls + '">' + ico + ' ' + lbl + '</span>';
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
    dashboard:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    couriers:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg>',
    businesses:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M9 9h1m5 0h1M9 13h1m5 0h1"/></svg>',
    firms:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M6 20V9l5-5 5 5v11"/><rect x="9" y="14" width="6" height="6"/></svg>',
    jobs:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
    map:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    pool:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    messages:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    applications: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    profile:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    settings:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    admin:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    hamburger:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    search:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    bell:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    logout:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
  };

  /* ─── SAYFA TİPİ ───────────────────────────────────────────── */
  var AUTH_PAGES    = ['giris.html', 'verify-email.html', 'sifre-sifirla.html', 'onboarding.html', 'app-onboarding.html'];
  var LANDING_PAGES = ['index.html', '', '/'];

  function currentPage() {
    var path = location.pathname.split('/').pop() || 'index.html';
    return path;
  }
  function isAuthPage()    { return AUTH_PAGES.indexOf(currentPage()) !== -1; }
  function isLandingPage() { return LANDING_PAGES.indexOf(currentPage()) !== -1; }

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
        '<a class="topbar-ico-btn" href="bildirimler.html" title="Bildirimler">' + SIC.bell + '</a>' +
        '<a class="topbar-ico-btn" href="mesajlar.html" title="Mesajlar">' + SIC.messages + '</a>' +
        '<a class="topbar-ico-btn" href="profil-' + (role !== 'guest' ? role : 'kurye') + '.html" title="' + esc(name) + '" style="width:auto;padding:0 8px;gap:6px;font-size:.85rem;font-weight:600;color:var(--text-2)">' +
          '<span style="width:30px;height:30px;border-radius:50%;background:var(--primary-light);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.75rem;flex-shrink:0">' + esc(initial) + '</span>' +
          '<span class="truncate" style="max-width:100px">' + esc(name) + '</span>' +
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
  }

  /* ─── SIDEBAR RENDER ───────────────────────────────────────── */
  function buildNavItems(role, activePage) {
    var panel = roleToPanel(role);
    var isAdmin = !!window._kbIsAdmin;

    var items = [
      { href: panel, label: 'Dashboard', ic: SIC.dashboard },
      { href: 'kuryeler.html',  label: 'Kuryeler',  ic: SIC.couriers },
      { href: 'isletmeler.html', label: 'İşletmeler', ic: SIC.businesses },
      { href: 'firmalar.html',  label: 'Firmalar',  ic: SIC.firms },
      { href: 'ilanlar.html',   label: 'İlanlar',   ic: SIC.jobs },
      { href: 'harita.html',    label: 'Harita',    ic: SIC.map },
      { href: 'havuzum.html',   label: 'Havuzum',   ic: SIC.pool },
      { href: 'mesajlar.html',  label: 'Mesajlar',  ic: SIC.messages },
    ];

    if (isAdmin) items.push({ href: 'admin.html', label: 'Admin', ic: SIC.admin });

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
        location.href = 'giris.html';
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
  function renderHeader() {
    document.documentElement.setAttribute('data-theme', 'light');

    if (isAuthPage() || isLandingPage()) return;

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

  /* ─── SESSION GUARD (panel sayfaları) ──────────────────────── */
  async function runSessionGuard() {
    if (!isOnline()) return;
    await _readyPromise;
    var page = currentPage();

    /* Auth sayfasındayken oturum açıksa panele yönlendir */
    if (isAuthPage() && page !== 'onboarding.html') {
      if (SESSION.user) {
        var role = (SESSION.profile && SESSION.profile.role) || null;
        if (!role) { location.href = 'onboarding.html'; return; }
        location.href = roleToPanel(role);
      }
      return;
    }

    /* Panel/app sayfasındayken oturum yoksa giris'e */
    if (!isAuthPage() && !isLandingPage()) {
      if (!SESSION.user) { location.href = 'giris.html'; return; }
    }
  }

  /* ─── INIT ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    renderHeader();
    renderFooter();
    initSession();
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
      /* Session güncellenirse topbar/sidebar'ı yenile */
      renderTopbar();
      renderSidebar();
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

    /* helpers */
    esc:            esc,
    initials:       initials,
    getParam:       getParam,
    findById:       findById,
    stars:          stars,
    levelBadge:     levelBadge,
    toast:          toast,

    /* draft / view state */
    bindDraft:      bindDraft,
    clearDraft:     clearDraft,
    saveView:       saveView,
    loadView:       loadView,

    /* offline teklif */
    getTeklifler:   getTeklifler,
    addTeklif:      addTeklif,

    /* render (dahili, ihtiyaç halinde yeniden tetiklemek için) */
    renderTopbar:   renderTopbar,
    renderSidebar:  renderSidebar,
  };

}());
