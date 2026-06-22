/* ============================================================
   KuryemiBul — screens/kurye.js
   7 Kurye ekranı: Panel, Harita, İlanlar, İlan Detayı,
                   Başvurularım, Mesajlar, Profil
   ============================================================ */
window.KuryeScreens = (function () {
  'use strict';


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
    var score   = profile.score ? String(profile.score) : '4.8';

    renderScreen(
      '<div class="prem-dash">' +

        /* ── Hero Card ── */
        '<div class="prem-hero" onclick="Router.go(\'/kurye/profil\')">' +
          '<div class="prem-hero__deco1"></div>' +
          '<div class="prem-hero__deco2"></div>' +
          '<div class="prem-hero__shine"></div>' +
          '<div class="prem-hero__badge">' + ICON.star + ' Top Kurye</div>' +
          '<div class="prem-hero__body">' +
            '<div class="prem-hero__label">Profil Puanın</div>' +
            '<div class="prem-hero__score-row">' +
              '<span class="prem-hero__score-big">' + score + '</span>' +
              '<span class="prem-hero__score-denom">/ 5.0</span>' +
            '</div>' +
            '<div class="prem-hero__stars">' +
              '<span class="prem-hero__star">★</span>' +
              '<span class="prem-hero__star">★</span>' +
              '<span class="prem-hero__star">★</span>' +
              '<span class="prem-hero__star">★</span>' +
              '<span class="prem-hero__star prem-hero__star--dim">★</span>' +
            '</div>' +
            '<p class="prem-hero__desc">Puanın yükseldikçe daha fazla premium fırsata erişirsin</p>' +
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
        _premJobCard('1', '🏢', 'Motorlu Kurye',     'ABC Lojistik',   '28.000 – 33.000 ₺/ay', '2.4 km', '2s önce',  'rgba(61,150,255,.13)')  +
        _premJobCard('2', '🚀', 'Araçlı Kurye',      'Hub Dağıtım',    '25.000 – 32.000 ₺/ay', '5.1 km', '5s önce',  'rgba(16,217,123,.12)')  +
        _premJobCard('3', '⚡', 'Yaya Kurye · Part', 'Lezzet Dükkânı', '13.000 – 18.000 ₺/ay', '1.2 km', '1g önce',  'rgba(255,209,102,.12)') +

      '</div>'
    );

    _loadPanelStats();
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
      set('ps-mesaj',   unread || convs.length);
    } catch(e) {}
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

  function _mapGPS() {
    if (typeof KBMotion !== 'undefined') KBMotion.showSuccess('Konum alındı', 'İstanbul, Kadıköy', 1800);
  }

  function _mapAI() {
    if (typeof KBMotion !== 'undefined') KBMotion.showInAppNotif('✨ AI Match', 'Profiline en uygun 4 ilan bulundu');
  }

  function _mapFilter(type) { /* legacy compat */ }

  /* ── 3. İLANLAR ────────────────────────────────────────── */
  var _ilanState = { cat: 'tumu', sort: 'match', savedIds: {}, _realListings: [] };

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
            '📍 ' + j.location + ' &bull; ' + j.dist + ' &bull; 🕐 ' + j.time +
          '</div>' +
        '</div>' +
        '<div class="il-card__score">' +
          '<svg viewBox="0 0 40 40" class="il-card__ring">' +
            '<circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/>' +
            '<circle cx="20" cy="20" r="17" fill="none" stroke="' + j.avatarBg + '" stroke-width="3"' +
              ' stroke-dasharray="' + Math.round(106.8 * j.match / 100) + ' 106.8"' +
              ' stroke-linecap="round" transform="rotate(-90 20 20)"/>' +
          '</svg>' +
          '<div class="il-card__pct"><span>' + j.match + '</span><small>%</small></div>' +
        '</div>' +
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
    var src  = _ilanState._realListings || [];
    var data = cat === 'tumu'      ? src.slice()
             : cat === 'tamzaman'  ? src.filter(function (j) { return j.tags && j.tags.some(function (t) { return t === 'Tam Zamanlı'; }); })
             : cat === 'parttime'  ? src.filter(function (j) { return j.tags && j.tags.some(function (t) { return t === 'Part Time'; }); })
             : cat === 'acil'      ? src.filter(function (j) { return j.tags && j.tags.some(function (t) { return t === 'Acil Alım'; }); })
             : cat === 'premium'   ? src.filter(function (j) { return j.tier === 'premium'; })
             : src.slice();

    data.sort(function (a, b) {
      if (sort === 'match')  return b.match - a.match;
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
              '<span class="il-hero__badge">3</span>' +
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
          '<div class="il-sort-right" id="il-counter">231 ilan</div>' +
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
    _loadRealIlanlar(); // DB'den gerçek ilanları async yükle
  }

  function _dbListingToIlan(l) {
    var aracEmoji = l.arac === 'Motosiklet' ? '🛵' : l.arac === 'Otomobil' ? '🚗' : l.arac === 'Bisiklet' ? '🚲' : '🏢';
    return {
      id: l.id,
      emoji: aracEmoji,
      title: l.baslik || 'İlan',
      company: l.sahip || 'İşletme',
      salary: '—',
      location: [l.sehir, l.bolge].filter(Boolean).join(', ') || 'Belirtilmemiş',
      dist: '—',
      time: l.tarih || 'Yeni',
      match: 82,
      tier: 'standart',
      avatarBg: '#F97316',
      tags: [l.arac || 'Kurye'].filter(Boolean),
      saved: false
    };
  }

  function _loadRealIlanlar() {
    if (!window.SB || !SB.isOn()) return;
    SB.openListings().then(function (listings) {
      if (!listings || !listings.length) return;
      var feed = document.getElementById('il-feed');
      if (!feed) return;
      var counter = document.getElementById('il-counter');
      var mapped = listings.map(_dbListingToIlan);
      _ilanState._realListings = mapped;
      _ilRender();
    }).catch(function (e) { console.warn('_loadRealIlanlar:', e); });
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
    var src = _ilanState._realListings || [];
    var data = !lower ? src : src.filter(function (j) {
      return (j.title || '').toLowerCase().indexOf(lower) > -1 ||
             (j.company || '').toLowerCase().indexOf(lower) > -1 ||
             (j.location || '').toLowerCase().indexOf(lower) > -1;
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
      var src = _ilanState._realListings || [];
      var saved = src.filter(function (j) { return !!_ilanState.savedIds[j.id]; });
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
    var src = _ilanState._realListings || [];
    var filtered = cat === 'tumu' ? src : src.filter(function (j) { return j.cat === cat; });
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
        _renderIlanDetay(ilan.id, ilan.baslik, ilan.sahip || 'İşletme', ilan.aciklama || '', ilan.sehir || '', ilan.arac || '');
      }).catch(function() { toast('İlan yüklenemedi'); Router.back(); });
      return;
    }

    toast('İlan bulunamadı');
    Router.back();
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
    var fromList = (_ilanState._realListings || []).find(function (j) { return j.id === ilanId; });
    var ilan = fromList
      ? Object.assign({}, fromList, titleOverride ? { title: titleOverride, company: companyOverride || fromList.company } : {})
      : { id: ilanId, title: titleOverride || 'İlan', company: companyOverride || 'İşletme', emoji: '🏢', avatarBg: '#6C4DFF', tier: 'standart' };

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

    _loadBasvurular();
  }

  function _basLabel(durum) {
    if (durum === 'accepted') return '<span style="background:rgba(34,197,94,.15);color:#22C55E;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:20px">Kabul Edildi</span>';
    if (durum === 'rejected') return '<span style="background:rgba(239,68,68,.12);color:#EF4444;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:20px">Reddedildi</span>';
    return '<span style="background:rgba(108,77,255,.12);color:#6C4DFF;font-size:.72rem;font-weight:700;padding:3px 8px;border-radius:20px">İnceleniyor</span>';
  }

  function _basCard(b) {
    return '<div class="kb-card" style="margin-bottom:10px">' +
      '<div class="flex items-center justify-between mb-8">' +
        '<div style="font-weight:700">' + (b.firma || b.company || 'İşletme') + '</div>' +
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
      var items = (window.SB && SB.isOn()) ? await SB.myApplications() : [];
      _basvuruCache = items;
      _basRender(items);
    } catch(e) {
      _basvuruCache = [];
      _basRender([]);
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
    var all = _basvuruCache;
    var filtered = all;
    if (type === 'aktif')  filtered = all.filter(function (b) { return (b.durum || b.status) === 'pending'; });
    if (type === 'sonuc')  filtered = all.filter(function (b) { var d = b.durum || b.status; return d === 'accepted' || d === 'rejected'; });
    _basRender(filtered);
  }

  /* ── 6. MESAJLAR ────────────────────────────────────────── */
  function mesajlar() {
    SharedScreens.sharedMesajlar('kurye');
  }

  /* ── 6b. MESAJ CHAT ─────────────────────────────────────── */
  function mesajChat(ctx) {
    SharedScreens.sharedMesajChat(ctx, 'kurye');
  }

  /* ── 7. PROFİL ──────────────────────────────────────────── */
  function profil() {
    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    showBottomNav();
    setActiveNav('profil');

    var name = (APP.profile && APP.profile.full_name) || 'Kadir Demir';

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
              '<div class="pr-hero__role">🛵 Moto Kurye</div>' +
              '<div class="pr-hero__loc">' +
                '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                ' İstanbul, Türkiye' +
              '</div>' +
              '<div class="pr-hero__status"><span class="pr-dot"></span>Çevrimiçi</div>' +
              '<div class="pr-hero__minibadges">' +
                '<span class="pr-minibadge">⏱ 2y 8a deneyim</span>' +
                '<span class="pr-minibadge pr-minibadge--star">⭐ 4.8 (128)</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="pr-hero__premium">' +
            '<div class="pr-premium-badge">' +
              '<div class="pr-premium-badge__icon">✨</div>' +
              '<div class="pr-premium-badge__label">Premium Üye</div>' +
              '<div class="pr-premium-badge__sub">Profilin öne çıkıyor</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* ── Trust score card ── */
        '<div class="pr-trust">' +
          '<div class="pr-trust__head">' +
            '<div class="pr-trust__title">Profil Güven Skoru</div>' +
            '<div class="pr-trust__score">4.8 <span>/ 5.0</span></div>' +
          '</div>' +
          '<div class="pr-trust__bar-wrap">' +
            '<div class="pr-trust__bar"><div class="pr-trust__fill" style="width:96%"></div></div>' +
          '</div>' +
          '<div class="pr-trust__metrics">' +
            _prMetric('128', 'Tamamlanan Başvuru', '#6C4DFF') +
            _prMetric('%92', 'Görüşme Oranı',      '#22C55E') +
            _prMetric('%78', 'Kabul Oranı',         '#4A90E2') +
            _prMetric('1s',  'Ort. Cevap Süresi',  '#F97316') +
          '</div>' +
        '</div>' +

        /* ── Verifications ── */
        '<div class="pr-section">' +
          '<div class="pr-section__title">Doğrulamalarım</div>' +
          '<div class="pr-verifs">' +
            _prVerif('Kimlik',    true)  +
            _prVerif('Ehliyet',   true)  +
            _prVerif('Araç',      true)  +
            _prVerif('Adres',     true)  +
            _prVerif('Telefon',   true)  +
          '</div>' +
        '</div>' +

        /* ── Experience ── */
        '<div class="pr-section">' +
          '<div class="pr-section__title">Deneyimim</div>' +
          '<div class="pr-exp-list">' +
            _prExp('🚀', 'Getir',        'Moto Kurye',  '1y 4a', '2023 – Devam ediyor', '#6C4DFF', true) +
            _prExp('🍔', 'Yemeksepeti',  'Moto Kurye',  '9 ay',  '2022 – 2023',         '#EF4444', false) +
            _prExp('🛒', 'Trendyol Go',  'Araçlı Kurye','7 ay',  '2021 – 2022',         '#F97316', false) +
          '</div>' +
        '</div>' +

        /* ── Work preferences ── */
        '<div class="pr-section">' +
          '<div class="pr-section__hd">' +
            '<div class="pr-section__title">Çalışabileceğim Alanlar</div>' +
            '<button class="pr-section__edit" onclick="KuryeScreens._prEditAreas()">Düzenle</button>' +
          '</div>' +
          '<div class="pr-tags">' +
            ['Levent','Maslak','Beşiktaş','Şişli','Beyoğlu','Kadıköy'].map(function (a) {
              return '<span class="pr-tag pr-tag--area">📍 ' + a + '</span>';
            }).join('') +
          '</div>' +
        '</div>' +

        /* ── Skills ── */
        '<div class="pr-section">' +
          '<div class="pr-section__title">Uzmanlık Alanlarım</div>' +
          '<div class="pr-tags">' +
            ['Hızlı teslimat','Trafik yönetimi','Müşteri iletişimi','Şehir içi navigasyon','Paket güvenliği'].map(function (s) {
              return '<span class="pr-tag">' + s + '</span>';
            }).join('') +
          '</div>' +
        '</div>' +

        /* ── Documents ── */
        '<div class="pr-section">' +
          '<div class="pr-section__title">Belgelerim</div>' +
          '<div class="pr-docs">' +
            _prDoc('📄', 'CV',                 'Yüklendi', true)  +
            _prDoc('🪪', 'Ehliyet',             'Yüklendi', true)  +
            _prDoc('📋', 'SRC Belgesi',         'Yüklendi', true)  +
            _prDoc('🧠', 'Psikoteknik',         'Bekliyor',  false) +
            _prDoc('⚖️', 'Adli Sicil Kaydı',   'Bekliyor',  false) +
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
    _showApplySuccess: _showApplySuccess
  };

})();
