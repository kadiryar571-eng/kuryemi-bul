/* ============================================================
   Kuryemi Bul — components.js
   Ortak iskelet: demo rozeti, header/footer, dil anahtarı,
   WhatsApp butonu, rol anahtarı, helper'lar.
   i18n.js bu dosyadan ÖNCE yüklenmelidir.
   ============================================================ */
(function () {
  'use strict';

  var T = (window.KBI18N && window.KBI18N.t) || function (k) { return k; };
  function lang() { return window.KBI18N ? window.KBI18N.lang : "tr"; }

  // İletişim / WhatsApp bilgileri
  var WA_NUMBER = "905455960360";          // 0545 596 0360
  var TEL_DISPLAY = "0545 596 0360";
  var EMAIL = "kadiryar571@gmail.com";
  function waLink(text) {
    var msg = text || (lang() === "en"
      ? "Hello, I'd like to get information about KuryemiBul."
      : "Merhaba, KuryemiBul hakkında bilgi almak istiyorum.");
    return "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(msg);
  }

  var ROLE_KEYS = ["ziyaretci", "kurye", "isletme", "firma"];
  var ROLES = { ziyaretci: "Ziyaretçi", kurye: "Kurye", isletme: "İşletme", firma: "Kurye Firması" };
  var THEME_KEYS = ["turuncu", "mavi", "mor", "yesil", "pembe"];

  function getTheme() { return localStorage.getItem("kb_theme") === "light" ? "light" : "dark"; }
  function setTheme(tk) { tk = (tk === "light" ? "light" : "dark"); localStorage.setItem("kb_theme", tk); document.documentElement.setAttribute("data-theme", tk); }
  // Erişilebilirlik: yazı boyutu + kontrast (localStorage; i18n.js'te erken uygulanır)
  function getFontScale() { var v = localStorage.getItem("kb_fontscale"); return (v === "sm" || v === "lg") ? v : "md"; }
  function setFontScale(v) { v = (v === "sm" || v === "lg") ? v : "md"; localStorage.setItem("kb_fontscale", v); document.documentElement.setAttribute("data-fontscale", v); }
  function getContrast() { return localStorage.getItem("kb_contrast") === "1"; }
  function setContrast(on) { localStorage.setItem("kb_contrast", on ? "1" : "0"); document.documentElement.classList.toggle("high-contrast", !!on); }

  var NAV = [
    { href: "index.html", key: "nav.home" },
    { href: "kuryeler.html", key: "nav.couriers" },
    { href: "isletmeler.html", key: "nav.businesses" },
    { href: "firmalar.html", key: "nav.firms" },
    { href: "ilanlar.html", key: "nav.ilanlar" },
    { href: "harita.html", key: "nav.map" }
  ];

  // Sosyal medya hesaplari — adres girilince footer'da otomatik gorunur (bos = gizli)
  var SOCIAL = { instagram: "", x: "", linkedin: "" };

  /* ---------- Sidebar SVG ikonları ---------- */
  var SIC = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    couriers:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg>',
    businesses:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M9 9h1m5 0h1M9 13h1m5 0h1"/></svg>',
    firms:     '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M6 20V9l5-5 5 5v11"/><rect x="9" y="14" width="6" height="6"/></svg>',
    jobs:      '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
    map:       '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
    pool:      '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    settings:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    admin:     '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    chevLeft:  '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    search:    '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
  };

  // Auth-flow sayfaları: sidebar + klasik header yok, sayfa kendi başlığını yönetir
  var AUTH_FLOW_PAGES = ["giris.html", "verify-email.html", "sifre-sifirla.html", "onboarding.html"];
  // Landing sayfaları: eski klasik header
  var LANDING_PAGES = ["index.html", "", "/"];
  // NO_SIDEBAR: sidebar render edilmeyecek sayfalar (auth flow)
  var NO_SIDEBAR = AUTH_FLOW_PAGES;

  function buildSidebarItems(activePage) {
    var curFile = (activePage || "").split("/").pop() || "index.html";
    var role = isOnline() ? (SESSION.profile && SESSION.profile.role) : getRole();
    var ph = roleToPanel(role);
    var panelPages = ["panel-kurye.html", "panel-isletme.html", "panel-firma.html", "admin.html"];
    var panelActive = panelPages.indexOf(curFile) !== -1 || curFile === ph.split("/").pop();
    var items = [
      { href: ph, label: lang() === "en" ? "Dashboard" : "Dashboard", ic: SIC.dashboard, active: panelActive },
      { href: "kuryeler.html",   label: T("nav.couriers")   || "Kuryeler",    ic: SIC.couriers },
      { href: "isletmeler.html", label: T("nav.businesses") || "İşletmeler",  ic: SIC.businesses },
      { href: "firmalar.html",   label: T("nav.firms")      || "Firmalar",    ic: SIC.firms },
      { href: "ilanlar.html",    label: T("nav.ilanlar")    || "İlanlar",     ic: SIC.jobs },
      { href: "harita.html",     label: T("nav.map")        || "Harita",      ic: SIC.map },
      { href: "havuzum.html",    label: T("nav.pool")       || "Havuzum",     ic: SIC.pool },
      { href: "admin.html",      label: "Admin",             ic: SIC.admin,   id: "sidebarAdminLink", hidden: true },
      { href: "ayarlar.html", label: lang() === "en" ? "Settings" : "Ayarlar", ic: SIC.settings }
    ];
    return items.map(function (it) {
      var isActive = it.active !== undefined ? it.active : (it.href.split("/").pop() === curFile);
      var hiddenAttr = it.hidden ? ' style="display:none"' : '';
      var idAttr = it.id ? ' id="' + it.id + '"' : '';
      return '<a href="' + it.href + '" class="sidebar__item' + (isActive ? ' is-active' : '') + '"' + idAttr + hiddenAttr + '>' +
        '<span class="sidebar__ic">' + it.ic + '</span>' +
        '<span class="sidebar__label">' + esc(it.label) + '</span>' +
      '</a>';
    }).join('');
  }

  /* ---------- localStorage durum ---------- */
  function getRole() { return localStorage.getItem("kb_rol") || "ziyaretci"; }
  function setRole(r) { localStorage.setItem("kb_rol", r); }

  function getTeklifler() {
    try { return JSON.parse(localStorage.getItem("kb_teklifler")) || []; }
    catch (e) { return []; }
  }
  function addTeklif(t) {
    var list = getTeklifler();
    t.id = "t" + Date.now();
    t.durum = t.durum || "pending";
    t.tarih = new Date().toISOString().slice(0, 10);
    list.push(t);
    localStorage.setItem("kb_teklifler", JSON.stringify(list));
    return t;
  }

  function panelHref() {
    var r = getRole();
    if (r === "kurye") return "panel-kurye.html";
    if (r === "isletme") return "panel-isletme.html";
    if (r === "firma") return "panel-firma.html";
    return "giris.html";
  }
  // Home = Dashboard kuralı: girişliyse rolüne göre panel, değilse landing.
  function homeHref() {
    if (isOnline() && SESSION.user) return roleToPanel(SESSION.profile && SESSION.profile.role);
    if (!isOnline() && getRole() !== "ziyaretci") return panelHref();
    return "index.html";
  }
  var _activePage = "index.html";
  function buildNavLinks(activePage) {
    return NAV.filter(function (n) { return n.key !== "nav.home"; })
      .map(function (n) {
        var active = (n.href === activePage) ? " is-active" : "";
        return '<a href="' + n.href + '" class="' + active.trim() + '">' + T(n.key) + '</a>';
      }).join("");
  }

  /* ---------- Header / Sidebar ---------- */
  function renderHeader(activePage) {
    var host = document.getElementById("app-header");
    if (!host) return;
    _activePage = activePage;

    var curFile = (activePage || "").split("/").pop() || "index.html";

    // Auth-flow sayfaları: header yok, kendi header'larını kullanırlar
    if (AUTH_FLOW_PAGES.indexOf(curFile) !== -1) return;

    // Landing sayfaları: klasik header
    if (LANDING_PAGES.indexOf(curFile) !== -1) {
      var navLinks = buildNavLinks(activePage);
      var otherLangL = window.KBI18N ? window.KBI18N.other().toUpperCase() : "EN";
      var themeIconL = getTheme() === "light" ? "🌙" : "☀️";
      host.innerHTML =
        '<header class="header">' +
          '<div class="container header__inner">' +
            '<a href="index.html" class="logo" data-home aria-label="Kuryemi Bul">' +
              '<img class="logo__img" src="assets/logo.png" alt="Kuryemi Bul">' +
              '<span class="logo__text">Kuryemi&nbsp;Bul</span>' +
            '</a>' +
            '<nav class="nav" id="anaMenu" aria-label="Ana menü">' +
              '<span id="navLinks" style="display:contents">' + navLinks + '</span>' +
            '</nav>' +
            '<div class="header__util">' +
              '<div class="util__toggles">' +
                '<button id="themeToggle" class="theme-toggle" aria-label="' + T("theme.toggle") + '" title="' + T("theme.toggle") + '">' + themeIconL + '</button>' +
                '<button id="langToggle" class="lang-toggle" aria-label="' + T("lang.aria") + '">🌐 ' + otherLangL + '</button>' +
              '</div>' +
              '<div class="util__divider"></div>' +
              '<span id="authArea" class="auth-area"></span>' +
              '<button class="nav-toggle" id="navToggle" aria-label="Menü" aria-expanded="false" aria-controls="anaMenu">' +
                '<span></span><span></span><span></span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</header>';
      var navToggle = document.getElementById("navToggle");
      var nav = document.getElementById("anaMenu");
      if (navToggle && nav) {
        navToggle.addEventListener("click", function () {
          var open = nav.classList.toggle("is-open");
          navToggle.classList.toggle("is-open", open);
          navToggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        document.addEventListener("click", function (e) {
          if (nav.classList.contains("is-open") && !nav.contains(e.target) && !navToggle.contains(e.target)) {
            nav.classList.remove("is-open");
            navToggle.classList.remove("is-open");
            navToggle.setAttribute("aria-expanded", "false");
          }
        });
      }
      var lt = document.getElementById("langToggle");
      if (lt && window.KBI18N) lt.addEventListener("click", function () { window.KBI18N.setLang(window.KBI18N.other()); });
      var tt = document.getElementById("themeToggle");
      if (tt) tt.addEventListener("click", function () {
        var next = getTheme() === "light" ? "dark" : "light";
        setTheme(next);
        tt.textContent = next === "light" ? "🌙" : "☀️";
      });
      return;
    }

    // Sidebar CSS'ini dinamik yükle
    if (!document.getElementById("sidebar-css")) {
      var lnk = document.createElement("link");
      lnk.id = "sidebar-css"; lnk.rel = "stylesheet"; lnk.href = "assets/css/sidebar.css";
      document.head.appendChild(lnk);
    }

    // Body offset
    document.body.classList.add("has-sidebar");
    var collapsed = localStorage.getItem("kb_sidebar_collapsed") === "1";
    var sidebar = document.getElementById("kbSidebar");
    if (collapsed) { document.body.classList.add("sidebar-collapsed"); }

    var otherLang = window.KBI18N ? window.KBI18N.other().toUpperCase() : "EN";
    var themeIcon = getTheme() === "light" ? "🌙" : "☀️";
    var searchPh = lang() === "en" ? "Search…" : "Ara…";

    host.innerHTML =
      // ── SIDEBAR — position:fixed inline: sidebar.css yüklenmeden normal akışa girmesin
      '<aside class="sidebar' + (collapsed ? ' is-collapsed' : '') + '" id="kbSidebar" aria-label="Kenar menüsü" style="position:fixed;">' +
        '<div class="sidebar__head">' +
          '<a href="index.html" class="sidebar__brand" data-home aria-label="Kuryemi Bul Ana Sayfa">' +
            '<img class="sidebar__logo-img" src="assets/logo.png" alt="Kuryemi Bul">' +
            '<span class="sidebar__brand-name">Kuryemi Bul</span>' +
          '</a>' +
        '</div>' +
        '<nav class="sidebar__nav" id="sidebarNav" aria-label="Ana menü">' +
          buildSidebarItems(activePage) +
        '</nav>' +
        '<div class="sidebar__footer">' +
          '<button type="button" class="sidebar__collapse-btn" id="sidebarCollapseBtn" title="Daralt/Genişlet">' +
            '<span class="sidebar__collapse-ic">' + SIC.chevLeft + '</span>' +
            '<span class="sidebar__collapse-label">Küçült</span>' +
          '</button>' +
        '</div>' +
      '</aside>' +
      '<div class="sidebar-overlay" id="sidebarOverlay"></div>' +
      // ── TOPBAR — position:fixed inline: sidebar.css yüklenmeden normal akışa girmesin
      '<header class="topbar" style="position:fixed;">' +
        '<button class="topbar__hamburger" id="topbarHamburger" aria-label="Menü aç/kapat">☰</button>' +
        '<div class="topbar__search">' +
          SIC.search +
          '<input class="topbar__search-input" type="search" placeholder="' + searchPh + '" aria-label="' + searchPh + '">' +
        '</div>' +
        '<div class="topbar__spacer"></div>' +
        '<div class="topbar__actions">' +
          '<button id="themeToggle" class="topbar__btn topbar__theme-btn" aria-label="' + T("theme.toggle") + '" title="' + T("theme.toggle") + '">' + themeIcon + '</button>' +
          '<button id="langToggle" class="topbar__btn" aria-label="' + T("lang.aria") + '">🌐 ' + otherLang + '</button>' +
          '<span id="authArea" style="display:contents"></span>' +
        '</div>' +
      '</header>';

    // ── Sidebar collapse ──
    var collapseBtn = document.getElementById("sidebarCollapseBtn");
    var sidebarEl = document.getElementById("kbSidebar");
    if (collapseBtn && sidebarEl) {
      collapseBtn.addEventListener("click", function () {
        var isNowCollapsed = sidebarEl.classList.toggle("is-collapsed");
        document.body.classList.toggle("sidebar-collapsed", isNowCollapsed);
        localStorage.setItem("kb_sidebar_collapsed", isNowCollapsed ? "1" : "0");
      });
    }

    // ── Mobile hamburger ──
    var hamburger = document.getElementById("topbarHamburger");
    var overlay = document.getElementById("sidebarOverlay");
    if (hamburger && sidebarEl && overlay) {
      function closeMobile() { sidebarEl.classList.remove("is-mobile-open"); overlay.classList.remove("is-active"); }
      hamburger.addEventListener("click", function () {
        var open = sidebarEl.classList.toggle("is-mobile-open");
        overlay.classList.toggle("is-active", open);
      });
      overlay.addEventListener("click", closeMobile);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMobile(); });
    }

    // ── Lang toggle ──
    var langToggle = document.getElementById("langToggle");
    if (langToggle && window.KBI18N) langToggle.addEventListener("click", function () { window.KBI18N.setLang(window.KBI18N.other()); });

    // ── Theme toggle ──
    var themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.addEventListener("click", function () {
      var next = getTheme() === "light" ? "dark" : "light";
      setTheme(next);
      themeToggle.textContent = next === "light" ? "🌙" : "☀️";
    });

    // Logo hatası durumunda emoji fallback
    var logoImg = host.querySelector(".sidebar__logo-img");
    if (logoImg) logoImg.addEventListener("error", function () {
      var s = document.createElement("span"); s.textContent = "🛵"; s.style.fontSize = "1.4rem";
      logoImg.parentNode && logoImg.parentNode.replaceChild(s, logoImg);
    });
  }

  /* ---------- Footer ---------- */
  function renderFooter() {
    var host = document.getElementById("app-footer");
    if (!host) return;
    var socials = '<a href="' + waLink() + '" target="_blank" rel="noopener" aria-label="WhatsApp">💬</a>';
    if (SOCIAL.instagram) socials += '<a href="' + SOCIAL.instagram + '" target="_blank" rel="noopener" aria-label="Instagram">📷</a>';
    if (SOCIAL.x) socials += '<a href="' + SOCIAL.x + '" target="_blank" rel="noopener" aria-label="X">🐦</a>';
    if (SOCIAL.linkedin) socials += '<a href="' + SOCIAL.linkedin + '" target="_blank" rel="noopener" aria-label="LinkedIn">💼</a>';
    host.innerHTML =
      '<footer class="footer">' +
        '<div class="container footer__inner">' +
          '<div class="footer__brand">' +
            '<a href="index.html" class="logo logo--light">' +
              '<img class="logo__img" src="assets/logo.png" alt="Kuryemi Bul">' +
              '<span class="logo__text">Kuryemi&nbsp;Bul</span>' +
            '</a>' +
            '<p>' + T("footer.tagline") + '</p>' +
          '</div>' +
          '<nav class="footer__links" aria-label="Alt menü">' +
            '<h4>' + T("footer.discover") + '</h4>' +
            '<a href="kuryeler.html">' + T("footer.couriersPool") + '</a>' +
            '<a href="isletmeler.html">' + T("footer.businessesPool") + '</a>' +
            '<a href="firmalar.html">' + T("footer.firmsPool") + '</a>' +
            '<a href="harita.html">' + T("footer.map") + '</a>' +
          '</nav>' +
          '<nav class="footer__links" aria-label="Yasal">' +
            '<h4>' + T("footer.legal") + '</h4>' +
            '<a href="kvkk.html">' + T("footer.kvkk") + '</a>' +
            '<a href="gizlilik.html">' + T("footer.privacy") + '</a>' +
            '<a href="sartlar.html">' + T("footer.terms") + '</a>' +
            '<a href="cerez.html">' + T("footer.cookies") + '</a>' +
          '</nav>' +
        '</div>' +
        '<div class="footer__bottom"><p>' + new Date().getFullYear() + ' ' + T("footer.rights") + '</p><span id="kb-version-tag" style="font-size:.78rem;opacity:.45;margin-top:4px;display:block"></span></div>' +
      '</footer>';
  }

  /* ---------- Versiyon etiketi ---------- */
  function renderVersion() {
    fetch('/version.json?_=' + Date.now())
      .then(function(r) { return r.json(); })
      .then(function(v) {
        var el = document.getElementById('kb-version-tag');
        if (el) el.textContent = 'v' + v.version + '.' + v.build + ' · Beta';
      })
      .catch(function() {});
  }

  /* ---------- Yüzen WhatsApp butonu ---------- */
  function renderWhatsApp() {
    if (document.getElementById("waFloat")) return;
    var a = document.createElement("a");
    a.id = "waFloat";
    a.className = "wa-float";
    a.href = waLink();
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", T("wa.tooltip"));
    a.innerHTML =
      '<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" fill="currentColor">' +
      '<path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.8 5.5 2.2 7.9L.4 31.5l7.8-2.2c2.3 1.3 4.9 1.9 7.6 1.9h.1C24.6 31.2 31.5 24.3 31.5 16 31.5 7.4 24.6.5 16 .5zm0 28c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.6 1.3 1.2-4.5-.3-.5C3.6 20.3 3 18.2 3 16 3 8.8 8.8 3 16 3s13 5.8 13 13-5.8 12.5-13 12.5zm7.1-9.4c-.4-.2-2.3-1.1-2.6-1.3-.3-.1-.6-.2-.8.2-.2.4-.9 1.3-1.1 1.5-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.3-2.1-2.7-.2-.4 0-.6.2-.8l.6-.7c.2-.2.2-.4.4-.6.1-.2.1-.5 0-.7-.1-.2-.8-2-1.1-2.7-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.5-.3.4-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.6.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.2-.7-.4z"/></svg>' +
      '<span class="wa-float__txt">' + T("wa.tooltip") + '</span>';
    document.body.appendChild(a);
  }

  /* ---------- Ortak helper'lar ---------- */
  function levelBadge(seviye) {
    var cls = { standart: "level--standart", profesyonel: "level--profesyonel", premium: "level--premium" }[seviye] || "level--standart";
    var icon = { standart: "●", profesyonel: "◆", premium: "★" }[seviye] || "●";
    return '<span class="level ' + cls + '">' + icon + ' ' + T("level." + seviye) + '</span>';
  }
  function stars(puan) {
    var full = Math.round(puan), s = "";
    for (var i = 0; i < 5; i++) s += i < full ? "★" : "☆";
    return '<span class="stars">' + s + '<span class="num">' + puan.toFixed(1) + '</span></span>';
  }
  function getParam(name) { return new URLSearchParams(location.search).get(name); }
  function findById(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function initials(ad) { return ad.split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase(); }
  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Yukarı çık butonu ---------- */
  function renderToTop() {
    if (document.getElementById("toTop")) return;
    var b = document.createElement("button");
    b.id = "toTop"; b.className = "to-top"; b.type = "button";
    b.setAttribute("aria-label", T("backtop.aria"));
    b.innerHTML = "↑";
    b.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    document.body.appendChild(b);
    function onScroll() { b.classList.toggle("is-visible", window.scrollY > 400); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Çerez onay banner'ı ---------- */
  function renderCookieConsent() {
    try { if (localStorage.getItem("kb_cookie_ok") === "1") return; } catch (e) {}
    if (document.getElementById("cookieBar")) return;
    var bar = document.createElement("div");
    bar.id = "cookieBar";
    bar.className = "cookie-bar";
    bar.innerHTML =
      '<p class="cookie-bar__txt">' + T("cookie.text") +
        ' <a href="cerez.html">' + T("cookie.link") + '</a></p>' +
      '<div class="cookie-bar__act">' +
        '<button type="button" class="btn btn--light btn--sm" id="cookieReject">' + T("cookie.reject") + '</button>' +
        '<button type="button" class="btn btn--primary btn--sm" id="cookieAccept">' + T("cookie.accept") + '</button>' +
      '</div>';
    document.body.appendChild(bar);
    function close(val) { try { localStorage.setItem("kb_cookie_ok", val); } catch (e) {} bar.classList.add("is-hidden"); setTimeout(function () { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 350); }
    document.getElementById("cookieAccept").addEventListener("click", function () { close("1"); });
    document.getElementById("cookieReject").addEventListener("click", function () { close("0"); });
    requestAnimationFrame(function () { bar.classList.add("is-in"); });
  }

  /* ---------- Oturum (Supabase) ---------- */
  var SESSION = { loaded: false, user: null, profile: null };

  /* ---------- Merkezi uygulama state'i (MP05) ---------- */
  // Tek kaynak: auth/user/role/context/prefs. Boot'ta doldurulur, abonelere bildirilir.
  var STATE = { auth: { status: "guest" }, user: null, role: "guest", context: {}, prefs: {} };
  var _stateSubs = [];
  function notifyState() { _stateSubs.forEach(function (cb) { try { cb(STATE); } catch (e) {} }); }
  function onState(cb) { if (typeof cb === "function") { _stateSubs.push(cb); try { cb(STATE); } catch (e) {} } }
  function setState(patch) { if (patch) Object.keys(patch).forEach(function (k) { STATE[k] = patch[k]; }); notifyState(); }

  /* ---------- Navigasyon hafızası + taslak koruma (MP05 §4/§7) ---------- */
  // View durumu (filtre/scroll vb.) — sekme boyu (sessionStorage)
  function saveView(key, data) { try { sessionStorage.setItem("kb_view:" + key, JSON.stringify(data)); } catch (e) {} }
  function loadView(key) { try { return JSON.parse(sessionStorage.getItem("kb_view:" + key)); } catch (e) { return null; } }
  function clearView(key) { try { sessionStorage.removeItem("kb_view:" + key); } catch (e) {} }
  // Form/konteyner taslağı: input'ları sessionStorage'a debounce ile yaz, dönünce geri yükle (boş alanlara)
  function bindDraft(container, key) {
    if (!container) return;
    var k = "kb_draft:" + key, t;
    try {
      var d = JSON.parse(sessionStorage.getItem(k));
      if (d) container.querySelectorAll("input,textarea,select").forEach(function (el) {
        if (el.id && d[el.id] != null && el.type !== "file" && el.type !== "password" && !el.value) el.value = d[el.id];
      });
    } catch (e) {}
    container.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var o = {};
        container.querySelectorAll("input,textarea,select").forEach(function (el) {
          if (el.id && el.type !== "file" && el.type !== "password") o[el.id] = el.value;
        });
        try { sessionStorage.setItem(k, JSON.stringify(o)); } catch (e) {}
      }, 400);
    });
  }
  function clearDraft(key) { try { sessionStorage.removeItem("kb_draft:" + key); } catch (e) {} }
  function buildState() {
    STATE.auth = { status: SESSION.user ? "authed" : "guest", userId: SESSION.user && SESSION.user.id, email: SESSION.user && SESSION.user.email };
    STATE.user = SESSION.profile ? { name: SESSION.profile.ad, avatar: SESSION.profile.avatar_url, role: SESSION.profile.role, verification: SESSION.profile.dogrulama } : null;
    STATE.role = (SESSION.profile && SESSION.profile.role) || (isOnline() ? "guest" : getRole());
    var cur = (location.pathname.split("/").pop() || "index.html");
    var prev = null; try { prev = sessionStorage.getItem("kb_route"); sessionStorage.setItem("kb_route", cur); } catch (e) {}
    STATE.context = { route: cur, prevRoute: (prev && prev !== cur) ? prev : (STATE.context && STATE.context.prevRoute) || null };
    STATE.prefs = { lang: (window.KBI18N ? KBI18N.lang : "tr"), theme: getTheme(), fontScale: getFontScale(), contrast: getContrast() };
    notifyState();
  }

  function isOnline() { return !!(window.SB && SB.isOn()); }
  function roleToPanel(r) {
    if (r === "kurye") return "panel-kurye.html";
    if (r === "isletme") return "panel-isletme.html";
    if (r === "firma") return "panel-firma.html";
    return "giris.html";
  }
  function roleToProfile(r) {
    if (r === "kurye") return "profil-kurye.html";
    if (r === "isletme") return "profil-isletme.html";
    if (r === "firma") return "profil-firma.html";
    return "";
  }

  async function loadSession() {
    if (!isOnline()) { SESSION.loaded = true; return SESSION; }
    try {
      SESSION.user = await SB.getUser();
      if (SESSION.user) SESSION.profile = await SB.myProfile();
    } catch (e) { console.warn("Oturum yüklenemedi:", e); }
    SESSION.loaded = true;
    return SESSION;
  }

  // Oturum yüklemesini DOM'dan bağımsız olarak HEMEN başlat; KB.ready() bunu bekler.
  // (init() DOMContentLoaded'a ertelenebildiği için burada başlatmak yarış koşulunu önler.)
  var READY = isOnline() ? loadSession() : Promise.resolve(SESSION);

  function buildAuthArea() {
    if (!isOnline()) {
      // Demo modu: eski rol anahtarı + Giriş/Panel
      var role = getRole();
      var roleOptions = ROLE_KEYS.map(function (k) {
        return '<option value="' + k + '"' + (k === role ? " selected" : "") + '>' + T("role." + k) + '</option>';
      }).join("");
      var panelLabel = role === "ziyaretci" ? T("cta.signin") : T("cta.panel");
      return '<span class="role-switch"><span class="role-switch__label">' + T("role.label") + '</span>' +
        '<select id="roleSelect" aria-label="' + T("role.label") + '">' + roleOptions + '</select></span>' +
        '<a href="' + panelHref() + '" class="btn btn--primary btn--sm nav__cta">' + panelLabel + '</a>';
    }
    if (SESSION.user) {
      var nm = (SESSION.profile && SESSION.profile.ad) || SESSION.user.email || T("cta.account");
      var role = SESSION.profile && SESSION.profile.role;
      var ph = roleToPanel(role);
      var profPage = roleToProfile(role);
      var pid = SESSION.profile && SESSION.profile.id;
      var profileLink = (profPage && pid) ? (profPage + "?id=" + pid) : "profil-duzenle.html";
      var hasSidebar = document.body.classList.contains("has-sidebar");
      var initAva = initials(nm) || "👤";
      var acctBtnHtml = hasSidebar
        ? '<button type="button" class="topbar__user-pill acct__btn" id="acctBtn" aria-haspopup="true" aria-expanded="false" title="' + esc(SESSION.user.email || "") + '">' +
            '<span class="topbar__avatar acct__ava">' + esc(initAva) + '</span>' +
            '<div class="topbar__user-info">' +
              '<div class="topbar__user-name">' + esc(nm) + '</div>' +
              (role ? '<div class="topbar__user-role">' + esc(T("role." + role)) + '</div>' : '') +
            '</div>' +
            '<span class="acct__caret" aria-hidden="true">▾</span>' +
          '</button>'
        : '<button type="button" class="acct__btn" id="acctBtn" aria-haspopup="true" aria-expanded="false" title="' + esc(SESSION.user.email || "") + '">' +
            '<span class="acct__ava">👤</span><span class="acct__name">' + esc(nm) + '</span><span class="acct__caret" aria-hidden="true">▾</span>' +
          '</button>';
      var notifClass = hasSidebar ? "topbar__icon-btn" : "auth-link notif-bell";
      return '<a href="mesajlar.html" class="' + notifClass + '" aria-label="' + T("nav.messages") + '" title="' + T("nav.messages") + '">💬<span class="badge-count" id="msgBadge" style="display:none">0</span></a>' +
        '<a href="bildirimler.html" class="' + notifClass + '" aria-label="' + T("notif.title") + '" title="' + T("notif.title") + '">🔔<span class="badge-count" id="notifBadge" style="display:none">0</span></a>' +
        '<div class="acct' + (hasSidebar ? ' topbar__acct' : '') + '" id="acctMenu">' +
          acctBtnHtml +
          '<div class="acct__menu" role="menu">' +
            '<div class="acct__head" style="padding:10px 13px;border-bottom:1px solid var(--line,rgba(255,255,255,.1));margin-bottom:4px">' +
              '<div style="font-weight:700;font-size:.92rem">' + esc(nm) + '</div>' +
              (role ? '<div style="font-size:.74rem;opacity:.65;margin-top:1px">' + esc(T("role." + role)) + '</div>' : '') +
            '</div>' +
            '<a href="' + ph + '" role="menuitem" class="acct__cmd">🏠 ' + T("cta.panel") + '</a>' +
            '<a href="havuzum.html" role="menuitem">★ ' + T("nav.pool") + '</a>' +
            '<a href="mesajlar.html" role="menuitem">' + T("menu.messages") + '</a>' +
            '<a href="' + profileLink + '" role="menuitem">' + T("menu.profile") + '</a>' +
            '<a href="profil-duzenle.html" role="menuitem">' + T("menu.editProfile") + '</a>' +
            '<a href="admin.html" role="menuitem" class="acct__admin" hidden>' + T("menu.admin") + '</a>' +
            '<button type="button" id="logoutBtn" role="menuitem" class="acct__signout">' + T("cta.signout") + '</button>' +
          '</div>' +
        '</div>';
    }
    return '<a href="giris.html" class="btn btn--primary btn--sm nav__cta">' + T("cta.signin") + '</a>';
  }

  function wireAuthArea() {
    var roleSelect = document.getElementById("roleSelect");
    if (roleSelect) roleSelect.addEventListener("change", function () { setRole(roleSelect.value); location.reload(); });
    var logout = document.getElementById("logoutBtn");
    if (logout) logout.addEventListener("click", async function () {
      try { await SB.signOut(); } catch (e) {}
      location.href = "index.html";
    });
    var acctBtn = document.getElementById("acctBtn");
    var acctMenu = document.getElementById("acctMenu");
    if (acctBtn && acctMenu) {
      acctBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = acctMenu.classList.toggle("acct--open");
        acctBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("click", function (e) {
        if (!acctMenu.contains(e.target)) {
          acctMenu.classList.remove("acct--open");
          acctBtn.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          acctMenu.classList.remove("acct--open");
          acctBtn.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  /* Session guard: giriş yapmış kullanıcıyı landing/login sayfasından panel'e yönlendir */
  var SESSION_GUARD_PAGES = ["index.html", "giris.html", ""];
  function runSessionGuard() {
    if (!isOnline()) return;
    var cur = (location.pathname.split("/").pop() || "index.html");
    if (SESSION_GUARD_PAGES.indexOf(cur) === -1) return;
    if (!SESSION.user) return;
    var role = SESSION.profile && SESSION.profile.role;
    if (!role) return; // profil tamamlanmamış, onboarding'e devam
    var dest = roleToPanel(role);
    if (dest && dest !== cur) window.location.replace(dest);
  }

  async function updateAuthArea() {
    var area = document.getElementById("authArea");
    if (!area) return;
    if (isOnline()) { area.innerHTML = '<span class="user-chip">…</span>'; await READY; }
    runSessionGuard();
    area.innerHTML = buildAuthArea();
    wireAuthArea();
    buildState();
    updateMobileAppBar();
    // Bildirim rozeti: okunmamış bildirim sayısı (+ anlık güncelleme)
    if (isOnline() && SESSION.user && window.SB && SB.unreadCount) {
      var setBadge = function (n) {
        ["notifBadge", "mobAppBarNotifBadge"].forEach(function (id) {
          var b = document.getElementById(id);
          if (!b) return;
          if (n > 0) { b.textContent = n > 99 ? "99+" : n; b.style.display = ""; }
          else { b.style.display = "none"; }
        });
      };
      SB.unreadCount().then(setBadge).catch(function () {});
      // Anlık: yeni bildirim gelince rozeti +1 yap (sayfada zaten abone varsa çift saymamak için global kilit)
      if (!window.__kbNotifSub && SB.subscribeNotifications) {
        window.__kbNotifSub = true;
        SB.subscribeNotifications(function () {
          SB.unreadCount().then(setBadge).catch(function () {});
        });
      }
    }
    // Mesaj rozeti: okunmamış mesaj sayısı (+ anlık güncelleme)
    if (isOnline() && SESSION.user && window.SB && SB.unreadMessageCount) {
      var setMsgBadge = function (n) {
        ["msgBadge", "bnavMsgBadge"].forEach(function (id) {
          var b = document.getElementById(id);
          if (!b) return;
          if (n > 0) { b.textContent = n > 99 ? "99+" : n; b.style.display = ""; }
          else { b.style.display = "none"; }
        });
      };
      window.__kbUpdateMsgBadge = function () { SB.unreadMessageCount().then(setMsgBadge).catch(function () {}); };
      window.__kbUpdateMsgBadge();
      if (!window.__kbMsgSub && SB.subscribeMessages) {
        window.__kbMsgSub = true;
        SB.subscribeMessages(function () { window.__kbUpdateMsgBadge(); });
      }
    }
    // Yönetim menü öğesi + sidebar admin linki: yalnız adminlere göster
    if (isOnline() && SESSION.user && window.SB && SB.amIAdmin) {
      SB.amIAdmin().then(function (ok) {
        if (ok) {
          var ai = area.querySelector(".acct__admin"); if (ai) ai.hidden = false;
          var sal = document.getElementById("sidebarAdminLink"); if (sal) sal.style.display = "";
        }
      }).catch(function () {});
    }
    // Alt navigasyonu oturum yüklendikten sonra tazele (Panelim hedefi rol'e göre) + rozet
    var bn = document.getElementById("kb-bottomnav");
    if (bn) { bn.remove(); renderBottomNav(); if (window.__kbUpdateMsgBadge) window.__kbUpdateMsgBadge(); }
    // Sidebar nav'ı rol belli olduktan sonra yeniden çiz (doğru panel linki için)
    var sn = document.getElementById("sidebarNav");
    if (sn) sn.innerHTML = buildSidebarItems(_activePage);
    // Eski flat nav (yoksa no-op)
    var nl = document.getElementById("navLinks");
    if (nl) nl.innerHTML = buildNavLinks(_activePage);
    // Home = Dashboard: girişli kullanıcıda logo da panele gider (landing'e değil)
    var hh = homeHref();
    if (hh !== "index.html") {
      document.querySelectorAll("[data-home]").forEach(function (a) { a.setAttribute("href", hh); });
    }
  }

  function renderCanvasBg() { /* canvas animasyonu kaldırıldı — sade dark tema */ }

  /* ---------- Sayfa sınıfı (kb-page) ekleme ---------- */
  function renderAmbient() {
    document.body.classList.add("kb-page");
    // CSS yükle
    if (!document.getElementById("space-bg-css")) {
      var lnk = document.createElement("link");
      lnk.id = "space-bg-css"; lnk.rel = "stylesheet"; lnk.href = "assets/css/space-bg.css";
      document.head.appendChild(lnk);
    }
    // HTML yapısını enjekte et
    if (!document.getElementById("space-bg")) {
      document.body.insertAdjacentHTML("afterbegin",
        '<div class="space-bg" id="space-bg" aria-hidden="true">' +
          '<div class="space-nebula"></div>' +
          '<div class="space-stars space-stars--s"></div>' +
          '<div class="space-stars space-stars--m"></div>' +
          '<div class="space-stars space-stars--f"></div>' +
          '<div class="nova nova--1"></div>' +
          '<div class="nova nova--2"></div>' +
          '<div class="nova nova--3"></div>' +
          '<div class="nova nova--4"></div>' +
          '<div class="nova nova--5"></div>' +
          '<div class="nova nova--6"></div>' +
        '</div>'
      );
    }
  }

  /* ---------- Erişilebilirlik paneli (yüzen) ---------- */
  function renderA11y() {
    if (document.getElementById("a11yFab")) return;
    var wrap = document.createElement("div");
    wrap.className = "a11y";
    wrap.innerHTML =
      '<button id="a11yFab" class="a11y-fab" type="button" aria-haspopup="true" aria-expanded="false" aria-label="' + T("a11y.title") + '" title="' + T("a11y.title") + '">♿</button>' +
      '<div class="a11y-panel" id="a11yPanel" role="dialog" aria-label="' + T("a11y.title") + '">' +
        '<div class="a11y-panel__h">' + T("a11y.title") + '</div>' +
        '<div class="a11y-row"><span>' + T("a11y.fontSize") + '</span><div class="a11y-seg" id="a11yFont">' +
          '<button type="button" data-fs="sm" aria-label="A-">A−</button><button type="button" data-fs="md">A</button><button type="button" data-fs="lg" aria-label="A+">A+</button></div></div>' +
        '<div class="a11y-row"><span>' + T("a11y.contrast") + '</span><div class="a11y-seg" id="a11yContrast">' +
          '<button type="button" data-ct="0">' + T("a11y.normal") + '</button><button type="button" data-ct="1">' + T("a11y.high") + '</button></div></div>' +
      '</div>';
    document.body.appendChild(wrap);
    var fab = document.getElementById("a11yFab"), panel = document.getElementById("a11yPanel");
    function sync() {
      var fs = getFontScale(), ct = getContrast();
      wrap.querySelectorAll("#a11yFont [data-fs]").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-fs") === fs); });
      wrap.querySelectorAll("#a11yContrast [data-ct]").forEach(function (b) { b.classList.toggle("is-on", (b.getAttribute("data-ct") === "1") === ct); });
    }
    fab.addEventListener("click", function (e) { e.stopPropagation(); var open = panel.classList.toggle("is-open"); fab.setAttribute("aria-expanded", open ? "true" : "false"); });
    document.addEventListener("click", function (e) { if (!wrap.contains(e.target)) { panel.classList.remove("is-open"); fab.setAttribute("aria-expanded", "false"); } });
    document.getElementById("a11yFont").addEventListener("click", function (e) { var b = e.target.closest("[data-fs]"); if (b) { setFontScale(b.getAttribute("data-fs")); sync(); } });
    document.getElementById("a11yContrast").addEventListener("click", function (e) { var b = e.target.closest("[data-ct]"); if (b) { setContrast(b.getAttribute("data-ct") === "1"); sync(); } });
    sync();
  }

  /* ---------- Mobil alt navigasyon — SVG ikonlar ---------- */
  var BNAV_ICONS = {
    home:         '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12L12 3l9 9"/><path d="M9 21V12h6v9"/><path d="M3 12v9h18v-9"/></svg>',
    listings:     '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>',
    map:          '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 7 9 4 15 7 21 4 21 17 15 20 9 17 3 20"/><line x1="9" y1="4" x2="9" y2="17"/><line x1="15" y1="7" x2="15" y2="20"/></svg>',
    messages:     '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    profile:      '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    signin:       '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    opportunities:'<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    matches:      '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    pool:         '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="8" r="4"/><path d="M2 20v-2a8 8 0 0 1 10.09-7.73"/><circle cx="19.5" cy="17.5" r="2.5"/><path d="m21.5 19.5 1.5 1.5"/></svg>',
    requests:     '<svg viewBox="0 0 24 24" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
  };

  function getRoleNavItems() {
    var role = isOnline() ? (SESSION.profile && SESSION.profile.role) : getRole();
    var authed = isOnline() ? !!SESSION.user : (getRole() !== "ziyaretci");
    var profHref = "profil-duzenle.html";
    if (isOnline() && SESSION.profile && SESSION.profile.id) {
      var rp = roleToProfile(SESSION.profile.role);
      if (rp) profHref = rp + "?id=" + SESSION.profile.id;
    }
    if (!authed) {
      return [
        { href: "index.html",    icon: BNAV_ICONS.home,     label: "Ana Sayfa" },
        { href: "ilanlar.html",  icon: BNAV_ICONS.listings,  label: "İlanlar" },
        { href: "harita.html",   icon: BNAV_ICONS.map,       label: "Harita" },
        { href: "mesajlar.html", icon: BNAV_ICONS.messages,  label: "Mesajlar" },
        { href: "giris.html",    icon: BNAV_ICONS.signin,    label: "Giriş" }
      ];
    }
    if (role === "kurye") {
      return [
        { href: homeHref(),       icon: BNAV_ICONS.home,         label: "Ana Sayfa" },
        { href: "ilanlar.html",   icon: BNAV_ICONS.opportunities, label: "Fırsatlar" },
        { href: "eslesme.html",   icon: BNAV_ICONS.matches,       label: "Eşleşmeler" },
        { href: "mesajlar.html",  icon: BNAV_ICONS.messages,      label: "Mesajlar", badge: "bnavMsgBadge" },
        { href: profHref,         icon: BNAV_ICONS.profile,       label: "Profil" }
      ];
    }
    if (role === "isletme") {
      return [
        { href: homeHref(),       icon: BNAV_ICONS.home,     label: "Ana Sayfa" },
        { href: "ilanlar.html",   icon: BNAV_ICONS.requests,  label: "Talepler" },
        { href: "kuryeler.html",  icon: BNAV_ICONS.matches,   label: "Eşleşmeler" },
        { href: "mesajlar.html",  icon: BNAV_ICONS.messages,  label: "Mesajlar", badge: "bnavMsgBadge" },
        { href: profHref,         icon: BNAV_ICONS.profile,   label: "İşletme" }
      ];
    }
    if (role === "firma") {
      return [
        { href: homeHref(),       icon: BNAV_ICONS.home,     label: "Ana Sayfa" },
        { href: "kuryeler.html",  icon: BNAV_ICONS.pool,      label: "Havuz" },
        { href: "ilanlar.html",   icon: BNAV_ICONS.listings,  label: "İlanlar" },
        { href: "mesajlar.html",  icon: BNAV_ICONS.messages,  label: "Mesajlar", badge: "bnavMsgBadge" },
        { href: profHref,         icon: BNAV_ICONS.profile,   label: "Firma" }
      ];
    }
    // Giriş yapmış ama rol belirsiz — generik
    return [
      { href: homeHref(),       icon: BNAV_ICONS.home,     label: "Ana Sayfa" },
      { href: "ilanlar.html",   icon: BNAV_ICONS.listings,  label: "İlanlar" },
      { href: "harita.html",    icon: BNAV_ICONS.map,       label: "Harita" },
      { href: "mesajlar.html",  icon: BNAV_ICONS.messages,  label: "Mesajlar", badge: "bnavMsgBadge" },
      { href: profHref,         icon: BNAV_ICONS.profile,   label: "Profil" }
    ];
  }

  function renderBottomNav() {
    if (document.getElementById("kb-bottomnav")) return;
    var active = (location.pathname.split("/").pop() || "index.html");
    var items = getRoleNavItems();
    var nav = document.createElement("nav");
    nav.id = "kb-bottomnav";
    nav.className = "bottom-nav";
    nav.setAttribute("aria-label", "Alt menü");
    nav.innerHTML = items.map(function (it) {
      var itFile = it.href.split("?")[0].split("/").pop();
      var on = (itFile === active) ? " is-active" : "";
      var badge = it.badge ? '<span class="bottom-nav__badge" id="' + it.badge + '" style="display:none">0</span>' : "";
      return '<a href="' + it.href + '" class="bottom-nav__item' + on + '">' +
        '<span class="bottom-nav__ic">' + it.icon + badge + '</span>' +
        '<span class="bottom-nav__l">' + it.label + '</span>' +
      '</a>';
    }).join("");
    document.body.appendChild(nav);
    document.body.classList.add("has-bottom-nav");
  }

  /* ---------- Mobil App Bar — panel olmayan sayfalarda üst bar ---------- */
  function renderMobileAppBar() {
    if (document.getElementById("mob-app-bar")) return;
    var curFile = (location.pathname.split("/").pop() || "index.html");
    if (AUTH_FLOW_PAGES.indexOf(curFile) !== -1) return;
    if (LANDING_PAGES.indexOf(curFile) !== -1) return;
    // Panel sayfaları kendi mob-dash__header'larını kullanır
    if (document.querySelector(".mob-dash")) return;

    var title = "";
    var h1 = document.querySelector(".page-head h1");
    if (h1) title = h1.textContent.trim();
    if (!title) title = document.title.split("·")[0].trim();

    var bell = '<svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    var bar = document.createElement("header");
    bar.id = "mob-app-bar";
    bar.className = "mob-app-bar";
    bar.setAttribute("role", "banner");
    bar.innerHTML =
      '<a href="' + homeHref() + '" class="mob-app-bar__brand" aria-label="Ana Sayfa" data-home>' +
        '<img src="assets/logo.png" class="mob-app-bar__logo" alt="KB" width="30" height="30">' +
      '</a>' +
      '<div class="mob-app-bar__title" id="mobAppBarTitle">' + esc(title) + '</div>' +
      '<div class="mob-app-bar__actions">' +
        '<a href="bildirimler.html" class="mob-app-bar__icon-btn" id="mobAppBarNotifBtn" aria-label="Bildirimler">' +
          bell +
          '<span class="mob-app-bar__badge" id="mobAppBarNotifBadge" style="display:none">0</span>' +
        '</a>' +
        '<a href="profil-duzenle.html" class="mob-app-bar__avatar" id="mobAppBarAvatarLink" aria-label="Profil">' +
          '<span id="mobAppBarAvatarInner" class="mob-app-bar__avatar-inner">?</span>' +
        '</a>' +
      '</div>';

    var host = document.getElementById("app-header");
    if (host) host.appendChild(bar);
    else document.body.insertAdjacentElement("afterbegin", bar);
  }

  function updateMobileAppBar() {
    var avatarInner = document.getElementById("mobAppBarAvatarInner");
    var avatarLink  = document.getElementById("mobAppBarAvatarLink");
    if (!SESSION.user || !SESSION.profile) {
      if (avatarInner) avatarInner.textContent = "?";
      return;
    }
    var p = SESSION.profile;
    // Rol aksanı için body attribute
    if (p.role) document.body.setAttribute("data-role", p.role);
    var nm = p.ad || "";
    var ini = initials(nm) || "?";
    if (avatarInner) {
      if (p.avatar_url) {
        avatarInner.innerHTML = '<img src="' + esc(p.avatar_url) + '" alt="' + esc(nm) + '">';
      } else {
        avatarInner.textContent = ini;
      }
    }
    var rp = roleToProfile(p.role);
    if (avatarLink && rp && p.id) avatarLink.href = rp + "?id=" + p.id;
  }

  /* ---------- KuryemiBul AI widget yükleyici ---------- */
  function loadAIAssistant() {
    if (document.getElementById("kb-ai-script")) return;
    var s = document.createElement("script");
    s.id = "kb-ai-script";
    s.src = "assets/js/ai-assistant.js";
    document.head.appendChild(s);
  }

  function injectMobileUX() {
    if (document.getElementById("kb-mobile-ux-css")) return;
    var link = document.createElement("link");
    link.id = "kb-mobile-ux-css";
    link.rel = "stylesheet";
    link.href = "assets/css/mobile-ux.css";
    document.head.appendChild(link);
  }

  function init() {
    var active = (location.pathname.split("/").pop() || "index.html");
    injectMobileUX();
    renderAmbient();
    renderCanvasBg();
    renderHeader(active);
    renderFooter();
    renderVersion();
    renderWhatsApp();
    renderToTop();
    renderA11y();
    loadAIAssistant();
    renderMobileAppBar();
    renderBottomNav();
    renderCookieConsent();
    updateAuthArea();
    // Logo görseli yoksa (assets/logo.png eklenmediyse) 🛵 emojiye düş
    document.querySelectorAll(".logo__img").forEach(function (im) {
      im.addEventListener("error", function () {
        var s = document.createElement("span");
        s.className = "logo__icon"; s.setAttribute("aria-hidden", "true"); s.textContent = "🛵";
        if (im.parentNode) im.parentNode.replaceChild(s, im);
      });
    });
    // Scroll listener: yalnızca klasik header (sidebar olmayan sayfalar) için
    var hdr = document.querySelector(".header:not(.topbar)");
    var banner = document.querySelector(".demo-banner");
    if (hdr) {
      function posHeader() {
        var bh = banner ? banner.getBoundingClientRect().height : 0;
        hdr.style.top = bh + "px";
      }
      function onScroll() {
        hdr.classList.toggle("is-stuck", window.scrollY > 8);
        posHeader();
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", posHeader);
      posHeader();
      onScroll();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* ---------- Toast bildirimi (alert yerine) ---------- */
  function toast(msg, type) {
    if (!msg) return;
    var host = document.getElementById("kb-toasts");
    if (!host) { host = document.createElement("div"); host.id = "kb-toasts"; host.className = "kb-toasts"; document.body.appendChild(host); }
    var el = document.createElement("div");
    el.className = "kb-toast" + (type === "error" ? " kb-toast--err" : type === "success" ? " kb-toast--ok" : "");
    el.setAttribute("role", "status");
    el.textContent = msg;
    host.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320); }, 3800);
  }

  window.KB = {
    ROLES: ROLES, t: T,
    getRole: getRole, setRole: setRole,
    getTeklifler: getTeklifler, addTeklif: addTeklif,
    panelHref: panelHref, roleToPanel: roleToPanel,
    waLink: waLink, waNumber: WA_NUMBER, email: EMAIL, telDisplay: TEL_DISPLAY,
    levelBadge: levelBadge, stars: stars,
    getParam: getParam, findById: findById, initials: initials, esc: esc,
    toast: toast,
    // oturum
    isOnline: isOnline,
    ready: function () { return READY || Promise.resolve(); },
    session: function () { return SESSION; },
    isAuthed: function () { return !!SESSION.user; },
    currentRole: function () { return isOnline() ? (SESSION.profile && SESSION.profile.role) : getRole(); },
    // Merkezi state (MP05): KB.state oku, KB.onState(cb) abone ol, KB.setState(patch) güncelle
    state: STATE, onState: onState, setState: setState, homeHref: homeHref,
    // Navigasyon hafızası + taslak (MP05 §4/§7)
    saveView: saveView, loadView: loadView, clearView: clearView, bindDraft: bindDraft, clearDraft: clearDraft
  };

  /* ---- PWA: manifest + service worker + push izni ---- */
  (function initPWA() {
    // manifest.json bağlantısını head'e ekle
    if (!document.querySelector('link[rel="manifest"]')) {
      var ml = document.createElement('link');
      ml.rel = 'manifest';
      ml.href = '/manifest.json';
      document.head.appendChild(ml);
    }

    // Service worker kaydı
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(function () {});

    // Realtime bildirim gelince SW üzerinden sistem bildirimi göster
    var origSub = window.SB && SB.subscribeNotifications;
    if (origSub) {
      SB.subscribeNotifications = function (cb) {
        return origSub(function (notif) {
          if (typeof cb === 'function') cb(notif);
          // SW'ye mesaj gönder → sistem bildirimi
          if (navigator.serviceWorker.controller && Notification.permission === 'granted') {
            var typeIcons = {
              offer_new: '✉️', offer_accepted: '✅', offer_rejected: '❌',
              application_new: '📨', application_accepted: '✅', application_rejected: '❌',
              review_new: '⭐', kyc_verified: '🛡️', info: '🔔'
            };
            var icon = typeIcons[notif.type] || '🔔';
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: {
                title: icon + ' KuryemiBul',
                body: notif.title || notif.body || '',
                url: notif.link || '/',
                tag: notif.type || 'kb'
              }
            });
          }
        });
      };
    }

    // Push izni banner'ı: doğrudan permission istemek yerine kullanıcıya sor
    function renderPushBanner() {
      if (document.getElementById('kbPushBar')) return;
      if (localStorage.getItem('kb_push_dismissed') === '1') return;
      if (!('Notification' in window) || Notification.permission !== 'default') return;
      var bar = document.createElement('div');
      bar.id = 'kbPushBar';
      bar.className = 'cookie-bar';
      bar.innerHTML =
        '<p class="cookie-bar__txt">🔔 Teklifleri ve mesajları anında görmek için bildirimlere izin ver.</p>' +
        '<div class="cookie-bar__act">' +
          '<button type="button" class="btn btn--light btn--sm" id="pushBarDismiss">Şimdi Değil</button>' +
          '<button type="button" class="btn btn--primary btn--sm" id="pushBarAllow">İzin Ver</button>' +
        '</div>';
      document.body.appendChild(bar);
      function closeBanner(dismissed) {
        if (dismissed) localStorage.setItem('kb_push_dismissed', '1');
        bar.classList.add('is-hidden');
        setTimeout(function() { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 350);
      }
      document.getElementById('pushBarDismiss').addEventListener('click', function() { closeBanner(true); });
      document.getElementById('pushBarAllow').addEventListener('click', function() {
        closeBanner(false);
        Notification.requestPermission().then(function(perm) {
          if (perm === 'granted') subscribePush();
        });
      });
      requestAnimationFrame(function() { bar.classList.add('is-in'); });
    }

    function requestPushPermission() {
      if (Notification.permission !== 'default') return;
      if (!window.SB || !SB.savePushSubscription) return;
      if (localStorage.getItem('kb_push_dismissed') === '1') return;
      setTimeout(renderPushBanner, 4000);
    }

    function subscribePush() {
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array('BFsPHwDgi84H_TC2ObvZ8ou3_HnI-XWUPkIAaz8Z74M16fiPQLHK0UAYXgkCEzG5Bvh8kJWg46O2qKZ4dDTJf1Y')
        });
      }).then(function (sub) {
        return SB.savePushSubscription(sub);
      }).catch(function () {});
    }

    function urlBase64ToUint8Array(b64) {
      var pad = '='.repeat((4 - b64.length % 4) % 4);
      var raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
      var arr = new Uint8Array(raw.length);
      for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      return arr;
    }

    // Auth değişikliğinde push izni iste
    if (window.SB && SB.onAuthChange) {
      SB.onAuthChange(function (event) {
        if (event === 'SIGNED_IN') requestPushPermission();
      });
    }
    // Sayfa açıkken zaten giriş yapılmışsa da iste
    document.addEventListener('DOMContentLoaded', function () {
      if (window.isOnline && isOnline()) requestPushPermission();
    });
  })();
})();
