/* ============================================================
   Kuryemi Bul — app.js
   Sayfa mantığı: havuz/filtre, profil, harita, panel, teklif modalı.
   i18n.js, data.js ve components.js bu dosyadan önce yüklenmelidir.
   ============================================================ */
(function () {
  'use strict';
  var D = window.KB_DATA;
  var T = (window.KBI18N && window.KBI18N.t) || function (k) { return k; };

  /* ============ VERİ KATMANI (online=Supabase / offline=demo) ============ */
  function online() { return !!(window.KB && KB.isOnline && KB.isOnline()); }
  async function loadPool(type) {
    if (window.KB && KB.ready) await KB.ready();
    if (online()) { try { return await SB.pool(type); } catch (e) { console.warn("pool:", e); } }
    return type === "kurye" ? D.kuryeler : type === "isletme" ? D.isletmeler : D.firmalar;
  }
  async function loadProfile(type, id) {
    if (window.KB && KB.ready) await KB.ready();
    if (online()) { try { var p = await SB.profileById(id); if (p) return p; } catch (e) { console.warn("profile:", e); } }
    var src = type === "kurye" ? D.kuryeler : type === "isletme" ? D.isletmeler : D.firmalar;
    return KB.findById(src, id) || src[0];
  }
  async function loadOffers() {
    if (window.KB && KB.ready) await KB.ready();
    if (online()) { try { return await SB.myOffers(); } catch (e) { console.warn("offers:", e); } return []; }
    return D.teklifler.concat(KB.getTeklifler());
  }

  /* ============ HAVUZUM (kayıtlı profiller) ============ */
  var POOL = {}; // member_id -> true
  function canPool() { return online() && window.KB && KB.isAuthed && KB.isAuthed(); }
  async function loadPoolSet() {
    POOL = {};
    if (canPool()) { try { (await SB.poolIds()).forEach(function (id) { POOL[id] = true; }); } catch (e) {} }
  }
  function poolStar(id) {
    if (!canPool()) return "";
    var on = !!POOL[id];
    return '<button type="button" class="pool-star' + (on ? " is-on" : "") + '" data-pool="' + id + '" title="' + T(on ? "pool.added" : "pool.add") + '" aria-label="' + T(on ? "pool.added" : "pool.add") + '">' + (on ? "★" : "☆") + '</button>';
  }
  function poolBtnFull(id) {
    if (!canPool()) return "";
    var on = !!POOL[id];
    return '<button type="button" class="btn ' + (on ? "btn--light" : "btn--ghost") + ' btn--block mt-24 pool-toggle' + (on ? " is-on" : "") + '" data-pool="' + id + '">' + (on ? "★ " + T("pool.added") : "☆ " + T("pool.add")) + '</button>';
  }
  document.addEventListener("click", async function (e) {
    var b = e.target.closest("[data-pool]");
    if (!b) return;
    e.preventDefault();
    var id = b.getAttribute("data-pool");
    var on = !!POOL[id];
    b.disabled = true;
    try {
      if (on) { await SB.removeFromPool(id); POOL[id] = false; }
      else { await SB.addToPool(id); POOL[id] = true; }
      var nowOn = !on;
      document.querySelectorAll('[data-pool="' + id + '"]').forEach(function (x) {
        x.classList.toggle("is-on", nowOn);
        if (x.classList.contains("pool-star")) { x.textContent = nowOn ? "★" : "☆"; x.title = T(nowOn ? "pool.added" : "pool.add"); }
        else if (x.classList.contains("pool-toggle")) {
          x.textContent = nowOn ? "★ " + T("pool.added") : "☆ " + T("pool.add");
          x.classList.toggle("btn--light", nowOn); x.classList.toggle("btn--ghost", !nowOn);
        }
      });
      // Havuzum sayfasındaysak ve çıkardıysak kartı kaldır
      if (!nowOn && document.getElementById("myPoolGrid")) {
        var card = b.closest(".pcard"); if (card) card.remove();
        var grid = document.getElementById("myPoolGrid");
        if (grid && !grid.querySelector(".pcard")) grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' + T("pool.empty") + '</div>';
      }
    } catch (err) { alert(err.message || "Hata"); }
    b.disabled = false;
  });

  /* ============ TEKLİF MODALI ============ */
  function ensureModal() {
    if (document.getElementById("offerModal")) return;
    var div = document.createElement("div");
    div.className = "modal-overlay";
    div.id = "offerModal";
    div.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="offerTitle">' +
        '<div class="modal__head"><h3 id="offerTitle">' + T("modal.title") + '</h3>' +
          '<button class="modal__close" aria-label="' + T("modal.close") + '">&times;</button></div>' +
        '<p class="modal__sub" id="offerSub"></p>' +
        '<form id="offerForm">' +
          '<div class="field"><label for="offerMsg">' + T("modal.msgLabel") + '</label>' +
            '<textarea id="offerMsg" rows="3" placeholder="' + T("modal.msgPh") + '" required></textarea></div>' +
          '<button type="submit" class="btn btn--primary btn--block">' + T("modal.send") + '</button>' +
          '<p class="form-success" id="offerSuccess" hidden>' + T("modal.success") + '</p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(div);
    div.querySelector(".modal__close").addEventListener("click", closeModal);
    div.addEventListener("click", function (e) { if (e.target === div) closeModal(); });
  }
  function closeModal() {
    var m = document.getElementById("offerModal");
    if (m) m.classList.remove("is-open");
  }
  async function openOfferModal(targetType, targetId) {
    if (window.KB && KB.ready) await KB.ready();
    var on = online();
    if (on) {
      if (!KB.isAuthed()) { alert(T("modal.guest")); location.href = "giris.html"; return; }
    } else {
      if (KB.getRole() === "ziyaretci") { alert(T("modal.guest")); return; }
    }
    var fromRole = on ? KB.currentRole() : KB.getRole();
    var target = on ? await SB.profileById(targetId)
      : KB.findById(targetType === "kurye" ? D.kuryeler : targetType === "isletme" ? D.isletmeler : D.firmalar, targetId);
    if (!target) return;
    ensureModal();
    var m = document.getElementById("offerModal");
    document.getElementById("offerSub").innerHTML =
      "<b>" + KB.esc(T("role." + fromRole)) + "</b> → <b>" + KB.esc(target.ad) + "</b> (" + KB.esc(T("role." + targetType)) + ")";
    var form = document.getElementById("offerForm");
    var success = document.getElementById("offerSuccess");
    success.hidden = true;
    form.reset();
    form.onsubmit = async function (e) {
      e.preventDefault();
      var msg = document.getElementById("offerMsg").value.trim();
      if (!msg) return;
      try {
        if (on) { await SB.sendOffer(targetId, targetType, fromRole, msg); }
        else { KB.addTeklif({ yon: fromRole + "-" + targetType, kimdenRol: fromRole, kimeTip: targetType, kime: target.ad, mesaj: msg }); }
      } catch (err) { alert(err.message || "Hata"); return; }
      success.hidden = false;
      setTimeout(closeModal, 1600);
    };
    m.classList.add("is-open");
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-teklif]");
    if (btn) { e.preventDefault(); openOfferModal(btn.getAttribute("data-teklif"), btn.getAttribute("data-id")); }
  });

  /* ============ HAVUZ LİSTELEME ============ */
  function teklifBtn(type, id) {
    return '<button class="btn btn--light btn--sm" data-teklif="' + type + '" data-id="' + id + '">✉️ ' + T("btn.offer") + '</button>';
  }
  function viewBtn(page, id) {
    return '<a class="btn btn--primary btn--sm" href="' + page + '?id=' + id + '">' + T("btn.viewProfile") + '</a>';
  }

  function kuryeCard(k) {
    var bolge = k.bolgeler.slice(0, 2).join(", ") + (k.bolgeler.length > 2 ? "…" : "");
    return '<article class="pcard">' + poolStar(k.id) +
      '<div class="pcard__top"><div class="avatar">' + KB.initials(k.ad) + '</div>' +
        '<div><div class="pcard__name">' + KB.esc(k.ad) + '</div>' +
          '<div class="pcard__sub">' + KB.esc(k.sehir) + ' · ' + KB.esc(bolge) + '</div></div></div>' +
      '<div>' + KB.levelBadge(k.seviye) + ' ' + KB.stars(k.puan) + '</div>' +
      '<div class="pcard__meta"><span class="chip">🛵 ' + KB.esc(k.arac) + '</span>' +
        '<span class="chip">' + T("pcard.exp", { n: k.deneyim }) + '</span>' +
        '<span class="chip">' + T("pcard.deliveries", { n: k.tamamlanan }) + '</span></div>' +
      '<div class="pcard__foot">' + viewBtn("profil-kurye.html", k.id) + teklifBtn("kurye", k.id) + '</div>' +
    '</article>';
  }
  function isletmeCard(i) {
    return '<article class="pcard">' + poolStar(i.id) +
      '<div class="pcard__top"><div class="avatar avatar--blue">' + KB.initials(i.ad) + '</div>' +
        '<div><div class="pcard__name">' + KB.esc(i.ad) + '</div>' +
          '<div class="pcard__sub">' + KB.esc(i.tur) + ' · ' + KB.esc(i.sehir) + '</div></div></div>' +
      '<p class="pcard__sub">' + KB.esc(i.aciklama) + '</p>' +
      '<div class="pcard__meta"><span class="chip">📍 ' + KB.esc(i.bolge) + '</span>' +
        '<span class="chip">' + T("pcard.openListings", { n: i.acikIlan }) + '</span></div>' +
      '<div class="pcard__foot">' + viewBtn("profil-isletme.html", i.id) + teklifBtn("isletme", i.id) + '</div>' +
    '</article>';
  }
  function firmaCard(f) {
    return '<article class="pcard">' + poolStar(f.id) +
      '<div class="pcard__top"><div class="avatar avatar--navy">' + KB.initials(f.ad) + '</div>' +
        '<div><div class="pcard__name">' + KB.esc(f.ad) + '</div>' +
          '<div class="pcard__sub">' + KB.esc(f.bolgeler.join(", ")) + '</div></div></div>' +
      '<p class="pcard__sub">' + KB.esc(f.aciklama) + '</p>' +
      '<div>' + KB.stars(f.puan) + '</div>' +
      '<div class="pcard__meta"><span class="chip">👥 ' + T("pcard.capacity", { n: f.kapasite }) + '</span></div>' +
      '<div class="pcard__foot">' + viewBtn("profil-firma.html", f.id) + teklifBtn("firma", f.id) + '</div>' +
    '</article>';
  }

  async function renderPool(type) {
    var grid = document.getElementById("poolGrid");
    var countEl = document.getElementById("resultCount");
    var search = document.getElementById("fSearch");
    var sel1 = document.getElementById("fSelect1");
    var sel2 = document.getElementById("fSelect2");
    if (!grid) return;

    var src = await loadPool(type);
    await loadPoolSet();
    var cardFn = type === "kurye" ? kuryeCard : type === "isletme" ? isletmeCard : firmaCard;

    function uniq(getter) {
      var s = {}; src.forEach(function (x) { [].concat(getter(x)).forEach(function (v) { if (v) s[v] = 1; }); });
      return Object.keys(s).sort();
    }
    if (sel1) {
      if (type === "firma") fillSelect(sel1, uniq(function (x) { return x.bolgeler; }));
      else fillSelect(sel1, uniq(function (x) { return x.sehir; }));
    }
    if (type === "kurye" && sel2) fillSelect(sel2, ["standart", "profesyonel", "premium"],
      { standart: T("level.standart"), profesyonel: T("level.profesyonel"), premium: T("level.premium") });
    if (type === "isletme" && sel2) fillSelect(sel2, uniq(function (x) { return x.tur; }));

    function apply() {
      var q = (search && search.value || "").toLowerCase().trim();
      var v1 = sel1 && sel1.value;
      var v2 = sel2 && sel2.value;
      var out = src.filter(function (x) {
        var hay = (x.ad + " " + (x.sehir || "") + " " + (x.bolgeler ? x.bolgeler.join(" ") : "") + " " + (x.bolge || "") + " " + (x.tur || "") + " " + (x.aciklama || "")).toLowerCase();
        if (q && hay.indexOf(q) === -1) return false;
        if (v1) {
          if (type === "firma") { if (x.bolgeler.indexOf(v1) === -1) return false; }
          else if (x.sehir !== v1) return false;
        }
        if (v2) {
          if (type === "kurye" && x.seviye !== v2) return false;
          if (type === "isletme" && x.tur !== v2) return false;
        }
        return true;
      });
      grid.innerHTML = out.length ? out.map(cardFn).join("") :
        '<div class="empty" style="grid-column:1/-1">' + T("common.noResult") + '</div>';
      if (countEl) countEl.textContent = T("common.results", { n: out.length });
    }
    [search, sel1, sel2].forEach(function (el) { if (el) el.addEventListener("input", apply); });
    apply();
  }
  function fillSelect(sel, values, labels) {
    sel.innerHTML = '<option value="">' + T("common.all") + '</option>' + values.map(function (v) {
      return '<option value="' + KB.esc(v) + '">' + KB.esc(labels && labels[v] ? labels[v] : v) + '</option>';
    }).join("");
  }

  /* ============ PROFİL ============ */
  function box(title, inner) { return '<div class="panel-box"><h3>' + title + '</h3>' + inner + '</div>'; }
  function chips(arr) { return '<div class="taglist">' + arr.map(function (s) { return '<span class="chip">' + KB.esc(s) + '</span>'; }).join("") + '</div>'; }

  async function renderProfile(type) {
    var host = document.getElementById("profileRoot");
    if (!host) return;
    var id = KB.getParam("id");
    var x = await loadProfile(type, id);
    if (!x) { host.innerHTML = '<div class="empty">' + T("empty.generic") + '</div>'; return; }
    await loadPoolSet();

    var avatarCls = type === "kurye" ? "" : type === "isletme" ? " avatar--blue" : " avatar--navy";
    var sideExtra = "", body = "";

    if (type === "kurye") {
      sideExtra = '<div class="profile__badges">' + KB.levelBadge(x.seviye) + KB.stars(x.puan) + '</div>';
      body =
        box(T("prof.general"), '<dl class="kv">' +
          '<dt>' + T("kv.city") + '</dt><dd>' + KB.esc(x.sehir) + '</dd>' +
          '<dt>' + T("kv.vehicle") + '</dt><dd>' + KB.esc(x.arac) + '</dd>' +
          '<dt>' + T("kv.exp") + '</dt><dd>' + x.deneyim + ' ' + T("unit.years") + '</dd>' +
          '<dt>' + T("kv.completed") + '</dt><dd>' + x.tamamlanan + ' ' + T("unit.deliveries") + '</dd>' +
          '<dt>' + T("kv.regions") + '</dt><dd>' + KB.esc(x.bolgeler.join(", ")) + '</dd></dl>') +
        box(T("prof.certs"), x.sertifikalar.length ? chips(x.sertifikalar) : '<p class="pcard__sub">' + T("prof.noCert") + '</p>') +
        box(T("prof.worked"), x.calistigi.length ? chips(x.calistigi) : '<p class="pcard__sub">' + T("prof.noHistory") + '</p>') +
        box(T("prof.refs"), x.referanslar.length ?
          '<ul class="reflist">' + x.referanslar.map(function (r) {
            return '<li><span class="ref__name">' + KB.esc(r.ad) + '</span> <span class="ref__role">· ' + KB.esc(r.rol) + '</span><br>“' + KB.esc(r.not) + '”</li>';
          }).join("") + '</ul>' : '<p class="pcard__sub">' + T("prof.noRef") + '</p>');
    } else if (type === "isletme") {
      sideExtra = '<div class="profile__badges"><span class="chip">' + KB.esc(x.tur) + '</span><span class="chip">' + T("pcard.openListings", { n: x.acikIlan }) + '</span></div>';
      body =
        box(T("prof.bizInfo"), '<dl class="kv">' +
          '<dt>' + T("kv.type") + '</dt><dd>' + KB.esc(x.tur) + '</dd>' +
          '<dt>' + T("kv.cityRegion") + '</dt><dd>' + KB.esc(x.sehir) + ' · ' + KB.esc(x.bolge) + '</dd>' +
          '<dt>' + T("kv.openListing") + '</dt><dd>' + x.acikIlan + '</dd></dl>') +
        box(T("prof.about"), '<p>' + KB.esc(x.aciklama) + '</p>') +
        box(T("prof.need"), '<p>' + KB.esc(x.ihtiyac) + '</p>');
    } else {
      sideExtra = '<div class="profile__badges">' + KB.stars(x.puan) + '<span class="chip">' + x.kapasite + ' ' + T("unit.couriers") + '</span></div>';
      body =
        box(T("prof.firmInfo"), '<dl class="kv">' +
          '<dt>' + T("kv.serviceRegions") + '</dt><dd>' + KB.esc(x.bolgeler.join(", ")) + '</dd>' +
          '<dt>' + T("kv.capacity") + '</dt><dd>' + x.kapasite + ' ' + T("unit.couriers") + '</dd></dl>') +
        box(T("prof.about"), '<p>' + KB.esc(x.aciklama) + '</p>') +
        box(T("prof.services"), chips(x.hizmetler));
    }

    host.innerHTML =
      '<div class="profile">' +
        '<aside class="profile__card">' +
          '<div class="avatar' + avatarCls + '">' + KB.initials(x.ad) + '</div>' +
          '<div class="profile__name">' + KB.esc(x.ad) + '</div>' +
          '<div class="profile__sub">' + KB.esc(x.sehir || (x.bolgeler && x.bolgeler.join(", ")) || "") + '</div>' +
          sideExtra +
          '<button class="btn btn--primary btn--block" data-teklif="' + type + '" data-id="' + x.id + '">✉️ ' + T("btn.sendOffer") + '</button>' +
          poolBtnFull(x.id) +
        '</aside>' +
        '<div class="profile__body">' + body + '</div>' +
      '</div>';
  }

  /* ============ HAVUZUM SAYFASI ============ */
  async function renderMyPool() {
    var grid = document.getElementById("myPoolGrid");
    if (!grid) return;
    var countEl = document.getElementById("myPoolCount");
    if (window.KB && KB.ready) await KB.ready();
    if (!(online() && KB.isAuthed && KB.isAuthed())) {
      grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' + T("pe.loginRequired") +
        '<br><a class="btn btn--primary btn--sm mt-24" href="giris.html">' + T("cta.signin") + '</a></div>';
      if (countEl) countEl.textContent = "";
      return;
    }
    await loadPoolSet();
    var list = await SB.myPool();
    if (countEl) countEl.textContent = list.length ? T("common.results", { n: list.length }) : "";
    if (!list.length) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' + T("pool.empty") + '</div>'; return; }
    grid.innerHTML = list.map(function (x) {
      return x.role === "kurye" ? kuryeCard(x) : x.role === "isletme" ? isletmeCard(x) : firmaCard(x);
    }).join("");
  }

  /* ============ HARİTA ============ */
  async function initMap() {
    var el = document.getElementById("map");
    if (!el || typeof L === "undefined") return;
    var map = L.map("map").setView([39.5, 33.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);

    function mk(items, type, color, emoji) {
      var group = L.layerGroup();
      items.forEach(function (x) {
        if (x.lat == null || x.lng == null) return;
        var icon = L.divIcon({
          className: "", html: '<div style="background:' + color + ';width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.3);display:grid;place-items:center"><span style="transform:rotate(45deg);font-size:15px">' + emoji + '</span></div>',
          iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28]
        });
        var page = type === "kurye" ? "profil-kurye.html" : type === "isletme" ? "profil-isletme.html" : "profil-firma.html";
        L.marker([x.lat, x.lng], { icon: icon }).addTo(group)
          .bindPopup('<div class="map-popup"><b>' + KB.esc(x.ad) + '</b>' +
            (x.sehir ? KB.esc(x.sehir) : KB.esc((x.bolgeler || []).join(", "))) +
            '<br><a href="' + page + '?id=' + x.id + '">' + T("map.viewProfile") + '</a></div>');
      });
      return group;
    }

    var kData = await loadPool("kurye"), iData = await loadPool("isletme"), fData = await loadPool("firma");
    var layers = {
      kurye: mk(kData, "kurye", "#FF6B35", "🛵"),
      isletme: mk(iData, "isletme", "#2D6CDF", "📦"),
      firma: mk(fData, "firma", "#1A1A2E", "🏢")
    };
    Object.keys(layers).forEach(function (k) { layers[k].addTo(map); });
    document.querySelectorAll("[data-layer]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var k = cb.getAttribute("data-layer");
        if (cb.checked) layers[k].addTo(map); else map.removeLayer(layers[k]);
      });
    });
  }

  /* ============ ANA SAYFA HARİTASI (seçmeli tek harita) ============ */
  function homeMarker(map, group, x, type) {
    if (x.lat == null || x.lng == null) return;
    var colors = { kurye: "#22D3EE", isletme: "#3B82F6", firma: "#A78BFA" };
    var emojis = { kurye: "🛵", isletme: "📦", firma: "🏢" };
    var pages = { kurye: "profil-kurye.html", isletme: "profil-isletme.html", firma: "profil-firma.html" };
    var icon = L.divIcon({
      className: "", html: '<div style="background:' + colors[type] + ';width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.5);display:grid;place-items:center"><span style="transform:rotate(45deg);font-size:15px">' + emojis[type] + '</span></div>',
      iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28]
    });
    L.marker([x.lat, x.lng], { icon: icon }).addTo(group)
      .bindPopup('<div class="map-popup"><b>' + KB.esc(x.ad) + '</b>' +
        (x.sehir ? KB.esc(x.sehir) : KB.esc((x.bolgeler || []).join(", "))) +
        '<br><a href="' + pages[type] + '?id=' + x.id + '">' + T("map.viewProfile") + '</a></div>');
  }
  async function initHomeMap() {
    var el = document.getElementById("map");
    if (!el || typeof L === "undefined") return;
    var map = L.map("map", { scrollWheelZoom: false }).setView([39.5, 33.5], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);

    var data = { kurye: await loadPool("kurye"), isletme: await loadPool("isletme"), firma: await loadPool("firma") };
    var layers = {};
    Object.keys(data).forEach(function (type) {
      var g = L.layerGroup();
      data[type].forEach(function (x) { homeMarker(map, g, x, type); });
      layers[type] = g;
    });

    var current = null;
    function show(type) {
      if (current && layers[current]) map.removeLayer(layers[current]);
      layers[type].addTo(map); current = type;
      var pts = data[type].filter(function (x) { return x.lat != null && x.lng != null; }).map(function (x) { return [x.lat, x.lng]; });
      if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 11 });
      document.querySelectorAll("[data-mapseg]").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-mapseg") === type); });
    }
    document.querySelectorAll("[data-mapseg]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-mapseg")); });
    });
    show("kurye");
    setTimeout(function () { map.invalidateSize(); }, 200);
  }

  /* ============ PANEL / DASHBOARD ============ */
  function metric(num, label) { return '<div class="metric"><div class="metric__num">' + num + '</div><div class="metric__label">' + label + '</div></div>'; }
  function listRow(title, sub, right) {
    return '<div class="list-row"><div class="list-row__main"><div class="list-row__title">' + title +
      '</div><div class="list-row__sub">' + sub + '</div></div>' + (right || "") + '</div>';
  }
  function stateChip(durum) {
    var key = durum || "pending";
    return '<span class="chip">' + T("state." + key, {}) + '</span>';
  }
  var KNOWN_STATES = ["pending", "active", "published", "applied", "accepted", "rejected"];
  function offerAction(t) {
    var durum = t.durum || "pending";
    // Yalnız bana GELEN ve hâlâ BEKLEYEN teklifler kabul/ret edilebilir (RLS: alıcı günceller)
    if (online() && t.gelen && durum === "pending") {
      return '<span class="offer-act" data-offer-id="' + t.id + '" data-offer-karsi="' + (t.karsiId || "") + '">' +
        '<button type="button" class="btn btn--primary btn--sm" data-offer-act="accepted">' + T("offer.accept") + '</button>' +
        '<button type="button" class="btn btn--light btn--sm" data-offer-act="rejected">' + T("offer.reject") + '</button>' +
        '</span>';
    }
    var st = KNOWN_STATES.indexOf(durum) > -1 ? T("state." + durum) : T("state.pending");
    return '<span class="offer-act"><span class="chip">' + st + '</span></span>';
  }
  function contactLine(c) {
    if (!c || (!c.telefon && !c.email)) return "";
    return ' · 📞 ' + KB.esc(c.telefon || c.email);
  }
  function soonInline() { return '<div class="empty">' + T("soon.feature") + '</div>'; }
  function renderOfferRows(rows) {
    if (!rows.length) return '<div class="empty">' + T("empty.offers") + '</div>';
    return rows.map(function (t) {
      var from = t.kimdenRol ? T("role." + t.kimdenRol) : (t.kimden || "");
      var who = t.kime ? (KB.esc(from) + " → " + KB.esc(t.kime)) : KB.esc(from);
      var dir = (online() && typeof t.gelen === "boolean")
        ? '<span class="chip chip--dir">' + (t.gelen ? "↓ " + T("offer.incoming") : "↑ " + T("offer.outgoing")) + '</span>'
        : "";
      var sub = KB.esc(t.mesaj || "") + " · " + KB.esc(t.tarih || "") + contactLine(t.iletisim);
      return listRow(who, sub, dir + offerAction(t));
    }).join("");
  }
  // Kabul/Reddet tıklamaları (online): durumu güncelle, satırı yerinde yenile
  document.addEventListener("click", async function (e) {
    var b = e.target.closest("[data-offer-act]");
    if (!b) return;
    var wrap = b.closest(".offer-act");
    var id = wrap && wrap.getAttribute("data-offer-id");
    var act = b.getAttribute("data-offer-act");
    if (!id) return;
    [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.disabled = true; });
    try {
      var r = await SB.updateOffer(id, act);
      if (r && r.error) throw r.error;
      wrap.innerHTML = '<span class="chip">' + T("state." + act) + '</span>';
      // Kabul edilince karşı tarafın iletişimi artık görünür (RLS açar)
      if (act === "accepted") {
        var karsiId = wrap.getAttribute("data-offer-karsi");
        try {
          var c = await SB.contactOf(karsiId);
          var subEl = wrap.closest(".list-row") && wrap.closest(".list-row").querySelector(".list-row__sub");
          if (subEl && c && (c.telefon || c.email)) subEl.innerHTML += contactLine(c);
        } catch (e) { /* iletişim okunamadıysa sessiz geç */ }
      }
    } catch (err) {
      alert(err.message || T("offer.actErr"));
      [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.disabled = false; });
    }
  });

  function showPanel(key) {
    document.querySelectorAll(".dash__panel").forEach(function (p) { p.classList.toggle("is-active", p.id === "panel-" + key); });
    document.querySelectorAll(".dash__nav button").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-tab") === key); });
  }
  async function initPanel(role) {
    var nav = document.querySelector(".dash__nav");
    if (!nav) return;
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-tab]");
      if (b) showPanel(b.getAttribute("data-tab"));
    });
    showPanel(nav.querySelector("button[data-tab]").getAttribute("data-tab"));

    var offers = await loadOffers();
    // Kabul edilmiş teklifler için karşı tarafın iletişimini önceden çek (RLS izin verirse)
    if (online() && SB.contactOf) {
      await Promise.all(offers.map(async function (o) {
        if (o.durum === "accepted" && o.karsiId) {
          try { var c = await SB.contactOf(o.karsiId); if (c) o.iletisim = c; } catch (e) {}
        }
      }));
    }
    function listFor(roleKey) {
      var rows = online() ? offers : offers.filter(function (t) { return t.kimdenRol === roleKey || t.kimeTip === roleKey; });
      return renderOfferRows(rows);
    }
    var offerCount = online() ? offers.length : (KB.getTeklifler().length + D.teklifler.length);
    var prof = (online() && KB.session()) ? KB.session().profile : null;

    if (role === "kurye") {
      var pu = prof ? (Number(prof.puan) || 0).toFixed(1) : "4.9";
      var sv = prof ? T("level." + (prof.seviye || "standart")) : T("level.premium");
      var tm = prof ? (prof.tamamlanan || 0) : "1.240";
      setHTML("kuryeMetrics", metric(pu, T("m.score")) + metric(sv, T("m.level")) + metric(tm, T("m.deliveries")) + metric(offerCount, T("m.offers")));
      // İlan/başvuru sistemi henüz yok → online'da dürüstçe "yakında", offline demoda örnek
      setHTML("kuryeBasvuru", online() ? soonInline() : D.ilanlar.filter(function (i) { return i.tip === "kurye-ilani"; }).map(function (i) {
        return listRow(KB.esc(i.baslik), KB.esc(i.sehir) + " · " + KB.esc(i.bolge), '<span class="chip">' + T("state.applied") + '</span>');
      }).join(""));
      setHTML("kuryeTeklif", listFor("kurye"));
    } else if (role === "isletme") {
      var ai = prof ? (prof.acikIlan || 0) : "3";
      // Görüşme/memnuniyet için gerçek veri yok → online'da "—"
      setHTML("isletmeMetrics", metric(ai, T("m.openListings")) + metric(offerCount, T("m.offers")) + metric(online() ? "—" : "12", T("m.meetings")) + metric(online() ? "—" : "4.7", T("m.satisfaction")));
      setHTML("isletmeIlan", online() ? soonInline() : D.ilanlar.filter(function (i) { return i.tip !== "ihale"; }).map(function (i) {
        return listRow(KB.esc(i.baslik), T("soon.published") + " · " + KB.esc(i.tarih), '<span class="chip">' + T("state.active") + '</span>');
      }).join(""));
      setHTML("isletmeBasvuru", listFor("isletme"));
    } else if (role === "firma") {
      var kp = prof ? (prof.kapasite || 0) : "60";
      var fpu = prof ? (Number(prof.puan) || 0).toFixed(1) : "4.8";
      // İhale modülü Faz 3 → online'da "—"
      setHTML("firmaMetrics", metric(kp, T("m.capacity")) + metric(fpu, T("m.score")) + metric(offerCount, T("m.offers")) + metric(online() ? "—" : "2", T("m.tenders")));
      var kuryeler = await loadPool("kurye");
      setHTML("firmaPersonel", kuryeler.slice(0, 5).map(function (k) {
        return listRow(KB.esc(k.ad), KB.esc(k.sehir) + " · " + k.deneyim + " " + T("unit.years"), KB.levelBadge(k.seviye));
      }).join(""));
      setHTML("firmaTeklif", listFor("firma"));
    }
  }
  function setHTML(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html || '<div class="empty">' + T("empty.generic") + '</div>'; }

  /* ============ DIŞA AÇIM ============ */
  window.KBApp = {
    renderPool: renderPool, renderProfile: renderProfile,
    initMap: initMap, initHomeMap: initHomeMap, initPanel: initPanel, openOfferModal: openOfferModal,
    renderMyPool: renderMyPool
  };
})();
