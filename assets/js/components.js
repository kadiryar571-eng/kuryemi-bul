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
    { href: "ilanlar.html", key: "nav.ilanlar" },
    { href: "ihaleler.html", key: "nav.ihaleler" },
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
          '<nav class="footer__links" aria-label="Yasal">' +
            '<h4>' + T("footer.legal") + '</h4>' +
            '<a href="kvkk.html">' + T("footer.kvkk") + '</a>' +
            '<a href="gizlilik.html">' + T("footer.privacy") + '</a>' +
            '<a href="sartlar.html">' + T("footer.terms") + '</a>' +
            '<a href="cerez.html">' + T("footer.cookies") + '</a>' +
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
      return '<a href="havuzum.html" class="auth-link">★ ' + T("nav.pool") + '</a>' +
        '<a href="bildirimler.html" class="auth-link notif-bell" aria-label="' + T("notif.title") + '" title="' + T("notif.title") + '">🔔<span class="badge-count" id="notifBadge" style="display:none">0</span></a>' +
        '<a href="' + ph + '" class="btn btn--primary btn--sm nav__cta">' + T("cta.panel") + '</a>' +
        '<div class="acct" id="acctMenu">' +
          '<button type="button" class="acct__btn" id="acctBtn" aria-haspopup="true" aria-expanded="false" title="' + esc(SESSION.user.email || "") + '">' +
            '<span class="acct__ava">👤</span><span class="acct__name">' + esc(nm) + '</span><span class="acct__caret" aria-hidden="true">▾</span></button>' +
          '<div class="acct__menu" role="menu">' +
            '<a href="havuzum.html" role="menuitem" class="acct__cmd">★ ' + T("nav.pool") + '</a>' +
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

  async function updateAuthArea() {
    var area = document.getElementById("authArea");
    if (!area) return;
    if (isOnline()) { area.innerHTML = '<span class="user-chip">…</span>'; await READY; }
    area.innerHTML = buildAuthArea();
    wireAuthArea();
    // Bildirim rozeti: okunmamış bildirim sayısı (+ anlık güncelleme)
    if (isOnline() && SESSION.user && window.SB && SB.unreadCount) {
      var setBadge = function (n) {
        var b = document.getElementById("notifBadge");
        if (!b) return;
        if (n > 0) { b.textContent = n > 99 ? "99+" : n; b.style.display = ""; }
        else { b.style.display = "none"; }
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
    // Yönetim menü öğesi: yalnız adminlere göster
    if (isOnline() && SESSION.user && window.SB && SB.amIAdmin) {
      SB.amIAdmin().then(function (ok) {
        if (ok) { var ai = area.querySelector(".acct__admin"); if (ai) ai.hidden = false; }
      }).catch(function () {});
    }
  }

  /* ---------- Paylaşılan canvas ağ arka planı (landing DNA'sı) ---------- */
  function renderCanvasBg() {
    // Landing'de zaten kendi canvas'ı var (net-canvas) — orada ekleme
    if (document.getElementById("net-canvas") || document.getElementById("kb-canvas")) return;
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var cv = document.createElement("canvas");
    cv.id = "kb-canvas";
    cv.setAttribute("aria-hidden", "true");
    document.body.insertBefore(cv, document.body.firstChild);
    if (reduced) return;
    var ctx = cv.getContext("2d"), W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [], couriers = [];
    function resize() {
      W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR;
      cv.style.width = innerWidth + "px"; cv.style.height = innerHeight + "px";
      var count = Math.min(60, Math.round(innerWidth * innerHeight / 26000));
      nodes = [];
      for (var i = 0; i < count; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.16 * DPR, vy: (Math.random() - 0.5) * 0.16 * DPR });
      couriers = [];
      for (var j = 0; j < Math.max(4, (count / 7) | 0); j++) couriers.push({ a: (Math.random() * count) | 0, b: (Math.random() * count) | 0, t: Math.random(), sp: 0.0015 + Math.random() * 0.002 });
    }
    var MAXD;
    function tick() {
      MAXD = 150 * DPR; ctx.clearRect(0, 0, W, H);
      var i, a, b;
      for (i = 0; i < nodes.length; i++) { var n = nodes[i]; n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > W) n.vx *= -1; if (n.y < 0 || n.y > H) n.vy *= -1; }
      for (a = 0; a < nodes.length; a++) for (b = a + 1; b < nodes.length; b++) {
        var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < MAXD) { ctx.strokeStyle = "rgba(110,150,230," + ((1 - d / MAXD) * 0.15) + ")"; ctx.lineWidth = DPR * 0.55; ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke(); }
      }
      for (i = 0; i < nodes.length; i++) { ctx.fillStyle = "rgba(150,180,240,0.42)"; ctx.beginPath(); ctx.arc(nodes[i].x, nodes[i].y, DPR * 1.25, 0, 6.2832); ctx.fill(); }
      for (var c = 0; c < couriers.length; c++) {
        var cu = couriers[c], na = nodes[cu.a], nb = nodes[cu.b]; if (!na || !nb) continue;
        cu.t += cu.sp; if (cu.t > 1) { cu.t = 0; cu.a = cu.b; cu.b = (Math.random() * nodes.length) | 0; }
        var x = na.x + (nb.x - na.x) * cu.t, y = na.y + (nb.y - na.y) * cu.t;
        var g = ctx.createRadialGradient(x, y, 0, x, y, DPR * 9);
        g.addColorStop(0, "rgba(34,211,238,0.9)"); g.addColorStop(1, "rgba(34,211,238,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, DPR * 9, 0, 6.2832); ctx.fill();
        ctx.fillStyle = "#dffaff"; ctx.beginPath(); ctx.arc(x, y, DPR * 1.6, 0, 6.2832); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize(); tick();
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 200); });
  }

  /* ---------- Ambient orb katmanı (markup ile, landing bg-fx gibi) ---------- */
  function renderAmbient() {
    if (document.querySelector(".bg-fx")) return;
    var d = document.createElement("div");
    d.className = "bg-fx"; d.setAttribute("aria-hidden", "true");
    d.innerHTML = '<span class="orb orb--1"></span><span class="orb orb--2"></span><span class="orb orb--3"></span>';
    document.body.insertBefore(d, document.body.firstChild);
    document.body.classList.add("kb-page");
  }

  function init() {
    var active = (location.pathname.split("/").pop() || "index.html");
    renderAmbient();
    renderCanvasBg();
    renderHeader(active);
    renderFooter();
    renderWhatsApp();
    renderToTop();
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
    // Scroll listener: header şeffaf başlar, scroll'da cam olur (landing nav gibi)
    // demo-banner varsa header onun altına yerleşir
    var hdr = document.querySelector(".header");
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
      posHeader(); // başlangıç konumu
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
    currentRole: function () { return isOnline() ? (SESSION.profile && SESSION.profile.role) : getRole(); }
  };
})();
