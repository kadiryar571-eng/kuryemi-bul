/* ============================================================
   Kuryemi Bul — app.js
   Sayfa mantığı: havuz/filtre, profil, harita, panel, teklif modalı.
   i18n.js, data.js ve components.js bu dosyadan önce yüklenmelidir.
   ============================================================ */
(function () {
  'use strict';
  var D = window.KB_DATA;
  var T = (window.KBI18N && window.KBI18N.t) || function (k) { return k; };
  // Aksan/Türkçe-İ bağımsız normalize (arama için): "İstanbul" ~ "istanbul", "Şişli" ~ "sisli"
  function norm(s) {
    s = String(s == null ? "" : s).normalize("NFD"); var o = "";
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c >= 0x300 && c <= 0x36f) continue; o += s.charAt(i); }
    return o.toLowerCase().trim();
  }

  // İskelet (skeleton) yükleme kartları — grid'e basılır, gerçek veri gelince değişir
  function skeletonCards(n) {
    var one = '<div class="skel-card">' +
      '<div class="skel-card__top"><span class="skel skel--ava"></span>' +
      '<span style="flex:1"><span class="skel skel--line" style="width:62%"></span><span class="skel skel--line" style="width:40%;margin-top:8px"></span></span></div>' +
      '<span class="skel skel--line" style="width:90%;margin-top:14px"></span>' +
      '<span class="skel skel--chips" style="margin-top:14px"></span></div>';
    var out = ""; for (var i = 0; i < (n || 6); i++) out += one; return out;
  }

  // Avatar içeriği: fotoğraf varsa <img>, yoksa baş harfler. (.avatar div'inin içine konur)
  function avInner(x) {
    if (x && x.avatar_url) {
      return '<img class="avatar__img" src="' + KB.esc(x.avatar_url) + '" alt="" onerror="this.remove()">';
    }
    return KB.initials((x && x.ad) || "?");
  }

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
        var card = b.closest(".talent-card") || b.closest(".pcard"); if (card) card.remove();
        var grid = document.getElementById("myPoolGrid");
        if (grid && !grid.querySelector(".pcard")) grid.innerHTML = '<div class="empty" style="grid-column:1/-1">' + T("pool.empty") + '</div>';
      }
    } catch (err) { KB.toast(err.message || "Hata", "error"); }
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
          '<p class="modal__consent">🔒 ' + T("modal.consent") + ' <a href="kvkk.html" target="_blank" rel="noopener">' + T("modal.consentLink") + '</a></p>' +
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
      if (!KB.isAuthed()) { KB.toast(T("modal.guest"), "error"); setTimeout(function () { location.href = "giris.html"; }, 1200); return; }
    } else {
      if (KB.getRole() === "ziyaretci") { KB.toast(T("modal.guest"), "error"); return; }
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
      } catch (err) { KB.toast(err.message || "Hata", "error"); return; }
      success.hidden = false;
      setTimeout(closeModal, 1600);
    };
    m.classList.add("is-open");
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-teklif]");
    if (btn) { e.preventDefault(); openOfferModal(btn.getAttribute("data-teklif"), btn.getAttribute("data-id")); }
  });

  /* ============ İLAN & BAŞVURU ============ */
  function val2(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }

  /* kaydedilen ilanlar (localStorage — ilan favorisi için backend tablosu yok) */
  function getSavedJobs() { try { return JSON.parse(localStorage.getItem("kb_saved_jobs")) || []; } catch (e) { return []; } }
  function isSavedJob(id) { return getSavedJobs().indexOf(String(id)) > -1; }
  function toggleSavedJob(id) {
    id = String(id); var s = getSavedJobs(); var i = s.indexOf(id);
    if (i > -1) s.splice(i, 1); else s.push(id);
    localStorage.setItem("kb_saved_jobs", JSON.stringify(s)); return i === -1;
  }
  function daysSince(dateStr) { if (!dateStr) return 9999; var d = new Date(dateStr + "T00:00:00"); if (isNaN(d.getTime())) return 9999; return Math.floor((Date.now() - d.getTime()) / 86400000); }
  function isFresh(dateStr) { var n = daysSince(dateStr); return n >= 0 && n <= 3; }
  function timeAgo(dateStr) {
    var n = daysSince(dateStr);
    if (n >= 9999) return KB.esc(dateStr || "");
    if (n <= 0) return T("ilan.today");
    if (n === 1) return T("ilan.yesterday");
    return T("ilan.daysAgo", { n: n });
  }
  // favori (kalp) tıklaması — tüm kopya butonları senkron güncelle
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-savejob]");
    if (!b) return;
    e.preventDefault();
    var id = b.getAttribute("data-savejob");
    var on = toggleSavedJob(id);
    document.querySelectorAll('[data-savejob="' + id + '"]').forEach(function (x) {
      x.classList.toggle("is-on", on);
      x.textContent = on ? "♥" : "♡";
      x.setAttribute("aria-pressed", on ? "true" : "false");
      var lbl = T(on ? "ilan.saved" : "ilan.save"); x.setAttribute("aria-label", lbl); x.title = lbl;
    });
    // Kayıtlı İlanlar görünümünde çıkarılan ilanın kartını anında kaldır
    if (!on) {
      var sg = document.getElementById("savedJobsGrid");
      if (sg && b.closest("#savedJobsGrid")) {
        var card = b.closest(".job-card"); if (card) card.remove();
        var left = sg.querySelectorAll(".job-card").length;
        var cnt = document.getElementById("savedJobsCount"); if (cnt) cnt.textContent = left ? T("fav.count", { n: left }) : "";
        if (!left) sg.innerHTML = savedEmpty();
      }
    }
  });

  function listingCard(l, appliedSet, myPid) {
    var owner = l.owner_id === myPid;
    var applied = appliedSet[l.id];
    var loc = [l.sehir, l.bolge].filter(Boolean).join(" · ");
    var score = talentScore(l.id);
    var saved = isSavedJob(l.id);
    var action;
    if (!canPool()) action = '<a class="btn btn--light btn--sm" href="giris.html">' + T("cta.signin") + '</a>';
    else if (owner) action = '<span class="chip">' + T("ilan.own") + '</span>';
    else if (applied) action = '<span class="chip chip--ok">' + T("ilan.applied") + '</span>';
    else action = '<button class="btn btn--primary btn--sm" data-apply="' + l.id + '" data-baslik="' + KB.esc(l.baslik) + '" data-company="' + KB.esc(l.sahip || "") + '" data-loc="' + KB.esc(loc) + '">' + T("ilan.apply") + '</button>';
    var tags = '<span class="chip chip--open">● ' + T("ilan.statusOpen") + '</span>' +
      (l.arac ? '<span class="chip">🛵 ' + KB.esc(l.arac) + '</span>' : '') +
      (isFresh(l.tarih) ? '<span class="chip chip--new">' + T("ilan.new") + '</span>' : '');
    return '<article class="job-card" data-job="' + l.id + '">' +
      '<button type="button" class="job-fav' + (saved ? " is-on" : "") + '" data-savejob="' + l.id + '" aria-pressed="' + (saved ? "true" : "false") + '" aria-label="' + T(saved ? "ilan.saved" : "ilan.save") + '" title="' + T(saved ? "ilan.saved" : "ilan.save") + '">' + (saved ? "♥" : "♡") + '</button>' +
      '<div class="employer-badge">' +
        '<div class="employer-badge__av">' + KB.initials(l.sahip || "?") + '</div>' +
        '<span class="employer-badge__name">' + KB.esc(l.sahip || T("ilan.unknown")) + '</span>' +
      '</div>' +
      '<a class="job-card__title" href="ilan.html?id=' + l.id + '">' + KB.esc(l.baslik) + '</a>' +
      '<div class="job-card__tags">' + tags + '</div>' +
      (loc ? '<div class="job-card__meta">📍 ' + KB.esc(loc) + '</div>' : '') +
      (l.aciklama ? '<p class="pcard__sub">' + KB.esc(l.aciklama) + '</p>' : '') +
      '<div class="job-card__foot">' +
        action +
        '<div style="display:flex;align-items:center;gap:8px"><span class="match-score">%' + score + ' Uyum</span><span class="job-posted">' + timeAgo(l.tarih) + '</span></div>' +
      '</div>' +
    '</article>';
  }
  function uniqVals(list, getter) {
    var s = {}; list.forEach(function (x) { var v = getter(x); if (v) s[v] = 1; }); return Object.keys(s).sort();
  }
  function fillFilterSelect(sel, values, allLabel) {
    if (!sel) return;
    sel.innerHTML = '<option value="">' + allLabel + '</option>' +
      values.map(function (v) { return '<option value="' + KB.esc(v) + '">' + KB.esc(v) + '</option>'; }).join("");
  }
  function emptyState(icon, title, sub, withClear) {
    return '<div class="kb-empty" style="grid-column:1/-1"><div class="kb-empty__ic">' + icon + '</div>' +
      '<div class="kb-empty__t">' + title + '</div>' +
      (sub ? '<div class="kb-empty__d">' + sub + '</div>' : '') +
      (withClear ? '<button type="button" class="btn btn--primary btn--sm mt-24" id="jobClearFilters">' + T("ilan.clearFilters") + '</button>' : '') +
      '</div>';
  }
  // İlan listesi modül durumu — handler hep güncel veriyi okur (re-render güvenli)
  var JOBS = { list: [], appliedSet: {}, myPid: null };

  /* ---- akıllı arama: son aramalar + öneriler ---- */
  function getRecentSearches() { try { return JSON.parse(localStorage.getItem("kb_recent_searches")) || []; } catch (e) { return []; } }
  function pushRecentSearch(q) {
    q = (q || "").trim(); if (!q) return;
    var s = getRecentSearches().filter(function (x) { return x.toLowerCase() !== q.toLowerCase(); });
    s.unshift(q); localStorage.setItem("kb_recent_searches", JSON.stringify(s.slice(0, 6)));
  }
  function buildSuggestHtml(q) {
    q = norm(q);
    var groups = [];
    function uniqMatch(getter, limit) {
      var seen = {}, out = [];
      JOBS.list.forEach(function (l) { var v = getter(l); if (!v) return; var k = norm(v); if (seen[k]) return; if (q && k.indexOf(q) === -1) return; seen[k] = 1; out.push(v); });
      return out.slice(0, limit);
    }
    if (!q) {
      var rec = getRecentSearches();
      if (rec.length) groups.push({ label: T("search.recent"), icon: "🕘", clear: true, items: rec });
    } else {
      var add = function (label, icon, vals) { if (vals.length) groups.push({ label: label, icon: icon, items: vals }); };
      add(T("search.positions"), "💼", uniqMatch(function (l) { return l.baslik; }, 4));
      add(T("search.companies"), "🏢", uniqMatch(function (l) { return l.sahip; }, 3));
      add(T("search.cities"), "📍", uniqMatch(function (l) { return l.sehir; }, 3));
      add(T("search.districts"), "🗺️", uniqMatch(function (l) { return l.bolge; }, 3));
    }
    if (!groups.length) return "";
    return groups.map(function (g) {
      return '<div class="suggest__group"><div class="suggest__label">' + KB.esc(g.label) +
        (g.clear ? '<button type="button" class="suggest__clear" data-suggclear>' + T("search.clearRecent") + '</button>' : "") + '</div>' +
        g.items.map(function (v) { return '<button type="button" class="suggest__item" data-sugg="' + KB.esc(v) + '"><span class="suggest__ic">' + g.icon + '</span><span>' + KB.esc(v) + '</span></button>'; }).join("") +
        '</div>';
    }).join("");
  }
  function renderActiveChips() {
    var host = document.getElementById("jobChips"); if (!host) return;
    var search = document.getElementById("jobSearch"), citySel = document.getElementById("jobCity"), vehSel = document.getElementById("jobVehicle");
    var chips = [];
    if (search && search.value.trim()) chips.push({ k: "q", label: '"' + search.value.trim() + '"' });
    if (citySel && citySel.value) chips.push({ k: "city", label: "📍 " + citySel.value });
    if (vehSel && vehSel.value) chips.push({ k: "veh", label: "🛵 " + vehSel.value });
    if (!chips.length) { host.innerHTML = ""; host.classList.remove("is-open"); return; }
    host.classList.add("is-open");
    host.innerHTML = '<span class="active-chips__label">' + T("filter.active") + ':</span>' +
      chips.map(function (c) { return '<button type="button" class="active-chip" data-rmfilter="' + c.k + '">' + KB.esc(c.label) + ' <span aria-hidden="true">✕</span></button>'; }).join("") +
      '<button type="button" class="active-chips__clear" data-rmfilter="all">' + T("filter.clearAll") + '</button>';
  }
  document.addEventListener("click", function (e) {
    var rm = e.target.closest("[data-rmfilter]"); if (!rm) return;
    var k = rm.getAttribute("data-rmfilter");
    var search = document.getElementById("jobSearch"), citySel = document.getElementById("jobCity"), vehSel = document.getElementById("jobVehicle");
    if (k === "q" && search) search.value = "";
    else if (k === "city" && citySel) citySel.value = "";
    else if (k === "veh" && vehSel) vehSel.value = "";
    else if (k === "all") { if (search) search.value = ""; if (citySel) citySel.value = ""; if (vehSel) vehSel.value = ""; }
    applyJobFilters();
  });

  function applyJobFilters() {
    var grid = document.getElementById("listingsGrid");
    if (!grid) return;
    renderActiveChips();
    var countEl = document.getElementById("listingsCount");
    var search = document.getElementById("jobSearch");
    var citySel = document.getElementById("jobCity");
    var vehSel = document.getElementById("jobVehicle");
    var sortSel = document.getElementById("jobSort");
    var q = norm(search && search.value || "");
    var city = citySel && citySel.value, veh = vehSel && vehSel.value, sort = (sortSel && sortSel.value) || "new";
    var out = JOBS.list.filter(function (l) {
      if (city && l.sehir !== city) return false;
      if (veh && l.arac !== veh) return false;
      if (q) {
        var hay = norm(l.baslik + " " + (l.aciklama || "") + " " + (l.sahip || "") + " " + (l.sehir || "") + " " + (l.bolge || ""));
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    out.sort(function (a, b) {
      if (sort === "match") return talentScore(b.id) - talentScore(a.id);
      var da = a.tarih || "", db = b.tarih || "";
      return sort === "old" ? (da < db ? -1 : da > db ? 1 : 0) : (da < db ? 1 : da > db ? -1 : 0);
    });
    var filtersActive = !!(q || city || veh);
    if (countEl) countEl.textContent = out.length ? T("ilan.count", { n: out.length }) : "";
    if (!out.length) {
      grid.innerHTML = filtersActive
        ? emptyState("🔍", T("ilan.noMatch"), T("ilan.noMatchSub"), true)
        : emptyState("📭", T("ilan.none"), "", false);
      var clr = document.getElementById("jobClearFilters");
      if (clr) clr.addEventListener("click", function () {
        if (search) search.value = ""; if (citySel) citySel.value = ""; if (vehSel) vehSel.value = ""; if (sortSel) sortSel.value = "new";
        applyJobFilters();
      });
      return;
    }
    grid.innerHTML = out.map(function (l) { return listingCard(l, JOBS.appliedSet, JOBS.myPid); }).join("");
  }
  async function renderListings() {
    var grid = document.getElementById("listingsGrid");
    if (!grid) return;
    var countEl = document.getElementById("listingsCount");
    if (window.KB && KB.ready) await KB.ready();
    grid.innerHTML = skeletonCards(6);
    if (!online()) { grid.innerHTML = emptyState("📭", T("ilan.none"), "", false); if (countEl) countEl.textContent = ""; return; }
    var list = await SB.openListings();
    var appliedSet = {}, myPid = null;
    if (canPool()) {
      try { (await SB.appliedListingIds()).forEach(function (id) { appliedSet[id] = 1; }); } catch (e) {}
      var mp = KB.session() && KB.session().profile; myPid = mp && mp.id;
    }
    JOBS.list = list; JOBS.appliedSet = appliedSet; JOBS.myPid = myPid;
    var citySel = document.getElementById("jobCity");
    var vehSel = document.getElementById("jobVehicle");
    fillFilterSelect(citySel, uniqVals(list, function (x) { return x.sehir; }), T("ilan.allCities"));
    fillFilterSelect(vehSel, uniqVals(list, function (x) { return x.arac; }), T("ilan.allVehicles"));
    ["jobSearch", "jobCity", "jobVehicle", "jobSort"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._wired) { el._wired = 1; el.addEventListener(el.tagName === "SELECT" ? "change" : "input", applyJobFilters); }
    });
    // arama önerileri (autocomplete)
    var searchEl = document.getElementById("jobSearch"), sugg = document.getElementById("jobSuggest");
    if (searchEl && sugg && !searchEl._suggWired) {
      searchEl._suggWired = 1;
      function openSugg() { var h = buildSuggestHtml(searchEl.value); sugg.innerHTML = h; sugg.classList.toggle("is-open", !!h); }
      searchEl.addEventListener("focus", openSugg);
      searchEl.addEventListener("input", openSugg);
      searchEl.addEventListener("keydown", function (e) { if (e.key === "Enter") { pushRecentSearch(searchEl.value); sugg.classList.remove("is-open"); } });
      sugg.addEventListener("mousedown", function (e) {
        var clr = e.target.closest("[data-suggclear]");
        if (clr) { e.preventDefault(); localStorage.removeItem("kb_recent_searches"); openSugg(); return; }
        var it = e.target.closest("[data-sugg]");
        if (it) { e.preventDefault(); searchEl.value = it.getAttribute("data-sugg"); pushRecentSearch(searchEl.value); applyJobFilters(); sugg.classList.remove("is-open"); }
      });
      document.addEventListener("click", function (e) { if (!sugg.contains(e.target) && e.target !== searchEl) sugg.classList.remove("is-open"); });
    }
    applyJobFilters();
  }

  /* başvuru modalı */
  function summaryRow(k, v) { return '<div class="apply-summary__row"><span class="apply-summary__k">' + KB.esc(k) + '</span><span class="apply-summary__v">' + KB.esc(v) + '</span></div>'; }
  function ensureApplyModal() {
    if (document.getElementById("applyModal")) return;
    var div = document.createElement("div");
    div.className = "modal-overlay"; div.id = "applyModal";
    div.innerHTML = '<div class="modal apply-modal" role="dialog" aria-modal="true" aria-labelledby="applyTitle">' +
      '<div class="modal__head"><h3 id="applyTitle">' + T("apl.confirmTitle") + '</h3><button class="modal__close" aria-label="' + T("modal.close") + '">&times;</button></div>' +
      '<div id="applyConfirm">' +
        '<p class="modal__sub">' + T("apl.confirmSub") + '</p>' +
        '<div class="apply-summary" id="applySummary"></div>' +
        '<form id="applyForm"><div class="field"><label for="applyMsg">' + T("apl.msgLabel") + '</label>' +
        '<textarea id="applyMsg" rows="3" placeholder="' + T("apl.msgPh") + '"></textarea></div>' +
        '<p class="apply-err" id="applyErr" role="alert" hidden></p>' +
        '<div class="apply-actions">' +
          '<button type="button" class="btn btn--ghost" id="applyCancel">' + T("apl.cancel") + '</button>' +
          '<button type="submit" class="btn btn--primary" id="applySend">' + T("apl.send") + '</button>' +
        '</div></form>' +
      '</div>' +
      '<div id="applySuccess" hidden><div class="apply-success">' +
        '<div class="apply-success__ic">✓</div>' +
        '<h4 class="apply-success__t">' + T("apl.successTitle") + '</h4>' +
        '<p class="apply-success__d">' + T("apl.successSub") + '</p>' +
        '<div class="apply-next"><a class="btn btn--primary btn--block" id="applyViewApps" href="havuzum.html">' + T("apl.viewApps") + '</a>' +
        '<a class="btn btn--ghost btn--block" href="ilanlar.html">' + T("apl.continue") + '</a></div>' +
      '</div></div>' +
    '</div>';
    document.body.appendChild(div);
    div.querySelector(".modal__close").addEventListener("click", function () { div.classList.remove("is-open"); });
    div.addEventListener("click", function (e) { if (e.target === div) div.classList.remove("is-open"); });
  }
  function openApplyModal(listingId, baslik, meta) {
    if (!canPool()) { location.href = "giris.html"; return; }
    ensureApplyModal();
    meta = meta || {};
    var m = document.getElementById("applyModal");
    document.getElementById("applyConfirm").hidden = false;
    document.getElementById("applySuccess").hidden = true;
    document.getElementById("applyTitle").textContent = T("apl.confirmTitle");
    document.getElementById("applySummary").innerHTML =
      summaryRow(T("apl.position"), baslik || "") +
      (meta.company ? summaryRow(T("apl.company"), meta.company) : "") +
      (meta.location ? summaryRow(T("apl.location"), meta.location) : "");
    var viewApps = document.getElementById("applyViewApps");
    if (viewApps) viewApps.href = online() ? KB.roleToPanel(KB.currentRole()) : KB.panelHref();
    var form = document.getElementById("applyForm");
    var err = document.getElementById("applyErr"); err.hidden = true;
    var sendBtn = document.getElementById("applySend");
    sendBtn.disabled = false; sendBtn.classList.remove("is-loading"); sendBtn.textContent = T("apl.send");
    form.reset();
    document.getElementById("applyCancel").onclick = function () { m.classList.remove("is-open"); };
    form.onsubmit = async function (e) {
      e.preventDefault();
      err.hidden = true;
      sendBtn.disabled = true; sendBtn.classList.add("is-loading"); sendBtn.textContent = T("apl.sending");
      try {
        await SB.applyToListing(listingId, document.getElementById("applyMsg").value.trim());
        document.querySelectorAll('[data-apply="' + listingId + '"]').forEach(function (b) { b.outerHTML = '<span class="chip chip--ok">' + T("ilan.applied") + '</span>'; });
        document.getElementById("applyConfirm").hidden = true;
        document.getElementById("applySuccess").hidden = false;
        document.getElementById("applyTitle").textContent = T("apl.successTitle");
      } catch (e2) {
        err.hidden = false; err.textContent = ((e2 && e2.message) || T("apl.error")) + " — " + T("apl.retry");
        sendBtn.disabled = false; sendBtn.classList.remove("is-loading"); sendBtn.textContent = T("apl.send");
      }
    };
    m.classList.add("is-open");
  }

  /* Başvurularım (kurye paneli) — zengin kart + durum timeline */
  function applicationCard(a) {
    var status = a.durum === "accepted" ? "accepted" : a.durum === "rejected" ? "rejected" : "review";
    var label = status === "accepted" ? T("state.accepted") : status === "rejected" ? T("state.rejected") : T("mya.review");
    var decided = status !== "review";
    var steps = [
      { l: T("mya.tlSent"), done: true, cur: false, dec: "" },
      { l: T("mya.tlReviewed"), done: decided, cur: !decided, dec: "" },
      { l: T("mya.tlDecision"), done: decided, cur: false, dec: decided ? status : "" }
    ];
    var tl = '<div class="app-timeline">' + steps.map(function (s, i) {
      var cls = s.done ? "done" : s.cur ? "current" : "";
      var dec = s.dec ? (" app-timeline__dot--" + s.dec) : "";
      return (i ? '<div class="app-timeline__seg' + (s.done ? " done" : "") + '"></div>' : "") +
        '<div class="app-timeline__step"><span class="app-timeline__dot ' + cls + dec + '"></span><span class="app-timeline__label">' + s.l + '</span></div>';
    }).join("") + '</div>';
    var titleHtml = a.listingId
      ? '<a class="app-card__title" href="ilan.html?id=' + a.listingId + '">' + KB.esc(a.baslik || T("ilan.removed")) + '</a>'
      : '<span class="app-card__title">' + KB.esc(a.baslik || T("ilan.removed")) + '</span>';
    return '<article class="app-card">' +
      '<div class="app-card__top">' +
        '<div class="app-card__emp"><div class="app-card__av">' + KB.initials(a.firma || a.baslik || "?") + '</div>' +
          '<div>' + titleHtml +
          '<div class="app-card__sub">' + KB.esc(a.firma || "") + (a.ilanSehir ? ' · ' + KB.esc(a.ilanSehir) : "") + '</div></div></div>' +
        '<span class="app-badge app-badge--' + status + '">' + label + '</span>' +
      '</div>' + tl +
      '<div class="app-card__foot"><span>' + T("mya.appliedOn") + ': ' + KB.esc(a.tarih) + '</span>' +
        (a.guncelleme && a.guncelleme !== a.tarih ? '<span>' + T("mya.updatedOn") + ': ' + KB.esc(a.guncelleme) + '</span>' : "") + '</div>' +
    '</article>';
  }
  async function renderMyApplications() {
    var host = document.getElementById("kuryeBasvuru");
    if (!host) return;
    host.innerHTML = skeletonCards(3);
    var apps = await SB.myApplications();
    if (!apps.length) {
      host.innerHTML = '<div class="kb-empty"><div class="kb-empty__ic">📭</div><div class="kb-empty__t">' + T("basvuru.none") + '</div>' +
        '<a class="btn btn--primary btn--sm mt-24" href="ilanlar.html">' + T("fav.browse") + '</a></div>';
      return;
    }
    host.innerHTML = '<div class="app-list">' + apps.map(applicationCard).join("") + '</div>';
  }

  /* İlanlarım (işletme paneli) */
  function applicationRow(a) {
    var page = a.rol === "kurye" ? "profil-kurye.html" : a.rol === "isletme" ? "profil-isletme.html" : "profil-firma.html";
    var action = a.durum === "pending"
      ? '<span class="offer-act" data-app="' + a.id + '"><button class="btn btn--primary btn--sm" data-app-act="accepted">' + T("offer.accept") + '</button><button class="btn btn--light btn--sm" data-app-act="rejected">' + T("offer.reject") + '</button></span>'
      : '<span class="offer-act"><span class="chip">' + (a.durum === "accepted" ? T("state.accepted") : T("state.rejected")) + '</span></span>';
    return listRow('<a href="' + page + '?id=' + a.applicantId + '">' + KB.esc(a.ad) + '</a> ' + KB.stars(a.puan), KB.esc(a.mesaj || "") + " · " + KB.esc(a.tarih), action);
  }
  function myListingRow(l) {
    var st = l.durum === "acik" ? T("ilan.open") : T("ilan.closed");
    return '<div class="panel-box" style="margin-bottom:14px">' +
      '<div class="list-row" style="border:none;background:none;padding:0;margin:0">' +
        '<div class="list-row__main"><div class="list-row__title">' + KB.esc(l.baslik) + '</div>' +
        '<div class="list-row__sub">' + KB.esc([l.sehir, l.bolge].filter(Boolean).join(" · ")) + ' · ' + st + '</div></div>' +
        '<span class="offer-act">' +
          '<button class="btn btn--light btn--sm" data-listing-toggle="' + l.id + '" data-durum="' + l.durum + '">' + (l.durum === "acik" ? T("ilan.close") : T("ilan.reopen")) + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-listing-del="' + l.id + '">' + T("ilan.delete") + '</button>' +
        '</span></div>' +
      '<div class="li-apps" data-apps="' + l.id + '" style="margin-top:12px"></div></div>';
  }
  async function renderMyListings() {
    var host = document.getElementById("isletmeIlan");
    if (!host) return;
    var formHtml = '<div class="rev-form" style="margin-bottom:20px">' +
      '<div class="form-grid">' +
      '<div class="field"><label>' + T("ilan.baslik") + '</label><input id="liBaslik" placeholder="' + T("ilan.baslikPh") + '"></div>' +
      '<div class="field"><label>' + T("ilan.sehir") + '</label><input id="liSehir"></div>' +
      '<div class="field"><label>' + T("ilan.bolge") + '</label><input id="liBolge"></div>' +
      '<div class="field"><label>' + T("ilan.arac") + '</label><input id="liArac"></div>' +
      '<div class="field field--full"><label>' + T("ilan.aciklama") + '</label><textarea id="liAciklama" rows="2"></textarea></div>' +
      '</div><button type="button" class="btn btn--primary btn--sm" id="liSubmit">' + T("ilan.create") + '</button>' +
      '<p class="form-success" id="liMsg" hidden></p></div>';
    var mine = await SB.myListings();
    var listHtml = mine.length ? mine.map(myListingRow).join("") : '<div class="empty">' + T("ilan.noneOwn") + '</div>';
    host.innerHTML = formHtml + listHtml;
    mine.forEach(async function (l) {
      var box = host.querySelector('[data-apps="' + l.id + '"]');
      if (!box) return;
      var apps = await SB.listingApplications(l.id);
      box.innerHTML = apps.length
        ? '<p class="pcard__sub" style="margin-bottom:8px">' + T("ilan.apps") + ' (' + apps.length + ')</p>' + apps.map(applicationRow).join("")
        : '<p class="pcard__sub">' + T("ilan.noApps") + '</p>';
    });
  }

  document.addEventListener("click", function (e) {
    var ap = e.target.closest("[data-apply]");
    if (ap) { e.preventDefault(); openApplyModal(ap.getAttribute("data-apply"), ap.getAttribute("data-baslik"), { company: ap.getAttribute("data-company") || "", location: ap.getAttribute("data-loc") || "" }); }
  });
  document.addEventListener("click", async function (e) {
    if (e.target.closest("#liSubmit")) {
      var baslik = val2("liBaslik"); var msg = document.getElementById("liMsg");
      if (!baslik) { msg.hidden = false; msg.style.color = "#c0392b"; msg.textContent = T("ilan.baslikReq"); return; }
      try { await SB.createListing({ baslik: baslik, sehir: val2("liSehir"), bolge: val2("liBolge"), arac: val2("liArac"), aciklama: val2("liAciklama") }); await renderMyListings(); }
      catch (err) { msg.hidden = false; msg.style.color = "#c0392b"; msg.textContent = (err && err.message) || "Hata"; }
      return;
    }
    var tog = e.target.closest("[data-listing-toggle]");
    if (tog) { try { await SB.updateListingStatus(tog.getAttribute("data-listing-toggle"), tog.getAttribute("data-durum") === "acik" ? "kapali" : "acik"); await renderMyListings(); } catch (err) { KB.toast((err && err.message) || "Hata", "error"); } return; }
    var del = e.target.closest("[data-listing-del]");
    if (del) { if (!confirm(T("ilan.delConfirm"))) return; try { await SB.deleteListing(del.getAttribute("data-listing-del")); await renderMyListings(); } catch (err) { KB.toast((err && err.message) || "Hata", "error"); } return; }
    var aa = e.target.closest("[data-app-act]");
    if (aa) {
      var wrap = aa.closest(".offer-act"); var aid = wrap.getAttribute("data-app"); var act = aa.getAttribute("data-app-act");
      [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.disabled = true; });
      try { var r = await SB.updateApplication(aid, act); if (r && r.error) throw r.error; wrap.innerHTML = '<span class="chip">' + (act === "accepted" ? T("state.accepted") : T("state.rejected")) + '</span>'; }
      catch (err) { KB.toast((err && err.message) || "Hata", "error"); [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.disabled = false; }); }
    }
  });

  /* ============ İHALE & TEKLİF ============ */
  function tenderCard(t, bidSet, myPid, myRole) {
    var owner = t.owner_id === myPid;
    var bidded = bidSet[t.id];
    var meta = [t.sehir, t.bolge].filter(Boolean).join(" · ");
    var details = [];
    if (t.adet) details.push(T("ihale.adet", { n: t.adet }));
    if (t.sure) details.push("⏱ " + t.sure);
    if (t.butce) details.push("💰 " + t.butce);
    var action;
    if (!canPool()) action = '<a class="btn btn--light btn--sm" href="giris.html">' + T("cta.signin") + '</a>';
    else if (owner) action = '<span class="kb-chip kb-chip--accent">' + T("ihale.own") + '</span>';
    else if (bidded) action = '<span class="kb-chip kb-chip--accent">✓ ' + T("ihale.bidded") + '</span>';
    else if (myRole === "firma") action = '<button class="btn btn--primary btn--sm" data-bid="' + t.id + '" data-baslik="' + KB.esc(t.baslik) + '">' + T("ihale.bid") + '</button>';
    else action = '<span class="kb-chip">' + T("ihale.firmOnly") + '</span>';
    var score = talentScore(t.id);
    return '<article class="kb-card kb-tender">' +
      '<div class="kb-card__inner">' +
        '<div class="kb-job__employer">' +
          '<div class="kb-job__emp-av">🏛️</div>' +
          '<span class="kb-job__emp-name">' + KB.esc(t.sahip) + (meta ? ' · ' + KB.esc(meta) : '') + '</span>' +
        '</div>' +
        '<span class="kb-tender__badge kb-tender__badge--active">● ' + T("ilan.open") + '</span>' +
        '<div class="kb-tender__title">' + KB.esc(t.baslik) + '</div>' +
        (t.aciklama ? '<p class="kb-card__sub" style="margin:4px 0 0">' + KB.esc(t.aciklama) + '</p>' : '') +
        (details.length ? '<div class="kb-card__chips" style="margin-top:12px">' + details.map(function (d) { return '<span class="kb-chip">' + KB.esc(d) + '</span>'; }).join('') + '</div>' : '') +
        '<div class="kb-tender__foot">' +
          action +
          '<span class="kb-chip kb-chip--violet">%' + score + ' Uyum</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }
  function bidRow(b) {
    var action = b.durum === "pending"
      ? '<span class="offer-act" data-bid-id="' + b.id + '"><button class="btn btn--primary btn--sm" data-bid-act="accepted">' + T("offer.accept") + '</button><button class="btn btn--light btn--sm" data-bid-act="rejected">' + T("offer.reject") + '</button></span>'
      : '<span class="offer-act"><span class="chip">' + (b.durum === "accepted" ? T("state.accepted") : T("state.rejected")) + '</span></span>';
    return listRow('<a href="profil-firma.html?id=' + b.bidderId + '">' + KB.esc(b.ad) + '</a> ' + KB.stars(b.puan), (b.tutar ? "💰 " + KB.esc(b.tutar) + " · " : "") + KB.esc(b.mesaj || "") + " · " + KB.esc(b.tarih), action);
  }
  function myTenderRow(t) {
    var st = t.durum === "acik" ? T("ilan.open") : T("ilan.closed");
    return '<div style="border:1px solid var(--line);border-radius:var(--radius-sm);padding:14px;margin-bottom:12px">' +
      '<div class="list-row" style="border:none;background:none;padding:0;margin:0">' +
        '<div class="list-row__main"><div class="list-row__title">' + KB.esc(t.baslik) + '</div>' +
        '<div class="list-row__sub">' + KB.esc([t.sehir, t.bolge].filter(Boolean).join(" · ")) + ' · ' + st + '</div></div>' +
        '<span class="offer-act">' +
          '<button class="btn btn--light btn--sm" data-tender-toggle="' + t.id + '" data-durum="' + t.durum + '">' + (t.durum === "acik" ? T("ilan.close") : T("ilan.reopen")) + '</button>' +
          '<button class="btn btn--ghost btn--sm" data-tender-del="' + t.id + '">' + T("ilan.delete") + '</button>' +
        '</span></div>' +
      '<div data-bids="' + t.id + '" style="margin-top:12px"></div></div>';
  }
  async function renderOwnerTenders() {
    var host = document.getElementById("tenderOwnerArea");
    if (!host) return;
    var mp = canPool() && KB.session() && KB.session().profile;
    if (!mp || mp.role !== "isletme") { host.innerHTML = ""; return; }
    host.innerHTML =
      '<div class="panel-box" style="margin-bottom:24px"><h3>' + T("ihale.newTitle") + '</h3>' +
      '<div class="form-grid">' +
      '<div class="field"><label>' + T("ilan.baslik") + '</label><input id="teBaslik" placeholder="' + T("ihale.baslikPh") + '"></div>' +
      '<div class="field"><label>' + T("ilan.sehir") + '</label><input id="teSehir"></div>' +
      '<div class="field"><label>' + T("ilan.bolge") + '</label><input id="teBolge"></div>' +
      '<div class="field"><label>' + T("ihale.adetLabel") + '</label><input id="teAdet" type="number"></div>' +
      '<div class="field"><label>' + T("ihale.sure") + '</label><input id="teSure" placeholder="3 ay"></div>' +
      '<div class="field"><label>' + T("ihale.butce") + '</label><input id="teButce"></div>' +
      '<div class="field field--full"><label>' + T("ilan.aciklama") + '</label><textarea id="teAciklama" rows="2"></textarea></div>' +
      '</div><button type="button" class="btn btn--primary btn--sm" id="teSubmit">' + T("ihale.create") + '</button>' +
      '<p class="form-success" id="teMsg" hidden></p></div>' +
      '<div id="myTendersList"></div>';
    var mine = await SB.myTenders();
    document.getElementById("myTendersList").innerHTML = mine.length
      ? '<div class="panel-box"><h3>' + T("ihale.mine") + '</h3>' + mine.map(myTenderRow).join("") + '</div>' : "";
    mine.forEach(async function (t) {
      var box = host.querySelector('[data-bids="' + t.id + '"]'); if (!box) return;
      var bids = await SB.tenderBids(t.id);
      box.innerHTML = bids.length ? '<p class="pcard__sub" style="margin-bottom:8px">' + T("ihale.bids") + ' (' + bids.length + ')</p>' + bids.map(bidRow).join("") : '<p class="pcard__sub">' + T("ihale.noBids") + '</p>';
    });
  }
  async function renderTenders() {
    var grid = document.getElementById("tendersGrid");
    if (!grid) return;
    if (window.KB && KB.ready) await KB.ready();
    grid.innerHTML = skeletonCards(6);
    if (!online()) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1">Supabase gerekli.</div>'; return; }
    await renderOwnerTenders();
    var list = await SB.openTenders();
    var bidSet = {}, myPid = null, myRole = null;
    if (canPool()) { try { (await SB.bidTenderIds()).forEach(function (id) { bidSet[id] = 1; }); } catch (e) {} var mp = KB.session() && KB.session().profile; myPid = mp && mp.id; myRole = mp && mp.role; }
    var countEl = document.getElementById("tendersCount");
    if (countEl) countEl.textContent = list.length ? T("common.results", { n: list.length }) : "";
    grid.innerHTML = list.length ? list.map(function (t) { return tenderCard(t, bidSet, myPid, myRole); }).join("") : '<div class="kb-empty"><div class="kb-empty__ic">🏛️</div><div class="kb-empty__t">' + T("ihale.none") + '</div><div class="kb-empty__d">Yeni kurumsal işe alım fırsatları yakında. Aşağıdaki kategorileri keşfedebilirsin.</div></div>';
  }
  async function renderMyBids() {
    var host = document.getElementById("firmaBids");
    if (!host) return;
    var bids = await SB.myBids();
    if (!bids.length) { host.innerHTML = '<div class="empty">' + T("ihale.noMyBids") + '</div>'; return; }
    host.innerHTML = bids.map(function (b) {
      var st = b.durum === "accepted" ? T("state.accepted") : b.durum === "rejected" ? T("state.rejected") : T("state.pending");
      return listRow(KB.esc(b.baslik || T("ihale.removed")), (b.tutar ? "💰 " + KB.esc(b.tutar) + " · " : "") + KB.esc(b.ihaleSehir || "") + " · " + KB.esc(b.tarih), '<span class="chip">' + st + '</span>');
    }).join("");
  }
  /* teklif modalı */
  function ensureBidModal() {
    if (document.getElementById("bidModal")) return;
    var div = document.createElement("div"); div.className = "modal-overlay"; div.id = "bidModal";
    div.innerHTML = '<div class="modal"><div class="modal__head"><h3>' + T("ihale.bidTitle") + '</h3><button class="modal__close" aria-label="' + T("modal.close") + '">&times;</button></div>' +
      '<p class="modal__sub" id="bidSub"></p>' +
      '<form id="bidForm"><div class="field"><label>' + T("ihale.tutar") + '</label><input id="bidTutar" placeholder="' + T("ihale.tutarPh") + '"></div>' +
      '<div class="field"><label>' + T("modal.msgLabel") + '</label><textarea id="bidMsg" rows="2"></textarea></div>' +
      '<button type="submit" class="btn btn--primary btn--block">' + T("ihale.bid") + '</button>' +
      '<p class="form-success" id="bidOk" hidden>' + T("ihale.bidded") + '</p></form></div>';
    document.body.appendChild(div);
    div.querySelector(".modal__close").addEventListener("click", function () { div.classList.remove("is-open"); });
    div.addEventListener("click", function (e) { if (e.target === div) div.classList.remove("is-open"); });
  }
  function openBidModal(tenderId, baslik) {
    if (!canPool()) { location.href = "giris.html"; return; }
    ensureBidModal();
    var m = document.getElementById("bidModal");
    document.getElementById("bidSub").textContent = baslik;
    var form = document.getElementById("bidForm"); var ok = document.getElementById("bidOk"); ok.hidden = true; form.reset();
    form.onsubmit = async function (e) {
      e.preventDefault();
      try { await SB.submitBid(tenderId, document.getElementById("bidTutar").value.trim(), document.getElementById("bidMsg").value.trim()); }
      catch (err) { KB.toast((err && err.message) || "Hata", "error"); return; }
      ok.hidden = false;
      document.querySelectorAll('[data-bid="' + tenderId + '"]').forEach(function (b) { b.outerHTML = '<span class="chip">' + T("ihale.bidded") + '</span>'; });
      setTimeout(function () { m.classList.remove("is-open"); }, 1200);
    };
    m.classList.add("is-open");
  }
  document.addEventListener("click", function (e) {
    var bd = e.target.closest("[data-bid]");
    if (bd) { e.preventDefault(); openBidModal(bd.getAttribute("data-bid"), bd.getAttribute("data-baslik")); }
  });
  document.addEventListener("click", async function (e) {
    if (e.target.closest("#teSubmit")) {
      var baslik = val2("teBaslik"); var msg = document.getElementById("teMsg");
      if (!baslik) { msg.hidden = false; msg.style.color = "#c0392b"; msg.textContent = T("ilan.baslikReq"); return; }
      try { await SB.createTender({ baslik: baslik, sehir: val2("teSehir"), bolge: val2("teBolge"), adet: val2("teAdet"), sure: val2("teSure"), butce: val2("teButce"), aciklama: val2("teAciklama") }); await renderOwnerTenders(); await renderTenders(); }
      catch (err) { msg.hidden = false; msg.style.color = "#c0392b"; msg.textContent = (err && err.message) || "Hata"; }
      return;
    }
    var tog = e.target.closest("[data-tender-toggle]");
    if (tog) { try { await SB.updateTenderStatus(tog.getAttribute("data-tender-toggle"), tog.getAttribute("data-durum") === "acik" ? "kapali" : "acik"); await renderOwnerTenders(); } catch (err) { KB.toast((err && err.message) || "Hata", "error"); } return; }
    var del = e.target.closest("[data-tender-del]");
    if (del) { if (!confirm(T("ilan.delConfirm"))) return; try { await SB.deleteTender(del.getAttribute("data-tender-del")); await renderOwnerTenders(); } catch (err) { KB.toast((err && err.message) || "Hata", "error"); } return; }
    var ba = e.target.closest("[data-bid-act]");
    if (ba) {
      var wrap = ba.closest(".offer-act"); var bid = wrap.getAttribute("data-bid-id"); var act = ba.getAttribute("data-bid-act");
      [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.disabled = true; });
      try { var r = await SB.updateBid(bid, act); if (r && r.error) throw r.error; wrap.innerHTML = '<span class="chip">' + (act === "accepted" ? T("state.accepted") : T("state.rejected")) + '</span>'; }
      catch (err) { KB.toast((err && err.message) || "Hata", "error"); [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.disabled = false; }); }
    }
  });

  /* ============ HAVUZ LİSTELEME ============ */
  function teklifBtn(type, id) {
    return '<button class="btn btn--light btn--sm" data-teklif="' + type + '" data-id="' + id + '">✉️ ' + T("btn.offer") + '</button>';
  }
  function viewBtn(page, id) {
    return '<a class="btn btn--primary btn--sm" href="' + page + '?id=' + id + '">' + T("btn.viewProfile") + '</a>';
  }

  /* deterministik seed-based match score (veri değişmez, sadece görsel) */
  function talentScore(id) {
    var h = 0, s = String(id || "");
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return (Math.abs(h) % 28) + 72;
  }
  function xpFill(puan) { return Math.round((Number(puan) || 0) / 5 * 100); }
  function careerTrackHtml(seviye) {
    var levels = ["standart", "profesyonel", "premium"];
    var cur = levels.indexOf(seviye || "standart");
    var labels = [T("level.standart"), T("level.profesyonel"), T("level.premium")];
    var icons = ["🥉", "🥈", "🥇"];
    var html = '<div class="career-track">';
    for (var i = 0; i < 3; i++) {
      var cls = i < cur ? "done" : i === cur ? "current" : "";
      html += '<div class="career-track__node ' + cls + '">' + icons[i] + '</div>';
      if (i < 2) html += '<div class="career-track__seg' + (i < cur ? " done" : "") + '"></div>';
    }
    html += '</div><div class="career-track__labels">';
    for (var j = 0; j < 3; j++) html += '<span' + (j === cur ? ' class="cur"' : '') + '>' + labels[j] + '</span>';
    html += '</div>';
    return html;
  }

  function kuryeCard(k) {
    var bolge = k.bolgeler.slice(0, 2).join(", ") + (k.bolgeler.length > 2 ? "…" : "");
    var score = talentScore(k.id);
    var fill = xpFill(k.puan);
    return '<article class="talent-card">' + poolStar(k.id) +
      '<span class="match-score">%' + score + ' Uyum</span>' +
      '<div class="pcard__top"><div class="avatar">' + avInner(k) + '</div>' +
        '<div><div class="pcard__name">' + KB.esc(k.ad) + ' ' + verBadge(k.dogrulama) + '</div>' +
          '<div class="pcard__sub">' + KB.esc(k.sehir) + ' · ' + KB.esc(bolge) + '</div></div></div>' +
      '<div>' + KB.levelBadge(k.seviye) + ' ' + KB.stars(k.puan) + '</div>' +
      '<div class="career-score-mini">' +
        '<div class="xp-bar__labels"><span>' + T("kv.score") + '</span><b>' + (k.puan ? Number(k.puan).toFixed(1) : "—") + '</b></div>' +
        '<div class="xp-bar__track"><div class="xp-bar__fill" style="width:' + fill + '%"></div></div>' +
      '</div>' +
      '<div class="pcard__meta"><span class="chip">🛵 ' + KB.esc(k.arac) + '</span>' +
        '<span class="chip">' + T("pcard.exp", { n: k.deneyim }) + '</span>' +
        '<span class="chip">' + T("pcard.deliveries", { n: k.tamamlanan }) + '</span></div>' +
      '<div class="pcard__foot">' + viewBtn("profil-kurye.html", k.id) + teklifBtn("kurye", k.id) + '</div>' +
    '</article>';
  }
  function isletmeCard(i) {
    var score = talentScore(i.id);
    return '<article class="talent-card">' + poolStar(i.id) +
      '<span class="match-score">%' + score + ' Uyum</span>' +
      '<div class="pcard__top"><div class="avatar avatar--blue">' + avInner(i) + '</div>' +
        '<div><div class="pcard__name">' + KB.esc(i.ad) + ' ' + verBadge(i.dogrulama) + '</div>' +
          '<div class="pcard__sub">' + KB.esc(i.tur) + ' · ' + KB.esc(i.sehir) + '</div></div></div>' +
      '<p class="pcard__sub">' + KB.esc(i.aciklama) + '</p>' +
      '<div class="pcard__meta"><span class="chip">📍 ' + KB.esc(i.bolge) + '</span>' +
        '<span class="chip">' + T("pcard.openListings", { n: i.acikIlan }) + '</span></div>' +
      '<div class="pcard__foot">' + viewBtn("profil-isletme.html", i.id) + teklifBtn("isletme", i.id) + '</div>' +
    '</article>';
  }
  function firmaCard(f) {
    var score = talentScore(f.id);
    return '<article class="talent-card">' + poolStar(f.id) +
      '<span class="match-score">%' + score + ' Uyum</span>' +
      '<div class="pcard__top"><div class="avatar avatar--navy">' + avInner(f) + '</div>' +
        '<div><div class="pcard__name">' + KB.esc(f.ad) + ' ' + verBadge(f.dogrulama) + '</div>' +
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
    grid.innerHTML = skeletonCards(6);

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

  /* ---------- DEĞERLENDİRME (profil) ---------- */
  function starPicker(val) {
    var s = "";
    for (var i = 1; i <= 5; i++) s += '<button type="button" class="rev-star' + (i <= val ? " on" : "") + '" data-star="' + i + '" aria-label="' + i + '">★</button>';
    return '<div class="rev-picker" data-val="' + (val || 0) + '">' + s + '</div>';
  }
  function reviewsBox(targetId, reviews, canRev, myRev) {
    var inner = "";
    if (canRev) {
      inner += '<div class="rev-form" data-target="' + targetId + '">' +
        '<p class="pcard__sub">' + T("rev.yourRating") + '</p>' +
        starPicker(myRev ? myRev.puan : 0) +
        '<textarea class="rev-text" rows="2" placeholder="' + T("rev.commentPh") + '">' + (myRev ? KB.esc(myRev.yorum) : "") + '</textarea>' +
        '<button type="button" class="btn btn--primary btn--sm rev-submit">' + T(myRev ? "rev.update" : "rev.submit") + '</button>' +
        '<p class="form-success rev-msg" hidden></p>' +
        '</div>';
    }
    if (reviews.length) {
      inner += '<ul class="rev-list">' + reviews.map(function (r) {
        return '<li><div class="rev-head"><b>' + KB.esc(r.ad) + '</b>' + KB.stars(r.puan) + '<span class="rev-date">' + KB.esc(r.tarih) + '</span></div>' +
          (r.yorum ? '<p>' + KB.esc(r.yorum) + '</p>' : '') + '</li>';
      }).join("") + '</ul>';
    } else if (!canRev) {
      inner += '<p class="pcard__sub">' + T("rev.none") + '</p>';
    }
    return box(T("rev.title") + ' (' + reviews.length + ')', inner);
  }
  document.addEventListener("click", function (e) {
    var st = e.target.closest(".rev-star");
    if (st) {
      var picker = st.closest(".rev-picker");
      var v = parseInt(st.getAttribute("data-star"), 10);
      picker.setAttribute("data-val", v);
      [].forEach.call(picker.querySelectorAll(".rev-star"), function (b, i) { b.classList.toggle("on", (i + 1) <= v); });
      return;
    }
    var sub = e.target.closest(".rev-submit");
    if (!sub) return;
    var form = sub.closest(".rev-form");
    var targetId = form.getAttribute("data-target");
    var val = parseInt(form.querySelector(".rev-picker").getAttribute("data-val"), 10) || 0;
    var yorum = form.querySelector(".rev-text").value.trim();
    var msg = form.querySelector(".rev-msg");
    if (val < 1) { msg.hidden = false; msg.style.color = "#c0392b"; msg.textContent = T("rev.pickStar"); return; }
    sub.disabled = true;
    SB.addReview(targetId, val, yorum).then(function () {
      msg.hidden = false; msg.style.color = ""; msg.textContent = T("rev.saved");
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function (err) { sub.disabled = false; msg.hidden = false; msg.style.color = "#c0392b"; msg.textContent = (err && err.message) || "Hata"; });
  });

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
      var fill = xpFill(x.puan);
      sideExtra =
        careerTrackHtml(x.seviye) +
        '<div class="xp-bar" style="margin:10px 0 14px">' +
          '<div class="xp-bar__labels"><span>' + T("kv.score") + '</span><b>' + (x.puan ? Number(x.puan).toFixed(1) : "—") + ' / 5</b></div>' +
          '<div class="xp-bar__track"><div class="xp-bar__fill" style="width:' + fill + '%"></div></div>' +
        '</div>';
      var certHtml = x.sertifikalar.length
        ? '<div class="achv-grid">' + x.sertifikalar.map(function (c) {
            return '<div class="achv-badge"><div class="achv-badge__ic">🏅</div><div class="achv-badge__t">' + KB.esc(c) + '</div></div>';
          }).join("") + '</div>'
        : '<p class="pcard__sub">' + T("prof.noCert") + '</p>';
      body =
        box(T("prof.general"), '<dl class="kv">' +
          '<dt>' + T("kv.city") + '</dt><dd>' + KB.esc(x.sehir) + '</dd>' +
          '<dt>' + T("kv.vehicle") + '</dt><dd>' + KB.esc(x.arac) + '</dd>' +
          '<dt>' + T("kv.exp") + '</dt><dd>' + x.deneyim + ' ' + T("unit.years") + '</dd>' +
          '<dt>' + T("kv.completed") + '</dt><dd>' + x.tamamlanan + ' ' + T("unit.deliveries") + '</dd>' +
          '<dt>' + T("kv.regions") + '</dt><dd>' + KB.esc(x.bolgeler.join(", ")) + '</dd></dl>') +
        box(T("prof.certs"), certHtml) +
        box(T("prof.worked"), x.calistigi.length ? chips(x.calistigi) : '<p class="pcard__sub">' + T("prof.noHistory") + '</p>') +
        box(T("prof.refs"), x.referanslar.length ?
          '<ul class="reflist">' + x.referanslar.map(function (r) {
            return '<li><span class="ref__name">' + KB.esc(r.ad) + '</span> <span class="ref__role">· ' + KB.esc(r.rol) + '</span><br>"' + KB.esc(r.not) + '"</li>';
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

    // Değerlendirmeler
    if (online()) {
      var reviews = [], canRev = false, myRev = null;
      try {
        reviews = await SB.reviewsFor(x.id);
        if (KB.isAuthed && KB.isAuthed()) {
          var meP = KB.session() && KB.session().profile;
          if (!meP || meP.id !== x.id) { canRev = await SB.canReview(x.id); if (canRev) myRev = await SB.myReviewFor(x.id); }
        }
      } catch (e) {}
      body += reviewsBox(x.id, reviews, canRev, myRev);
    }

    var msgBtn = '<a class="btn btn--light btn--block mt-24" id="profMsgBtn" href="mesajlar.html?to=' + x.id + '" hidden>💬 ' + T("msg.btn") + '</a>';
    var sideWrapper = type === "kurye"
      ? '<aside class="profile-identity">' +
          '<div class="profile-identity__cover"></div>' +
          '<div class="profile-identity__body">' +
            '<div class="avatar' + avatarCls + '">' + avInner(x) + '</div>' +
            '<div class="profile__name">' + KB.esc(x.ad) + ' ' + verBadge(x.dogrulama) + '</div>' +
            '<div class="profile__sub">' + KB.esc(x.sehir || (x.bolgeler && x.bolgeler.join(", ")) || "") + '</div>' +
            sideExtra +
            '<button class="btn btn--primary btn--block" style="margin-top:16px" data-teklif="' + type + '" data-id="' + x.id + '">✉️ ' + T("btn.sendOffer") + '</button>' +
            msgBtn +
            poolBtnFull(x.id) +
          '</div>' +
        '</aside>'
      : '<aside class="profile__card">' +
          '<div class="avatar' + avatarCls + '">' + avInner(x) + '</div>' +
          '<div class="profile__name">' + KB.esc(x.ad) + ' ' + verBadge(x.dogrulama) + '</div>' +
          '<div class="profile__sub">' + KB.esc(x.sehir || (x.bolgeler && x.bolgeler.join(", ")) || "") + '</div>' +
          sideExtra +
          '<button class="btn btn--primary btn--block" data-teklif="' + type + '" data-id="' + x.id + '">✉️ ' + T("btn.sendOffer") + '</button>' +
          msgBtn +
          poolBtnFull(x.id) +
        '</aside>';
    host.innerHTML =
      '<div class="profile">' +
        sideWrapper +
        '<div class="profile__body">' + body + '</div>' +
      '</div>';
    // Eşleşme (kabul edilmiş teklif/başvuru) varsa "Mesaj Gönder" butonunu göster
    if (online() && KB.isAuthed && KB.isAuthed() && SB.canMessage) {
      SB.canMessage(x.id).then(function (ok) { if (ok) { var mb = document.getElementById("profMsgBtn"); if (mb) mb.hidden = false; } }).catch(function () {});
    }
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
    if (!list.length) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1">⭐<br>' + T("pool.empty") + '<br><a class="btn btn--primary btn--sm mt-24" href="kuryeler.html">' + T("pool.emptyCta") + '</a></div>'; return; }
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

  /* ============ GOOGLE MAPS - HARITA SAYFASI ============ */
  async function initMapGoogle() {
    if (typeof google === "undefined" || !google.maps) return;
    var el = document.getElementById("map");
    if (!el) return;
    
    var turkeyCenter = { lat: 39.5, lng: 33.5 };
    var map = new google.maps.Map(el, {
      zoom: 6,
      center: turkeyCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] }
      ]
    });
    
    var markerConfig = {
      kurye: { color: "#22D3EE", emoji: "🛵", page: "profil-kurye.html" },
      isletme: { color: "#4f8bff", emoji: "📦", page: "profil-isletme.html" },
      firma: { color: "#a855f7", emoji: "🏢", page: "profil-firma.html" }
    };
    
    var layers = {
      kurye: [],
      isletme: [],
      firma: []
    };
    
    function createMarker(item, type) {
      if (item.lat == null || item.lng == null) return;
      var config = markerConfig[type];
      var marker = new google.maps.Marker({
        position: { lat: parseFloat(item.lat), lng: parseFloat(item.lng) },
        map: map,
        title: item.ad,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: config.color,
          fillOpacity: 0.85,
          strokeColor: "#fff",
          strokeWeight: 2.5
        }
      });
      
      var contentString = '<div style="padding:10px;font-family:Arial,sans-serif;max-width:220px;">' +
        '<div style="font-weight:bold;margin-bottom:6px;font-size:14px;">' + config.emoji + ' ' + KB.esc(item.ad) + '</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:10px;">' + 
        (item.sehir ? KB.esc(item.sehir) : KB.esc((item.bolgeler || []).join(", "))) + 
        '</div>' +
        '<a href="' + config.page + '?id=' + item.id + '" style="color:#4f8bff;text-decoration:none;font-size:12px;font-weight:bold;">Profili Gör →</a>' +
        '</div>';
      
      var infoWindow = new google.maps.InfoWindow({ content: contentString });
      marker.addListener("click", function () { infoWindow.open(map, marker); });
      
      return { marker: marker, infoWindow: infoWindow };
    }
    
    try {
      var kData = await loadPool("kurye");
      var iData = await loadPool("isletme");
      var fData = await loadPool("firma");
      
      kData.forEach(function(x) { layers.kurye.push(createMarker(x, "kurye")); });
      iData.forEach(function(x) { layers.isletme.push(createMarker(x, "isletme")); });
      fData.forEach(function(x) { layers.firma.push(createMarker(x, "firma")); });
      
      document.querySelectorAll("[data-layer]").forEach(function (cb) {
        cb.addEventListener("change", function () {
          var type = cb.getAttribute("data-layer");
          layers[type].forEach(function(item) {
            if (item && item.marker) {
              item.marker.setMap(cb.checked ? map : null);
            }
          });
        });
      });
    } catch (e) {
      console.error("Map error:", e);
    }
  }

  /* ============ GOOGLE MAPS - PANEL HARİTASI ============ */
  async function initPanelMap(panelType) {
    // panelType: "kurye", "isletme", "firma"
    if (typeof google === "undefined" || !google.maps) return;
    
    var containerId = "panelMap" + (panelType.charAt(0).toUpperCase() + panelType.slice(1));
    var el = document.getElementById(containerId);
    if (!el) return;
    
    var turkeyCenter = { lat: 39.5, lng: 33.5 };
    var map = new google.maps.Map(el, {
      zoom: 6,
      center: turkeyCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] }
      ]
    });
    
    var markerConfig = {
      kurye: { color: "#22D3EE", emoji: "🛵", page: "profil-kurye.html" },
      isletme: { color: "#4f8bff", emoji: "📦", page: "profil-isletme.html" },
      firma: { color: "#a855f7", emoji: "🏢", page: "profil-firma.html" }
    };
    
    try {
      var kData = await loadPool("kurye");
      var iData = await loadPool("isletme");
      var fData = await loadPool("firma");
      
      function createMarker(item, type) {
        if (item.lat == null || item.lng == null) return;
        var config = markerConfig[type];
        var marker = new google.maps.Marker({
          position: { lat: parseFloat(item.lat), lng: parseFloat(item.lng) },
          map: map,
          title: item.ad,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: config.color,
            fillOpacity: 0.85,
            strokeColor: "#fff",
            strokeWeight: 2.5
          }
        });
        
        var contentString = '<div style="padding:10px;font-family:Arial,sans-serif;max-width:220px;">' +
          '<div style="font-weight:bold;margin-bottom:6px;font-size:14px;">' + config.emoji + ' ' + KB.esc(item.ad) + '</div>' +
          '<div style="font-size:12px;color:#666;margin-bottom:10px;">' + 
          (item.sehir ? KB.esc(item.sehir) : KB.esc((item.bolgeler || []).join(", "))) + 
          '</div>' +
          '<a href="' + config.page + '?id=' + item.id + '" style="color:#4f8bff;text-decoration:none;font-size:12px;font-weight:bold;display:inline-block;">Profili Gör →</a>' +
          '</div>';
        
        var infoWindow = new google.maps.InfoWindow({ content: contentString });
        marker.addListener("click", function () { infoWindow.open(map, marker); });
      }
      
      kData.forEach(function(x) { createMarker(x, "kurye"); });
      iData.forEach(function(x) { createMarker(x, "isletme"); });
      fData.forEach(function(x) { createMarker(x, "firma"); });
      
    } catch (e) {
      console.error("Panel map error:", e);
    }
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

  /* ============ ANA SAYFA: CANLI İSTATİSTİK + YORUM CAROUSEL ============ */
  async function renderHomeStats() {
    var host = document.getElementById("homeStats");
    if (!host) return;
    if (window.KB && KB.ready) await KB.ready();
    if (!online()) { host.closest(".section") && (host.closest(".section").style.display = "none"); return; }
    try {
      var c = await SB.poolCounts();
      var items = [
        { n: c.kurye, label: T("stats.couriers") },
        { n: c.isletme, label: T("stats.businesses") },
        { n: c.firma, label: T("stats.firms") },
        { n: c.degerlendirme, label: T("stats.reviews") }
      ];
      host.innerHTML = items.map(function (it) {
        return '<div class="stat-card"><div class="stat-card__num" data-to="' + it.n + '">0</div><div class="stat-card__label">' + it.label + '</div></div>';
      }).join("");
      host.querySelectorAll(".stat-card__num").forEach(function (el) {
        var to = parseInt(el.getAttribute("data-to"), 10) || 0, start = null;
        function step(ts) { if (!start) start = ts; var p = Math.min((ts - start) / 1100, 1); el.textContent = Math.floor(p * to).toLocaleString("tr-TR"); if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
      });
    } catch (e) {}
  }
  async function renderTestimonials() {
    var sec = document.getElementById("testimonials");
    if (!sec) return;
    if (window.KB && KB.ready) await KB.ready();
    var list = [];
    if (online()) { try { list = await SB.recentReviews(10); } catch (e) {} }
    if (!list.length) { sec.style.display = "none"; return; }
    var track = sec.querySelector(".tcarousel__track");
    var dots = sec.querySelector(".tcarousel__dots");
    track.innerHTML = list.map(function (r) {
      var stars = ""; for (var i = 0; i < 5; i++) stars += i < Math.round(r.puan) ? "★" : "☆";
      return '<div class="tcarousel__slide"><div class="tquote">' +
        '<div class="tquote__stars">' + stars + '</div>' +
        '<p class="tquote__text">"' + KB.esc(r.yorum) + '"</p>' +
        '<div class="tquote__by"><span class="tquote__av">' + KB.initials(r.ad) + '</span>' +
        '<span><span class="tquote__name">' + KB.esc(r.ad) + '</span><br><span class="tquote__role">' + (r.rol ? T("role." + r.rol) : "") + (r.hedef ? " → " + KB.esc(r.hedef) : "") + '</span></span></div>' +
        '</div></div>';
    }).join("");
    dots.innerHTML = list.map(function (_, i) { return '<button data-i="' + i + '"' + (i === 0 ? ' class="is-active"' : '') + ' aria-label="' + (i + 1) + '"></button>'; }).join("");
    var idx = 0, n = list.length, timer = null;
    function go(i) { idx = (i + n) % n; track.style.transform = "translateX(-" + (idx * 100) + "%)"; dots.querySelectorAll("button").forEach(function (b, j) { b.classList.toggle("is-active", j === idx); }); }
    dots.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { go(parseInt(b.getAttribute("data-i"), 10)); }); });
    function startTimer() { timer = setInterval(function () { go(idx + 1); }, 5000); }
    sec.addEventListener("mouseenter", function () { clearInterval(timer); });
    sec.addEventListener("mouseleave", startTimer);
    if (n > 1) startTimer();
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
    var msgLink = (online() && durum === "accepted" && t.karsiId) ? ' <a class="btn btn--light btn--sm" href="mesajlar.html?to=' + t.karsiId + '">💬 ' + T("msg.btn") + '</a>' : '';
    return '<span class="offer-act"><span class="chip">' + st + '</span>' + msgLink + '</span>';
  }
  function contactLine(c) {
    if (!c || (!c.telefon && !c.email)) return "";
    return ' · 📞 ' + KB.esc(c.telefon || c.email);
  }
  function soonInline() { return '<div class="empty">' + T("soon.feature") + '</div>'; }
  function verBadge(d) { return d === "verified" ? '<span class="ver-badge" title="' + T("kyc.verified") + '">✓ ' + T("kyc.verifiedShort") + '</span>' : ""; }
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
      KB.toast(err.message || T("offer.actErr"), "error");
      [].forEach.call(wrap.querySelectorAll("button"), function (x) { x.disabled = false; });
    }
  });

  function showPanel(key) {
    document.querySelectorAll(".dash__panel").forEach(function (p) { p.classList.toggle("is-active", p.id === "panel-" + key); });
    document.querySelectorAll(".dash__nav button").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-tab") === key); });
  }
  async function initPanel(role) {
    if (window.KB && KB.ready) await KB.ready();
    // Rol koruması: online'da giriş yoksa girişe, farklı roldeyse kendi paneline yönlendir
    if (online()) {
      if (!KB.isAuthed()) { location.href = "giris.html"; return; }
      var myRole = KB.currentRole();
      if (myRole && myRole !== role) { location.href = KB.roleToPanel(myRole); return; }
    }
    var nav = document.querySelector(".dash__nav");
    if (!nav) return;
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-tab]");
      if (b) {
        var tab = b.getAttribute("data-tab");
        showPanel(tab);
        if (tab === "harita") {
          setTimeout(function() { initPanelMap(role); }, 100);
        }
      }
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
      var sv = prof ? (prof.seviye || "standart") : "premium";
      var svLabel = T("level." + sv);
      var tm = prof ? (prof.tamamlanan || 0) : "1.240";
      var fill = xpFill(prof ? prof.puan : 4.9);
      /* kariyer seviye progress + metrikler + profil gücü + insight */
      var levels2 = ["standart", "profesyonel", "premium"];
      var curIdx = levels2.indexOf(sv);
      var clpHtml = '<div class="career-level-progress">';
      var clpIcons = ["🥉","🥈","🥇"], clpLabels = [T("level.standart"), T("level.profesyonel"), T("level.premium")];
      for (var ci = 0; ci < 3; ci++) {
        var cls2 = ci < curIdx ? "done" : ci === curIdx ? "active" : "";
        clpHtml += '<div class="clp__node"><div class="clp__ic ' + cls2 + '">' + clpIcons[ci] + '</div><div class="clp__label' + (ci === curIdx ? " active" : "") + '">' + clpLabels[ci] + '</div></div>';
        if (ci < 2) clpHtml += '<div class="clp__seg' + (ci < curIdx ? " done" : "") + '"></div>';
      }
      clpHtml += '</div>';
      var tips = [];
      if (prof && !prof.arac) tips.push("🛵 " + T("career.tipVehicle"));
      if (prof && !(prof.bolgeler && prof.bolgeler.length)) tips.push("📍 " + T("career.tipRegion"));
      if (prof && !prof.aciklama) tips.push("📝 " + T("career.tipBio"));
      var strength = prof ? Math.min(100, 40 + (prof.arac ? 20 : 0) + (prof.bolgeler && prof.bolgeler.length ? 20 : 0) + (prof.aciklama ? 20 : 0)) : 60;
      var strengthHtml = '<div class="profile-strength">' +
        '<div class="profile-strength__h"><span>' + T("career.strength") + '</span><b>%' + strength + '</b></div>' +
        '<div class="profile-strength__track"><div class="profile-strength__fill" style="width:' + strength + '%"></div></div>' +
        (tips.length ? '<div class="profile-strength__tips">' + tips.map(function (t) { return '<div class="profile-strength__tip"><span class="ic">→</span>' + t + '</div>'; }).join("") + '</div>' : '') +
      '</div>';
      var insightHtml = '<div class="insight-card"><div class="insight-card__h">💡 ' + T("career.insight") + '</div><p>' + T("career.insightMsg") + '</p></div>';
      setHTML("kuryeMetrics", clpHtml + metric(pu, T("m.score")) + metric(svLabel, T("m.level")) + metric(tm, T("m.deliveries")) + metric(offerCount, T("m.offers")) + strengthHtml + insightHtml);
      if (online()) renderMyApplications();
      else setHTML("kuryeBasvuru", D.ilanlar.filter(function (i) { return i.tip === "kurye-ilani"; }).map(function (i) {
        return listRow(KB.esc(i.baslik), KB.esc(i.sehir) + " · " + KB.esc(i.bolge), '<span class="chip">' + T("state.applied") + '</span>');
      }).join(""));
      setHTML("kuryeTeklif", listFor("kurye"));
    } else if (role === "isletme") {
      var ai = prof ? (prof.acikIlan || 0) : "3";
      // Görüşme/memnuniyet için gerçek veri yok → online'da "—"
      setHTML("isletmeMetrics", metric(ai, T("m.openListings")) + metric(offerCount, T("m.offers")) + metric(online() ? "—" : "12", T("m.meetings")) + metric(online() ? "—" : "4.7", T("m.satisfaction")));
      if (online()) renderMyListings();
      else setHTML("isletmeIlan", D.ilanlar.filter(function (i) { return i.tip !== "ihale"; }).map(function (i) {
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
      if (online()) renderMyBids();
    }
  }
  function setHTML(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html || '<div class="empty">' + T("empty.generic") + '</div>'; }

  /* ============ HARİTA DENEYİMİ (senkron liste + harita) ============ */
  async function initMapExperience() {
    var mapEl = document.getElementById("map");
    if (!mapEl || typeof L === "undefined") return;
    var listEl = document.getElementById("mxList");
    var countEl = document.getElementById("mxCount");
    var searchEl = document.getElementById("mxSearch");
    var container = document.querySelector(".mx");

    var PIN = { ilan: { c: "#f59e0b", e: "💼" }, kurye: { c: "#22d3ee", e: "🛵" }, isletme: { c: "#4f8bff", e: "🏪" }, firma: { c: "#a855f7", e: "🏢" } };

    if (listEl) listEl.innerHTML = mxSkeleton();

    var map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: true }).setView([39.5, 33.5], 6);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, subdomains: "abcd", attribution: "© OpenStreetMap © CARTO" }).addTo(map);
    var cluster = L.markerClusterGroup ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 }) : L.layerGroup();
    map.addLayer(cluster);

    if (window.KB && KB.ready) await KB.ready();
    var listings = [];
    try { if (online()) listings = await SB.openListings(); } catch (e) {}
    var kur = await loadPool("kurye"), isl = await loadPool("isletme"), frm = await loadPool("firma");

    var items = [];
    function push(type, x, lat, lng, ad, sub, chips, action) {
      if (lat == null || lng == null) return;
      items.push({ key: type + "-" + x.id, type: type, id: x.id, lat: +lat, lng: +lng, ad: ad || "", sub: sub || "", chips: chips || [], action: action });
    }
    listings.forEach(function (l) { push("ilan", l, l.lat, l.lng, l.baslik, (l.sahip ? l.sahip + " · " : "") + [l.sehir, l.bolge].filter(Boolean).join(" · "), [l.arac].filter(Boolean), { apply: { id: l.id, baslik: l.baslik } }); });
    kur.forEach(function (k) { push("kurye", k, k.lat, k.lng, k.ad, [k.sehir, (k.bolgeler || [])[0]].filter(Boolean).join(" · "), [k.arac].filter(Boolean), { view: "profil-kurye.html", offer: "kurye" }); });
    isl.forEach(function (i) { push("isletme", i, i.lat, i.lng, i.ad, [i.tur, i.sehir].filter(Boolean).join(" · "), [], { view: "profil-isletme.html", offer: "isletme" }); });
    frm.forEach(function (f) { push("firma", f, f.lat, f.lng, f.ad, (f.bolgeler || []).slice(0, 2).join(", "), [], { view: "profil-firma.html", offer: "firma" }); });

    var activeLayers = { ilan: true, kurye: true, isletme: true, firma: true };
    var markers = {}, cardEls = {}, selectedKey = null;

    function pinIcon(it, sel) {
      var p = PIN[it.type];
      return L.divIcon({ className: "", html: '<div class="mx-pin mx-pin--' + it.type + (sel ? " is-sel" : "") + '" style="--c:' + p.c + '"><span>' + p.e + '</span></div>', iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -32] });
    }
    function actionHtml(it) {
      if (it.action.apply) return '<button class="btn btn--primary btn--sm" data-apply="' + it.id + '" data-baslik="' + KB.esc(it.action.apply.baslik) + '">' + T("mx.apply") + '</button>';
      return '<a class="btn btn--light btn--sm" href="' + it.action.view + '?id=' + it.id + '">' + T("mx.view") + '</a>';
    }
    function chipsHtml(it) { return it.chips.length ? '<div class="mx-card__chips">' + it.chips.map(function (c) { return '<span class="chip">' + KB.esc(c) + '</span>'; }).join("") + '</div>' : ""; }
    function mxCard(it) {
      return '<article class="mx-card" data-mxkey="' + KB.esc(it.key) + '" tabindex="0">' +
        '<div class="mx-card__ic mx-card__ic--' + it.type + '">' + PIN[it.type].e + '</div>' +
        '<div class="mx-card__body"><div class="mx-card__head"><span class="mx-card__title">' + KB.esc(it.ad) + '</span>' +
        '<span class="mx-tag mx-tag--' + it.type + '">' + T("mx.type." + it.type) + '</span></div>' +
        '<div class="mx-card__sub">' + KB.esc(it.sub) + '</div>' + chipsHtml(it) +
        '<div class="mx-card__act">' + actionHtml(it) + '</div></div></article>';
    }
    function mxPopup(it) {
      return '<div class="mx-popup"><div class="mx-popup__head"><span class="mx-card__ic mx-card__ic--' + it.type + '">' + PIN[it.type].e + '</span>' +
        '<div><div class="mx-popup__title">' + KB.esc(it.ad) + '</div><div class="mx-popup__sub">' + KB.esc(it.sub) + '</div></div></div>' +
        chipsHtml(it).replace("mx-card__chips", "mx-popup__chips") +
        '<div class="mx-popup__act">' + actionHtml(it) + '</div></div>';
    }
    function visible() {
      var q = norm(searchEl && searchEl.value || "");
      return items.filter(function (it) {
        if (!activeLayers[it.type]) return false;
        if (q && norm(it.ad + " " + it.sub).indexOf(q) === -1) return false;
        return true;
      });
    }
    function select(key, fromMap) {
      selectedKey = key;
      Object.keys(cardEls).forEach(function (k) { if (cardEls[k]) cardEls[k].classList.toggle("is-selected", k === key); });
      if (key && cardEls[key] && fromMap) cardEls[key].scrollIntoView({ behavior: "smooth", block: "nearest" });
      Object.keys(markers).forEach(function (k) {
        var m = markers[k]; if (m._it) m.setIcon(pinIcon(m._it, k === key));
      });
      if (key && markers[key] && !fromMap) {
        var m = markers[key];
        if (cluster.zoomToShowLayer) cluster.zoomToShowLayer(m, function () { m.openPopup(); });
        else { map.setView(m.getLatLng(), Math.max(map.getZoom(), 12)); m.openPopup(); }
      }
    }
    function renderList(list) {
      if (countEl) countEl.textContent = list.length ? T("mx.count", { n: list.length }) : "";
      if (!list.length) { listEl.innerHTML = '<div class="kb-empty"><div class="kb-empty__ic">🗺️</div><div class="kb-empty__t">' + T("mx.empty") + '</div><div class="kb-empty__d">' + T("mx.emptySub") + '</div></div>'; cardEls = {}; return; }
      listEl.innerHTML = list.map(mxCard).join("");
      cardEls = {};
      list.forEach(function (it) { cardEls[it.key] = listEl.querySelector('[data-mxkey="' + it.key.replace(/"/g, '\\"') + '"]'); });
    }
    function renderMarkers(list) {
      cluster.clearLayers(); markers = {};
      list.forEach(function (it) {
        var m = L.marker([it.lat, it.lng], { icon: pinIcon(it, it.key === selectedKey) });
        m._it = it;
        m.bindPopup(mxPopup(it), { className: "mx-popup-wrap", maxWidth: 270, minWidth: 220 });
        m.on("click", function () { select(it.key, true); });
        markers[it.key] = m; cluster.addLayer(m);
      });
    }
    function refresh() {
      var list = visible();
      if (selectedKey && !list.some(function (i) { return i.key === selectedKey; })) selectedKey = null;
      renderList(list); renderMarkers(list);
    }

    // liste kartı tıklama → seç (aksiyon butonu/linke dokunma)
    if (listEl) listEl.addEventListener("click", function (e) {
      if (e.target.closest("[data-apply],[data-teklif],a,button")) return;
      var c = e.target.closest("[data-mxkey]");
      if (c) select(c.getAttribute("data-mxkey"), false);
    });
    // katman chip'leri
    document.querySelectorAll("[data-mxlayer]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var t = chip.getAttribute("data-mxlayer");
        activeLayers[t] = !activeLayers[t];
        chip.classList.toggle("is-on", activeLayers[t]);
        chip.setAttribute("aria-pressed", activeLayers[t] ? "true" : "false");
        refresh();
      });
    });
    if (searchEl) searchEl.addEventListener("input", refresh);
    // mobil liste/harita geçişi
    var toggleBtn = document.getElementById("mxToggle");
    if (toggleBtn && container) toggleBtn.addEventListener("click", function () {
      var open = container.classList.toggle("mx--listopen");
      toggleBtn.textContent = open ? T("mx.map") : T("mx.list");
    });

    refresh();
    var pts = items.map(function (i) { return [i.lat, i.lng]; });
    if (pts.length) map.fitBounds(pts, { padding: [50, 50], maxZoom: 11 });
    setTimeout(function () { map.invalidateSize(); }, 200);
  }
  function mxSkeleton() {
    var one = '<div class="mx-card mx-card--skel"><span class="skel skel--ava"></span><div style="flex:1"><span class="skel skel--line" style="width:60%"></span><span class="skel skel--line" style="width:40%;margin-top:8px"></span></div></div>';
    var out = ""; for (var i = 0; i < 6; i++) out += one; return out;
  }

  /* ============ İLAN DETAYI (Job Detail) ============ */
  function jobDetailSkeleton() {
    return '<div class="jd"><div class="jd-main">' +
      '<span class="skel skel--line" style="width:38%"></span>' +
      '<span class="skel skel--line" style="width:75%;height:30px;margin-top:16px"></span>' +
      '<span class="skel skel--line" style="width:100%;margin-top:22px"></span>' +
      '<span class="skel skel--line" style="width:92%;margin-top:10px"></span>' +
      '<span class="skel skel--line" style="width:80%;margin-top:10px"></span>' +
      '</div><aside class="jd-side"><div class="skel-card" style="height:120px"></div></aside></div>';
  }
  function jobNotFound() {
    return '<div class="kb-empty"><div class="kb-empty__ic">🔍</div><div class="kb-empty__t">' + T("jd.notFound") + '</div>' +
      '<div class="kb-empty__d">' + T("jd.notFoundSub") + '</div>' +
      '<a class="btn btn--primary btn--sm mt-24" href="ilanlar.html">' + T("jd.back") + '</a></div>';
  }
  async function renderJobDetail() {
    var host = document.getElementById("jobDetailRoot");
    if (!host) return;
    var id = KB.getParam("id");
    if (window.KB && KB.ready) await KB.ready();
    host.innerHTML = jobDetailSkeleton();
    if (!online() || !id) { host.innerHTML = jobNotFound(); return; }
    var l = null;
    try { l = await SB.listingById(id); } catch (e) {}
    if (!l) { host.innerHTML = jobNotFound(); return; }

    var applied = false, owner = false;
    if (canPool()) {
      try { (await SB.appliedListingIds()).forEach(function (x) { if (String(x) === String(id)) applied = true; }); } catch (e) {}
      var mp = KB.session() && KB.session().profile; owner = !!(mp && mp.id === l.owner_id);
    }
    var saved = isSavedJob(l.id);
    var loc = [l.sehir, l.bolge].filter(Boolean).join(" · ");
    var profilePage = l.sahipRol === "firma" ? "profil-firma.html" : "profil-isletme.html";
    var ver = l.sahipDogrulama === "verified" ? ' <span class="ver-badge" title="' + T("kyc.verified") + '">✓ ' + T("kyc.verifiedShort") + '</span>' : "";
    var logo = l.sahipAvatar
      ? '<img class="jd-company__logo" src="' + KB.esc(l.sahipAvatar) + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'jd-company__logo jd-company__logo--ph\',textContent:\'' + KB.esc(KB.initials(l.sahip || "?")) + '\'}))">'
      : '<div class="jd-company__logo jd-company__logo--ph">' + KB.initials(l.sahip || "?") + '</div>';
    function applyBtn(block) {
      var cls = "btn btn--primary " + (block ? "btn--lg btn--block" : "btn--sm");
      if (!canPool()) return '<a class="' + cls + '" href="giris.html">' + T("cta.signin") + '</a>';
      if (owner) return '<span class="chip">' + T("ilan.own") + '</span>';
      if (applied) return '<span class="chip chip--ok">✓ ' + T("ilan.applied") + '</span>';
      return '<button class="' + cls + '" data-apply="' + l.id + '" data-baslik="' + KB.esc(l.baslik) + '" data-company="' + KB.esc(l.sahip || "") + '" data-loc="' + KB.esc(loc) + '">' + T("ilan.apply") + '</button>';
    }
    var favBtn = '<button type="button" class="job-fav' + (saved ? " is-on" : "") + '" data-savejob="' + l.id + '" aria-pressed="' + (saved ? "true" : "false") + '" aria-label="' + T(saved ? "ilan.saved" : "ilan.save") + '" title="' + T(saved ? "ilan.saved" : "ilan.save") + '">' + (saved ? "♥" : "♡") + '</button>';
    var tags = '<span class="chip chip--open">● ' + T("ilan.statusOpen") + '</span>' +
      (l.arac ? '<span class="chip">🛵 ' + KB.esc(l.arac) + '</span>' : '') +
      (isFresh(l.tarih) ? '<span class="chip chip--new">' + T("ilan.new") + '</span>' : '');

    host.innerHTML =
      '<a class="jd-back" href="ilanlar.html">← ' + T("jd.back") + '</a>' +
      '<div class="jd">' +
        '<div class="jd-main">' +
          '<div class="jd-head">' +
            '<div class="employer-badge"><div class="employer-badge__av">' + KB.initials(l.sahip || "?") + '</div><span class="employer-badge__name">' + KB.esc(l.sahip || T("ilan.unknown")) + '</span></div>' +
            '<h1 class="jd-title">' + KB.esc(l.baslik) + '</h1>' +
            '<div class="jd-meta">' + (loc ? '<span>📍 ' + KB.esc(loc) + '</span>' : "") + '<span>🕐 ' + T("jd.postedOn") + ': ' + timeAgo(l.tarih) + '</span></div>' +
            '<div class="job-card__tags" style="margin-top:14px">' + tags + '</div>' +
          '</div>' +
          '<div class="jd-section"><h2>' + T("jd.about") + '</h2><p class="jd-desc">' + (l.aciklama ? KB.esc(l.aciklama) : T("jd.noDesc")) + '</p></div>' +
          '<div class="jd-section"><h2>' + T("jd.details") + '</h2><dl class="kv">' +
            '<dt>' + T("apl.position") + '</dt><dd>' + KB.esc(l.baslik) + '</dd>' +
            (loc ? '<dt>' + T("apl.location") + '</dt><dd>' + KB.esc(loc) + '</dd>' : "") +
            (l.arac ? '<dt>' + T("kv.vehicle") + '</dt><dd>' + KB.esc(l.arac) + '</dd>' : "") +
            '<dt>' + T("jd.postedOn") + '</dt><dd>' + KB.esc(l.tarih) + '</dd>' +
          '</dl></div>' +
        '</div>' +
        '<aside class="jd-side">' +
          '<div class="jd-apply-card"><div class="jd-apply-card__act">' + applyBtn(true) + favBtn + '</div></div>' +
          '<div class="jd-company">' +
            '<div class="jd-company__head">' + logo + '<div><div class="jd-company__name">' + KB.esc(l.sahip || T("ilan.unknown")) + ver + '</div><div class="jd-company__role">' + T("role." + (l.sahipRol || "isletme")) + '</div></div></div>' +
            '<a class="jd-company__link" href="' + profilePage + '?id=' + l.owner_id + '">' + T("jd.viewCompany") + '</a>' +
          '</div>' +
        '</aside>' +
      '</div>' +
      '<div class="jd-mobilebar">' + applyBtn(true) + favBtn + '</div>';
    document.title = (l.baslik || "İlan") + " · Kuryemi Bul";
  }

  /* ============ KAYITLI İLANLAR (favoriler) ============ */
  function savedEmpty() {
    return '<div class="kb-empty" style="grid-column:1/-1"><div class="kb-empty__ic">🔖</div><div class="kb-empty__t">' + T("fav.empty") + '</div>' +
      '<div class="kb-empty__d">' + T("fav.emptySub") + '</div>' +
      '<a class="btn btn--primary btn--sm mt-24" href="ilanlar.html">' + T("fav.browse") + '</a></div>';
  }
  async function renderSavedJobs() {
    var grid = document.getElementById("savedJobsGrid");
    if (!grid) return;
    var countEl = document.getElementById("savedJobsCount");
    var sortSel = document.getElementById("savedSort");
    if (window.KB && KB.ready) await KB.ready();
    var ids = getSavedJobs();
    if (!ids.length) { grid.innerHTML = savedEmpty(); if (countEl) countEl.textContent = ""; return; }
    grid.innerHTML = skeletonCards(Math.min(ids.length, 4));
    var jobs = [];
    if (online()) {
      for (var i = 0; i < ids.length; i++) { try { var l = await SB.listingById(ids[i]); if (l && l.durum === "acik") jobs.push(l); } catch (e) {} }
    }
    function render() {
      if (!jobs.length) { grid.innerHTML = savedEmpty(); if (countEl) countEl.textContent = ""; return; }
      var sort = (sortSel && sortSel.value) || "new";
      var arr = jobs.slice();
      arr.sort(function (a, b) {
        if (sort === "company") return (a.sahip || "").localeCompare(b.sahip || "", "tr");
        if (sort === "location") return (a.sehir || "").localeCompare(b.sehir || "", "tr");
        var da = a.tarih || "", db = b.tarih || ""; return da < db ? 1 : da > db ? -1 : 0;
      });
      if (countEl) countEl.textContent = T("fav.count", { n: arr.length });
      grid.innerHTML = arr.map(function (l) { return listingCard(l, {}, null); }).join("");
    }
    if (sortSel && !sortSel._wired) { sortSel._wired = 1; sortSel.addEventListener("change", render); }
    render();
  }

  /* ============ MESAJLAŞMA ============ */
  function msgTimeShort(iso) { try { return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  function msgPickPlaceholder() { return '<div class="msg-empty"><div class="kb-empty__ic">💬</div><div class="kb-empty__t">' + T("msg.pickConv") + '</div><div class="kb-empty__d">' + T("msg.pickConvSub") + '</div></div>'; }
  async function renderMessages() {
    var root = document.getElementById("msgRoot");
    if (!root) return;
    if (window.KB && KB.ready) await KB.ready();
    if (!(online() && KB.isAuthed && KB.isAuthed())) {
      root.innerHTML = '<div class="kb-empty"><div class="kb-empty__ic">💬</div><div class="kb-empty__t">' + T("msg.loginRequired") + '</div>' +
        '<a class="btn btn--primary btn--sm mt-24" href="giris.html">' + T("cta.signin") + '</a></div>';
      return;
    }
    var listEl = document.getElementById("msgConvList");
    var mainEl = document.getElementById("msgMain");
    var rootC = document.querySelector(".msg");
    var current = null, convs = [];

    function convItem(c) {
      var av = c.avatar ? '<img class="msg-conv__av" src="' + KB.esc(c.avatar) + '" alt="" onerror="this.remove()">' : '<div class="msg-conv__av msg-conv__av--ph">' + KB.initials(c.ad) + '</div>';
      return '<button type="button" class="msg-conv' + (c.profileId === current ? " is-active" : "") + '" data-conv="' + c.profileId + '">' +
        av + '<div class="msg-conv__body"><div class="msg-conv__top"><span class="msg-conv__name">' + KB.esc(c.ad) + '</span>' +
        (c.unread ? '<span class="msg-conv__badge">' + c.unread + '</span>' : '') + '</div>' +
        '<div class="msg-conv__last">' + (c.lastMine ? T("msg.you") + ": " : "") + KB.esc(c.lastBody || "") + '</div></div></button>';
    }
    async function loadConvs() {
      convs = await SB.myConversations();
      listEl.innerHTML = convs.map(convItem).join("");
      if (!convs.length && !current) {
        mainEl.innerHTML = '<div class="msg-empty"><div class="kb-empty__ic">💬</div><div class="kb-empty__t">' + T("msg.empty") + '</div><div class="kb-empty__d">' + T("msg.emptySub") + '</div></div>';
      }
    }
    function bubble(m, meId) {
      var mine = m.from_user === meId;
      return '<div class="msg-bubble' + (mine ? " msg-bubble--mine" : "") + '">' + KB.esc(m.body) + '<span class="msg-bubble__t">' + msgTimeShort(m.created_at) + '</span></div>';
    }
    function scrollBottom() { var s = document.getElementById("msgScroll"); if (s) s.scrollTop = s.scrollHeight; }
    async function openThread(profileId) {
      current = profileId;
      if (rootC) rootC.classList.add("msg--threadopen");
      listEl.querySelectorAll(".msg-conv").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-conv") === profileId); });
      mainEl.innerHTML = '<div class="msg-thread"><div class="msg-thread__scroll" id="msgScroll"><div class="skel skel--line" style="width:55%;margin:10px 0"></div><div class="skel skel--line" style="width:40%;margin:10px 0 10px auto"></div></div></div>';
      var t = await SB.threadWith(profileId);
      var other = t.other || {};
      var head = '<div class="msg-thread__head"><button type="button" class="msg-back" id="msgBack" aria-label="' + T("msg.back") + '">←</button>' +
        '<div class="msg-thread__who"><div class="msg-conv__av msg-conv__av--ph">' + KB.initials(other.ad || "?") + '</div>' +
        '<div><div class="msg-thread__name">' + KB.esc(other.ad || "") + '</div><div class="msg-thread__role">' + (other.role ? T("role." + other.role) : "") + '</div></div></div></div>';
      var body = t.messages.length ? t.messages.map(function (m) { return bubble(m, t.me); }).join("") : '<div class="msg-thread__empty">' + T("msg.threadEmpty") + '</div>';
      mainEl.innerHTML = '<div class="msg-thread">' + head + '<div class="msg-thread__scroll" id="msgScroll">' + body + '</div>' +
        '<form class="msg-compose" id="msgForm"><input id="msgInput" autocomplete="off" placeholder="' + T("msg.placeholder") + '"><button type="submit" class="btn btn--primary btn--sm">' + T("msg.send") + '</button></form></div>';
      scrollBottom();
      try { await SB.markThreadRead(profileId); } catch (e) {}
      loadConvs();
      if (window.__kbUpdateMsgBadge) window.__kbUpdateMsgBadge();
      document.getElementById("msgBack").addEventListener("click", function () {
        current = null; if (rootC) rootC.classList.remove("msg--threadopen");
        listEl.querySelectorAll(".msg-conv").forEach(function (b) { b.classList.remove("is-active"); });
      });
      document.getElementById("msgForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        var inp = document.getElementById("msgInput"); var bodyTxt = inp.value.trim(); if (!bodyTxt) return;
        inp.value = "";
        var scroll = document.getElementById("msgScroll");
        var empt = scroll.querySelector(".msg-thread__empty"); if (empt) empt.remove();
        scroll.insertAdjacentHTML("beforeend", bubble({ from_user: t.me, body: bodyTxt, created_at: new Date().toISOString() }, t.me));
        scrollBottom();
        try { await SB.sendMessage(profileId, bodyTxt); loadConvs(); }
        catch (err) { KB.toast((err && err.message) || T("apl.error"), "error"); }
      });
    }
    listEl.addEventListener("click", function (e) { var b = e.target.closest("[data-conv]"); if (b) openThread(b.getAttribute("data-conv")); });

    await loadConvs();
    var to = KB.getParam("to");
    if (to) openThread(to);
    else if (convs.length && window.matchMedia("(min-width:861px)").matches) openThread(convs[0].profileId);
    else if (convs.length) mainEl.innerHTML = msgPickPlaceholder();

    if (SB.subscribeMessages) {
      SB.subscribeMessages(function (m) {
        if (current && m.from_user === current) {
          var scroll = document.getElementById("msgScroll");
          if (scroll) { scroll.insertAdjacentHTML("beforeend", bubble(m, m.to_user)); scrollBottom(); SB.markThreadRead(current); }
        }
        loadConvs();
        if (window.__kbUpdateMsgBadge) window.__kbUpdateMsgBadge();
      });
    }
  }

  /* ============ DIŞA AÇIM ============ */
  window.KBApp = {
    renderPool: renderPool, renderProfile: renderProfile,
    initMap: initMap, initMapGoogle: initMapGoogle, initHomeMap: initHomeMap, initMapExperience: initMapExperience, initPanel: initPanel, openOfferModal: openOfferModal,
    renderMyPool: renderMyPool, renderListings: renderListings, renderTenders: renderTenders,
    renderJobDetail: renderJobDetail, renderSavedJobs: renderSavedJobs, renderMyApplications: renderMyApplications, renderMessages: renderMessages,
    renderHomeStats: renderHomeStats, renderTestimonials: renderTestimonials
  };
})();
