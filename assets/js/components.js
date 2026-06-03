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

  var NAV = [
    { href: "index.html", key: "nav.home" },
    { href: "kuryeler.html", key: "nav.couriers" },
    { href: "isletmeler.html", key: "nav.businesses" },
    { href: "firmalar.html", key: "nav.firms" },
    { href: "harita.html", key: "nav.map" },
    { href: "iletisim.html", key: "nav.contact" }
  ];

  // Sosyal medya hesaplari — adres girilince footer'da otomatik gorunur (bos = gizli)
  var SOCIAL = { instagram: "", x: "", linkedin: "" };

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

  /* ---------- Header ---------- */
  function renderHeader(activePage) {
    var host = document.getElementById("app-header");
    if (!host) return;
    var role = getRole();

    var navLinks = NAV.map(function (n) {
      var active = n.href === activePage ? " is-active" : "";
      return '<a href="' + n.href + '" class="' + active.trim() + '">' + T(n.key) + '</a>';
    }).join("");

    var roleOptions = ROLE_KEYS.map(function (k) {
      return '<option value="' + k + '"' + (k === role ? " selected" : "") + '>' + T("role." + k) + '</option>';
    }).join("");

    var panelLabel = role === "ziyaretci" ? T("cta.signin") : T("cta.panel");
    var otherLang = window.KBI18N ? window.KBI18N.other().toUpperCase() : "EN";

    host.innerHTML =
      '<div class="demo-banner">' + T("demo.banner") + '</div>' +
      '<header class="header">' +
        '<div class="container header__inner">' +
          '<a href="index.html" class="logo" aria-label="Kuryemi Bul">' +
            '<img class="logo__img" src="assets/logo.png" alt="Kuryemi Bul">' +
            '<span class="logo__text">Kuryemi&nbsp;Bul</span>' +
          '</a>' +
          '<button class="nav-toggle" id="navToggle" aria-label="Menü" aria-expanded="false" aria-controls="anaMenu">' +
            '<span></span><span></span><span></span>' +
          '</button>' +
          '<nav class="nav" id="anaMenu" aria-label="Ana menü">' +
            navLinks +
            '<button id="themeToggle" class="theme-toggle" aria-label="' + T("theme.toggle") + '" title="' + T("theme.toggle") + '">' + (getTheme() === "light" ? "🌙" : "☀️") + '</button>' +
            '<button id="langToggle" class="lang-toggle" aria-label="' + T("lang.aria") + '">🌐 ' + otherLang + '</button>' +
            '<span id="authArea" class="auth-area"></span>' +
          '</nav>' +
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
    }
    var langToggle = document.getElementById("langToggle");
    if (langToggle && window.KBI18N) langToggle.addEventListener("click", function () { window.KBI18N.setLang(window.KBI18N.other()); });

    var themeToggle = document.getElementById("themeToggle");
    if (themeToggle) themeToggle.addEventListener("click", function () {
      var next = getTheme() === "light" ? "dark" : "light";
      setTheme(next);
      themeToggle.textContent = next === "light" ? "🌙" : "☀️";
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
          '<div class="footer__contact">' +
            '<h4>' + T("footer.contact") + '</h4>' +
            '<p><a href="mailto:' + EMAIL + '">' + EMAIL + '</a></p>' +
            '<p><a href="tel:+' + WA_NUMBER + '">' + TEL_DISPLAY + '</a></p>' +
            '<div class="socials" aria-label="Sosyal medya">' + socials + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="footer__bottom"><p>' + new Date().getFullYear() + ' ' + T("footer.rights") + '</p></div>' +
      '</footer>';
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

  /* ---------- Oturum (Supabase) ---------- */
  var SESSION = { loaded: false, user: null, profile: null };

  function isOnline() { return !!(window.SB && SB.isOn()); }
  function roleToPanel(r) {
    if (r === "kurye") return "panel-kurye.html";
    if (r === "isletme") return "panel-isletme.html";
    if (r === "firma") return "panel-firma.html";
    return "giris.html";
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
      var nm = (SESSION.profile && SESSION.profile.ad) || SESSION.user.email || "Hesabım";
      var ph = roleToPanel(SESSION.profile && SESSION.profile.role);
      return '<a href="havuzum.html" class="auth-link">★ ' + T("nav.pool") + '</a>' +
        '<a href="' + ph + '" class="btn btn--primary btn--sm nav__cta">' + T("cta.panel") + '</a>' +
        '<a href="profil-duzenle.html" class="user-chip" title="' + esc(SESSION.user.email || "") + '">👤 ' + esc(nm) + '</a>' +
        '<button id="logoutBtn" type="button" class="lang-toggle">' + T("cta.signout") + '</button>';
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
  }

  async function updateAuthArea() {
    var area = document.getElementById("authArea");
    if (!area) return;
    if (isOnline()) { area.innerHTML = '<span class="user-chip">…</span>'; await READY; }
    area.innerHTML = buildAuthArea();
    wireAuthArea();
  }

  function init() {
    var active = (location.pathname.split("/").pop() || "index.html");
    renderHeader(active);
    renderFooter();
    renderWhatsApp();
    renderToTop();
    updateAuthArea();
    // Logo görseli yoksa (assets/logo.png eklenmediyse) 🛵 emojiye düş
    document.querySelectorAll(".logo__img").forEach(function (im) {
      im.addEventListener("error", function () {
        var s = document.createElement("span");
        s.className = "logo__icon"; s.setAttribute("aria-hidden", "true"); s.textContent = "🛵";
        if (im.parentNode) im.parentNode.replaceChild(s, im);
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.KB = {
    ROLES: ROLES, t: T,
    getRole: getRole, setRole: setRole,
    getTeklifler: getTeklifler, addTeklif: addTeklif,
    panelHref: panelHref, roleToPanel: roleToPanel,
    waLink: waLink, waNumber: WA_NUMBER, email: EMAIL, telDisplay: TEL_DISPLAY,
    levelBadge: levelBadge, stars: stars,
    getParam: getParam, findById: findById, initials: initials, esc: esc,
    // oturum
    isOnline: isOnline,
    ready: function () { return READY || Promise.resolve(); },
    session: function () { return SESSION; },
    isAuthed: function () { return !!SESSION.user; },
    currentRole: function () { return isOnline() ? (SESSION.profile && SESSION.profile.role) : getRole(); }
  };
})();
