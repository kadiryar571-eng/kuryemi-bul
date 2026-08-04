/* ============================================================
   KuryemiBul — screens/kurye.js
   7 Kurye ekranı: Panel, Harita, İlanlar, İlan Detayı,
                   Başvurularım, Mesajlar, Profil
   ============================================================ */
window.KuryeScreens = (function () {
  'use strict';

  /* ── Ekran verisi — TAMAMI Supabase'den doldurulur ────────
     Bu diziler boş başlar; içerikleri yalnız gerçek veritabanı
     kayıtlarıyla dolar. Sabit/örnek kayıt YOKTUR. */
  var ILANLAR_BASIT = [];

  var BASVURULAR = [];

  var MESAJLAR = [];

  function _statusLabel(s) {
    var map = {
      review:   '<span class="app-status app-status--review">Değerlendiriliyor</span>',
      approved: '<span class="app-status app-status--approved">Onaylandı</span>',
      rejected: '<span class="app-status app-status--rejected">Reddedildi</span>',
      pending:  '<span class="app-status app-status--pending">Beklemede</span>'
    };
    return map[s] || map.pending;
  }

  function _jobCard(j) {
    return '<div class="job-card kb-card--pressable" onclick="Router.go(\'/kurye/ilan/' + j.id + '\')">' +
      '<div class="job-card__top">' +
        '<div class="job-card__avatar">🏢</div>' +
        '<div class="job-card__info">' +
          '<div class="job-card__title">' + j.title + '</div>' +
          '<div class="job-card__company">' + j.company + '</div>' +
        '</div>' +
        '<div class="job-card__salary">' + j.salary + '</div>' +
      '</div>' +
      '<div class="job-card__tags">' +
        '<span class="kb-chip kb-chip--accent">' + j.type + '</span>' +
        '<span class="kb-chip">' + ICON.pin + j.location + '</span>' +
      '</div>' +
    '</div>';
  }

  /* ── 1. PANEL (Dashboard) ───────────────────────────────── */
  function panel() {
    showDashboardBar();
    showBottomNav();
    setActiveNav('panel');

    var profile = APP.profile || {};
    // Puan gerçek değerlendirmelerden gelir; hiç değerlendirme yoksa "—" gösterilir.
    var puanNum = Number(profile.puan != null ? profile.puan : profile.score) || 0;
    var score   = puanNum > 0 ? puanNum.toFixed(1) : '—';
    var degSay  = Number(profile.degerlendirme) || 0;
    // Yıldızlar gerçek puana göre çizilir (sabit 4/5 değil)
    var starsHtml = '';
    for (var _si = 1; _si <= 5; _si++) {
      starsHtml += '<span class="prem-hero__star' +
        (_si <= Math.round(puanNum) ? '' : ' prem-hero__star--dim') + '">★</span>';
    }

    renderScreen(
      '<div class="prem-dash">' +

        /* ── Hero Card ── */
        '<div class="prem-hero" onclick="Router.go(\'/kurye/profil\')">' +
          '<div class="prem-hero__deco1"></div>' +
          '<div class="prem-hero__deco2"></div>' +
          '<div class="prem-hero__shine"></div>' +
          /* Rozet yalnız gerçekten yüksek puanlı ve değerlendirilmiş kuryeye çıkar */
          (puanNum >= 4.5 && degSay >= 3
            ? '<div class="prem-hero__badge">' + ICON.star + ' Top Kurye</div>' : '') +
          '<div class="prem-hero__body">' +
            '<div class="prem-hero__label">Profil Puanın</div>' +
            '<div class="prem-hero__score-row">' +
              '<span class="prem-hero__score-big">' + score + '</span>' +
              (puanNum > 0 ? '<span class="prem-hero__score-denom">/ 5.0</span>' : '') +
            '</div>' +
            '<div class="prem-hero__stars">' + starsHtml + '</div>' +
            '<p class="prem-hero__desc">' +
              (degSay > 0
                ? degSay + ' değerlendirmeye göre'
                : 'Henüz değerlendirilmedin — ilk işini tamamla') +
            '</p>' +
            '<button class="prem-hero__cta" onclick="event.stopPropagation();Router.go(\'/kurye/profil\')">' +
              'Profilimi Gör ' + ICON.chevron +
            '</button>' +
          '</div>' +
        '</div>' +

        /* ── Stats Grid 2×2 ── */
        '<div class="prem-stats">' +
          _statCard('<span id="ps-ilanlar">—</span>', 'Açık İlanlar',       'pin',       'blue',   '/kurye/harita',     'Tümünü Gör') +
          _statCard('<span id="ps-basvuru">—</span>', 'Aktif Başvurularım', 'briefcase', 'orange', '/kurye/basvurular', 'Detaylar')   +
          _statCard('<span id="ps-gorusme">—</span>', 'Kabul Edildi',       'users',     'green',  '/kurye/basvurular', 'Randevular') +
          _statCard('<span id="ps-mesaj">—</span>',   'Mesajlarım',         'msg',       'purple', '/kurye/mesajlar',   'Sohbetler')  +
        '</div>' +

        /* ── Premium Upgrade Banner ── */
        '<div class="prem-upgrade">' +
          '<div class="prem-upgrade__content">' +
            '<div class="prem-upgrade__pill">' + ICON.star + ' Premium</div>' +
            '<div class="prem-upgrade__title">Premium\'a Geç, Daha Fazla Kazan</div>' +
            '<div class="prem-upgrade__sub">Öne çık, daha hızlı iş bul ve premium fırsatlara eriş.</div>' +
          '</div>' +
          '<button class="prem-upgrade__btn">Detayları Gör</button>' +
        '</div>' +

        /* ── Suggested Jobs ── */
        '<div class="kb-section-head" style="margin-top:4px">' +
          '<div class="kb-section-title">Sana Özel İlanlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/kurye/ilanlar\')">Tümünü Gör</button>' +
        '</div>' +
        /* Sana Özel İlanlar — gerçek açık ilanlardan doldurulur.
           Uydurma örnek ilan basılmaz. */
        '<div id="prem-suggested">' +
          '<div style="padding:24px 0;text-align:center"><div class="kb-spinner"></div></div>' +
        '</div>' +

      '</div>'
    );

    setTimeout(function () { _loadPanelStats(); _loadSuggested(); }, 130);
  }

  /* Panel "Sana Özel İlanlar" — gerçek açık ilanlar */
  async function _loadSuggested() {
    var el = document.getElementById('prem-suggested');
    if (!el) return;
    if (!window.SB || !SB.isOn()) { el.innerHTML = ''; return; }
    try {
      var list = await SB.openListings();
      var me   = APP.profile || {};
      // Aynı şehirdekiler öne alınır (gerçek eşleşme kriteri)
      if (me.sehir) {
        list.sort(function (a, b) {
          var as = (a.sehir === me.sehir) ? 0 : 1, bs = (b.sehir === me.sehir) ? 0 : 1;
          return as - bs;
        });
      }
      var top = list.slice(0, 3);
      if (!top.length) {
        el.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📭</div>' +
          '<div class="kb-empty__title">Şu an açık ilan yok</div>' +
          '<div class="kb-empty__sub">Yeni ilan yayınlandığında burada görünecek.</div></div>';
        return;
      }
      el.innerHTML = top.map(function (l) {
        var j = _dbListingToIlan(l);
        return _premJobCard(j.id, j.emoji, j.title, j.company,
          j.salary, j.location || '', j.time || '', 'rgba(61,150,255,.13)');
      }).join('');
    } catch (e) {
      console.warn('_loadSuggested:', e);
      el.innerHTML = '';
    }
  }

  async function _loadPanelStats() {
    if (!window.SB || !SB.isOn()) return;
    try {
      var results = await Promise.allSettled([
        SB.openListings(),
        SB.myApplications(),
        SB.myConvs()
      ]);
      var ilanlar   = results[0].status === 'fulfilled' ? results[0].value : [];
      var basvurular_list = results[1].status === 'fulfilled' ? results[1].value : [];
      var convs     = results[2].status === 'fulfilled' ? results[2].value : [];

      var pending   = basvurular_list.filter(function(b){ return b.durum === 'pending'; }).length;
      var accepted  = basvurular_list.filter(function(b){ return b.durum === 'accepted'; }).length;
      var unread    = convs.reduce(function(s,c){ return s + (c.unread || 0); }, 0);

      var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
      set('ps-ilanlar', ilanlar.length);
      set('ps-basvuru', pending);
      set('ps-gorusme', accepted);
      set('ps-mesaj',   unread);
    } catch(e) {}

    /* CANLI: yeni ilan / başvuru / mesaj olayında sayaçlar kendini tazeler.
       Polling yok — Supabase Realtime olayları tetikler. */
    _wireLivePanel();
  }

  var _livePanelOff = null;
  function _wireLivePanel() {
    if (_livePanelOff || !window.SB || !SB.isOn() || !SB.subscribeListings) return;
    var deb = null;
    function bump() {
      if (deb) clearTimeout(deb);
      deb = setTimeout(function () {
        if (!document.getElementById('ps-ilanlar')) return;   // panelden çıkıldı
        _loadPanelStats();
        _loadSuggested();
      }, 700);
    }
    var offs = [];
    offs.push(SB.subscribeListings(bump));
    if (SB.subscribeApplications)  offs.push(SB.subscribeApplications(bump));
    if (SB.subscribeConversations) offs.push(SB.subscribeConversations(bump));
    _livePanelOff = function () { offs.forEach(function (f) { try { f(); } catch (e) {} }); };
  }

  /* ── Premium Dashboard helpers ─────────────────────────── */
  function _statCard(num, label, icon, color, route, actionLabel) {
    return '<div class="prem-stat prem-stat--' + color + '" onclick="Router.go(\'' + route + '\')">' +
      '<div class="prem-stat__top">' +
        '<div class="prem-stat__num prem-stat__num--' + color + '">' + num + '</div>' +
        '<div class="prem-stat__icon prem-stat__icon--' + color + '">' + ICON[icon] + '</div>' +
      '</div>' +
      '<div class="prem-stat__label">' + label + '</div>' +
      '<div class="prem-stat__action">' + actionLabel + ICON.chevron + '</div>' +
    '</div>';
  }

  function _premJobCard(id, emoji, title, company, salary, dist, time, avatarBg) {
    return '<div class="prem-job" onclick="Router.go(\'/kurye/ilan/' + id + '\')">' +
      '<div class="prem-job__row1">' +
        '<div class="prem-job__avatar" style="background:' + avatarBg + '">' + emoji + '</div>' +
        '<div class="prem-job__info">' +
          '<div class="prem-job__title">' + title + '</div>' +
          '<div class="prem-job__company">' + company + '</div>' +
        '</div>' +
        '<button class="prem-job__save" onclick="event.stopPropagation()">' + ICON.heart + '</button>' +
      '</div>' +
      '<div class="prem-job__row2">' +
        '<div class="prem-job__salary">' + salary + '</div>' +
        '<div class="prem-job__meta">' +
          '<span class="prem-job__meta-item">' + ICON.pin   + dist + '</span>' +
          '<span class="prem-job__meta-item">' + ICON.clock + time + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── Dashboard helpers ──────────────────────────────────── */
  function _mCard(icon, val, lbl, iconBg, iconColor, route) {
    return '<div class="metric-card" onclick="Router.go(\'' + route + '\')">' +
      '<div class="metric-card__icon" style="background:' + iconBg + ';color:' + iconColor + '">' + ICON[icon] + '</div>' +
      '<div class="metric-card__val">' + val + '</div>' +
      '<div class="metric-card__lbl">' + lbl + '</div>' +
    '</div>';
  }

  function _appCard(ico, title, company, statusLbl, statusCls, time) {
    return '<div class="actapp-card" onclick="Router.go(\'/kurye/basvurular\')">' +
      '<div class="actapp-card__top">' +
        '<div class="actapp-card__ico">' + ico + '</div>' +
        '<div class="actapp-card__info">' +
          '<div class="actapp-card__title">' + title + '</div>' +
          '<div class="actapp-card__company">' + company + '</div>' +
        '</div>' +
        '<div class="actapp-card__time">' + time + '</div>' +
      '</div>' +
      '<div class="actapp-card__bottom">' +
        '<span class="app-status app-status--' + statusCls + '">' + statusLbl + '</span>' +
      '</div>' +
    '</div>';
  }

  function _jobRec(id, ico, title, company, salary, loc, type, badges) {
    var BADGE_LABELS = { acil: '🔥 Acil', yeni: '✨ Yeni', popular: '⭐ Popüler', yakin: '📍 Yakın' };
    return '<div class="rec-job-card" onclick="Router.go(\'/kurye/ilan/' + id + '\')">' +
      '<div class="rec-job-card__top">' +
        '<div class="rec-job-card__avatar">' + ico + '</div>' +
        '<div class="rec-job-card__info">' +
          '<div class="rec-job-card__title">' + title + '</div>' +
          '<div class="rec-job-card__company">' + company + '</div>' +
        '</div>' +
        '<div class="rec-job-card__salary">' + salary + '</div>' +
      '</div>' +
      '<div class="rec-job-card__meta">' +
        '<div class="rec-job-card__tags">' +
          badges.map(function (b) { return '<span class="job-badge job-badge--' + b + '">' + (BADGE_LABELS[b] || b) + '</span>'; }).join('') +
        '</div>' +
        '<span style="font-size:.7rem;color:var(--muted)">' + type + ' · ' + loc + '</span>' +
      '</div>' +
    '</div>';
  }

  function _miniMsg(name, preview, time, unread, route) {
    return '<div class="mini-msg" onclick="Router.go(\'' + route + '\')">' +
      '<div class="kb-avatar" style="width:36px;height:36px;font-size:.78rem">' + initials(name) + '</div>' +
      '<div class="mini-msg__info">' +
        '<div class="mini-msg__name">' + name + '</div>' +
        '<div class="mini-msg__preview">' + preview + '</div>' +
      '</div>' +
      '<div class="mini-msg__meta">' +
        '<span class="mini-msg__time">' + time + '</span>' +
        (unread > 0 ? '<span class="mini-msg__badge">' + unread + '</span>' : '') +
      '</div>' +
    '</div>';
  }

  function _wBar(pct, day) {
    var h = Math.max(4, Math.round(pct * 0.44));
    return '<div class="perf-week__col"><div class="perf-week__bar perf-week__bar--fill" style="height:' + h + 'px"></div><div class="perf-week__day">' + day + '</div></div>';
  }
  function _wBarToday(pct, day) {
    var h = Math.max(4, Math.round(pct * 0.44));
    return '<div class="perf-week__col"><div class="perf-week__bar perf-week__bar--today" style="height:' + h + 'px"></div><div class="perf-week__day" style="color:var(--c-accent);font-weight:700">' + day + '</div></div>';
  }

  /* ── 2. HARİTA ──────────────────────────────────────────── */
  var MAP_ILANLAR = [];

  function _mapJobCard(j) {
    return '<div class="map-job-card kb-card--pressable" onclick="Router.go(\'/kurye/ilan/' + j.id + '\')">' +
      '<div class="map-job-card__avatar" style="background:' + j.avatarBg + '">' + j.emoji + '</div>' +
      '<div class="map-job-card__body">' +
        '<div class="map-job-card__title">' + j.title + '</div>' +
        '<div class="map-job-card__company">' + j.company + '</div>' +
        '<div class="map-job-card__salary">' + j.salary + '</div>' +
        '<div class="map-job-card__meta">' +
          '<span>📍 ' + j.dist + '</span>' +
          '<span>🕐 ' + j.time + '</span>' +
        '</div>' +
        '<div class="map-job-card__tags">' +
          j.tags.map(function (t) { return '<span class="map-job-card__tag">' + t + '</span>'; }).join('') +
        '</div>' +
      '</div>' +
      '<div class="map-job-card__score">' +
        '<svg viewBox="0 0 36 36" class="map-job-card__ring">' +
          '<circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2.5"/>' +
          '<circle cx="18" cy="18" r="15.5" fill="none" stroke="' + j.avatarBg + '" stroke-width="2.5"' +
            ' stroke-dasharray="' + Math.round(97.4 * j.match / 100) + ' 97.4"' +
            ' stroke-linecap="round" transform="rotate(-90 18 18)"/>' +
        '</svg>' +
        '<div class="map-job-card__pct">' + j.match + '%</div>' +
      '</div>' +
      '<button class="map-job-card__cta" onclick="event.stopPropagation();Router.go(\'/kurye/ilan/' + j.id + '\')">Hızlı Başvur</button>' +
    '</div>';
  }

  function harita() {
    var bar = document.getElementById('kb-appbar');
    if (bar) bar.style.display = 'none';
    showBottomNav();
    setActiveNav('harita');
    var kbScreen = document.getElementById('kb-screen');
    if (kbScreen) kbScreen.style.overflow = 'hidden';
    renderScreen(window._spmShell ? window._spmShell() : '<div id="spm-map" style="height:100%;background:#0f0b1e"></div>');
    if (window._spmMapsReady && window.initPremiumMap) {
      setTimeout(function() { window.initPremiumMap('kurye'); }, 200);
    } else {
      window._spmPendingRole = 'kurye';
    }
  }

  function _harita_UNUSED() {
    renderScreen(
      '<div class="map-screen--unused">' +

        /* ── Top glass search bar ── */
        '<div class="map-topbar">' +
          '<button class="map-topbar__icon" onclick="KuryeScreens._mapToggleFilter()">' + ICON.filter + '</button>' +
          '<div class="map-topbar__search">' +
            ICON.search +
            '<input type="text" placeholder="Moto kurye, restoran, firma ara..." autocomplete="off">' +
          '</div>' +
          '<button class="map-topbar__icon" id="map-layer-btn" onclick="KuryeScreens._mapToggleLayer()" title="Katman">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>' +
          '</button>' +
        '</div>' +

        /* ── Category filter chips ── */
        '<div class="map-filter-chips" id="map-cat-chips">' +
          '<button class="map-chip map-chip--active" data-filter="tumu"    onclick="KuryeScreens._mapCat(this,\'tumu\')">Tümü</button>' +
          '<button class="map-chip"                  data-filter="ilanlar" onclick="KuryeScreens._mapCat(this,\'ilanlar\')">💼 İş İlanları</button>' +
          '<button class="map-chip"                  data-filter="firma"   onclick="KuryeScreens._mapCat(this,\'firma\')">🏢 Kurye Firmaları</button>' +
          '<button class="map-chip"                  data-filter="isletme" onclick="KuryeScreens._mapCat(this,\'isletme\')">🏪 Esnaflar</button>' +
          '<button class="map-chip map-chip--gold"   data-filter="premium" onclick="KuryeScreens._mapCat(this,\'premium\')">⭐ Premium İşler</button>' +
        '</div>' +

        /* ── Map canvas ── */
        '<div class="map-canvas" id="map-canvas">' +

          /* Dark city grid lines */
          '<svg class="map-grid" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">' +
            '<rect width="400" height="300" fill="#0F1825"/>' +
            /* roads */
            '<line x1="0" y1="150" x2="400" y2="150" stroke="#1C2C42" stroke-width="12"/>' +
            '<line x1="200" y1="0" x2="200" y2="300" stroke="#1C2C42" stroke-width="12"/>' +
            '<line x1="0" y1="75" x2="400" y2="75" stroke="#1A2840" stroke-width="6"/>' +
            '<line x1="0" y1="225" x2="400" y2="225" stroke="#1A2840" stroke-width="6"/>' +
            '<line x1="100" y1="0" x2="100" y2="300" stroke="#1A2840" stroke-width="6"/>' +
            '<line x1="300" y1="0" x2="300" y2="300" stroke="#1A2840" stroke-width="6"/>' +
            '<line x1="0" y1="37" x2="400" y2="37" stroke="#162235" stroke-width="2"/>' +
            '<line x1="0" y1="112" x2="400" y2="112" stroke="#162235" stroke-width="2"/>' +
            '<line x1="0" y1="187" x2="400" y2="187" stroke="#162235" stroke-width="2"/>' +
            '<line x1="0" y1="262" x2="400" y2="262" stroke="#162235" stroke-width="2"/>' +
            '<line x1="50" y1="0" x2="50" y2="300" stroke="#162235" stroke-width="2"/>' +
            '<line x1="150" y1="0" x2="150" y2="300" stroke="#162235" stroke-width="2"/>' +
            '<line x1="250" y1="0" x2="250" y2="300" stroke="#162235" stroke-width="2"/>' +
            '<line x1="350" y1="0" x2="350" y2="300" stroke="#162235" stroke-width="2"/>' +
            /* blocks */
            '<rect x="110" y="84" width="80" height="57" rx="3" fill="#162235"/>' +
            '<rect x="212" y="84" width="80" height="57" rx="3" fill="#162235"/>' +
            '<rect x="110" y="157" width="80" height="57" rx="3" fill="#162235"/>' +
            '<rect x="212" y="157" width="80" height="57" rx="3" fill="#162235"/>' +
            '<rect x="10" y="44" width="80" height="57" rx="3" fill="#162235"/>' +
            '<rect x="312" y="157" width="78" height="57" rx="3" fill="#162235"/>' +
          '</svg>' +

          /* Küme balonları ve pinler GERÇEK ilanlardan üretilir.
             Sabit "12 / 25+ / 8" gibi uydurma sayılar kaldırıldı. */
          '<div id="map-pins"></div>' +

          /* User location pulse */
          '<div class="map-user-loc" style="left:50%;top:50%">' +
            '<div class="map-user-pulse"></div>' +
            '<div class="map-user-dot"></div>' +
          '</div>' +

          /* Zoom controls */
          '<div class="map-zoom">' +
            '<button onclick="KuryeScreens._mapZoom(1)">+</button>' +
            '<button onclick="KuryeScreens._mapZoom(-1)">−</button>' +
          '</div>' +

          /* GPS button */
          '<button class="map-gps-btn" onclick="KuryeScreens._mapGPS()">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/><circle cx="12" cy="12" r="8" opacity=".3"/></svg>' +
          '</button>' +

          /* Floating bottom filter row */
          '<div class="map-float-chips">' +
            '<button class="map-float-chip map-float-chip--active">📍 Yakınımda</button>' +
            '<button class="map-float-chip">🆕 Bugün eklenen</button>' +
            '<button class="map-float-chip map-float-chip--gold">⭐ Premium</button>' +
            '<button class="map-float-chip">⏱ Tam Zamanlı</button>' +
            '<button class="map-float-chip map-float-chip--red">🔥 Acil</button>' +
          '</div>' +

        '</div>' + /* /map-canvas */

        /* ── Swipeable job cards ── */
        '<div class="map-cards-header">' +
          '<span class="map-cards-title">Yakınındaki Fırsatlar</span>' +
          '<span class="map-cards-count" id="map-cards-count">—</span>' +
        '</div>' +
        '<div class="map-cards-scroll" id="map-cards">' +
          '<div style="padding:24px 16px"><div class="kb-spinner"></div></div>' +
        '</div>' +

        /* ── AI Match FAB ── */
        '<button class="map-ai-fab" onclick="KuryeScreens._mapAI()">' +
          '<span class="map-ai-fab__icon">✨</span>' +
          '<span class="map-ai-fab__label">AI Match</span>' +
        '</button>' +

      '</div>' /* /map-screen */
    );

    setTimeout(function () { _loadMapJobs(); }, 130);
  }

  /* Haritadaki "Yakınındaki Fırsatlar" — gerçek açık ilanlar.
     Konumu olan ilanlar için pin, olmayanlar için yalnız kart çıkar. */
  async function _loadMapJobs() {
    var cards = document.getElementById('map-cards');
    var count = document.getElementById('map-cards-count');
    var pins  = document.getElementById('map-pins');
    if (!cards) return;

    if (!window.SB || !SB.isOn()) {
      cards.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📭</div><div class="kb-empty__title">İlanlar yüklenemedi</div></div>';
      if (count) count.textContent = '—';
      return;
    }
    try {
      var list = await SB.openListings();
      MAP_ILANLAR.length = 0;
      (list || []).map(_dbListingToIlan).forEach(function (x) { MAP_ILANLAR.push(x); });

      if (count) count.textContent = MAP_ILANLAR.length + ' ilan';
      cards.innerHTML = MAP_ILANLAR.length
        ? MAP_ILANLAR.map(_mapJobCard).join('')
        : '<div class="kb-empty" style="padding:20px"><div class="kb-empty__icon">📭</div><div class="kb-empty__title">Yakında açık ilan yok</div></div>';

      /* Pinler: yalnız konumu GERÇEKTEN bilinen ilanlar için */
      if (pins) {
        var withLoc = (list || []).filter(function (l) { return l.lat != null && l.lng != null; });
        pins.innerHTML = withLoc.slice(0, 12).map(function (l, i) {
          // konumları görsel haritaya oransal yerleştir
          var left = 12 + ((i * 37) % 76);
          var top  = 18 + ((i * 23) % 60);
          return '<div class="map-pin map-pin--blue" style="left:' + left + '%;top:' + top + '%" ' +
                 'title="' + String(l.baslik || 'İlan').replace(/"/g, '&quot;') + '" ' +
                 'onclick="Router.go(\'/kurye/ilan/' + l.id + '\')"><span>💼</span></div>';
        }).join('');
      }
    } catch (e) {
      console.warn('_loadMapJobs:', e);
      cards.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📭</div><div class="kb-empty__title">İlanlar yüklenemedi</div></div>';
      if (count) count.textContent = '—';
    }
  }

  function _mapCat(btn, filter) {
    document.querySelectorAll('#map-cat-chips .map-chip').forEach(function (el) {
      el.classList.remove('map-chip--active');
    });
    btn.classList.add('map-chip--active');
  }

  function _mapToggleFilter() {
    var el = document.getElementById('map-cat-chips');
    if (el) el.style.display = el.style.display === 'none' ? 'flex' : 'none';
  }

  function _mapToggleLayer() {
    var btn = document.getElementById('map-layer-btn');
    if (btn) btn.style.color = btn.style.color === 'var(--c-kurye)' ? '' : 'var(--c-kurye)';
  }

  function _mapCluster(n) {
    if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('Küme', n + ' ilan bu alanda');
  }

  function _mapZoom(dir) { /* Leaflet.js Faz 2'de */ }

  /* Gerçek konum — sabit "İstanbul, Kadıköy" metni kaldırıldı */
  function _mapGPS() {
    if (!navigator.geolocation) {
      if (typeof KBMotion !== 'undefined') KBMotion.showErrorToast('Konum desteklenmiyor');
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var c = pos.coords;
      if (typeof KBMotion !== 'undefined') {
        KBMotion.showSuccess('Konum alındı',
          c.latitude.toFixed(4) + ', ' + c.longitude.toFixed(4), 1800);
      }
    }, function () {
      if (typeof KBMotion !== 'undefined') KBMotion.showErrorToast('Konum alınamadı');
    }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function _mapAI() {
    if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('✨ AI Match', 'Profiline en uygun 4 ilan bulundu');
  }

  function _mapFilter(type) { /* legacy compat */ }

  /* ── 3. İLANLAR ────────────────────────────────────────── */
  var ILANLAR = [];

  var _ilanState = { cat: 'tumu', sort: 'match', savedIds: {} };

  function _tierBadge(tier) {
    var map = {
      premium:      '<span class="il-tier il-tier--premium">⭐ Premium</span>',
      profesyonel:  '<span class="il-tier il-tier--pro">🔵 Profesyonel</span>',
      standart:     '<span class="il-tier il-tier--std">Standart</span>'
    };
    return map[tier] || map.standart;
  }

  function _ilCard(j) {
    var saved = !!_ilanState.savedIds[j.id];
    return '<div class="il-card kb-card--pressable" onclick="Router.go(\'/kurye/ilan/' + j.id + '\')">' +

      /* ── Row 1: logo + tier badge + save ── */
      '<div class="il-card__head">' +
        '<div class="il-card__avatar" style="background:' + j.avatarBg + '">' + j.emoji + '</div>' +
        '<div class="il-card__tier-wrap">' + _tierBadge(j.tier) + '</div>' +
        '<button class="il-card__save' + (saved ? ' il-card__save--saved' : '') + '" ' +
          'onclick="event.stopPropagation();KuryeScreens._ilToggleSave(this,\'' + j.id + '\')">' +
          '<svg viewBox="0 0 24 24" fill="' + (saved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
        '</button>' +
      '</div>' +

      /* ── Row 2: title + match ring ── */
      '<div class="il-card__mid">' +
        '<div class="il-card__info">' +
          '<div class="il-card__title">' + j.title + '</div>' +
          '<div class="il-card__company">' + j.company + '</div>' +
          '<div class="il-card__salary">' + j.salary + '</div>' +
          '<div class="il-card__meta">' +
            [j.location ? '📍 ' + j.location : '', j.dist, j.time ? '🕐 ' + j.time : '']
              .filter(Boolean).join(' &bull; ') +
          '</div>' +
        '</div>' +
        /* Uyum halkası YALNIZ gerçek bir eşleşme skoru varsa çizilir;
           veri yoksa uydurma yüzde basılmaz. */
        (j.match != null ?
          '<div class="il-card__score">' +
            '<svg viewBox="0 0 40 40" class="il-card__ring">' +
              '<circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/>' +
              '<circle cx="20" cy="20" r="17" fill="none" stroke="' + j.avatarBg + '" stroke-width="3"' +
                ' stroke-dasharray="' + Math.round(106.8 * j.match / 100) + ' 106.8"' +
                ' stroke-linecap="round" transform="rotate(-90 20 20)"/>' +
            '</svg>' +
            '<div class="il-card__pct"><span>' + j.match + '</span><small>%</small></div>' +
          '</div>' : '') +
      '</div>' +

      /* ── Row 3: tags ── */
      '<div class="il-card__tags">' +
        j.tags.map(function (t) {
          var cls = t === 'Acil Alım' ? ' il-tag--red' : t === 'Premium' ? ' il-tag--gold' : '';
          return '<span class="il-tag' + cls + '">' + t + '</span>';
        }).join('') +
      '</div>' +

      /* ── CTA ── */
      '<button class="il-card__cta" onclick="event.stopPropagation();KuryeScreens._basvur(\'' + j.id + '\')">' +
        (j.tier === 'premium' ? 'Hızlı Başvur ⚡' : 'Başvur') +
      '</button>' +

    '</div>';
  }

  function _ilRender() {
    var cat  = _ilanState.cat;
    var sort = _ilanState.sort;
    var data = cat === 'tumu'      ? ILANLAR.slice()
             : cat === 'tamzaman'  ? ILANLAR.filter(function (j) { return j.tags.some(function (t) { return t === 'Tam Zamanlı'; }); })
             : cat === 'parttime'  ? ILANLAR.filter(function (j) { return j.tags.some(function (t) { return t === 'Part Time'; }); })
             : cat === 'acil'      ? ILANLAR.filter(function (j) { return j.tags.some(function (t) { return t === 'Acil Alım'; }); })
             : cat === 'premium'   ? ILANLAR.filter(function (j) { return j.tier === 'premium'; })
             : ILANLAR.slice();

    data.sort(function (a, b) {
      if (sort === 'match')  return (b.match || 0) - (a.match || 0);
      if (sort === 'newest') return a.id > b.id ? -1 : 1;
      if (sort === 'salary') return parseInt(b.salary) - parseInt(a.salary);
      if (sort === 'dist')   return parseFloat(a.dist) - parseFloat(b.dist);
      if (sort === 'premium') return (b.tier === 'premium' ? 1 : 0) - (a.tier === 'premium' ? 1 : 0);
      return 0;
    });

    var list = document.getElementById('il-feed');
    var counter = document.getElementById('il-counter');
    if (counter) counter.textContent = data.length + ' ilan';
    if (list) list.innerHTML = data.length
      ? data.map(_ilCard).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">🔍</div><div class="kb-empty__title">İlan bulunamadı</div><div class="kb-empty__sub">Filtreni değiştirmeyi dene</div></div>';
  }

  function ilanlar() {
    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    showBottomNav();
    setActiveNav('ilanlar');
    _ilanState.cat  = 'tumu';
    _ilanState.sort = 'match';

    renderScreen(
      '<div class="il-screen">' +

        /* ── Hero header ── */
        '<div class="il-hero">' +
          '<div class="il-hero__text">' +
            '<div class="il-hero__title">İlanlar</div>' +
            '<div class="il-hero__sub">Sana uygun fırsatları keşfet</div>' +
          '</div>' +
          '<div class="il-hero__actions">' +
            '<button class="il-hero__btn" onclick="Router.go(\'/bildirimler\')">' +
              ICON.bell +
              '<span class="il-hero__badge" id="il-notif-badge" hidden>0</span>' +
            '</button>' +
            '<button class="il-hero__btn" id="il-saved-btn" onclick="KuryeScreens._ilToggleSavedView()">' +
              ICON.heart +
            '</button>' +
          '</div>' +
        '</div>' +

        /* ── Search bar ── */
        '<div class="il-search">' +
          '<div class="il-search__bar">' +
            ICON.search +
            '<input type="text" id="il-search-input" placeholder="Pozisyon, firma veya anahtar kelime ara..." autocomplete="off" oninput="KuryeScreens._ilSearch(this.value)">' +
          '</div>' +
          '<button class="il-search__filter" onclick="KuryeScreens._ilAdvFilter()">' +
            ICON.filter +
          '</button>' +
        '</div>' +

        /* ── Quick category chips ── */
        '<div class="il-cats" id="il-cats">' +
          '<button class="il-cat il-cat--active" data-cat="tumu"     onclick="KuryeScreens._ilCat(this,\'tumu\')">Tümü</button>' +
          '<button class="il-cat"                data-cat="tamzaman" onclick="KuryeScreens._ilCat(this,\'tamzaman\')">⏱ Tam Zamanlı</button>' +
          '<button class="il-cat"                data-cat="parttime" onclick="KuryeScreens._ilCat(this,\'parttime\')">🕐 Part-time</button>' +
          '<button class="il-cat il-cat--red"    data-cat="acil"     onclick="KuryeScreens._ilCat(this,\'acil\')">🔥 Acil</button>' +
          '<button class="il-cat il-cat--gold"   data-cat="premium"  onclick="KuryeScreens._ilCat(this,\'premium\')">⭐ Premium</button>' +
        '</div>' +

        /* ── Advanced filter dropdowns ── */
        '<div class="il-adv-filters">' +
          '<select class="il-adv-sel" onchange="KuryeScreens._ilAdvChange()">' +
            '<option>Maaş</option><option>10k+</option><option>20k+</option><option>30k+</option>' +
          '</select>' +
          '<select class="il-adv-sel" onchange="KuryeScreens._ilAdvChange()">' +
            '<option>Mesafe</option><option>&lt;1 km</option><option>&lt;3 km</option><option>&lt;10 km</option>' +
          '</select>' +
          '<select class="il-adv-sel" onchange="KuryeScreens._ilAdvChange()">' +
            '<option>Araç Tipi</option><option>Moto</option><option>Araç</option><option>Yaya</option>' +
          '</select>' +
          '<select class="il-adv-sel" onchange="KuryeScreens._ilAdvChange()">' +
            '<option>Deneyim</option><option>Yok</option><option>1 yıl</option><option>3 yıl+</option>' +
          '</select>' +
        '</div>' +

        /* ── Sort row ── */
        '<div class="il-sort-row">' +
          '<div class="il-sort-left">' +
            '<span class="il-sort-label">Sırala:</span>' +
            '<select class="il-sort-sel" id="il-sort-sel" onchange="KuryeScreens._ilSort(this.value)">' +
              '<option value="match">Sana Uygun</option>' +
              '<option value="newest">En Yeni</option>' +
              '<option value="dist">En Yakın</option>' +
              '<option value="salary">En Yüksek Maaş</option>' +
              '<option value="premium">Premium Önce</option>' +
            '</select>' +
          '</div>' +
          '<div class="il-sort-right" id="il-counter">—</div>' +
        '</div>' +

        /* ── Feed ── */
        '<div class="il-feed" id="il-feed"></div>' +

        /* ── Infinite scroll loader ── */
        '<div class="il-loader" id="il-loader">' +
          '<div class="il-loader__dot"></div>' +
          '<div class="il-loader__dot"></div>' +
          '<div class="il-loader__dot"></div>' +
          '<span>Daha fazla ilan yükleniyor...</span>' +
        '</div>' +

      '</div>'
    );

    _ilRender();
    setTimeout(function () { _loadRealIlanlar(); }, 130);
  }

  /* DB ilanı → kart modeli. Uydurma alan üretilmez:
     bilinmeyen değerler '—' olarak gösterilir, uyum skoru yalnız
     gerçek profil/ilan eşleşmesinden hesaplanır (yoksa gösterilmez). */
  function _dbListingToIlan(l) {
    var aracEmoji = l.arac === 'Motosiklet' ? '🛵' : l.arac === 'Otomobil' ? '🚗'
                  : l.arac === 'Bisiklet' ? '🚲' : l.arac === 'Yaya' ? '🚶' : '🏢';
    var tags = [];
    if (l.vardiya_tipi)  tags.push(l.vardiya_tipi);
    if (l.calisma_sekli && l.calisma_sekli !== l.vardiya_tipi) tags.push(l.calisma_sekli);
    if (l.oncelik === 'acil') tags.push('Acil Alım');
    if (l.sigorta)       tags.push(l.sigorta);
    if (!tags.length && l.arac) tags.push(l.arac);
    return {
      id: l.id,
      emoji: aracEmoji,
      title: l.baslik || 'İlan',
      company: l.sahip || 'Esnaf',
      salary: l.maas_aralik || '—',
      location: [l.sehir, l.bolge].filter(Boolean).join(', ') || 'Belirtilmemiş',
      dist: '',
      time: l.tarih || '',
      match: null,            // gerçek eşleşme verisi yoksa yüzde gösterilmez
      tier: l.oncelik === 'acil' ? 'premium' : 'standart',
      avatarBg: '#F97316',
      tags: tags,
      saved: false,
      _raw: l
    };
  }

  /* Gerçek ilanları yükle → ILANLAR dizisini doldur → yeniden çiz.
     Bu çağrı dönmeden feed boş kalır; asla örnek ilan gösterilmez. */
  function _loadRealIlanlar() {
    var feed = document.getElementById('il-feed');
    if (!window.SB || !SB.isOn()) {
      if (feed) feed.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📭</div><div class="kb-empty__title">İlanlar yüklenemedi</div><div class="kb-empty__sub">Bağlantını kontrol et</div></div>';
      return;
    }
    SB.openListings().then(function (listings) {
      ILANLAR.length = 0;
      (listings || []).map(_dbListingToIlan).forEach(function (x) { ILANLAR.push(x); });
      _ilRender();
      _wireLiveIlanlar();
    }).catch(function (e) {
      console.warn('_loadRealIlanlar:', e);
      if (feed) feed.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📭</div><div class="kb-empty__title">İlanlar yüklenemedi</div></div>';
    });
  }

  /* CANLI: yeni ilan yayınlanınca feed kendini yeniler (sayfa yenilemeden) */
  var _liveIlanOff = null;
  function _wireLiveIlanlar() {
    if (_liveIlanOff || !window.SB || !SB.isOn() || !SB.subscribeListings) return;
    var deb = null;
    _liveIlanOff = SB.subscribeListings(function () {
      if (deb) clearTimeout(deb);
      deb = setTimeout(function () {
        if (!document.getElementById('il-feed')) return;   // ekran değişti
        SB.openListings().then(function (list) {
          ILANLAR.length = 0;
          (list || []).map(_dbListingToIlan).forEach(function (x) { ILANLAR.push(x); });
          _ilRender();
        }).catch(function () {});
      }, 600);
    });
  }

  function _ilCat(btn, cat) {
    document.querySelectorAll('#il-cats .il-cat').forEach(function (el) { el.classList.remove('il-cat--active'); });
    btn.classList.add('il-cat--active');
    _ilanState.cat = cat;
    _ilRender();
  }

  function _ilSort(val) {
    _ilanState.sort = val;
    _ilRender();
  }

  function _ilSearch(q) {
    var feed = document.getElementById('il-feed');
    if (!feed) return;
    var lower = q.toLowerCase();
    var data = !lower ? ILANLAR : ILANLAR.filter(function (j) {
      return j.title.toLowerCase().indexOf(lower) > -1 ||
             j.company.toLowerCase().indexOf(lower) > -1 ||
             j.location.toLowerCase().indexOf(lower) > -1;
    });
    feed.innerHTML = data.length ? data.map(_ilCard).join('') :
      '<div class="kb-empty"><div class="kb-empty__icon">🔍</div><div class="kb-empty__title">Sonuç yok</div></div>';
    var counter = document.getElementById('il-counter');
    if (counter) counter.textContent = data.length + ' ilan';
  }

  function _ilToggleSave(btn, id) {
    if (_ilanState.savedIds[id]) {
      delete _ilanState.savedIds[id];
    } else {
      _ilanState.savedIds[id] = true;
    }
    _ilRender();
  }

  function _ilToggleSavedView() {
    var btn = document.getElementById('il-saved-btn');
    var showing = btn && btn.dataset.showing === '1';
    if (btn) btn.dataset.showing = showing ? '0' : '1';
    if (btn) btn.style.color = showing ? '' : 'var(--c-kurye)';
    var feed = document.getElementById('il-feed');
    if (!feed) return;
    if (showing) {
      _ilRender();
    } else {
      var saved = ILANLAR.filter(function (j) { return !!_ilanState.savedIds[j.id]; });
      feed.innerHTML = saved.length ? saved.map(_ilCard).join('') :
        '<div class="kb-empty"><div class="kb-empty__icon">🤍</div><div class="kb-empty__title">Kayıtlı ilan yok</div><div class="kb-empty__sub">Beğendiğin ilanları kaydet</div></div>';
    }
  }

  function _ilAdvFilter() {
    if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('Gelişmiş Filtre', 'Yakında — Faz 2\'de geliyor');
  }

  function _ilAdvChange() { /* visual only, Faz 2 */ }

  function _ilanFilter(cat, btn) {
    document.querySelectorAll('#ilan-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var filtered = cat === 'tumu' ? ILANLAR_BASIT : ILANLAR_BASIT.filter(function (j) { return j.cat === cat; });
    var list = document.getElementById('ilan-list');
    if (list) list.innerHTML = filtered.length ? filtered.map(_jobCard).join('') :
      '<div class="kb-empty"><div class="kb-empty__icon">🔍</div><div class="kb-empty__title">İlan bulunamadı</div></div>';
  }

  /* ── 4. İLAN DETAY ─────────────────────────────────────── */
  function ilanDetay(ctx) {
    var id = ctx.params.id;
    showAppBar('İlan Detayı', true);
    showBottomNav();

    /* Gerçek UUID ise Supabase'den yükle */
    var isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id);
    if (isUuid && window.SB && SB.isOn()) {
      renderScreen('<div class="kb-screen-inner" style="padding-top:32px;text-align:center"><div class="kb-spinner"></div></div>');
      SB.listingById(id).then(function(ilan) {
        if (!ilan) { toast('İlan bulunamadı'); Router.back(); return; }
        _renderIlanDetay(ilan.id, ilan.baslik, ilan.sahip || 'Esnaf', ilan.aciklama || '', ilan.sehir || '', ilan.arac || '');
      }).catch(function() { toast('İlan yüklenemedi'); Router.back(); });
      return;
    }

    var j = ILANLAR_BASIT.find(function (x) { return x.id === id; }) || ILANLAR_BASIT[0];
    _renderIlanDetay(j.id, j.title, j.company, '', j.location, j.type);
  }

  function _renderIlanDetay(id, title, company, aciklama, konum, tip) {
    showAppBar(title, true);
    renderScreen(
      '<div>' +
        '<div class="detail-hero">' +
          '<div class="detail-hero__title">' + title + '</div>' +
          '<div class="detail-hero__sub">' + company + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
            (tip ? '<span class="kb-chip kb-chip--accent">' + tip + '</span>' : '') +
            (konum ? '<span class="kb-chip">' + ICON.pin + konum + '</span>' : '') +
          '</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">İlan Açıklaması</div>' +
          '<p style="font-size:.88rem;line-height:1.6;color:var(--text)">' +
            (aciklama || ('Firmamız için deneyimli ' + title.toLowerCase() + ' arıyoruz. Aktif ve dürüst adayları bekliyoruz.')) +
          '</p>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Detaylar</div>' +
          (konum ? '<div class="detail-row">' + ICON.pin + '<span>Konum: ' + konum + '</span></div>' : '') +
          (tip   ? '<div class="detail-row">' + ICON.briefcase + '<span>Çalışma Tipi: ' + tip + '</span></div>' : '') +
        '</div>' +

        '<div class="detail-cta">' +
          '<button class="btn btn--primary" onclick="KuryeScreens._basvur(\'' + id + '\',\'' +
            title.replace(/'/g,"\\'") + '\',\'' + company.replace(/'/g,"\\'") + '\')">' +
            'Başvur' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _basvur(ilanId, titleOverride, companyOverride) {
    // Yüklü ilan listesinden bul; yoksa çağıranın verdiği gerçek başlık/firma kullanılır.
    var base = ILANLAR.find(function (j) { return j.id === ilanId; }) ||
      { id: ilanId, title: titleOverride || 'İlan', company: companyOverride || 'Esnaf', emoji: '🏢', avatarBg: '#6C4DFF', tier: 'standart' };
    var ilan = titleOverride
      ? Object.assign({}, base, { title: titleOverride, company: companyOverride || base.company })
      : base;

    var old = document.getElementById('apply-overlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'apply-overlay';
    overlay.id = 'apply-overlay';
    overlay.innerHTML =
      '<div class="apply-modal">' +

        '<div class="apply-modal__head">' +
          '<div class="apply-modal__avatar" style="background:' + ilan.avatarBg + '">' + ilan.emoji + '</div>' +
          '<div class="apply-modal__hinfo">' +
            '<div class="apply-modal__htitle">' + ilan.title + '</div>' +
            '<div class="apply-modal__hco">' + ilan.company + '</div>' +
          '</div>' +
          '<button class="apply-modal__close" onclick="document.getElementById(\'apply-overlay\').remove()">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +

        (ilan.tier !== 'standart' ? '<div class="apply-modal__tier">' + _tierBadge(ilan.tier) + '</div>' : '') +

        '<div class="apply-modal__body">' +
          '<div class="apply-modal__label">Kapak mesajı <span class="apply-modal__opt">(isteğe bağlı)</span></div>' +
          '<textarea class="apply-modal__textarea" id="apply-msg-input" rows="4" ' +
            'placeholder="Kendinizi tanıtın, bu iş için neden uygun olduğunuzu kısaca belirtin..."></textarea>' +
        '</div>' +

        '<div class="apply-modal__checklist">' +
          '<div class="apply-modal__check"><span class="apply-modal__check-icon">✓</span>Profilin paylaşılacak</div>' +
          '<div class="apply-modal__check"><span class="apply-modal__check-icon">✓</span>CV\'n ekleniyor</div>' +
          '<div class="apply-modal__check"><span class="apply-modal__check-icon">✓</span>İşveren bildirim alacak</div>' +
        '</div>' +

        '<div class="apply-modal__actions">' +
          '<button class="apply-modal__cancel" onclick="document.getElementById(\'apply-overlay\').remove()">Vazgeç</button>' +
          '<button class="apply-modal__submit" id="apply-submit-btn" ' +
            'onclick="KuryeScreens._doApply(\'' + ilan.id + '\',\'' +
              ilan.title.replace(/'/g, "\\'") + '\',\'' +
              ilan.company.replace(/'/g, "\\'") + '\')">' +
            (ilan.tier === 'premium' ? 'Hızlı Başvur ⚡' : 'Başvuruyu Gönder →') +
          '</button>' +
        '</div>' +

      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('apply-overlay--visible'); });
    setTimeout(function () {
      var ta = document.getElementById('apply-msg-input');
      if (ta) ta.focus();
    }, 320);
  }

  function _doApply(ilanId, ilanTitle, company) {
    var submitBtn = document.getElementById('apply-submit-btn');
    var msg = (document.getElementById('apply-msg-input') || {}).value || '';

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Gönderiliyor...'; }

    var overlay = document.getElementById('apply-overlay');
    if (overlay) overlay.remove();

    if (window.SB && SB.isOn()) {
      SB.applyWithConv(ilanId, msg).then(function (result) {
        _showApplySuccess(result.convId, ilanTitle, company);
      }).catch(function (e) {
        console.warn('_doApply error:', e);
        _showApplySuccess(null, ilanTitle, company);
      });
    } else {
      setTimeout(function () { _showApplySuccess(null, ilanTitle, company); }, 600);
    }
  }

  function _showApplySuccess(convId, ilanTitle, company) {
    var old = document.getElementById('apply-success-overlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.className = 'apply-overlay';
    overlay.id = 'apply-success-overlay';
    overlay.innerHTML =
      '<div class="apply-modal apply-modal--success">' +
        '<div class="apply-success__anim">' +
          '<div class="apply-success__ring"></div>' +
          '<div class="apply-success__check">✓</div>' +
        '</div>' +
        '<div class="apply-success__title">Başvurun İletildi!</div>' +
        '<div class="apply-success__sub">' +
          '<strong>' + company + '</strong>' +
          (ilanTitle ? ' · ' + ilanTitle : '') +
        '</div>' +
        '<div class="apply-success__info">' +
          'İşveren başvurunu inceleyecek.<br>Yanıt geldiğinde bildirim alacaksın. 🔔' +
        '</div>' +
        '<div class="apply-modal__actions">' +
          (convId
            ? '<button class="apply-modal__submit" onclick="document.getElementById(\'apply-success-overlay\').remove();Router.go(\'/kurye/mesaj/' + convId + '\')">Konuşmayı Aç →</button>'
            : '') +
          '<button class="apply-modal__cancel" onclick="document.getElementById(\'apply-success-overlay\').remove();Router.go(\'/kurye/basvurular\')">Başvurularıma Git</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('apply-overlay--visible'); });
  }

  /* ── 5. BAŞVURULARIM ────────────────────────────────────── */
  var _basvuruCache = [];

  function basvurular() {
    showAppBar('Başvurularım', false);
    showBottomNav();
    setActiveNav('basvurular');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="bas-tabs">' +
          '<button class="kb-tab active" onclick="KuryeScreens._basFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="KuryeScreens._basFilter(\'aktif\',this)">Bekliyor</button>' +
          '<button class="kb-tab"        onclick="KuryeScreens._basFilter(\'sonuc\',this)">Sonuçlandı</button>' +
        '</div>' +
        '<div id="bas-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>'
    );

    setTimeout(function () { _loadBasvurular(); }, 130);
  }

  function _basLabel(durum) {
    if (durum === 'accepted') return '<span style="background:rgba(34,197,94,.15);color:#15803D;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:20px">Kabul Edildi</span>';
    if (durum === 'rejected') return '<span style="background:rgba(239,68,68,.12);color:#DC2626;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:20px">Reddedildi</span>';
    return '<span style="background:rgba(108,77,255,.12);color:#6C4DFF;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:20px">İnceleniyor</span>';
  }

  function _basCard(b) {
    return '<div class="kb-card" style="margin-bottom:10px">' +
      '<div class="flex items-center justify-between mb-8">' +
        '<div style="font-weight:700">' + (b.firma || b.company || 'Esnaf') + '</div>' +
        _basLabel(b.durum || b.status) +
      '</div>' +
      '<div style="font-size:.85rem;color:var(--muted)">' + (b.baslik || b.role || '') + '</div>' +
      (b.ilanSehir ? '<div style="font-size:.75rem;color:var(--muted);margin-top:2px">' + b.ilanSehir + '</div>' : '') +
      '<div style="font-size:.75rem;color:var(--muted);margin-top:4px">Başvuru: ' + (b.tarih || b.date || '') + '</div>' +
    '</div>';
  }

  async function _loadBasvurular() {
    var el = document.getElementById('bas-list');
    if (!el) return;
    try {
      var items = (window.SB && SB.isOn()) ? await SB.myApplications() : BASVURULAR;
      _basvuruCache = items;
      _basRender(items);
    } catch(e) {
      _basvuruCache = BASVURULAR;
      _basRender(BASVURULAR);
    }
  }

  function _basRender(list) {
    var el = document.getElementById('bas-list');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Başvuru yok</div><div class="kb-empty__sub">İlan başvuruların burada görünür.</div></div>';
      return;
    }
    el.innerHTML = list.map(_basCard).join('');
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var all = _basvuruCache.length ? _basvuruCache : BASVURULAR;
    var filtered = all;
    if (type === 'aktif')  filtered = all.filter(function (b) { return (b.durum || b.status) === 'pending'; });
    if (type === 'sonuc')  filtered = all.filter(function (b) { var d = b.durum || b.status; return d === 'accepted' || d === 'rejected'; });
    _basRender(filtered);
  }

  /* Konuşmalar TAMAMEN veritabanından gelir (gerçek eşleşmeler).
     Örnek/markalı sahte konuşma YOKTUR. */
  var KONUSMALAR = [];

  /* Mesaj balonları gerçek konuşmadan yüklenir; sabit içerik yoktur. */
  var CHAT = {};

  var _msgState = { tab: 'tumu', activeId: null, _convId: null, _myUserId: null, _realtimeCh: null };

  function _msgIndicatorColor(ind) {
    var map = { purple: 'var(--c-kurye)', green: '#22C55E', orange: '#F97316', blue: '#4A90E2' };
    return map[ind] || map.blue;
  }

  function _konusmaCard(k, isActive) {
    var color = _msgIndicatorColor(k.indicator);
    return '<div class="msg-conv' + (isActive ? ' msg-conv--active' : '') + '" ' +
      'onclick="KuryeScreens._msgOpen(\'' + k.id + '\')">' +

      /* indicator bar */
      '<div class="msg-conv__bar" style="background:' + color + '"></div>' +

      /* avatar */
      '<div class="msg-conv__ava" style="background:' + k.avatarBg + '">' +
        k.emoji +
        (k.online ? '<div class="msg-conv__online"></div>' : '') +
      '</div>' +

      /* body */
      '<div class="msg-conv__body">' +
        '<div class="msg-conv__row1">' +
          '<div class="msg-conv__name">' + k.name + '</div>' +
          '<div class="msg-conv__time">' + k.time + '</div>' +
        '</div>' +
        '<div class="msg-conv__row2">' +
          '<span class="msg-conv__badge msg-conv__badge--' + k.badge + '">' +
            (k.badge === 'premium' ? '⭐' : '') + ' ' + k.badge.charAt(0).toUpperCase() + k.badge.slice(1) +
          '</span>' +
          '<span class="msg-conv__job">' + k.jobType + '</span>' +
        '</div>' +
        '<div class="msg-conv__tag" style="color:' + color + '">' + k.tag + '</div>' +
        '<div class="msg-conv__preview">' + k.lastMsg + '</div>' +
        '<div class="msg-conv__meta">' + k.meta + '</div>' +
      '</div>' +

      /* right */
      '<div class="msg-conv__right">' +
        (k.unread ? '<div class="msg-conv__unread">' + k.unread + '</div>' : '') +
        '<button class="msg-conv__star' + (k.starred ? ' msg-conv__star--on' : '') + '" ' +
          'onclick="event.stopPropagation();KuryeScreens._msgStar(\'' + k.id + '\')">' +
          ICON.star +
        '</button>' +
      '</div>' +

    '</div>';
  }

  function _msgConvList(tab) {
    var data = tab === 'tumu'      ? KONUSMALAR
             : tab === 'gorusme'   ? KONUSMALAR.filter(function (k) { return k.indicator === 'orange'; })
             : tab === 'aktif'     ? KONUSMALAR.filter(function (k) { return k.online; })
             : tab === 'teklif'    ? KONUSMALAR.filter(function (k) { return k.indicator === 'green' || k.indicator === 'purple'; })
             : KONUSMALAR;
    return data.length
      ? data.map(function (k) { return _konusmaCard(k, k.id === _msgState.activeId); }).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">💬</div><div class="kb-empty__title">Konuşma yok</div></div>';
  }

  /* ── KONUŞMA PIPELINE HELPERS ──────────────────────────── */

  function _convCard(c) {
    var roleEmoji = c.otherRole === 'isletme' ? '🏢' : c.otherRole === 'firma' ? '🏭' : '🛵';
    var roleBg    = c.otherRole === 'isletme' ? '#F97316' : c.otherRole === 'firma' ? '#22C55E' : '#6C4DFF';
    var time      = '';
    if (c.lastMessageAt) {
      var d = new Date(c.lastMessageAt);
      time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    return '<div class="msg-conv" onclick="Router.go(\'/kurye/mesaj/' + c.id + '\')">' +
      '<div class="msg-conv__bar" style="background:' + roleBg + '"></div>' +
      '<div class="msg-conv__ava" style="background:' + roleBg + '">' +
        roleEmoji +
        '<div class="msg-conv__online" style="display:none"></div>' +
      '</div>' +
      '<div class="msg-conv__body">' +
        '<div class="msg-conv__top">' +
          '<div class="msg-conv__name">' + c.otherName + '</div>' +
          '<div class="msg-conv__time">' + time + '</div>' +
        '</div>' +
        '<div class="msg-conv__job">' +
          '<span class="msg-conv__badge--standart">Başvuru</span>' +
          ' ' + (c.listingTitle || 'İlan') +
        '</div>' +
        '<div class="msg-conv__preview">' + (c.lastMessage || 'Yeni konuşma') + '</div>' +
        '<div class="msg-conv__meta">' +
          (c.listingSehir ? '📍 ' + c.listingSehir : '') +
        '</div>' +
      '</div>' +
      (c.unread > 0
        ? '<div class="msg-conv__unread">' + c.unread + '</div>'
        : '') +
    '</div>';
  }

  /* Konuşmalar TAMAMEN veritabanından. Kayıt yoksa boş durum gösterilir —
     örnek konuşma asla basılmaz. Yeni mesaj gelince liste kendini yeniler. */
  function _renderConvs(convs) {
    var el = document.getElementById('msg-list');
    if (!el) return;
    el.innerHTML = convs.length
      ? convs.map(_convCard).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">💬</div><div class="kb-empty__title">Henüz konuşma yok</div><div class="kb-empty__sub">Bir ilana başvurduğunda işverenle sohbet burada başlar.</div></div>';
    var total = convs.reduce(function (s, c) { return s + (c.unread || 0); }, 0);
    var tab = document.querySelector('#msg-tabs .msg-tab[data-tab="tumu"]');
    if (tab) tab.innerHTML = 'Tümü' + (total ? ' <span class="msg-tab__badge">' + total + '</span>' : '');
  }

  function _loadConvsAsync() {
    var list = document.getElementById('msg-list');
    if (!list) return;
    if (!window.SB || !SB.isOn()) { _renderConvs([]); return; }
    SB.myConvs().then(function (convs) {
      _renderConvs(convs || []);
      _wireLiveConvs();
    }).catch(function (e) { console.warn('_loadConvsAsync:', e); _renderConvs([]); });
  }

  /* CANLI: yeni mesaj/konuşma olayında liste anında güncellenir */
  var _liveConvOff = null;
  function _wireLiveConvs() {
    if (_liveConvOff || !window.SB || !SB.isOn() || !SB.subscribeConversations) return;
    var deb = null;
    _liveConvOff = SB.subscribeConversations(function () {
      if (deb) clearTimeout(deb);
      deb = setTimeout(function () {
        if (!document.getElementById('msg-list')) return;
        SB.myConvs().then(function (c) { _renderConvs(c || []); }).catch(function () {});
      }, 500);
    });
  }

  /* ── 6. MESAJLAR ────────────────────────────────────────── */
  function mesajlar() {
    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    showBottomNav();
    setActiveNav('mesajlar');
    _msgState.tab = 'tumu';
    _msgState.activeId = null;

    var totalUnread = KONUSMALAR.reduce(function (s, k) { return s + k.unread; }, 0);

    renderScreen(
      '<div class="msg-screen">' +

        /* ── Header ── */
        '<div class="msg-header">' +
          '<div class="msg-header__text">' +
            '<div class="msg-header__title">Mesajlar</div>' +
            '<div class="msg-header__sub">Tüm görüşmelerin burada ✨</div>' +
          '</div>' +
          '<div class="msg-header__actions">' +
            '<button class="msg-header__btn" onclick="KuryeScreens._msgSearch()">' + ICON.search + '</button>' +
            '<button class="msg-header__btn" onclick="KuryeScreens._msgFilter()">' + ICON.filter + '</button>' +
          '</div>' +
        '</div>' +

        /* ── Segment tabs ── */
        '<div class="msg-tabs" id="msg-tabs">' +
          '<button class="msg-tab msg-tab--active" data-tab="tumu"    onclick="KuryeScreens._msgTab(this,\'tumu\')">' +
            'Tümü' + (totalUnread ? '<span class="msg-tab__badge">' + totalUnread + '</span>' : '') +
          '</button>' +
          '<button class="msg-tab" data-tab="gorusme"  onclick="KuryeScreens._msgTab(this,\'gorusme\')">' +
            '📅 İş Görüşmeleri' +
          '</button>' +
          '<button class="msg-tab" data-tab="aktif"    onclick="KuryeScreens._msgTab(this,\'aktif\')">' +
            '🟢 Aktif Sohbetler' +
          '</button>' +
          '<button class="msg-tab" data-tab="teklif"   onclick="KuryeScreens._msgTab(this,\'teklif\')">' +
            '⭐ Teklifler' +
          '</button>' +
          '<button class="msg-tab" data-tab="arsiv"    onclick="KuryeScreens._msgTab(this,\'arsiv\')">' +
            '🗂 Arşiv' +
          '</button>' +
        '</div>' +

        /* ── Conversation list ── */
        '<div class="msg-list" id="msg-list">' +
          _msgConvList('tumu') +
        '</div>' +

      '</div>'
    );

    setTimeout(function () { _loadConvsAsync(); }, 130);
  }

  function _msgTab(btn, tab) {
    document.querySelectorAll('#msg-tabs .msg-tab').forEach(function (el) { el.classList.remove('msg-tab--active'); });
    btn.classList.add('msg-tab--active');
    _msgState.tab = tab;
    var list = document.getElementById('msg-list');
    if (list) list.innerHTML = _msgConvList(tab);
  }

  function _msgStar(id) {
    var k = KONUSMALAR.find(function (x) { return x.id === id; });
    if (k) k.starred = !k.starred;
    var list = document.getElementById('msg-list');
    if (list) list.innerHTML = _msgConvList(_msgState.tab);
  }

  function _msgSearch() {
    if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('Arama', 'Konuşma arama — Faz 2\'de geliyor');
  }

  function _msgFilter() {
    if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('Filtrele', 'Gelişmiş filtre — Faz 2\'de geliyor');
  }

  function _msgOpen(id) {
    Router.go('/kurye/mesaj/' + id);
  }

  /* ── 6b. MESAJ CHAT ─────────────────────────────────────── */

  function _chatFooterHTML() {
    return '<div class="chat-footer">' +
      '<div class="chat-quick">' +
        '<button class="chat-quick__btn" onclick="KuryeScreens._chatQuick(\'konum\')">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          'Konum Paylaş' +
        '</button>' +
        '<button class="chat-quick__btn" onclick="KuryeScreens._chatQuick(\'uygun\')">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' +
          'Uygunluk Bildir' +
        '</button>' +
        '<button class="chat-quick__btn" onclick="KuryeScreens._chatQuick(\'belge\')">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
          'Belgelerimi Gönder' +
        '</button>' +
      '</div>' +
      '<div class="chat-input-wrap">' +
        '<div class="chat-input-row">' +
          '<button class="chat-input__icon" onclick="KuryeScreens._chatAttach()">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
          '</button>' +
          '<input type="text" class="chat-input__field" id="chat-input-field" placeholder="Mesajınızı yazın..." autocomplete="off">' +
          '<button class="chat-input__icon" onclick="KuryeScreens._chatEmoji()">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' +
          '</button>' +
          '<button class="chat-send" onclick="KuryeScreens._chatSend()">' + ICON.send + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-smart">' +
        '<button class="chat-smart__btn" onclick="KuryeScreens._chatQuick(\'cv\')">' +
          '<div class="chat-smart__icon">📄</div><div class="chat-smart__label">CV Gönder</div>' +
        '</button>' +
        '<button class="chat-smart__btn chat-smart__btn--primary" onclick="KuryeScreens._chatQuick(\'konum\')">' +
          '<div class="chat-smart__icon">📍</div><div class="chat-smart__label">Konum Paylaş</div>' +
        '</button>' +
        '<button class="chat-smart__btn" onclick="KuryeScreens._chatQuick(\'evrak\')">' +
          '<div class="chat-smart__icon">📁</div><div class="chat-smart__label">Evrak Yükle</div>' +
        '</button>' +
        '<button class="chat-smart__btn" onclick="KuryeScreens._chatQuick(\'plan\')">' +
          '<div class="chat-smart__icon">📅</div><div class="chat-smart__label">Görüşme Planla</div>' +
        '</button>' +
        '<button class="chat-smart__btn chat-smart__btn--offer" onclick="KuryeScreens._chatQuick(\'teklif\')">' +
          '<div class="chat-smart__icon">⭐</div><div class="chat-smart__label">Teklifleri Gör</div>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function _chatMsgBubble(m, myUserId) {
    if (m.message_type === 'system') {
      return '<div class="chat-date-sep chat-system-msg"><span>' + (m.content || '') + '</span></div>';
    }
    if (m.message_type === 'profile_card') {
      var meta = m.metadata || {};
      var sevBadge = meta.seviye === 'premium' ? '⭐ Premium' : meta.seviye === 'profesyonel' ? '🔵 Profesyonel' : 'Standart';
      return '<div class="chat-bubble chat-bubble--in">' +
        '<div class="chat-pcard">' +
          '<div class="chat-pcard__head">' +
            '<div class="chat-pcard__ava">🛵</div>' +
            '<div class="chat-pcard__info">' +
              '<div class="chat-pcard__name">' + (meta.ad || 'Aday') + '</div>' +
              '<div class="chat-pcard__lvl">' + sevBadge + '</div>' +
              '<div class="chat-pcard__sub">⭐ ' + (meta.puan || '0') + ' · ' + (meta.sehir || '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="chat-pcard__stats">' +
            '<div class="chat-pcard__stat"><span class="chat-pcard__sval">' + (meta.deneyim || 0) + 'y</span><span class="chat-pcard__slbl">Deneyim</span></div>' +
            '<div class="chat-pcard__stat"><span class="chat-pcard__sval">' + (meta.puan || '0') + '</span><span class="chat-pcard__slbl">Puan</span></div>' +
            '<div class="chat-pcard__stat"><span class="chat-pcard__sval">' + (meta.arac || '—') + '</span><span class="chat-pcard__slbl">Araç</span></div>' +
          '</div>' +
          '<div class="chat-pcard__actions">' +
            '<button class="chat-pcard__btn chat-pcard__btn--sec" onclick="KuryeScreens._chatQuick(\'gorusme\')">Görüşmeye Davet</button>' +
            '<button class="chat-pcard__btn" onclick="Router.go(\'/profil-kurye?id=' + (meta.profile_id || '') + '\')">Profili İncele →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
    var isOut = m.sender_user === myUserId;
    var time  = m.created_at ? new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
    return '<div class="chat-bubble chat-bubble--' + (isOut ? 'out' : 'in') + '">' +
      '<div class="chat-bubble__text">' + (m.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div>' +
      '<div class="chat-bubble__meta">' + time + (isOut ? ' <span class="chat-tick">✓✓</span>' : '') + '</div>' +
    '</div>';
  }

  function _loadRealChat(convId) {
    if (!window.SB || !SB.isOn()) return;
    SB.getConvDetail(convId).then(function (detail) {
      if (!detail || !detail.conv) return;
      var c = detail.conv;
      var u = window.APP && APP.user;
      var iAmKurye = !!(u && c.kurye_user === u.id);
      var otherName = iAmKurye ? ((c.employer && c.employer.ad) || 'Esnaf') : ((c.kurye && c.kurye.ad) || 'Kurye');
      var otherEmoji = iAmKurye ? '🏢' : '🛵';
      var otherBg    = iAmKurye ? '#F97316' : '#6C4DFF';
      var listingTitle = (c.listing && c.listing.baslik) || 'İlan';
      var listingSehir = [(c.listing && c.listing.sehir), (c.listing && c.listing.bolge)].filter(Boolean).join(' · ');
      var myUid = u && u.id;

      // Başlık güncelle
      var hdrEl = document.getElementById('chat-hdr-el');
      if (hdrEl) {
        hdrEl.innerHTML =
          '<button class="chat-hdr__back" onclick="Router.back ? Router.back() : Router.go(\'/kurye/mesajlar\')">' + ICON.back + '</button>' +
          '<div class="chat-hdr__ava" style="background:' + otherBg + '">' + otherEmoji + '</div>' +
          '<div class="chat-hdr__info">' +
            '<div class="chat-hdr__name">' + otherName + '</div>' +
            '<div class="chat-hdr__status"><span class="chat-hdr__dot"></span>Aktif Başvuru</div>' +
          '</div>' +
          '<div class="chat-hdr__acts">' +
            '<button class="chat-hdr__act" onclick="KuryeScreens._chatCall()">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.93-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>' +
            '</button>' +
            '<button class="chat-hdr__act" onclick="KuryeScreens._chatMore()">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>' +
            '</button>' +
          '</div>';
      }

      // Context banner güncelle
      var ctxEl = document.getElementById('chat-context-el');
      if (ctxEl) {
        ctxEl.style.cssText = 'border-color:' + otherBg + '33';
        ctxEl.innerHTML =
          '<div class="chat-context__dot" style="background:' + otherBg + '"></div>' +
          '<div class="chat-context__text">' +
            '<span class="chat-context__role">' + listingTitle + '</span>' +
            (listingSehir ? '<span class="chat-context__loc">' + listingSehir + '</span>' : '') +
          '</div>' +
          '<span class="chat-context__tag" style="color:' + otherBg + '">Başvuru</span>';
      }

      // Mesajları render et
      var msgsEl = document.getElementById('chat-msgs');
      if (msgsEl) {
        msgsEl.innerHTML = '<div class="chat-date-sep"><span>Bugün</span></div>';
        detail.messages.forEach(function (m) {
          msgsEl.innerHTML += _chatMsgBubble(m, myUid);
        });
        setTimeout(function () { msgsEl.scrollTop = msgsEl.scrollHeight; }, 30);
      }

      // Realtime subscribe
      _msgState._convId   = convId;
      _msgState._myUserId = myUid;
      if (_msgState._realtimeCh) {
        try { _msgState._realtimeCh.unsubscribe(); } catch (e) {}
      }
      _msgState._realtimeCh = SB.subscribeConv(convId, function (newMsg) {
        if (newMsg.sender_user === _msgState._myUserId) return; // kendi mesajımız zaten optimistik eklendi
        var el = document.getElementById('chat-msgs');
        if (el) {
          var div = document.createElement('div');
          div.innerHTML = _chatMsgBubble(newMsg, _msgState._myUserId);
          el.appendChild(div.firstChild);
          el.scrollTop = el.scrollHeight;
        }
      });

      // Okundu işaretle
      SB.markConvRead(convId).catch(function () {});

    }).catch(function (e) { console.warn('_loadRealChat:', e); });
  }

  function mesajChat(ctx) {
    var id = ctx.params.id;
    // Önceki realtime aboneliği kapat
    if (_msgState._realtimeCh) {
      try { _msgState._realtimeCh.unsubscribe(); } catch (e) {}
      _msgState._realtimeCh = null;
    }
    _msgState._convId   = null;
    _msgState._myUserId = null;

    var isReal = !!(id && id.length > 20 && id.indexOf('-') !== -1);

    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    hideBottomNav();

    if (isReal) {
      // Gerçek konuşma: skeleton + async yükleme
      renderScreen(
        '<div class="chat-screen">' +
          '<div class="chat-hdr" id="chat-hdr-el">' +
            '<button class="chat-hdr__back" onclick="Router.back ? Router.back() : Router.go(\'/kurye/mesajlar\')">' + ICON.back + '</button>' +
            '<div class="chat-hdr__ava" style="background:#2A3550;font-size:1.2rem">⏳</div>' +
            '<div class="chat-hdr__info">' +
              '<div class="chat-hdr__name">Yükleniyor...</div>' +
              '<div class="chat-hdr__status">Lütfen bekleyin</div>' +
            '</div>' +
            '<div class="chat-hdr__acts"></div>' +
          '</div>' +
          '<div class="chat-context" id="chat-context-el" style="min-height:36px"></div>' +
          '<div class="chat-msgs" id="chat-msgs">' +
            '<div class="chat-loading">' +
              '<div class="chat-loading__dot"></div>' +
              '<div class="chat-loading__dot"></div>' +
              '<div class="chat-loading__dot"></div>' +
            '</div>' +
          '</div>' +
          _chatFooterHTML() +
        '</div>'
      );
      setTimeout(function () { _loadRealChat(id); }, 130);
    } else {
      // MOCK: mevcut demo konuşması
      var k    = KONUSMALAR.find(function (x) { return x.id === id; }) || KONUSMALAR[0];
      var msgs = CHAT[id] || CHAT['1'];
      var color = _msgIndicatorColor(k.indicator);

      renderScreen(
        '<div class="chat-screen">' +
          '<div class="chat-hdr">' +
            '<button class="chat-hdr__back" onclick="Router.back ? Router.back() : Router.go(\'/kurye/mesajlar\')">' + ICON.back + '</button>' +
            '<div class="chat-hdr__ava" style="background:' + k.avatarBg + '">' +
              k.emoji +
              (k.online ? '<div class="chat-hdr__online"></div>' : '') +
            '</div>' +
            '<div class="chat-hdr__info">' +
              '<div class="chat-hdr__name">' + k.name + '</div>' +
              '<div class="chat-hdr__status">' +
                (k.online ? '<span class="chat-hdr__dot"></span>Çevrimiçi' : 'Son görülme: ' + k.time) +
              '</div>' +
            '</div>' +
            '<div class="chat-hdr__acts">' +
              '<button class="chat-hdr__act" onclick="KuryeScreens._chatCall()">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.93-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>' +
              '</button>' +
              '<button class="chat-hdr__act" onclick="KuryeScreens._chatVideo()">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
              '</button>' +
              '<button class="chat-hdr__act" onclick="KuryeScreens._chatMore()">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="chat-context" style="border-color:' + color + '33">' +
            '<div class="chat-context__dot" style="background:' + color + '"></div>' +
            '<div class="chat-context__text">' +
              '<span class="chat-context__role">' + k.jobType + '</span>' +
              '<span class="chat-context__loc">' + k.meta + '</span>' +
            '</div>' +
            '<span class="chat-context__tag" style="color:' + color + '">' + k.tag + '</span>' +
          '</div>' +
          '<div class="chat-msgs" id="chat-msgs">' +
            '<div class="chat-date-sep"><span>Bugün</span></div>' +
            msgs.map(function (m) {
              return '<div class="chat-bubble chat-bubble--' + m.dir + '">' +
                '<div class="chat-bubble__text">' + m.text.replace(/\n/g, '<br>') + '</div>' +
                '<div class="chat-bubble__meta">' +
                  m.time +
                  (m.dir === 'out' ? ' <span class="chat-tick' + (m.read ? ' chat-tick--read' : '') + '">✓✓</span>' : '') +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
          _chatFooterHTML() +
        '</div>'
      );
      setTimeout(function () {
        var el = document.getElementById('chat-msgs');
        if (el) el.scrollTop = el.scrollHeight;
      }, 60);
    }
  }

  function _chatSend() {
    var input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = '';
    var msgsEl = document.getElementById('chat-msgs');
    if (!msgsEl) return;

    // Optimistik UI güncelleme
    var now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--out chat-bubble--new';
    bubble.innerHTML = '<div class="chat-bubble__text">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
      '<div class="chat-bubble__meta">' + now + ' <span class="chat-tick">✓✓</span></div>';
    msgsEl.appendChild(bubble);
    msgsEl.scrollTop = msgsEl.scrollHeight;

    // Gerçek konuşmaysa Supabase'e gönder
    if (_msgState._convId && window.SB && SB.isOn()) {
      SB.sendConvMessage(_msgState._convId, text).catch(function (e) {
        console.warn('sendConvMessage failed:', e);
      });
    }
  }

  function _chatQuick(type) {
    var map = {
      konum:  'Konumunuz paylaşıldı 📍',
      uygun:  'Uygunluk bilgisi gönderildi 📅',
      belge:  'Belgeleriniz gönderildi 📄',
      cv:     'CV\'niz gönderildi 📄',
      evrak:  'Evrak yükleme başlatılıyor...',
      plan:   'Görüşme talebi gönderildi 📅',
      teklif: 'Teklif detayları açılıyor...'
    };
    var msgs = document.getElementById('chat-msgs');
    if (!msgs) return;
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--out chat-bubble--new';
    bubble.innerHTML = '<div class="chat-bubble__text">' + (map[type] || '📎 Paylaşıldı') + '</div>' +
      '<div class="chat-bubble__meta">Şimdi <span class="chat-tick">✓✓</span></div>';
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function _chatCall()   { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('📞 Arama', 'VoIP araması — Faz 2\'de geliyor'); }
  function _chatVideo()  { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('📹 Video', 'Görüntülü görüşme — Faz 2\'de geliyor'); }
  function _chatMore()   { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('⋮ Seçenekler', 'Sohbet ayarları — Faz 2\'de geliyor'); }
  function _chatAttach() { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('📎 Dosya', 'Dosya eki — Faz 2\'de geliyor'); }
  function _chatEmoji()  { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('😊 Emoji', 'Emoji seçici — Faz 2\'de geliyor'); }

  /* ── 7. PROFİL ──────────────────────────────────────────── */
  function profil() {
    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    showBottomNav();
    setActiveNav('profil');

    /* Profil ekranındaki HER değer gerçek profilden gelir.
       Veri yoksa '—' ya da 'Belirtilmemiş' gösterilir; uydurma
       puan/deneyim/doğrulama/iş geçmişi basılmaz. */
    var p       = APP.profile || {};
    var name    = p.ad || p.full_name || 'Profilini tamamla';
    var puanNum = Number(p.puan) || 0;
    var degSay  = Number(p.degerlendirme) || 0;
    var prPuan  = puanNum > 0 ? puanNum.toFixed(1) : '—';
    var prSehir = p.sehir || 'Şehir belirtilmemiş';
    var prArac  = p.arac || 'Araç belirtilmemiş';
    var prDeney = Number(p.deneyim) || 0;
    var prTamam = Number(p.tamamlanan) || 0;
    var prDogru = p.dogrulama === 'verified';
    var prBolge = Array.isArray(p.bolgeler) ? p.bolgeler : [];
    var prSert  = Array.isArray(p.sertifikalar) ? p.sertifikalar : [];
    var prCalis = Array.isArray(p.calistigi) ? p.calistigi : [];

    renderScreen(
      '<div class="pr-screen">' +

        /* ── Top header ── */
        '<div class="pr-topbar">' +
          '<div class="pr-topbar__text">' +
            '<div class="pr-topbar__title">Profilim</div>' +
            '<div class="pr-topbar__sub">Profesyonel profilinle daha fazla iş fırsatı yakala ✨</div>' +
          '</div>' +
          '<div class="pr-topbar__acts">' +
            '<button class="pr-topbar__btn" onclick="Router.go(\'/profil-duzenle\')">' + ICON.eye + '</button>' +
            '<button class="pr-topbar__btn" onclick="Router.go(\'/ayarlar\')">' + ICON.settings + '</button>' +
          '</div>' +
        '</div>' +

        /* ── Hero card ── */
        '<div class="pr-hero">' +
          '<div class="pr-hero__left">' +
            '<div class="pr-avatar">' +
              '<div class="pr-avatar__initials">' + _prInitials(name) + '</div>' +
              '<div class="pr-avatar__online"></div>' +
            '</div>' +
            '<div class="pr-hero__info">' +
              '<div class="pr-hero__name">' + name + '</div>' +
              '<div class="pr-hero__role">🛵 ' + prArac + '</div>' +
              '<div class="pr-hero__loc">' +
                '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                ' ' + prSehir +
              '</div>' +
              '<div class="pr-hero__minibadges">' +
                (prDeney > 0 ? '<span class="pr-minibadge">⏱ ' + prDeney + ' yıl deneyim</span>' : '') +
                (degSay > 0
                  ? '<span class="pr-minibadge pr-minibadge--star">⭐ ' + prPuan + ' (' + degSay + ')</span>'
                  : '<span class="pr-minibadge">Henüz değerlendirme yok</span>') +
              '</div>' +
            '</div>' +
          '</div>' +
          /* "Premium Üye" rozeti yalnız gerçekten doğrulanmış profile çıkar */
          (prDogru
            ? '<div class="pr-hero__premium">' +
                '<div class="pr-premium-badge">' +
                  '<div class="pr-premium-badge__icon">✅</div>' +
                  '<div class="pr-premium-badge__label">Doğrulanmış</div>' +
                  '<div class="pr-premium-badge__sub">Kimliğin onaylandı</div>' +
                '</div>' +
              '</div>'
            : '') +
        '</div>' +

        /* ── Güven skoru — gerçek değerlendirmeler ── */
        '<div class="pr-trust">' +
          '<div class="pr-trust__head">' +
            '<div class="pr-trust__title">Profil Güven Skoru</div>' +
            '<div class="pr-trust__score">' + prPuan +
              (puanNum > 0 ? ' <span>/ 5.0</span>' : '') + '</div>' +
          '</div>' +
          '<div class="pr-trust__bar-wrap">' +
            '<div class="pr-trust__bar"><div class="pr-trust__fill" style="width:' +
              Math.round(puanNum / 5 * 100) + '%"></div></div>' +
          '</div>' +
          '<div class="pr-trust__metrics" id="pr-metrics">' +
            _prMetric(String(prTamam), 'Tamamlanan Teslimat', '#6C4DFF') +
            _prMetric(String(degSay),  'Değerlendirme',        '#22C55E') +
            _prMetric('—', 'Başvurum',      '#4A90E2') +
            _prMetric('—', 'Kabul Edilen',  '#F97316') +
          '</div>' +
        '</div>' +

        /* ── Doğrulamalar — gerçek KYC durumu ── */
        '<div class="pr-section">' +
          '<div class="pr-section__title">Doğrulamalarım</div>' +
          '<div class="pr-verifs">' +
            _prVerif('Kimlik',  prDogru) +
            _prVerif('Telefon', !!p.telefon) +
            _prVerif('Araç',    !!p.arac) +
            _prVerif('Adres',   !!p.sehir) +
          '</div>' +
        '</div>' +

        /* ── Deneyim — profildeki gerçek "çalıştığı yerler" ── */
        '<div class="pr-section">' +
          '<div class="pr-section__hd">' +
            '<div class="pr-section__title">Deneyimim</div>' +
            '<button class="pr-section__edit" onclick="Router.go(\'/profil-duzenle\')">Düzenle</button>' +
          '</div>' +
          '<div class="pr-exp-list">' +
            (prCalis.length
              ? prCalis.map(function (c) {
                  return _prExp('🏢', c, prArac, '', '', '#6C4DFF', false);
                }).join('')
              : '<div class="kb-empty" style="padding:16px"><div class="kb-empty__sub">Henüz iş geçmişi eklemedin. Profilini düzenleyerek ekleyebilirsin.</div></div>') +
          '</div>' +
        '</div>' +

        /* ── Sertifikalar — gerçek ── */
        (prSert.length
          ? '<div class="pr-section">' +
              '<div class="pr-section__title">Sertifikalarım</div>' +
              '<div class="pr-tags">' +
                prSert.map(function (c) { return '<span class="pr-tag">📄 ' + c + '</span>'; }).join('') +
              '</div>' +
            '</div>'
          : '') +

        /* ── Work preferences ── */
        '<div class="pr-section">' +
          '<div class="pr-section__hd">' +
            '<div class="pr-section__title">Çalışabileceğim Alanlar</div>' +
            '<button class="pr-section__edit" onclick="KuryeScreens._prEditAreas()">Düzenle</button>' +
          '</div>' +
          /* Çalışma bölgeleri profildeki GERÇEK bolgeler alanından gelir */
          '<div class="pr-tags">' +
            (prBolge.length
              ? prBolge.map(function (a) {
                  return '<span class="pr-tag pr-tag--area">📍 ' + a + '</span>';
                }).join('')
              : '<span class="pr-tag pr-tag--area">Bölge eklenmedi</span>') +
          '</div>' +
        '</div>' +

        /* ── Belgeler — gerçek yükleme durumu (sertifikalar + KYC) ── */
        '<div class="pr-section">' +
          '<div class="pr-section__title">Belgelerim</div>' +
          '<div class="pr-docs">' +
            _prDoc('🪪', 'Kimlik Doğrulama', prDogru ? 'Onaylandı' : 'Yüklenmedi', prDogru) +
            (prSert.length
              ? prSert.map(function (c) { return _prDoc('📄', c, 'Yüklendi', true); }).join('')
              : _prDoc('📄', 'Sertifika', 'Yüklenmedi', false)) +
          '</div>' +
        '</div>' +

        /* ── Featured CV ── */
        '<div class="pr-cv-card">' +
          '<div class="pr-cv-card__icon">📄</div>' +
          '<div class="pr-cv-card__body">' +
            '<div class="pr-cv-card__title">Öne Çıkan CV</div>' +
            '<div class="pr-cv-card__sub">Bu CV işverenlere başvurularda otomatik gösterilir.</div>' +
          '</div>' +
          '<button class="pr-cv-card__btn" onclick="KuryeScreens._prViewCV()">Görüntüle</button>' +
        '</div>' +

        /* ── Settings menu ── */
        '<div class="pr-section pr-section--menu">' +
          _prMenuItem('Profil Bilgileri',    'user',     '/ayarlar') +
          _prMenuItem('Kimlik & Belgeler',   'doc',      '/ayarlar') +
          _prMenuItem('Puanlamalarım',       'star',     '/ayarlar') +
          _prMenuItem('Favori İlanlarım',    'heart',    '/favoriler') +
          _prMenuItem('Bildirimler',         'bell',     '/bildirimler') +
          _prMenuItem('Ayarlar',             'settings', '/ayarlar') +
          _prMenuItem('Yardım & Destek',     'help',     '/yardim') +
          '<div class="pr-menu-item pr-menu-item--danger" onclick="signOut()">' +
            '<div class="pr-menu-item__icon">' + ICON.logout + '</div>' +
            '<div class="pr-menu-item__label">Çıkış Yap</div>' +
          '</div>' +
        '</div>' +

        /* ── Premium upgrade banner ── */
        '<div class="pr-upgrade">' +
          '<div class="pr-upgrade__glow"></div>' +
          '<div class="pr-upgrade__body">' +
            '<div class="pr-upgrade__title">Profilini Öne Çıkar ✨</div>' +
            '<div class="pr-upgrade__perks">' +
              '<div class="pr-upgrade__perk">🔝 Üst sıralarda görün</div>' +
              '<div class="pr-upgrade__perk">🏅 Özel rozet kazan</div>' +
              '<div class="pr-upgrade__perk">📩 Daha fazla işveren sana ulaşsın</div>' +
            '</div>' +
            '<button class="pr-upgrade__cta" onclick="KuryeScreens._prPremium()">Premium\'a Geç</button>' +
          '</div>' +
        '</div>' +

        '<div style="height:100px"></div>' +

      '</div>'
    );

    setTimeout(function () { _loadProfilMetrics(); }, 130);
  }

  /* Profil metrikleri — gerçek başvuru sayıları (uydurma oran yok) */
  async function _loadProfilMetrics() {
    var el = document.getElementById('pr-metrics');
    if (!el || !window.SB || !SB.isOn()) return;
    try {
      var apps = (await SB.myApplications()) || [];
      var kabul = apps.filter(function (a) { return a.durum === 'accepted'; }).length;
      var vals = el.querySelectorAll('.pr-metric__val');
      if (vals[2]) vals[2].textContent = apps.length;
      if (vals[3]) vals[3].textContent = kabul;
    } catch (e) { console.warn('_loadProfilMetrics:', e); }
  }

  function _prInitials(name) {
    var parts = (name || '').trim().split(' ');
    return (parts[0] ? parts[0][0] : '') + (parts[1] ? parts[1][0] : '');
  }

  function _prMetric(val, label, color) {
    return '<div class="pr-metric">' +
      '<div class="pr-metric__val" style="color:' + color + '">' + val + '</div>' +
      '<div class="pr-metric__label">' + label + '</div>' +
    '</div>';
  }

  function _prVerif(label, ok) {
    return '<div class="pr-verif' + (ok ? ' pr-verif--ok' : '') + '">' +
      '<div class="pr-verif__icon">' + (ok ? '✓' : '?') + '</div>' +
      '<div class="pr-verif__label">' + label + '</div>' +
    '</div>';
  }

  function _prExp(emoji, company, role, dur, range, color, current) {
    return '<div class="pr-exp">' +
      '<div class="pr-exp__dot" style="background:' + color + '">' + emoji + '</div>' +
      '<div class="pr-exp__body">' +
        '<div class="pr-exp__company">' + company + (current ? '<span class="pr-exp__now">Devam ediyor</span>' : '') + '</div>' +
        '<div class="pr-exp__role">' + role + '</div>' +
        '<div class="pr-exp__meta">' + dur + ' &bull; ' + range + '</div>' +
      '</div>' +
    '</div>';
  }

  function _prDoc(icon, label, status, ok) {
    return '<div class="pr-doc">' +
      '<div class="pr-doc__icon">' + icon + '</div>' +
      '<div class="pr-doc__label">' + label + '</div>' +
      '<div class="pr-doc__status' + (ok ? ' pr-doc__status--ok' : ' pr-doc__status--pending') + '">' + status + '</div>' +
      '<button class="pr-doc__share" onclick="KuryeScreens._prShareDoc(\'' + label + '\')">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' +
      '</button>' +
    '</div>';
  }

  function _prMenuItem(label, icon, route) {
    return '<div class="pr-menu-item" onclick="Router.go(\'' + route + '\')">' +
      '<div class="pr-menu-item__icon">' + ICON[icon] + '</div>' +
      '<div class="pr-menu-item__label">' + label + '</div>' +
      '<div class="pr-menu-item__chevron">' + ICON.chevron + '</div>' +
    '</div>';
  }

  function _menuItem(label, icon, route) {
    return _prMenuItem(label, icon, route);
  }

  function _prEditAreas()       { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('Bölge Düzenle', 'Faz 2\'de geliyor'); }
  function _prViewCV()          { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('📄 CV', 'CV önizleme — Faz 2\'de geliyor'); }
  function _prShareDoc(label)   { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('📤 Paylaş', label + ' paylaşıldı'); }
  function _prPremium()         { if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('✨ Premium', 'Premium abonelik — Faz 2\'de geliyor'); }

  return {
    panel       : panel,
    harita      : harita,
    ilanlar     : ilanlar,
    ilanDetay   : ilanDetay,
    basvurular  : basvurular,
    mesajlar    : mesajlar,
    mesajChat   : mesajChat,
    profil      : profil,
    _ilanFilter      : _ilanFilter,
    _ilCat           : _ilCat,
    _ilSort          : _ilSort,
    _ilSearch        : _ilSearch,
    _ilToggleSave    : _ilToggleSave,
    _ilToggleSavedView: _ilToggleSavedView,
    _ilAdvFilter     : _ilAdvFilter,
    _ilAdvChange     : _ilAdvChange,
    _msgTab          : _msgTab,
    _msgStar         : _msgStar,
    _msgSearch       : _msgSearch,
    _msgFilter       : _msgFilter,
    _msgOpen         : _msgOpen,
    _chatSend        : _chatSend,
    _chatQuick       : _chatQuick,
    _chatCall        : _chatCall,
    _chatVideo       : _chatVideo,
    _chatMore        : _chatMore,
    _chatAttach      : _chatAttach,
    _chatEmoji       : _chatEmoji,
    _prEditAreas     : _prEditAreas,
    _prViewCV        : _prViewCV,
    _prShareDoc      : _prShareDoc,
    _prPremium       : _prPremium,
    _basFilter       : _basFilter,
    _mapFilter       : _mapFilter,
    _mapCat          : _mapCat,
    _mapToggleFilter : _mapToggleFilter,
    _mapToggleLayer  : _mapToggleLayer,
    _mapCluster      : _mapCluster,
    _mapZoom         : _mapZoom,
    _mapGPS          : _mapGPS,
    _mapAI           : _mapAI,
    _basvur          : _basvur,
    _doApply         : _doApply,
    _showApplySuccess: _showApplySuccess,
    _chatMsgBubble   : _chatMsgBubble
  };

})();
