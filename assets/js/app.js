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
    if (window.KB && KB.bindDraft) KB.bindDraft(document.getElementById("offerForm"), "offer_draft");
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
    form.onsubmit = async function (e) {
      e.preventDefault();
      var msg = document.getElementById("offerMsg").value.trim();
      if (!msg) return;
      try {
        if (on) { await SB.sendOffer(targetId, targetType, fromRole, msg); }
        else { KB.addTeklif({ yon: fromRole + "-" + targetType, kimdenRol: fromRole, kimeTip: targetType, kime: target.ad, mesaj: msg }); }
      } catch (err) { KB.toast(err.message || "Hata", "error"); return; }
      document.getElementById("offerMsg").value = "";
      if (window.KB && KB.clearDraft) KB.clearDraft("offer_draft");
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

  /* ── İlan kartı — zengin render ──────────────────────────────── */
  var FAYDA_ICO = {
    'SGK':'🛡', 'Sigorta':'🛡', 'Yemek':'🍽', 'Prim':'💎',
    'Yakıt':'⛽', 'Haftalık':'📅', 'Araç':'🚗', 'Sağlık':'❤️', 'Eğitim':'📚'
  };
  function benefitIco(f) {
    var keys = Object.keys(FAYDA_ICO);
    for (var i = 0; i < keys.length; i++) { if ((f + '').indexOf(keys[i]) !== -1) return FAYDA_ICO[keys[i]] + ' '; }
    return '';
  }
  function listingCard(l, appliedSet, myPid) {
    var owner   = l.owner_id === myPid;
    var applied = appliedSet[l.id];
    var loc     = [l.sehir, l.bolge].filter(Boolean).join(" / ");
    var prefScore  = (window.KBPrefs && KBPrefs.hasPrefs()) ? KBPrefs.matchScore(l) : null;
    var score      = prefScore !== null ? prefScore : talentScore(l.id);
    var scoreClass = prefScore !== null
      ? (prefScore >= 70 ? ' is-match-high' : prefScore < 40 ? ' is-match-low' : '') : '';
    var saved = isSavedJob(l.id);
    var fresh = isFresh(l.tarih);

    /* ── Doğrulama rozeti ───────────────────────────────────── */
    var verHtml = l.sahipDogrulama === 'verified'
      ? '<span class="jc-ver">✓ Onaylı</span>' : '';

    /* ── Durum etiketleri ───────────────────────────────────── */
    var tags = '<span class="chip chip--open">● Açık</span>' +
      (l.oncelik === 'acil' ? '<span class="chip chip--urgent">🔥 ACİL</span>' : '') +
      (fresh ? '<span class="chip chip--new">' + T("ilan.new") + '</span>' : '') +
      (l.vardiya_tipi ? '<span class="chip">' + KB.esc(l.vardiya_tipi) + '</span>' : '') +
      (l.calisma_sekli && l.calisma_sekli !== l.vardiya_tipi
        ? '<span class="chip">' + KB.esc(l.calisma_sekli) + '</span>' : '') +
      (l.kategori ? '<span class="chip">' + KB.esc(l.kategori) + '</span>' : '');

    /* ── İş bilgileri grid ──────────────────────────────────── */
    var infoItems = [];
    if (l.maas_aralik) {
      var maasLabel = l.maas_modeli ? KB.esc(l.maas_modeli) : 'Maaş';
      infoItems.push(
        '<div class="jc-info-item"><span class="jc-info-item__label">' + maasLabel + '</span>' +
        '<span class="jc-info-item__val jc-info-item__val--salary">💰 ' + KB.esc(l.maas_aralik) + '</span></div>');
    }
    if (l.arac) {
      infoItems.push(
        '<div class="jc-info-item"><span class="jc-info-item__label">Araç</span>' +
        '<span class="jc-info-item__val">🛵 ' + KB.esc(l.arac) + '</span></div>');
    }
    if (l.calisma_saatleri) {
      infoItems.push(
        '<div class="jc-info-item"><span class="jc-info-item__label">Saat</span>' +
        '<span class="jc-info-item__val">🕐 ' + KB.esc(l.calisma_saatleri) + '</span></div>');
    }
    if (l.deneyim) {
      infoItems.push(
        '<div class="jc-info-item"><span class="jc-info-item__label">Deneyim</span>' +
        '<span class="jc-info-item__val">📋 ' + KB.esc(l.deneyim) + '</span></div>');
    } else if (l.sigorta) {
      infoItems.push(
        '<div class="jc-info-item"><span class="jc-info-item__label">Sigorta</span>' +
        '<span class="jc-info-item__val">🛡 ' + KB.esc(l.sigorta) + '</span></div>');
    }
    if (l.son_basvuru) {
      var dlDays  = -daysSince(l.son_basvuru);
      var dlUrgent = dlDays >= 0 && dlDays <= 7;
      var dlFmt = '';
      try { dlFmt = new Date(l.son_basvuru + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); } catch (e) {}
      var dlExtra = (dlDays >= 0 && dlDays <= 7) ? ' (' + dlDays + ' gün)' : '';
      var dlCls   = dlUrgent ? ' jc-info-item__val--deadline' : '';
      infoItems.push(
        '<div class="jc-info-item"><span class="jc-info-item__label">Son Başvuru</span>' +
        '<span class="jc-info-item__val' + dlCls + '">' + (dlUrgent ? '⚠️ ' : '📅 ') + dlFmt + dlExtra + '</span></div>');
    }
    if (l.kontenjan) {
      infoItems.push(
        '<div class="jc-info-item"><span class="jc-info-item__label">Kontenjan</span>' +
        '<span class="jc-info-item__val">👥 ' + l.kontenjan + ' kişi</span></div>');
    }
    var infoGridHtml = infoItems.length
      ? '<div class="jc-info-grid">' + infoItems.join('') + '</div>' : '';

    /* ── Faydalar ───────────────────────────────────────────── */
    var benefitHtml = '';
    if (l.faydalar && l.faydalar.length) {
      var badges = l.faydalar.slice(0, 5).map(function (f) {
        var ico = benefitIco(f);
        var sgkCls = ((f + '').indexOf('SGK') !== -1 || (f + '').indexOf('Sigorta') !== -1)
          ? ' jc-benefit-tag--sgk' : '';
        return '<span class="jc-benefit-tag' + sgkCls + '">' + ico + KB.esc(f) + '</span>';
      }).join('');
      benefitHtml = '<div class="jc-benefit-tags">' + badges + '</div>';
    }

    /* ── Açıklama (2 satır) ─────────────────────────────────── */
    var descHtml = '';
    if (l.aciklama) {
      var descText = l.aciklama;
      var nlIdx = descText.indexOf('\n\n');
      if (nlIdx > 30 && nlIdx < 250) descText = descText.slice(0, nlIdx);
      descHtml = '<p class="jc-desc">' + KB.esc(descText) + '</p>';
    }

    /* ── Aktivite bilgisi ───────────────────────────────────── */
    var actHtml = '<div class="jc-activity">' +
      '<span>' + timeAgo(l.tarih) + '</span>' +
      '<span class="jc-activity__dot"></span>' +
      '<span>' + appCount(l.id) + ' başvuru</span>' +
      (l.kontenjan > 1 ? '<span class="jc-activity__dot"></span><span>' + l.kontenjan + ' pozisyon</span>' : '') +
    '</div>';

    /* ── Aksiyonlar ─────────────────────────────────────────── */
    var detailHref = 'ilan.html?id=' + l.id;
    var actionHtml;
    if (!canPool()) {
      actionHtml = '<div class="jc-card-actions">' +
        '<a class="btn btn--ghost btn--sm" href="' + detailHref + '">Detay Gör</a>' +
        '<a class="btn btn--primary btn--sm" href="giris.html">' + T("cta.signin") + '</a>' +
      '</div>';
    } else if (owner) {
      actionHtml = '<div class="jc-card-actions">' +
        '<a class="btn btn--ghost btn--sm" href="ilan-olustur.html?edit=' + l.id + '">✏️ Düzenle</a>' +
        '<a class="btn btn--light btn--sm" href="panel-isletme.html">📋 Başvurular</a>' +
      '</div>';
    } else if (applied) {
      actionHtml = '<div class="jc-card-actions">' +
        '<a class="btn btn--ghost btn--sm" href="' + detailHref + '">Detay Gör</a>' +
        '<span class="chip chip--ok">✓ ' + T("ilan.applied") + '</span>' +
      '</div>';
    } else {
      actionHtml = '<div class="jc-card-actions">' +
        '<a class="btn btn--ghost btn--sm" href="' + detailHref + '">Detay Gör</a>' +
        '<button class="btn btn--primary btn--sm" data-apply="' + l.id + '" data-baslik="' + KB.esc(l.baslik) + '" data-company="' + KB.esc(l.sahip || "") + '" data-loc="' + KB.esc(loc) + '">' + T("ilan.apply") + '</button>' +
      '</div>';
    }

    /* ── Favori butonu ──────────────────────────────────────── */
    var favBtn = '<button type="button" class="job-fav' + (saved ? " is-on" : "") +
      '" data-savejob="' + l.id + '" aria-pressed="' + (saved ? "true" : "false") +
      '" aria-label="' + T(saved ? "ilan.saved" : "ilan.save") +
      '" title="' + T(saved ? "ilan.saved" : "ilan.save") + '">' +
      (saved ? "♥" : "♡") + '</button>';

    /* ── Şirket rolü etiketi ────────────────────────────────── */
    var roleLabel = l.sahipRol === 'firma' ? 'Firma' : l.sahipRol === 'isletme' ? 'İşletme' : '';

    /* ── Kart ───────────────────────────────────────────────── */
    return '<article class="job-card job-card--rich" data-job="' + l.id + '">' +
      favBtn +
      '<div class="employer-badge">' +
        '<div class="employer-badge__av">' + KB.initials(l.sahip || "?") + '</div>' +
        '<div class="jc-company-info">' +
          '<span class="jc-company-name">' + KB.esc(l.sahip || T("ilan.unknown")) + verHtml + '</span>' +
          (roleLabel ? '<span class="jc-company-role">' + roleLabel + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<a class="job-card__title" href="' + detailHref + '">' + KB.esc(l.baslik) + '</a>' +
      '<div class="job-card__tags">' + tags + '</div>' +
      (loc ? '<div class="jc-location"><span>📍</span><span>' + KB.esc(loc) + '</span>' +
        (l.teslimat_bolge && l.teslimat_bolge !== l.bolge
          ? ' <span class="jc-location__region">· ' + KB.esc(l.teslimat_bolge) + '</span>' : '') +
      '</div>' : '') +
      infoGridHtml +
      descHtml +
      benefitHtml +
      actHtml +
      '<div class="job-card__foot">' +
        actionHtml +
        '<span class="match-score' + scoreClass + '">%' + score + ' Uyum</span>' +
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
    if (window.KB && KB.saveView) KB.saveView("flt_ilanlar", { q: (search && search.value) || "", city: city || "", veh: veh || "", sort: sort });
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
      if (sort === "match") {
        var usePrefs = window.KBPrefs && KBPrefs.hasPrefs();
        return (usePrefs ? KBPrefs.matchScore(b) : talentScore(b.id)) - (usePrefs ? KBPrefs.matchScore(a) : talentScore(a.id));
      }
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
    if (!online()) {
      JOBS.list = (window.KB_DATA && KB_DATA.ilanlar) ? KB_DATA.ilanlar : [];
      var citySel2 = document.getElementById("jobCity");
      var vehSel2 = document.getElementById("jobVehicle");
      fillFilterSelect(citySel2, uniqVals(JOBS.list, function (x) { return x.sehir; }), T("ilan.allCities"));
      fillFilterSelect(vehSel2, uniqVals(JOBS.list, function (x) { return x.arac; }), T("ilan.allVehicles"));
      if (countEl) countEl.textContent = JOBS.list.length ? T("ilan.count", { n: JOBS.list.length }) : "";
      ["jobSearch", "jobCity", "jobVehicle", "jobSort"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el._wired) { el._wired = 1; el.addEventListener(el.tagName === "SELECT" ? "change" : "input", applyJobFilters); }
      });
      applyJobFilters();
      return;
    }
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
    // Filtre hafızası: geri dönünce son arama/filtre korunur (MP05 §4)
    var savedF = window.KB && KB.loadView && KB.loadView("flt_ilanlar");
    if (savedF) {
      var se = document.getElementById("jobSearch"); if (se && savedF.q) se.value = savedF.q;
      if (citySel && savedF.city) citySel.value = savedF.city;
      if (vehSel && savedF.veh) vehSel.value = savedF.veh;
      var so = document.getElementById("jobSort"); if (so && savedF.sort) so.value = savedF.sort;
    }
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
    if (window.KB && KB.bindDraft) KB.bindDraft(document.getElementById("applyForm"), "apply_draft");
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
    document.getElementById("applyCancel").onclick = function () { m.classList.remove("is-open"); };
    form.onsubmit = async function (e) {
      e.preventDefault();
      err.hidden = true;
      sendBtn.disabled = true; sendBtn.classList.add("is-loading"); sendBtn.textContent = T("apl.sending");
      try {
        await SB.applyToListing(listingId, document.getElementById("applyMsg").value.trim());
        document.querySelectorAll('[data-apply="' + listingId + '"]').forEach(function (b) { b.outerHTML = '<span class="chip chip--ok">' + T("ilan.applied") + '</span>'; });
        document.getElementById("applyMsg").value = "";
        if (window.KB && KB.clearDraft) KB.clearDraft("apply_draft");
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
    var mine = await SB.myListings();

    var formHtml =
      '<div class="li-create-wrap">' +
        '<div class="li-create-head">' +
          '<span class="li-create-head__title">📋 İlanlarım' + (mine.length ? ' <span class="chip chip--sm">' + mine.length + '</span>' : '') + '</span>' +
          '<button type="button" class="btn btn--primary btn--sm" id="liToggle">✚ Yeni İlan Oluştur</button>' +
        '</div>' +
        '<div class="li-create-form" id="liForm" style="display:none">' +
          '<div class="form-grid">' +
            '<div class="field field--required"><label>' + T("ilan.baslik") + '</label><input id="liBaslik" placeholder="' + T("ilan.baslikPh") + '" autocomplete="off"></div>' +
            '<div class="field"><label>' + T("ilan.sehir") + '</label><input id="liSehir" autocomplete="off"></div>' +
            '<div class="field"><label>' + T("ilan.bolge") + '</label><input id="liBolge" autocomplete="off"></div>' +
            '<div class="field"><label>' + T("ilan.arac") + '</label>' +
              '<select id="liArac"><option value="">— Seçiniz —</option>' +
              ['Motosiklet','Bisiklet','Scooter','Araba','Yaya','Diğer'].map(function(v){ return '<option>' + v + '</option>'; }).join('') +
              '</select>' +
            '</div>' +
            '<div class="field field--full"><label>' + T("ilan.aciklama") + '</label><textarea id="liAciklama" rows="3" placeholder="Kurye gereksinimlerini, çalışma saatlerini ve detayları buraya yazın…"></textarea></div>' +
          '</div>' +
          '<div class="li-create-foot">' +
            '<button type="button" class="btn btn--primary" id="liSubmit">📤 İlanı Yayınla</button>' +
            '<button type="button" class="btn btn--ghost btn--sm" id="liCancel">İptal</button>' +
            '<span class="li-msg" id="liMsg" style="display:none"></span>' +
          '</div>' +
        '</div>' +
      '</div>';

    var listHtml = mine.length
      ? mine.map(myListingRow).join("")
      : '<div class="empty">Henüz ilan oluşturmadınız. Yukarıdan yeni ilan ekleyebilirsiniz.</div>';

    host.innerHTML = formHtml + listHtml;

    var toggle = document.getElementById("liToggle");
    var form = document.getElementById("liForm");
    var cancel = document.getElementById("liCancel");
    if (toggle && form) {
      toggle.addEventListener("click", function () {
        var open = form.style.display !== "none";
        form.style.display = open ? "none" : "block";
        toggle.textContent = open ? "✚ Yeni İlan Oluştur" : "✕ Kapat";
        if (!open) { var inp = document.getElementById("liBaslik"); if (inp) inp.focus(); }
      });
    }
    if (cancel && form) {
      cancel.addEventListener("click", function () {
        form.style.display = "none";
        if (toggle) toggle.textContent = "✚ Yeni İlan Oluştur";
      });
    }

    if (window.KB && KB.bindDraft) KB.bindDraft(form, "ilan_create");

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
      var baslik = val2("liBaslik");
      var msg = document.getElementById("liMsg");
      var btn = document.getElementById("liSubmit");
      if (!baslik) {
        if (msg) { msg.style.display = "inline"; msg.style.color = "#c0392b"; msg.textContent = T("ilan.baslikReq") || "İlan başlığı zorunludur."; }
        return;
      }
      if (btn) { btn.disabled = true; btn.textContent = "Yayınlanıyor…"; }
      try {
        await SB.createListing({ baslik: baslik, sehir: val2("liSehir"), bolge: val2("liBolge"), arac: val2("liArac"), aciklama: val2("liAciklama") });
        if (window.KB && KB.clearDraft) KB.clearDraft("ilan_create");
        if (window.KB && KB.toast) KB.toast("İlan başarıyla yayınlandı! 🎉", "success");
        await renderMyListings();
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = "📤 İlanı Yayınla"; }
        if (msg) { msg.style.display = "inline"; msg.style.color = "#c0392b"; msg.textContent = (err && err.message) || "Bir hata oluştu."; }
      }
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
  /* deterministik başvuru sayısı (demo) */
  function appCount(id) {
    var h = 0, s = String(id || "") + "_a";
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return (Math.abs(h) % 22) + 4;
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

  // Havuz modül durumu — handler güncel veriyi okur (GROUP 3 deseni)
  var POOLV = { src: [], type: "kurye", cardFn: null };
  function renderPoolChips() {
    var host = document.getElementById("poolChips"); if (!host) return;
    var search = document.getElementById("fSearch"), sel1 = document.getElementById("fSelect1"), sel2 = document.getElementById("fSelect2");
    var chips = [];
    if (search && search.value.trim()) chips.push({ k: "q", label: '"' + search.value.trim() + '"' });
    if (sel1 && sel1.value) chips.push({ k: "s1", label: "📍 " + sel1.value });
    if (sel2 && sel2.value) { var txt = sel2.options[sel2.selectedIndex] ? sel2.options[sel2.selectedIndex].text : sel2.value; chips.push({ k: "s2", label: txt }); }
    if (!chips.length) { host.innerHTML = ""; host.classList.remove("is-open"); return; }
    host.classList.add("is-open");
    host.innerHTML = '<span class="active-chips__label">' + T("filter.active") + ':</span>' +
      chips.map(function (c) { return '<button type="button" class="active-chip" data-rmpool="' + c.k + '">' + KB.esc(c.label) + ' <span aria-hidden="true">✕</span></button>'; }).join("") +
      '<button type="button" class="active-chips__clear" data-rmpool="all">' + T("filter.clearAll") + '</button>';
  }
  function poolApply() {
    var grid = document.getElementById("poolGrid"); if (!grid) return;
    renderPoolChips();
    var countEl = document.getElementById("resultCount");
    var search = document.getElementById("fSearch"), sel1 = document.getElementById("fSelect1"), sel2 = document.getElementById("fSelect2");
    var type = POOLV.type;
    var q = norm(search && search.value || ""), v1 = sel1 && sel1.value, v2 = sel2 && sel2.value;
    if (window.KB && KB.saveView) KB.saveView("flt_pool_" + type, { q: (search && search.value) || "", v1: v1 || "", v2: v2 || "" });
    var out = POOLV.src.filter(function (x) {
      if (q) {
        var hay = norm(x.ad + " " + (x.sehir || "") + " " + (x.bolgeler ? x.bolgeler.join(" ") : "") + " " + (x.bolge || "") + " " + (x.tur || "") + " " + (x.aciklama || ""));
        if (hay.indexOf(q) === -1) return false;
      }
      if (v1) { if (type === "firma") { if (x.bolgeler.indexOf(v1) === -1) return false; } else if (x.sehir !== v1) return false; }
      if (v2) { if (type === "kurye" && x.seviye !== v2) return false; if (type === "isletme" && x.tur !== v2) return false; }
      return true;
    });
    grid.innerHTML = out.length ? out.map(POOLV.cardFn).join("") :
      '<div class="empty" style="grid-column:1/-1">' + T("common.noResult") + '</div>';
    if (countEl) countEl.textContent = T("common.results", { n: out.length });
  }
  document.addEventListener("click", function (e) {
    var rm = e.target.closest("[data-rmpool]"); if (!rm) return;
    var k = rm.getAttribute("data-rmpool");
    var search = document.getElementById("fSearch"), sel1 = document.getElementById("fSelect1"), sel2 = document.getElementById("fSelect2");
    if (k === "q" && search) search.value = ""; else if (k === "s1" && sel1) sel1.value = ""; else if (k === "s2" && sel2) sel2.value = "";
    else if (k === "all") { if (search) search.value = ""; if (sel1) sel1.value = ""; if (sel2) sel2.value = ""; }
    poolApply();
  });
  function poolSuggestHtml(q) {
    q = norm(q); var src = POOLV.src, type = POOLV.type, groups = [];
    function uniqMatch(getter, limit) {
      var seen = {}, out = [];
      src.forEach(function (x) { [].concat(getter(x) || []).forEach(function (v) { if (!v) return; var k = norm(v); if (seen[k] || (q && k.indexOf(q) === -1)) return; seen[k] = 1; out.push(v); }); });
      return out.slice(0, limit);
    }
    var add = function (label, icon, vals) { if (vals.length) groups.push({ label: label, icon: icon, items: vals }); };
    add(T("search.names"), "👤", uniqMatch(function (x) { return x.ad; }, 4));
    add(T("search.cities"), "📍", uniqMatch(function (x) { return x.sehir; }, 3));
    add(T("search.districts"), "🗺️", uniqMatch(function (x) { return x.bolgeler || x.bolge; }, 3));
    if (type === "isletme") add(T("pe.type"), "🏷️", uniqMatch(function (x) { return x.tur; }, 3));
    if (!groups.length) return "";
    return groups.map(function (g) {
      return '<div class="suggest__group"><div class="suggest__label">' + KB.esc(g.label) + '</div>' +
        g.items.map(function (v) { return '<button type="button" class="suggest__item" data-poolsugg="' + KB.esc(v) + '"><span class="suggest__ic">' + g.icon + '</span><span>' + KB.esc(v) + '</span></button>'; }).join("") + '</div>';
    }).join("");
  }
  async function renderPool(type) {
    var grid = document.getElementById("poolGrid");
    if (!grid) return;
    grid.innerHTML = skeletonCards(6);
    var src = await loadPool(type);
    await loadPoolSet();
    POOLV.src = src; POOLV.type = type;
    POOLV.cardFn = type === "kurye" ? kuryeCard : type === "isletme" ? isletmeCard : firmaCard;
    var sel1 = document.getElementById("fSelect1"), sel2 = document.getElementById("fSelect2");
    function uniq(getter) { var s = {}; src.forEach(function (x) { [].concat(getter(x)).forEach(function (v) { if (v) s[v] = 1; }); }); return Object.keys(s).sort(); }
    if (sel1) { if (type === "firma") fillSelect(sel1, uniq(function (x) { return x.bolgeler; })); else fillSelect(sel1, uniq(function (x) { return x.sehir; })); }
    if (type === "kurye" && sel2) fillSelect(sel2, ["standart", "profesyonel", "premium"], { standart: T("level.standart"), profesyonel: T("level.profesyonel"), premium: T("level.premium") });
    if (type === "isletme" && sel2) fillSelect(sel2, uniq(function (x) { return x.tur; }));
    ["fSearch", "fSelect1", "fSelect2"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el._poolWired) { el._poolWired = 1; el.addEventListener(el.tagName === "SELECT" ? "change" : "input", poolApply); }
    });
    // Filtre hafızası: geri dönünce son arama/filtre korunur (MP05 §4)
    var savedF = window.KB && KB.loadView && KB.loadView("flt_pool_" + type);
    if (savedF) {
      var se = document.getElementById("fSearch"); if (se && savedF.q) se.value = savedF.q;
      if (sel1 && savedF.v1) sel1.value = savedF.v1;
      if (sel2 && savedF.v2) sel2.value = savedF.v2;
    }
    var search = document.getElementById("fSearch"), sugg = document.getElementById("poolSuggest");
    if (search && sugg && !search._poolSugg) {
      search._poolSugg = 1;
      function openS() { var h = poolSuggestHtml(search.value); sugg.innerHTML = h; sugg.classList.toggle("is-open", !!h); }
      search.addEventListener("focus", openS);
      search.addEventListener("input", openS);
      sugg.addEventListener("mousedown", function (e) { var it = e.target.closest("[data-poolsugg]"); if (it) { e.preventDefault(); search.value = it.getAttribute("data-poolsugg"); poolApply(); sugg.classList.remove("is-open"); } });
      document.addEventListener("click", function (e) { if (!sugg.contains(e.target) && e.target !== search) sugg.classList.remove("is-open"); });
    }
    poolApply();
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

    /* ── Avatar ───────────────────────────────────────────── */
    var avHtml = x.avatar_url
      ? '<img class="prf__av-img" src="' + KB.esc(x.avatar_url) + '" alt="" onerror="this.style.display=\'none\'">'
      : '<div class="prf__av-ph">' + KB.initials(x.ad || "?") + '</div>';

    /* ── Verification badge inline ────────────────────────── */
    var verSvg = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    var verHtml = x.dogrulama === "verified"
      ? '<span class="prf__badge prf__badge--ver" title="' + T("kyc.verified") + '">' + verSvg + T("kyc.verifiedShort") + '</span>'
      : '<span class="prf__badge prf__badge--pend">Doğrulanmadı</span>';

    /* ── Level badge (kurye only) ─────────────────────────── */
    var lvlCls = { standart: "prf__lvl--std", profesyonel: "prf__lvl--pro", premium: "prf__lvl--prm" };
    var lvlIco  = { standart: "🥉", profesyonel: "🥈", premium: "🥇" };
    var lvlLbl  = { standart: T("level.standart"), profesyonel: T("level.profesyonel"), premium: T("level.premium") };

    /* ── Quick-trust row (role-specific KPI pills) ────────── */
    function kpi(val, lbl, hi) {
      return '<div class="prf__kpi' + (hi ? " prf__kpi--hi" : "") + '"><div class="prf__kpi-val">' + val + '</div><div class="prf__kpi-lbl">' + lbl + '</div></div>';
    }
    var trustRow;
    if (type === "kurye") {
      trustRow = kpi(x.puan ? Number(x.puan).toFixed(1) : "—", T("kv.score"), true) +
                 kpi(x.tamamlanan || 0, "Teslimat", false) +
                 kpi((x.deneyim || 0) + " yıl", T("kv.exp"), false) +
                 kpi((x.bolgeler || []).length, "Bölge", false);
    } else if (type === "isletme") {
      trustRow = kpi(x.puan ? Number(x.puan).toFixed(1) : "—", "Puan", true) +
                 kpi(x.acikIlan || 0, "Açık İlan", false) +
                 kpi((x.bolgeler || []).length, "Bölge", false);
    } else {
      trustRow = kpi(x.puan ? Number(x.puan).toFixed(1) : "—", "Puan", true) +
                 kpi(x.kapasite || 0, "Kurye Kap.", false) +
                 kpi((x.bolgeler || []).length, "Bölge", false) +
                 kpi((x.hizmetler || []).length, "Hizmet", false);
    }

    /* ── Sub-title & tagline ──────────────────────────────── */
    var sub = type === "kurye"    ? (x.sehir || "")
            : type === "isletme" ? [x.tur, x.sehir].filter(Boolean).join(" · ")
            : (x.bolgeler || []).slice(0, 2).join(", ");
    var tagline = type === "kurye"    ? (lvlLbl[x.seviye] || "Kurye")
                : type === "isletme" ? (x.tur || "İşletme")
                : "Kurye Firması";

    /* ── Verification center checklist ───────────────────── */
    var okIco  = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
    var noIco  = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    function verifItem(ok, label) {
      return '<div class="prf-verif__item' + (ok ? " prf-verif__item--ok" : "") + '">' +
        '<div class="prf-verif__ic">' + (ok ? okIco : noIco) + '</div>' +
        '<span class="prf-verif__lbl">' + label + '</span>' +
        (ok ? '<span class="prf-verif__status">Doğrulandı</span>' : '<span class="prf-verif__status prf-verif__status--no">Bekliyor</span>') +
      '</div>';
    }
    var verifHtml =
      verifItem(x.dogrulama === "verified", "Kimlik Doğrulama") +
      verifItem(!!(x.telefon), "Telefon") +
      verifItem(true, "Platform Üyeliği") +
      verifItem(x.dogrulama === "verified", "Güvenilir Hesap");

    /* ── KYC back-link (built into page-head via JS rendered hero) */
    var backHref = type === "kurye" ? "kuryeler.html" : type === "isletme" ? "isletmeler.html" : "firmalar.html";
    var backLabel = type === "kurye" ? "← Yetenek Keşfi" : type === "isletme" ? "← İşverenler" : "← Kurye Firmaları";

    /* ── HERO HTML ────────────────────────────────────────── */
    var heroHtml =
      '<div class="prf">' +
        '<a class="prf__back" href="' + backHref + '">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>' +
          backLabel +
        '</a>' +
        '<div class="prf__cover"></div>' +
        '<div class="prf__head">' +
          '<div class="prf__av">' + avHtml + '</div>' +
          '<div class="prf__meta">' +
            '<div class="prf__name-row">' +
              '<span class="prf__name">' + KB.esc(x.ad) + '</span>' +
              verHtml +
            '</div>' +
            (type === "kurye"
              ? '<span class="prf__lvl ' + (lvlCls[x.seviye] || "prf__lvl--std") + '">' + (lvlIco[x.seviye] || "") + ' ' + (lvlLbl[x.seviye] || x.seviye) + '</span>'
              : '<span class="prf__tagline">' + KB.esc(tagline) + '</span>') +
            (sub ? '<div class="prf__loc"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> ' + KB.esc(sub) + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="prf__trust-row">' + trustRow + '</div>' +
        '<div class="prf__cta-row">' +
          '<button class="prf__btn prf__btn--primary" data-teklif="' + type + '" data-id="' + x.id + '">✉️ ' + T("btn.sendOffer") + '</button>' +
          '<a class="prf__btn prf__btn--ghost" id="profMsgBtn" href="mesajlar.html?to=' + x.id + '" hidden>💬 ' + T("msg.btn") + '</a>' +
        '</div>' +
      '</div>';

    /* ── SECTIONS ─────────────────────────────────────────── */
    var sections = "";

    function prfSection(title, inner) {
      return '<div class="prf-section"><div class="prf-section__h">' + title + '</div><div class="prf-section__body">' + inner + '</div></div>';
    }
    function prfKv(pairs) {
      return '<dl class="prf-kv">' + pairs.map(function(p){ return '<dt>' + p[0] + '</dt><dd>' + p[1] + '</dd>'; }).join("") + '</dl>';
    }
    function prfKpiGrid(items) {
      return '<div class="prf-kpi-grid">' + items.map(function(k){
        return '<div class="prf-kpi-card' + (k.hi ? " prf-kpi-card--hi" : "") + '"><div class="prf-kpi-card__val">' + k.val + '</div><div class="prf-kpi-card__lbl">' + k.lbl + '</div></div>';
      }).join("") + '</div>';
    }
    function prfChips(arr) {
      return '<div class="prf-chips">' + arr.map(function(s){ return '<span class="chip">' + KB.esc(s) + '</span>'; }).join("") + '</div>';
    }

    if (type === "kurye") {
      /* Kariyer seviyesi */
      sections += prfSection("Kariyer Seviyesi",
        careerTrackHtml(x.seviye) +
        '<div class="xp-bar" style="margin-top:14px">' +
          '<div class="xp-bar__labels"><span>' + T("kv.score") + '</span><b>' + (x.puan ? Number(x.puan).toFixed(1) : "—") + ' / 5</b></div>' +
          '<div class="xp-bar__track"><div class="xp-bar__fill" style="width:' + xpFill(x.puan) + '%"></div></div>' +
        '</div>');

      /* Doğrulama merkezi */
      sections += prfSection("Doğrulama Merkezi", '<div class="prf-verif">' + verifHtml + '</div>');

      /* Aktivite KPI */
      sections += prfSection("Aktivite & Deneyim", prfKpiGrid([
        { val: x.tamamlanan || 0, lbl: "Teslimat", hi: true },
        { val: (x.deneyim || 0) + " yıl", lbl: "Deneyim", hi: false },
        { val: (x.bolgeler || []).length, lbl: "Bölge", hi: false },
        { val: (x.sertifikalar || []).length, lbl: "Sertifika", hi: false }
      ]));

      /* Genel bilgiler */
      sections += prfSection(T("prof.general"), prfKv([
        [T("kv.city"), KB.esc(x.sehir)],
        [T("kv.vehicle"), KB.esc(x.arac)],
        [T("kv.regions"), KB.esc((x.bolgeler || []).join(", "))]
      ]));

      /* Başarılar / sertifikalar */
      if (x.sertifikalar && x.sertifikalar.length) {
        sections += prfSection(T("prof.certs"),
          '<div class="prf-achv-grid">' + x.sertifikalar.map(function(c){
            return '<div class="prf-achv"><div class="prf-achv__ic">🏅</div><div class="prf-achv__lbl">' + KB.esc(c) + '</div></div>';
          }).join("") + '</div>');
      } else {
        sections += prfSection(T("prof.certs"), '<p class="prf-empty-sub">' + T("prof.noCert") + '</p>');
      }

      /* Çalışma geçmişi */
      sections += prfSection(T("prof.worked"),
        (x.calistigi && x.calistigi.length) ? prfChips(x.calistigi) : '<p class="prf-empty-sub">' + T("prof.noHistory") + '</p>');

      /* Referanslar */
      if (x.referanslar && x.referanslar.length) {
        sections += prfSection(T("prof.refs"),
          '<div class="prf-ref-list">' + x.referanslar.map(function(r){
            return '<div class="prf-ref"><div class="prf-ref__head"><span class="prf-ref__name">' + KB.esc(r.ad) + '</span><span class="prf-ref__role">' + KB.esc(r.rol) + '</span></div>' +
              '<p class="prf-ref__note">"' + KB.esc(r.not) + '"</p></div>';
          }).join("") + '</div>');
      } else {
        sections += prfSection(T("prof.refs"), '<p class="prf-empty-sub">' + T("prof.noRef") + '</p>');
      }

    } else if (type === "isletme") {
      sections += prfSection("Doğrulama Merkezi", '<div class="prf-verif">' + verifHtml + '</div>');
      sections += prfSection("İşletme Metrikleri", prfKpiGrid([
        { val: x.puan ? Number(x.puan).toFixed(1) : "—", lbl: "Puan", hi: true },
        { val: x.acikIlan || 0, lbl: "Açık İlan", hi: false }
      ]));
      sections += prfSection(T("prof.bizInfo"), prfKv([
        [T("kv.type"), KB.esc(x.tur)],
        [T("kv.cityRegion"), KB.esc(x.sehir) + (x.bolge ? ' · ' + KB.esc(x.bolge) : "")]
      ]));
      if (x.ihtiyac) sections += prfSection(T("prof.need"), '<p class="prf-about">' + KB.esc(x.ihtiyac) + '</p>');
      if (x.aciklama) sections += prfSection(T("prof.about"), '<p class="prf-about">' + KB.esc(x.aciklama) + '</p>');

    } else { /* firma */
      sections += prfSection("Doğrulama Merkezi", '<div class="prf-verif">' + verifHtml + '</div>');
      sections += prfSection("Firma Metrikleri", prfKpiGrid([
        { val: x.puan ? Number(x.puan).toFixed(1) : "—", lbl: "Puan", hi: true },
        { val: x.kapasite || 0, lbl: "Kurye Kapasitesi", hi: false }
      ]));
      sections += prfSection(T("kv.serviceRegions"), prfChips(x.bolgeler || []));
      if (x.hizmetler && x.hizmetler.length) sections += prfSection(T("prof.services"), prfChips(x.hizmetler));
      if (x.aciklama) sections += prfSection(T("prof.about"), '<p class="prf-about">' + KB.esc(x.aciklama) + '</p>');
    }

    /* Pool toggle */
    if (canPool()) {
      sections += '<div class="prf-pool-wrap">' + poolBtnFull(x.id) + '</div>';
    }

    /* Değerlendirmeler */
    if (online()) {
      var reviews = [], canRev = false, myRev = null;
      try {
        reviews = await SB.reviewsFor(x.id);
        if (KB.isAuthed && KB.isAuthed()) {
          var meP = KB.session() && KB.session().profile;
          if (!meP || meP.id !== x.id) { canRev = await SB.canReview(x.id); if (canRev) myRev = await SB.myReviewFor(x.id); }
        }
      } catch (e) {}
      sections += '<div class="prf-section">' + reviewsBox(x.id, reviews, canRev, myRev) + '</div>';
    }

    host.innerHTML = heroHtml + '<div class="prf__body">' + sections + '</div>';

    /* Eşleşme varsa "Mesaj Gönder" butonunu göster */
    if (online() && KB.isAuthed && KB.isAuthed() && SB.canMessage) {
      SB.canMessage(x.id).then(function(ok) { if (ok) { var mb = document.getElementById("profMsgBtn"); if (mb) mb.hidden = false; } }).catch(function(){});
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
    el.__gmap = map; // konumum butonu için referans

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

    // Konumum butonu
    var panelLocMarker = null;
    var panelLocBtn = document.createElement('button');
    panelLocBtn.className = 'gm-locate-btn';
    panelLocBtn.title = 'Konumumu göster';
    panelLocBtn.setAttribute('aria-label', 'Konumumu göster');
    panelLocBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>';
    panelLocBtn.style.margin = '0 10px 10px 0';
    panelLocBtn.addEventListener('click', function () {
      if (!navigator.geolocation) { if (window.KB) KB.toast('Konum desteklenmiyor.', 'error'); return; }
      panelLocBtn.classList.add('is-loading'); panelLocBtn.classList.remove('is-active');
      navigator.geolocation.getCurrentPosition(function (pos) {
        panelLocBtn.classList.remove('is-loading'); panelLocBtn.classList.add('is-active');
        var ll = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (panelLocMarker) panelLocMarker.setMap(null);
        panelLocMarker = new google.maps.Marker({
          position: ll, map: map, title: 'Konumunuz',
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
          zIndex: 1000
        });
        map.panTo(ll); map.setZoom(13);
      }, function (err) {
        panelLocBtn.classList.remove('is-loading');
        if (window.KB) KB.toast(err.code === 1 ? 'Konum izni reddedildi.' : 'Konum alınamadı.', 'error');
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
    });
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(panelLocBtn);

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
      // Admin tüm panelleri görebilir; diğerleri sadece kendi panelini
      var isAdmin = window._kbIsAdmin || false;
      if (myRole && myRole !== role && myRole !== "admin" && !isAdmin) {
        location.href = KB.roleToPanel(myRole); return;
      }
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
      if (online() && window.SB && SB.myListingStats) {
        SB.myListingStats().then(function (stats) {
          var acceptRate = stats.totalApps > 0 ? Math.round(stats.acceptedApps / stats.totalApps * 100) : 0;
          var analyticsHtml =
            '<div class="kb-analytics" style="margin-top:16px">' +
              '<div class="kb-analytics__title">📊 İlan Analitiği</div>' +
              '<div class="kb-analytics__grid">' +
                '<div class="kb-analytics__item"><span class="kb-analytics__val">' + stats.openCount + '</span><span class="kb-analytics__lbl">Açık İlan</span></div>' +
                '<div class="kb-analytics__item"><span class="kb-analytics__val">' + stats.totalApps + '</span><span class="kb-analytics__lbl">Toplam Başvuru</span></div>' +
                '<div class="kb-analytics__item"><span class="kb-analytics__val kb-analytics__val--ok">' + stats.acceptedApps + '</span><span class="kb-analytics__lbl">Kabul Edildi</span></div>' +
                '<div class="kb-analytics__item"><span class="kb-analytics__val">' + stats.pendingApps + '</span><span class="kb-analytics__lbl">Bekleyen</span></div>' +
                '<div class="kb-analytics__item"><span class="kb-analytics__val">' + acceptRate + '%</span><span class="kb-analytics__lbl">Kabul Oranı</span></div>' +
                '<div class="kb-analytics__item"><span class="kb-analytics__val">' + stats.closedCount + '</span><span class="kb-analytics__lbl">Kapalı İlan</span></div>' +
              '</div>' +
            '</div>';
          setHTML("isletmeMetrics",
            metric(stats.openCount, T("m.openListings")) +
            metric(offerCount, T("m.offers")) +
            metric(stats.totalApps, "Başvuru") +
            metric(acceptRate + "%", "Kabul Oranı") +
            analyticsHtml
          );
        }).catch(function () {});
        setHTML("isletmeMetrics", metric("…", T("m.openListings")) + metric(offerCount, T("m.offers")) + metric("…", "Başvuru") + metric("…", "Kabul Oranı"));
      } else {
        var ai = prof ? (prof.acikIlan || 0) : "—";
        setHTML("isletmeMetrics", metric(ai, T("m.openListings")) + metric(offerCount, T("m.offers")) + metric("—", "Başvuru") + metric("—", "Kabul Oranı"));
      }
      if (online()) renderMyListings();
      else setHTML("isletmeIlan", D.ilanlar.filter(function (i) { return i.tip !== "ihale"; }).map(function (i) {
        return listRow(KB.esc(i.baslik), T("soon.published") + " · " + KB.esc(i.tarih), '<span class="chip">' + T("state.active") + '</span>');
      }).join(""));
      setHTML("isletmeBasvuru", listFor("isletme"));
    } else if (role === "firma") {
      var kp = prof ? (prof.kapasite || 0) : "60";
      var fpu = prof ? (Number(prof.puan) || 0).toFixed(1) : "4.8";
      setHTML("firmaMetrics", metric(kp, T("m.capacity")) + metric(fpu, T("m.score")) + metric(offerCount, T("m.offers")));
      var kuryeler = await loadPool("kurye");
      setHTML("firmaPersonel", kuryeler.slice(0, 5).map(function (k) {
        return listRow(KB.esc(k.ad), KB.esc(k.sehir) + " · " + k.deneyim + " " + T("unit.years"), KB.levelBadge(k.seviye));
      }).join(""));
      setHTML("firmaTeklif", listFor("firma"));
    }
  }
  function setHTML(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html || '<div class="empty">' + T("empty.generic") + '</div>'; }

  /* ============ HARİTA DENEYİMİ (senkron liste + harita) ============ */
  async function initMapExperience() {
    var mapEl = document.getElementById("map");
    if (!mapEl || typeof google === "undefined" || !google.maps) return;

    var searchEl = document.getElementById("mxSearch");
    var countEl  = document.getElementById("mxCount");
    var scrollEl = document.getElementById("mxCardScroll");
    var aiCard   = document.getElementById("mxAiCard");
    var aiClose  = document.getElementById("mxAiClose");
    var heatLeg  = document.getElementById("mxHeatLegend");
    var locBtn   = document.getElementById("mxLocateBtn");
    var aiBtn    = document.getElementById("mxAIBtn");
    var heatBtn  = document.getElementById("mxHeatBtn");
    var layBtn   = document.getElementById("mxLayersBtn");

    var ISTANBUL = { lat: 41.015, lng: 28.979 };

    var DARK_STYLE = [
      { elementType: "geometry", stylers: [{ color: "#0f0b1e" }] },
      { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#8a7aaa" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#0f0b1e" }] },
      { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e1640" }] },
      { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e90c0" }] },
      { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#c4b5fd" }] },
      { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#5a4a7a" }] },
      { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0d0a1e" }] },
      { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3a2a5a" }] },
      { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#1e1540" }] },
      { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2a1f55" }] },
      { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7060a0" }] },
      { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#2a1f55" }] },
      { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a2b80" }] },
      { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#4a3a95" }] },
      { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#9080c5" }] },
      { featureType: "transit", elementType: "geometry", stylers: [{ color: "#0f0b1e" }] },
      { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#6050a0" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#07051a" }] },
      { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d2d6a" }] }
    ];

    var map = new google.maps.Map(mapEl, {
      zoom: 12, center: ISTANBUL,
      mapTypeControl: false, fullscreenControl: false, streetViewControl: false,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      styles: DARK_STYLE,
      gestureHandling: "greedy",
      backgroundColor: "#0f0b1e"
    });

    var PIN = {
      ilan:    { color: "#f59e0b", emoji: "💼", label: "İlan" },
      kurye:   { color: "#22d3ee", emoji: "🛵", label: "Kurye" },
      isletme: { color: "#4f8bff", emoji: "🏪", label: "İşletme" },
      firma:   { color: "#a855f7", emoji: "🏢", label: "Firma" }
    };

    if (window.KB && KB.ready) await KB.ready();
    if (scrollEl) scrollEl.innerHTML = mxBcardSkel(3);

    var map = new google.maps.Map(mapEl, {
      zoom: 6, center: { lat: 39.5, lng: 33.5 },
      mapTypeControl: false, fullscreenControl: false, streetViewControl: false,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER }
    });

    var listings = [], kur = [], isl = [], frm = [];
    try { if (online()) listings = await SB.openListings(); } catch (e) {}
    kur = await loadPool("kurye");
    isl = await loadPool("isletme");
    frm = await loadPool("firma");

    var items = [];
    function pushItem(type, x, lat, lng, ad, sub) {
      if (lat == null || lng == null) return;
      items.push({
        key: type + "-" + x.id, type: type, id: x.id,
        lat: +lat, lng: +lng, ad: ad || "", sub: sub || "",
        acil: !!(x.acil || x.acil_alinacak),
        premium: !!(x.premium),
        maas: x.maas || x.ucret_min || x.ucret || null,
        action: type === "ilan"
          ? { apply: { id: x.id, baslik: ad } }
          : { view: "profil-" + type + ".html" }
      });
    }

    listings.forEach(function(l) { pushItem("ilan", l, l.lat, l.lng, l.baslik, [l.sahip, l.sehir, l.bolge].filter(Boolean).join(" · ")); });
    kur.forEach(function(k) { pushItem("kurye", k, k.lat, k.lng, k.ad, [k.sehir, (k.bolgeler||[])[0]].filter(Boolean).join(" · ")); });
    isl.forEach(function(i) { pushItem("isletme", i, i.lat, i.lng, i.ad, [i.tur, i.sehir].filter(Boolean).join(" · ")); });
    frm.forEach(function(f) { pushItem("firma", f, f.lat, f.lng, f.ad, (f.bolgeler||[]).slice(0,2).join(", ")); });

    var activeLayers = { ilan: true, firma: true, acil: false, premium: false, yakin: false };
    var saved = window.KB && KB.loadView && KB.loadView("flt_mx2");
    if (saved && saved.layers) {
      Object.keys(saved.layers).forEach(function(k) { if (k in activeLayers) activeLayers[k] = !!saved.layers[k]; });
    }
    if (saved && saved.q && searchEl) searchEl.value = saved.q;

    var userLat = null, userLng = null, userMarker = null;
    var markers = {}, selectedKey = null;
    var heatLayer = null, heatmapOn = false;

    function saveState() {
      if (window.KB && KB.saveView) KB.saveView("flt_mx2", { q: searchEl ? searchEl.value : "", layers: activeLayers });
    }

    function matchScore(key) {
      var h = 0;
      for (var i = 0; i < key.length; i++) h = ((h * 31) + key.charCodeAt(i)) >>> 0;
      return 72 + (h % 22);
    }

    function distKm(lat1, lng1, lat2, lng2) {
      var R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
      var a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function isVisible(it, q) {
      if (q && norm(it.ad + " " + it.sub).indexOf(q) === -1) return false;
      if (activeLayers.yakin && userLat !== null) {
        if (distKm(userLat, userLng, it.lat, it.lng) > 5) return false;
      }
      if (activeLayers.premium && it.premium) return true;
      if (activeLayers.acil && it.type === "ilan" && it.acil) return true;
      if (activeLayers.ilan && it.type === "ilan" && !it.acil) return true;
      if (activeLayers.firma && (it.type === "firma" || it.type === "isletme" || it.type === "kurye")) return true;
      return false;
    }

    function visible() {
      var q = norm(searchEl && searchEl.value || "");
      return items.filter(function(it) { return isVisible(it, q); });
    }

    function pinIcon(it, sel) {
      var cfg = PIN[it.type];
      var s = sel ? 56 : 44, r = sel ? 17 : 13, c = s / 2;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' +
        '<circle cx="' + c + '" cy="' + c + '" r="' + (r + 9) + '" fill="' + cfg.color + '" fill-opacity="0.15"/>' +
        (sel ? '<circle cx="' + c + '" cy="' + c + '" r="' + (r + 16) + '" fill="' + cfg.color + '" fill-opacity="0.07"/>' : '') +
        '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="' + cfg.color + '" fill-opacity="' + (sel ? '1' : '0.88') + '"/>' +
        '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="white" stroke-opacity="0.85" stroke-width="' + (sel ? '2.5' : '2') + '"/>' +
        '<text x="' + c + '" y="' + c + '" font-size="' + (sel ? 14 : 11) + '" text-anchor="middle" dominant-baseline="central">' + cfg.emoji + '</text>' +
        '</svg>';
      return {
        url: 'data:image/svg+xml,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(s, s),
        anchor: new google.maps.Point(c, c)
      };
    }

    function renderMarkers(list) {
      Object.keys(markers).forEach(function(k) { markers[k].setMap(null); });
      markers = {};
      list.forEach(function(it) {
        var m = new google.maps.Marker({
          position: { lat: it.lat, lng: it.lng },
          map: map, title: it.ad,
          icon: pinIcon(it, it.key === selectedKey),
          zIndex: it.key === selectedKey ? 999 : 1
        });
        m._it = it;
        m.addListener("click", function() { select(it.key, true); });
        markers[it.key] = m;
      });
    }

    function select(key, fromMap) {
      selectedKey = key;
      Object.keys(markers).forEach(function(k) {
        var m = markers[k];
        if (m && m._it) { m.setIcon(pinIcon(m._it, k === key)); m.setZIndex(k === key ? 999 : 1); }
      });
      if (key && markers[key]) map.panTo(markers[key].getPosition());
      if (key && scrollEl) {
        var card = scrollEl.querySelector('[data-mxkey="' + key + '"]');
        if (card) card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
      if (scrollEl) {
        scrollEl.querySelectorAll(".mx-bcard").forEach(function(c) {
          c.classList.toggle("is-selected", c.getAttribute("data-mxkey") === key);
        });
      }
    }

    function bcard(it) {
      var cfg = PIN[it.type];
      var score = matchScore(it.key);
      var dist = (userLat !== null) ? distKm(userLat, userLng, it.lat, it.lng).toFixed(1) + " km" : null;
      var maasHtml = it.maas ? '<div class="mx-bcard__meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' + KB.esc(String(it.maas)) + ' ₺</div>' : '';
      var distHtml = dist ? '<div class="mx-bcard__meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + dist + '</div>' : '';
      var actionHtml = it.action.apply
        ? '<button class="mx-bcard__btn mx-bcard__btn--primary" data-apply="' + it.id + '" data-baslik="' + KB.esc(it.action.apply.baslik || "") + '">Hızlı Başvur</button>' +
          '<a class="mx-bcard__btn mx-bcard__btn--ghost" href="ilan.html?id=' + it.id + '">Detay</a>'
        : '<a class="mx-bcard__btn mx-bcard__btn--primary" href="' + it.action.view + '?id=' + it.id + '">Profili Gör</a>';
      return '<div class="mx-bcard" data-mxkey="' + KB.esc(it.key) + '" tabindex="0">' +
        '<div class="mx-bcard__top">' +
          '<div class="mx-bcard__logo" style="border-color:' + cfg.color + '33">' + cfg.emoji + '</div>' +
          '<div class="mx-bcard__info">' +
            '<div class="mx-bcard__title">' + KB.esc(it.ad) + '</div>' +
            '<div class="mx-bcard__sub">' + KB.esc(it.sub) + '</div>' +
          '</div>' +
          '<span class="mx-bcard__badge mx-bcard__badge--' + it.type + '">' + cfg.label + '</span>' +
        '</div>' +
        '<div class="mx-bcard__meta">' + maasHtml + distHtml + '</div>' +
        '<div class="mx-bcard__score">' +
          '<div class="mx-bcard__score-bar"><div class="mx-bcard__score-fill" style="width:' + score + '%"></div></div>' +
          '<div class="mx-bcard__score-pct">%' + score + ' eşleşme</div>' +
        '</div>' +
        '<div class="mx-bcard__action">' + actionHtml + '</div>' +
      '</div>';
    }

    function renderCards(list) {
      if (!scrollEl) return;
      if (countEl) countEl.textContent = list.length ? list.length + " SONUÇ" : "";
      if (!list.length) {
        scrollEl.innerHTML = '<div style="padding:20px 16px;color:rgba(255,255,255,.3);font-size:.82rem">Bu katmanda gösterilecek sonuç yok.</div>';
        return;
      }
      scrollEl.innerHTML = list.map(bcard).join("");
      scrollEl.querySelectorAll(".mx-bcard").forEach(function(card) {
        card.addEventListener("click", function(e) {
          if (e.target.closest("a,button")) return;
          select(card.getAttribute("data-mxkey"), false);
        });
      });
    }

    function toggleHeatmap(list) {
      if (heatLayer) { heatLayer.setMap(null); heatLayer = null; }
      if (!heatmapOn || !window.google || !google.maps.visualization) return;
      var pts = list.map(function(it) {
        return { location: new google.maps.LatLng(it.lat, it.lng), weight: it.premium ? 3 : (it.acil ? 2 : 1) };
      });
      heatLayer = new google.maps.visualization.HeatmapLayer({
        data: pts, map: map, radius: 40, opacity: 0.65,
        gradient: ["rgba(108,77,255,0)", "rgba(108,77,255,0.6)", "rgba(168,85,247,0.8)", "rgba(245,158,11,0.9)", "rgba(239,68,68,1)"]
      });
    }

    function refresh() {
      var list = visible();
      if (selectedKey && !list.some(function(i) { return i.key === selectedKey; })) selectedKey = null;
      renderMarkers(list);
      renderCards(list);
      toggleHeatmap(list);
    }

    // Chip toggles
    document.querySelectorAll("[data-mxlayer]").forEach(function(chip) {
      var t = chip.getAttribute("data-mxlayer");
      chip.classList.toggle("is-on", !!activeLayers[t]);
      chip.addEventListener("click", function() {
        activeLayers[t] = !activeLayers[t];
        chip.classList.toggle("is-on", activeLayers[t]);
        refresh(); saveState();
      });
    });

    if (searchEl) searchEl.addEventListener("input", function() { refresh(); saveState(); });

    // Locate FAB
    if (locBtn) locBtn.addEventListener("click", function() {
      if (!navigator.geolocation) { if (window.KBMotion) KBMotion.showErrorToast("Konum desteklenmiyor."); return; }
      locBtn.classList.add("is-loading"); locBtn.classList.remove("is-active");
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          locBtn.classList.remove("is-loading"); locBtn.classList.add("is-active");
          userLat = pos.coords.latitude; userLng = pos.coords.longitude;
          if (userMarker) userMarker.setMap(null);
          userMarker = new google.maps.Marker({
            position: { lat: userLat, lng: userLng }, map: map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#3b82f6", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
            zIndex: 2000, title: "Konumunuz"
          });
          map.panTo({ lat: userLat, lng: userLng }); map.setZoom(14);
          if (activeLayers.yakin) refresh();
        },
        function(err) {
          locBtn.classList.remove("is-loading");
          if (window.KBMotion) KBMotion.showErrorToast(err.code === 1 ? "Konum izni reddedildi." : "Konum alınamadı.");
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    });

    // AI FAB
    if (aiBtn && aiCard) {
      aiBtn.addEventListener("click", function() {
        var on = aiCard.classList.toggle("is-visible");
        aiBtn.classList.toggle("is-active", on);
      });
    }
    if (aiClose && aiCard) {
      aiClose.addEventListener("click", function() {
        aiCard.classList.remove("is-visible");
        if (aiBtn) aiBtn.classList.remove("is-active");
      });
    }

    var AI_ZONES = { kadikoy: { lat: 40.990, lng: 29.030 }, besiktas: { lat: 41.043, lng: 29.005 }, sisli: { lat: 41.061, lng: 28.987 }, atasehir: { lat: 40.996, lng: 29.118 }, umraniye: { lat: 41.016, lng: 29.110 } };
    document.querySelectorAll("[data-zone]").forEach(function(z) {
      z.addEventListener("click", function() {
        var pos = AI_ZONES[z.getAttribute("data-zone")];
        if (pos) { map.panTo(pos); map.setZoom(13); }
      });
    });

    // Heatmap FAB
    if (heatBtn) heatBtn.addEventListener("click", function() {
      heatmapOn = !heatmapOn;
      heatBtn.classList.toggle("is-active", heatmapOn);
      if (heatLeg) heatLeg.classList.toggle("is-visible", heatmapOn);
      toggleHeatmap(visible());
    });

    // Layers FAB — toggle chips row visibility
    if (layBtn) layBtn.addEventListener("click", function() {
      var chipsRow = document.getElementById("mxChipsRow");
      if (!chipsRow) return;
      var hidden = chipsRow.style.display === "none";
      chipsRow.style.display = hidden ? "" : "none";
      layBtn.classList.toggle("is-active", hidden);
    });

    refresh();

    if (items.length) {
      var bounds = new google.maps.LatLngBounds();
      items.forEach(function(i) { bounds.extend({ lat: i.lat, lng: i.lng }); });
      if (items.length < 80) { map.fitBounds(bounds); } else { map.setCenter(ISTANBUL); map.setZoom(12); }
    }
  }
  function mxBcardSkel(n) {
    var one = '<div class="mx-bcard mx-bcard--skel">' +
      '<div class="mx-bcard__top">' +
      '<span class="mx-skel" style="width:42px;height:42px;border-radius:14px;flex:none"></span>' +
      '<div class="mx-bcard__info"><span class="mx-skel" style="width:70%;height:13px;margin-bottom:7px"></span><span class="mx-skel" style="width:50%;height:10px"></span></div>' +
      '</div>' +
      '<span class="mx-skel" style="width:100%;height:4px;border-radius:2px;margin:10px 0"></span>' +
      '<div style="display:flex;gap:6px;margin-top:10px"><span class="mx-skel" style="flex:1;height:34px;border-radius:11px"></span><span class="mx-skel" style="flex:1;height:34px;border-radius:11px"></span></div>' +
      '</div>';
    var out = ""; for (var i = 0; i < n; i++) out += one; return out;
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
  /* ============ İLAN DETAY HTML BUILDER ============ */
  function buildJobDetailHtml(l, opts) {
    opts = opts || {};
    var applied = !!opts.applied, owner = !!opts.owner, saved = !!opts.saved, myProfile = opts.myProfile || null;

    var loc = [l.sehir, l.bolge].filter(Boolean).join(" · ");
    var inits = KB.initials(l.sahip || "?");
    var pPage = l.sahipRol === "firma" ? "profil-firma.html" : "profil-isletme.html";
    var pUrl = pPage + "?id=" + (l.owner_id || l.sahipId || "");
    var verBadge = l.sahipDogrulama === "verified" ? ' <span class="ver-badge">✓ Doğrulandı</span>' : "";

    var logoHtml = l.sahipAvatar
      ? '<img class="jd-hero__logo" src="' + KB.esc(l.sahipAvatar) + '" alt="">'
      : '<div class="jd-hero__logo--ph">' + inits + '</div>';

    var tagHtml = '<span class="chip chip--open">● Açık</span>' +
      (l.oncelik === "acil" ? '<span class="chip chip--urgent">🔥 ACİL</span>' : "") +
      (isFresh(l.tarih) ? '<span class="chip chip--new">✦ Yeni</span>' : "") +
      (l.vardiya_tipi ? '<span class="chip">' + KB.esc(l.vardiya_tipi) + '</span>' : "") +
      (l.calisma_sekli ? '<span class="chip">' + KB.esc(l.calisma_sekli) + '</span>' : "") +
      (l.kategori ? '<span class="chip">' + KB.esc(l.kategori) + '</span>' : "");

    var deadlineMeta = "", deadlineRow = "";
    if (l.son_basvuru) {
      var dLeft = -daysSince(l.son_basvuru);
      var dMetaCls = dLeft > 7 ? "jd-hero__deadline--ok" : dLeft > 3 ? "jd-hero__deadline--soon" : "jd-hero__deadline--urgent";
      var dMetaTxt = dLeft > 0 ? "Son " + dLeft + " gün" : dLeft === 0 ? "Bugün son gün!" : "Başvuru kapandı";
      deadlineMeta = '<span class="' + dMetaCls + '">⏳ ' + dMetaTxt + '</span>';
      var dRowCls = dLeft > 7 ? "jd-deadline-row--ok" : dLeft > 3 ? "jd-deadline-row--soon" : "jd-deadline-row--urgent";
      var dRowTxt = dLeft > 0 ? "Son başvuru: " + dLeft + " gün kaldı · " + KB.esc(l.son_basvuru) : dLeft === 0 ? "Bugün son gün!" : "Başvuru süresi doldu";
      deadlineRow = '<div class="jd-deadline-row ' + dRowCls + '">⏳ ' + dRowTxt + '</div>';
    }

    function applyBtn(block) {
      var cls = "btn btn--primary" + (block ? " btn--lg btn--block" : " btn--sm");
      if (owner) return '<a class="btn btn--secondary btn--sm" href="ilan-olustur.html?edit=' + l.id + '">✏️ Düzenle</a>';
      if (!canPool()) return '<a class="' + cls + '" href="giris.html">Giriş Yap &amp; Başvur</a>';
      if (applied) return '<span class="chip chip--ok" style="padding:8px 14px">✓ Başvuruldu</span>';
      return '<button class="' + cls + '" data-apply="' + l.id + '" data-baslik="' + KB.esc(l.baslik) + '" data-company="' + KB.esc(l.sahip || "") + '" data-loc="' + KB.esc(loc) + '">Başvur</button>';
    }
    var favSmall = '<button type="button" class="btn btn--ghost btn--sm' + (saved ? " is-on" : "") + '" data-savejob="' + l.id + '" aria-pressed="' + saved + '">' + (saved ? "♥ Kaydedildi" : "♡ Kaydet") + '</button>';
    var favLarge = '<button type="button" class="btn btn--ghost btn--lg btn--block mt-8' + (saved ? " is-on" : "") + '" data-savejob="' + l.id + '" aria-pressed="' + saved + '">' + (saved ? "♥ Kaydedildi" : "♡ Kaydet") + '</button>';
    var shareBtn = '<button type="button" class="btn btn--ghost btn--sm" onclick="(navigator.share?navigator.share({title:this.dataset.t,url:location.href}):navigator.clipboard&&navigator.clipboard.writeText(location.href))" data-t="' + KB.esc(l.baslik) + '">📤 Paylaş</button>';

    var qiItems = [
      { ico: "💰", lbl: "Maaş",           val: l.maas_aralik || "Belirtilmedi",                               cls: l.maas_aralik ? " jd-qi__val--green" : "" },
      { ico: "⏰", lbl: "Çalışma Saati",  val: l.calisma_saatleri || "Belirtilmedi",                          cls: "" },
      { ico: "🛵", lbl: "Araç",           val: l.arac || "Belirtilmedi",                                      cls: "" },
      { ico: "📋", lbl: "Çalışma Şekli", val: l.calisma_sekli || l.vardiya_tipi || "Belirtilmedi",           cls: "" },
      { ico: "🛡️", lbl: "Sigorta",        val: l.sigorta || "Belirtilmedi",                                   cls: (l.sigorta && l.sigorta.indexOf("SGK") !== -1) ? " jd-qi__val--green" : "" },
      { ico: "💵", lbl: "Ödeme Modeli",  val: l.maas_modeli || "Belirtilmedi",                               cls: "" },
      { ico: "📍", lbl: "Çalışma Bölgesi", val: l.teslimat_bolge || loc || "Belirtilmedi",                   cls: "" },
      { ico: "👥", lbl: "Kontenjan",      val: l.kontenjan ? l.kontenjan + " kişi" : "Belirtilmedi",         cls: "" }
    ];

    function richPara(text) {
      if (!text) return "";
      return text.split(/\n\n+/).map(function(p) { var t = p.trim(); return t ? '<p>' + KB.esc(t) + '</p>' : ""; }).join("");
    }

    var BICO = { "Yakıt": "⛽", "yemek": "🍽️", "Kaza": "🛡️", "SGK": "🛡️", "Yol": "🚌", "İkramiye": "🎁", "Telefon": "📱", "Sağlık": "🏥", "Prim": "💰", "Esnek": "🕐", "servis": "🚌" };
    function bIco(f) { var fl = f.toLowerCase(); for (var k in BICO) { if (fl.indexOf(k.toLowerCase()) !== -1) return BICO[k]; } return "✓"; }
    var benefitHtml = (l.faydalar || []).map(function(f) {
      var isSgk = f.toLowerCase().indexOf("sgk") !== -1 || (f.indexOf("sigorta") !== -1 && f.indexOf("Kaza") === -1);
      return '<span class="jc-benefit-tag' + (isSgk ? " jc-benefit-tag--sgk" : "") + '">' + bIco(f) + " " + KB.esc(f) + '</span>';
    }).join("");

    var reqHtml = (l.gereksinimler || []).map(function(r) {
      var met = "neutral";
      if (myProfile) {
        var rl = r.toLowerCase();
        if ((rl.indexOf("ehliyet") !== -1 || rl.indexOf("motosiklet") !== -1 || rl.indexOf("bisiklet") !== -1) && myProfile.arac) met = "met";
        else if (rl.indexOf("deneyim") !== -1 && myProfile.deneyim) met = "met";
        else if (rl.indexOf("telefon") !== -1 || rl.indexOf("iletişim") !== -1) met = "met";
      }
      return '<li class="jd-req jd-req--' + met + '"><span class="jd-req__ic">' + (met === "met" ? "✓" : "·") + '</span><span class="jd-req__text">' + KB.esc(r) + '</span></li>';
    }).join("");

    var locFields = [
      { lbl: "Şehir", val: l.sehir }, { lbl: "Bölge / İlçe", val: l.bolge },
      { lbl: "Mahalle / Adres", val: l.adres }, { lbl: "Teslimat Bölgesi", val: l.teslimat_bolge },
      { lbl: "Yakın Metro / Durak", val: l.yakin_metro }
    ].filter(function(f) { return f.val; });

    var compDesc = l.sahipRol === "firma"
      ? "Kurye firması — platform üzerinden kurye istihdamı sağlar."
      : "Kayıtlı işletme — platformumuz üzerinden kurye çalıştırır.";
    if (l.sahipId && window.KB_DATA) {
      var cArr = l.sahipRol === "firma" ? (KB_DATA.firmalar || []) : (KB_DATA.isletmeler || []);
      for (var ci = 0; ci < cArr.length; ci++) {
        if (cArr[ci].id === l.sahipId) { compDesc = cArr[ci].hakkinda || cArr[ci].bio || compDesc; break; }
      }
    }

    var relJobs = [];
    if (window.KB_DATA && KB_DATA.ilanlar) {
      for (var ri = 0; ri < KB_DATA.ilanlar.length && relJobs.length < 3; ri++) {
        var rj = KB_DATA.ilanlar[ri];
        if (rj.id !== l.id && rj.durum !== "kapali" && (rj.sehir === l.sehir || rj.kategori === l.kategori)) relJobs.push(rj);
      }
    }

    var score = 0;
    if (window.KBPrefs && canPool()) { score = KBPrefs.matchScore(l); }
    else { score = talentScore(l.id); }
    score = Math.max(0, Math.min(100, score));
    var scoreColor = score >= 70 ? "#16A34A" : score >= 45 ? "#D97706" : "#DC2626";
    var scoreLbl = score >= 70 ? "Yüksek uyum — başvurabilirsiniz" : score >= 45 ? "Orta uyum — denemeye değer" : "Düşük uyum — tercihleri güncelleyin";

    var eligHtml = "";
    if (canPool() && myProfile && myProfile.role === "kurye") {
      var eligChecks = [
        { ok: !!(myProfile.arac),                lbl: "Araç: " + (myProfile.arac || "Profilde belirtilmedi") },
        { ok: !!(myProfile.deneyim),             lbl: "Deneyim: " + (myProfile.deneyim || "Profilde belirtilmedi") },
        { ok: myProfile.sehir === l.sehir,       lbl: "Şehir: " + (myProfile.sehir === l.sehir ? "Eşleşiyor (" + (l.sehir || "") + ")" : "Farklı şehir") },
        { ok: !!(myProfile.yayinda),             lbl: "Profil durumu: " + (myProfile.yayinda ? "Yayında" : "Yayında değil — havuzda görünmüyorsunuz") }
      ];
      eligHtml = '<div class="jd-section"><h2>Başvuru Uygunluğum</h2><div class="jd-match-items">' +
        eligChecks.map(function(c) {
          return '<div class="jd-match-item' + (c.ok ? " jd-match-item--ok" : "") + '"><span class="jd-match-item__ic">' + (c.ok ? "✅" : "⚪") + '</span><span class="jd-match-item__text">' + KB.esc(c.lbl) + '</span></div>';
        }).join("") +
        '</div>' + (eligChecks.some(function(c) { return !c.ok; }) ? '<a href="profil-duzenle.html" class="btn btn--ghost btn--sm" style="display:inline-flex;margin-top:12px">Profili Tamamla →</a>' : '') + '</div>';
    }

    var html =
      '<div class="jd-hero">' +
        '<div class="jd-hero__co">' + logoHtml +
          '<div class="jd-hero__co-info">' +
            '<div class="jd-hero__co-name"><a href="' + pUrl + '" style="color:inherit;text-decoration:none">' + KB.esc(l.sahip || "İşletme") + '</a>' + verBadge + '</div>' +
            '<div class="jd-hero__co-role">' + (l.sahipRol === "firma" ? "Kurye Firması" : "İşletme") + '</div>' +
          '</div>' +
        '</div>' +
        '<h1 class="jd-hero__title">' + KB.esc(l.baslik) + '</h1>' +
        '<div class="jd-hero__meta">' +
          (loc ? '<span>📍 ' + KB.esc(loc) + '</span>' : '') +
          '<span>📅 ' + timeAgo(l.tarih) + ' yayınlandı</span>' +
          deadlineMeta +
          '<span>👥 ' + appCount(l.id) + ' başvuru</span>' +
        '</div>' +
        '<div class="jd-hero__tags">' + tagHtml + '</div>' +
        '<div class="jd-hero__actions">' + applyBtn(false) + favSmall + shareBtn + '</div>' +
      '</div>' +

      '<div class="jd">' +
        '<div class="jd-main">' +

          '<div class="jd-quickinfo">' +
            qiItems.map(function(q) {
              return '<div class="jd-qi"><div class="jd-qi__ico">' + q.ico + '</div><div class="jd-qi__label">' + q.lbl + '</div><div class="jd-qi__val' + q.cls + '">' + KB.esc(q.val) + '</div></div>';
            }).join("") +
          '</div>' +

          (l.aciklama || l.gorev_tanimi || l.gunluk_akis || l.beklentiler ?
            '<div class="jd-section"><h2>Görev Tanımı</h2><div class="jd-desc-rich">' +
              richPara(l.aciklama || l.gorev_tanimi) +
              (l.gunluk_akis ? '<div class="jd-desc-sub-h">Günlük Akış</div>' + richPara(l.gunluk_akis) : '') +
              (l.beklentiler ? '<div class="jd-desc-sub-h">Beklentiler</div>' + richPara(l.beklentiler) : '') +
            '</div></div>' : '') +

          (benefitHtml ?
            '<div class="jd-section"><h2>Sağlanan Faydalar</h2><div class="jc-benefit-tags">' + benefitHtml + '</div>' +
            (l.bonus && l.bonus !== "Yok" ? '<div style="margin-top:10px;font-size:0.8rem;color:var(--text-2)">🎁 Prim/Bonus: ' + KB.esc(l.bonus) + '</div>' : '') +
            '</div>' : '') +

          (reqHtml ? '<div class="jd-section"><h2>Aranan Nitelikler</h2><ul class="jd-reqs">' + reqHtml + '</ul></div>' : '') +

          (locFields.length ?
            '<div class="jd-section"><h2>Çalışma Yeri</h2><div class="jd-loc-grid">' +
              locFields.map(function(f) {
                return '<div class="jd-loc-item"><div class="jd-loc-item__label">' + f.lbl + '</div><div class="jd-loc-item__val">' + KB.esc(f.val) + '</div></div>';
              }).join("") +
            '</div></div>' : '') +

          '<div class="jd-section"><h2>Şirket Hakkında</h2><div class="jd-co-main">' +
            '<div class="jd-co-main__logo">' + inits + '</div>' +
            '<div class="jd-co-main__body">' +
              '<div class="jd-co-main__name">' + KB.esc(l.sahip || "—") + verBadge + '</div>' +
              '<div class="jd-co-main__meta">' + KB.esc(compDesc) + '</div>' +
              '<a href="' + pUrl + '" class="btn btn--ghost btn--sm" style="display:inline-flex;margin-top:10px">Profili Görüntüle →</a>' +
            '</div>' +
          '</div></div>' +

          eligHtml +

          (relJobs.length ?
            '<div class="jd-related"><div class="jd-related__title">Benzer İlanlar</div><div class="jd-related__grid">' +
              relJobs.map(function(r) {
                return '<a class="jd-rel-item" href="ilan.html?id=' + r.id + '">' +
                  '<div class="jd-rel-item__av">' + KB.initials(r.sahip || "?") + '</div>' +
                  '<div class="jd-rel-item__body">' +
                    '<div class="jd-rel-item__title">' + KB.esc(r.baslik) + '</div>' +
                    '<div class="jd-rel-item__meta">' + KB.esc(r.sahip || "") + (r.sehir ? " · " + KB.esc(r.sehir) : '') + '</div>' +
                    (r.maas_aralik ? '<div class="jd-rel-item__salary">💰 ' + KB.esc(r.maas_aralik) + '</div>' : '') +
                  '</div>' +
                '</a>';
              }).join("") +
            '</div></div>' : '') +

        '</div>' +

        '<aside class="jd-side">' +
          '<div class="jd-apply-card">' +
            (l.maas_aralik ? '<div class="jd-salary"><div class="jd-salary__val">💰 ' + KB.esc(l.maas_aralik) + '</div><div class="jd-salary__model">' + KB.esc(l.maas_modeli || "") + (l.sigorta ? " · " + KB.esc(l.sigorta) : '') + '</div></div>' : '') +
            deadlineRow +
            (l.kontenjan ? '<p style="font-size:0.8rem;color:var(--text-2);margin:0 0 12px">👥 ' + l.kontenjan + ' açık pozisyon</p>' : '') +
            '<div class="jd-apply-card__act">' + applyBtn(true) + favLarge + '</div>' +
          '</div>' +

          '<div class="jd-match-card">' +
            '<div class="jd-match-card__head"><span class="jd-match-card__title">Uyum Skoru</span></div>' +
            '<div class="jd-match-ring" style="background:conic-gradient(' + scoreColor + ' ' + (score * 3.6).toFixed(1) + 'deg,var(--border) 0%)">' +
              '<div class="jd-match-ring__inner">%' + score + '</div>' +
            '</div>' +
            '<div style="text-align:center;font-size:0.78rem;color:var(--text-2);margin-bottom:12px">' + scoreLbl + '</div>' +
            (!canPool() ? '<a href="profil-duzenle.html" class="btn btn--ghost btn--sm btn--block">Tercihlerimi Güncelle</a>' : '') +
          '</div>' +

          '<div class="jd-company">' +
            '<div class="jd-company__head">' +
              (l.sahipAvatar ? '<img class="jd-company__logo" src="' + KB.esc(l.sahipAvatar) + '" alt="">' : '<div class="jd-company__logo--ph">' + inits + '</div>') +
              '<div><div class="jd-company__name">' + KB.esc(l.sahip || "—") + '</div><div class="jd-company__role">' + (l.sahipRol === "firma" ? "Kurye Firması" : "İşletme") + '</div></div>' +
            '</div>' +
            '<a class="jd-company__link" href="' + pUrl + '">Profili Görüntüle →</a>' +
          '</div>' +
        '</aside>' +
      '</div>' +

      '<div class="jd-mobilebar">' + applyBtn(false) + favSmall + '</div>';

    return { html: html, title: (l.baslik || "İlan") + " · Kuryemi Bul" };
  }

  async function renderJobDetail() {
    var host = document.getElementById("jobDetailRoot");
    if (!host) return;
    var id = KB.getParam("id");
    if (window.KB && KB.ready) await KB.ready();
    host.innerHTML = jobDetailSkeleton();
    if (!id) { host.innerHTML = jobNotFound(); return; }
    var l = null;
    if (!online()) {
      l = (window.KB_DATA && KB_DATA.ilanlar || []).filter(function(x) { return x.id === id; })[0];
      if (!l) { host.innerHTML = jobNotFound(); return; }
    } else {
      try { l = await SB.listingById(id); } catch(e) {}
      if (!l) { host.innerHTML = jobNotFound(); return; }
    }
    var applied = false, owner = false, myProfile = null;
    if (canPool()) {
      try { (await SB.appliedListingIds()).forEach(function(x) { if (String(x) === String(id)) applied = true; }); } catch(e) {}
      myProfile = KB.session() && KB.session().profile;
      owner = !!(myProfile && myProfile.id === l.owner_id);
    }
    var result = buildJobDetailHtml(l, { applied: applied, owner: owner, saved: isSavedJob(l.id), myProfile: myProfile });
    host.innerHTML = '<a class="jd-back" href="ilanlar.html">← İlanlara Dön</a>' + result.html;
    document.title = result.title;
    try {
      var vk = "kb_job_views_" + l.id;
      localStorage.setItem(vk, (parseInt(localStorage.getItem(vk) || "0", 10) + 1));
    } catch(e) {}
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
  function msgTimeConv(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso), now = new Date(), diff = Math.floor((now - d) / 1000);
      if (diff < 60) return "şimdi";
      if (diff < 3600) return Math.floor(diff / 60) + "dk";
      if (diff < 86400) return Math.floor(diff / 3600) + "sa";
      var yest = new Date(now); yest.setDate(now.getDate() - 1);
      if (d.toDateString() === yest.toDateString()) return "Dün";
      if (diff < 7 * 86400) return d.toLocaleDateString("tr-TR", { weekday: "short" });
      return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    } catch (e) { return ""; }
  }
  function msgPickPlaceholder() {
    return '<div class="msg-empty"><div class="kb-empty__ic">💬</div><div class="kb-empty__t">' + T("msg.pickConv") + '</div><div class="kb-empty__d">' + T("msg.pickConvSub") + '</div></div>';
  }
  async function renderMessages() {
    var root = document.getElementById("msgRoot");
    if (!root) return;
    if (window.KB && KB.ready) await KB.ready();
    if (!(online() && KB.isAuthed && KB.isAuthed())) {
      var mockConvs = (window.KB_DATA && KB_DATA.konusmalar) || [];
      if (!mockConvs.length) {
        root.innerHTML = '<div class="kb-empty"><div class="kb-empty__ic">💬</div><div class="kb-empty__t">' + T("msg.loginRequired") + '</div>' +
          '<a class="btn btn--primary btn--sm mt-24" href="giris.html">' + T("cta.signin") + '</a></div>';
        return;
      }
      var listEl0 = document.getElementById("msgConvList");
      var mainEl0 = document.getElementById("msgMain");
      if (listEl0) {
        listEl0.innerHTML = mockConvs.map(function (c) {
          var unreadBadge = c.unread ? '<span class="msg-conv__badge">' + (c.unread > 99 ? "99+" : c.unread) + '</span>' : '';
          return '<button type="button" class="msg-conv' + (c.unread ? " msg-conv--unread" : "") + '" data-mockconv="' + KB.esc(c.profileId) + '">' +
            '<div class="msg-conv__av msg-conv__av--ph">' + KB.initials(c.ad) + '</div>' +
            '<div class="msg-conv__body">' +
              '<div class="msg-conv__top"><span class="msg-conv__name">' + KB.esc(c.ad) + '</span><span class="msg-conv__time">' + msgTimeConv(c.lastAt) + '</span></div>' +
              '<div class="msg-conv__bottom"><span class="msg-conv__last">' + (c.lastMine ? "Siz: " : "") + KB.esc(c.lastBody || "") + '</span>' + unreadBadge + '</div>' +
            '</div></button>';
        }).join("");
        listEl0.addEventListener("click", function (e) {
          var b = e.target.closest("[data-mockconv]");
          if (!b || !mainEl0) return;
          var cid = b.getAttribute("data-mockconv");
          var conv = mockConvs.filter(function (x) { return x.profileId === cid; })[0];
          if (!conv) return;
          listEl0.querySelectorAll(".msg-conv").forEach(function (x) { x.classList.toggle("is-active", x.getAttribute("data-mockconv") === cid); });
          root.classList.add("msg--threadopen");
          var bubbles = (conv.mesajlar || []).map(function (m) {
            var mine = m.from_user === "me";
            return '<div class="msg-bubble' + (mine ? " msg-bubble--mine" : "") + '">' + KB.esc(m.body) +
              '<span class="msg-bubble__t">' + msgTimeShort(m.created_at) + '</span></div>';
          }).join("");
          mainEl0.innerHTML =
            '<div class="msg-thread">' +
              '<div class="msg-thread__head">' +
                '<button type="button" class="msg-back" id="msgBack0"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg></button>' +
                '<div class="msg-thread__who"><div class="msg-thread__av">' + KB.initials(conv.ad || "?") + '</div>' +
                '<div class="msg-thread__info"><div class="msg-thread__name">' + KB.esc(conv.ad) + '</div></div></div>' +
              '</div>' +
              '<div class="msg-thread__scroll" id="msgScroll0">' + (bubbles || '<div class="msg-thread__empty">Henüz mesaj yok.</div>') + '</div>' +
              '<div class="msg-compose"><form id="msgForm0"><input id="msgInput0" autocomplete="off" placeholder="Demo modda mesaj gönderilemez…" disabled>' +
                '<button type="submit" class="msg-send-btn" disabled><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>' +
              '</form></div>' +
            '</div>';
          var s = document.getElementById("msgScroll0"); if (s) s.scrollTop = s.scrollHeight;
          var backBtn = document.getElementById("msgBack0");
          if (backBtn) backBtn.addEventListener("click", function () {
            root.classList.remove("msg--threadopen");
            listEl0.querySelectorAll(".msg-conv").forEach(function (x) { x.classList.remove("is-active"); });
          });
        });
      }
      if (mainEl0) mainEl0.innerHTML = '<div class="msg-empty"><div class="kb-empty__ic">💬</div><div class="kb-empty__t">Bir konuşma seçin</div><div class="kb-empty__d">Soldaki listeden bir konuşma açın.</div></div>';
      return;
    }
    var listEl = document.getElementById("msgConvList");
    var mainEl = document.getElementById("msgMain");
    var rootC = document.querySelector(".msg");
    var current = null, convs = [], searchQ = "";
    var myRole = (online() && KB.session && KB.session() && KB.session().profile && KB.session().profile.role) || "kurye";

    function convItem(c) {
      var avEl = c.avatar
        ? '<div class="msg-conv__av"><img src="' + KB.esc(c.avatar) + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.remove()"></div>'
        : '<div class="msg-conv__av msg-conv__av--ph">' + KB.initials(c.ad) + '</div>';
      var unreadBadge = c.unread ? '<span class="msg-conv__badge">' + (c.unread > 99 ? "99+" : c.unread) + '</span>' : '';
      return '<button type="button" class="msg-conv' + (c.profileId === current ? " is-active" : "") + (c.unread ? " msg-conv--unread" : "") + '" data-conv="' + c.profileId + '">' +
        avEl +
        '<div class="msg-conv__body">' +
          '<div class="msg-conv__top"><span class="msg-conv__name">' + KB.esc(c.ad) + '</span><span class="msg-conv__time">' + msgTimeConv(c.lastAt) + '</span></div>' +
          '<div class="msg-conv__bottom"><span class="msg-conv__last">' + (c.lastMine ? T("msg.you") + ": " : "") + KB.esc(c.lastBody || "") + '</span>' + unreadBadge + '</div>' +
        '</div>' +
      '</button>';
    }
    async function loadConvs() {
      convs = await SB.myConversations();
      convs.sort(function(a, b) {
        if ((b.unread || 0) !== (a.unread || 0)) return (b.unread || 0) - (a.unread || 0);
        var ta = a.lastAt || "", tb = b.lastAt || ""; return tb < ta ? -1 : tb > ta ? 1 : 0;
      });
      var filtered = convs;
      if (searchQ) {
        var q = norm(searchQ);
        filtered = convs.filter(function(c) { return norm(c.ad || "").indexOf(q) !== -1 || norm(c.lastBody || "").indexOf(q) !== -1; });
      }
      if (!filtered.length) {
        listEl.innerHTML = '<div class="msg-empty-list">' + (searchQ ? "Sonuç bulunamadı" : T("msg.empty")) + '</div>';
      } else {
        listEl.innerHTML = filtered.map(convItem).join("");
      }
      if (!convs.length && !current) {
        mainEl.innerHTML = '<div class="msg-empty"><div class="kb-empty__ic">💬</div><div class="kb-empty__t">' + T("msg.empty") + '</div><div class="kb-empty__d">' + T("msg.emptySub") + '</div></div>';
      }
    }
    function bubble(m, meId) {
      var mine = m.from_user === meId;
      var statusMark = mine ? '<span class="msg-bubble__status">✓✓</span>' : '';
      return '<div class="msg-bubble' + (mine ? " msg-bubble--mine" : "") + '">' + KB.esc(m.body) +
        '<span class="msg-bubble__t">' + msgTimeShort(m.created_at) + statusMark + '</span></div>';
    }
    function scrollBottom() { var s = document.getElementById("msgScroll"); if (s) s.scrollTop = s.scrollHeight; }

    function ctxItems(other) {
      var r = myRole, items = [];
      if (r === "kurye") {
        if (other.role === "isletme" && other.id) items.push({ href: "profil-isletme.html?id=" + other.id, label: "🏪 İşletmeyi Görüntüle" });
        if (other.role === "firma" && other.id)   items.push({ href: "profil-firma.html?id=" + other.id, label: "🏢 Firmayı Görüntüle" });
        items.push({ href: "ilanlar.html", label: "⚡ Fırsatlara Bak" });
      } else if (r === "isletme") {
        if (other.role === "kurye" && other.id)  items.push({ href: "profil-kurye.html?id=" + other.id, label: "🛵 Kurye Profilini Gör" });
        if (other.role === "firma" && other.id)  items.push({ href: "profil-firma.html?id=" + other.id, label: "🏢 Firmayı Gör" });
        items.push({ href: "eslesme.html", label: "🤝 Eşleşmelere Git" });
      } else if (r === "firma") {
        if (other.role === "kurye" && other.id)    items.push({ href: "profil-kurye.html?id=" + other.id, label: "🛵 Kurye Profilini Gör" });
        if (other.role === "isletme" && other.id)  items.push({ href: "profil-isletme.html?id=" + other.id, label: "🏪 İşletmeyi Gör" });
        items.push({ href: "kuryeler.html", label: "👥 Kurye Havuzuna Git" });
      }
      items.push({ action: "archive", label: "🗂️ Konuşmayı Arşivle" });
      return items;
    }
    function openCtxMenu(other) {
      var ex = document.getElementById("msgCtxSheet"); if (ex) ex.remove();
      var items = ctxItems(other);
      var sheet = document.createElement("div");
      sheet.id = "msgCtxSheet"; sheet.className = "msg-ctx-sheet";
      sheet.innerHTML =
        '<div class="msg-ctx-sheet__bg"></div>' +
        '<div class="msg-ctx-sheet__panel">' +
          '<div class="msg-ctx-sheet__handle"></div>' +
          '<p class="msg-ctx-sheet__who">' + KB.esc(other.ad || "") + '</p>' +
          '<div class="msg-ctx-sheet__items">' +
            items.map(function(it) {
              if (it.action) return '<button class="msg-ctx-sheet__item msg-ctx-sheet__item--muted" data-ctx-action="' + it.action + '">' + it.label + '</button>';
              return '<a class="msg-ctx-sheet__item" href="' + KB.esc(it.href) + '">' + it.label + '</a>';
            }).join("") +
          '</div>' +
          '<button class="msg-ctx-sheet__cancel" data-ctx-close>Vazgeç</button>' +
        '</div>';
      document.body.appendChild(sheet);
      requestAnimationFrame(function() { sheet.classList.add("is-open"); });
      function close() { sheet.classList.remove("is-open"); setTimeout(function() { if (sheet.parentNode) sheet.remove(); }, 300); }
      sheet.querySelector(".msg-ctx-sheet__bg").addEventListener("click", close);
      var cancelBtn = sheet.querySelector("[data-ctx-close]"); if (cancelBtn) cancelBtn.addEventListener("click", close);
      var archBtn = sheet.querySelector('[data-ctx-action="archive"]');
      if (archBtn) archBtn.addEventListener("click", function() { close(); KB.toast("Konuşma arşivlendi", "success"); });
    }

    async function openThread(profileId) {
      current = profileId;
      if (rootC) rootC.classList.add("msg--threadopen");
      listEl.querySelectorAll(".msg-conv").forEach(function(b) { b.classList.toggle("is-active", b.getAttribute("data-conv") === profileId); });
      mainEl.innerHTML = '<div class="msg-thread"><div class="msg-thread__scroll" id="msgScroll"><div class="skel skel--line" style="width:55%;margin:10px 0"></div><div class="skel skel--line" style="width:40%;margin:10px 0 10px auto"></div></div></div>';
      var t = await SB.threadWith(profileId);
      var other = t.other || {};
      var head =
        '<div class="msg-thread__head">' +
          '<button type="button" class="msg-back" id="msgBack" aria-label="' + T("msg.back") + '">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>' +
          '</button>' +
          '<div class="msg-thread__who">' +
            '<div class="msg-thread__av">' + KB.initials(other.ad || "?") + '</div>' +
            '<div class="msg-thread__info">' +
              '<div class="msg-thread__name">' + KB.esc(other.ad || "") + '</div>' +
              (other.role ? '<div class="msg-thread__role">' + T("role." + other.role) + '</div>' : '') +
            '</div>' +
          '</div>' +
          '<button type="button" class="msg-thread__more" id="msgMore" aria-label="Seçenekler">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>' +
          '</button>' +
        '</div>';
      var bodyHtml = t.messages.length
        ? t.messages.map(function(m) { return bubble(m, t.me); }).join("")
        : '<div class="msg-thread__empty">' + T("msg.threadEmpty") + '</div>';
      mainEl.innerHTML =
        '<div class="msg-thread">' + head +
          '<div class="msg-thread__scroll" id="msgScroll">' + bodyHtml + '</div>' +
          '<div class="msg-compose" id="msgCompose">' +
            '<button type="button" class="msg-attach-btn" id="msgAttach" aria-label="Dosya ekle">' +
              '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
            '</button>' +
            '<form id="msgForm">' +
              '<input id="msgInput" autocomplete="off" placeholder="' + T("msg.placeholder") + '">' +
              '<button type="submit" class="msg-send-btn" id="msgSend" aria-label="' + T("msg.send") + '">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
              '</button>' +
            '</form>' +
          '</div>' +
        '</div>';
      scrollBottom();
      try { await SB.markThreadRead(profileId); } catch (e) {}
      loadConvs();
      if (window.__kbUpdateMsgBadge) window.__kbUpdateMsgBadge();
      document.getElementById("msgBack").addEventListener("click", function() {
        current = null; if (rootC) rootC.classList.remove("msg--threadopen");
        listEl.querySelectorAll(".msg-conv").forEach(function(b) { b.classList.remove("is-active"); });
      });
      var moreBtn = document.getElementById("msgMore");
      if (moreBtn) moreBtn.addEventListener("click", function() { openCtxMenu(other); });
      var attachBtn = document.getElementById("msgAttach");
      if (attachBtn) attachBtn.addEventListener("click", function() { KB.toast("Dosya eki yakında geliyor", "info"); });
      document.getElementById("msgForm").addEventListener("submit", async function(e) {
        e.preventDefault();
        var inp = document.getElementById("msgInput"), bodyTxt = inp.value.trim(); if (!bodyTxt) return;
        inp.value = "";
        var scroll = document.getElementById("msgScroll");
        var empt = scroll.querySelector(".msg-thread__empty"); if (empt) empt.remove();
        scroll.insertAdjacentHTML("beforeend", bubble({ from_user: t.me, body: bodyTxt, created_at: new Date().toISOString() }, t.me));
        scrollBottom();
        try { await SB.sendMessage(profileId, bodyTxt); loadConvs(); }
        catch (err) { KB.toast((err && err.message) || T("apl.error"), "error"); }
      });
    }
    listEl.addEventListener("click", function(e) { var b = e.target.closest("[data-conv]"); if (b) openThread(b.getAttribute("data-conv")); });

    var searchEl = document.getElementById("msgSearchInput");
    if (searchEl) {
      searchEl.addEventListener("input", function() { searchQ = searchEl.value.trim(); loadConvs(); });
    }

    await loadConvs();
    var to = KB.getParam("to");
    if (to) openThread(to);
    else if (convs.length && window.matchMedia("(min-width:861px)").matches) openThread(convs[0].profileId);
    else if (convs.length) mainEl.innerHTML = msgPickPlaceholder();

    if (SB.subscribeMessages) {
      SB.subscribeMessages(function(m) {
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
    renderMyPool: renderMyPool, renderListings: renderListings,
    renderJobDetail: renderJobDetail, buildJobDetailHtml: buildJobDetailHtml, renderSavedJobs: renderSavedJobs, renderMyApplications: renderMyApplications, renderMessages: renderMessages,
    renderHomeStats: renderHomeStats, renderTestimonials: renderTestimonials
  };
})();
