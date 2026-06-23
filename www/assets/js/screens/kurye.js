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

        /* ── İş Arıyorum Toggle ── */
        '<div class="kb-card ilan-status-card" style="margin-bottom:12px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">' +
          '<div>' +
            '<div style="font-weight:700;margin-bottom:2px">İş Arıyorum</div>' +
            '<div id="is-ari-status" style="font-size:.78rem;color:var(--muted)">Profil durumu yükleniyor...</div>' +
          '</div>' +
          '<label class="ilan-toggle">' +
            '<input type="checkbox" id="is-ariyorum-toggle" onchange="KuryeScreens._toggleIsAriyorum(this.checked)">' +
            '<span class="ilan-toggle__knob"></span>' +
          '</label>' +
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
        '<div id="panel-suggested-jobs"><div style="padding:16px 0;text-align:center"><div class="kb-spinner" style="width:24px;height:24px"></div></div></div>' +

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
        SB.myConvs(),
        SB.myProfile()
      ]);
      var ilanlar   = results[0].status === 'fulfilled' ? results[0].value : [];
      var basvurular_list = results[1].status === 'fulfilled' ? results[1].value : [];
      var convs     = results[2].status === 'fulfilled' ? results[2].value : [];
      var profile   = results[3].status === 'fulfilled' ? results[3].value : null;

      var pending   = basvurular_list.filter(function(b){ return b.durum === 'pending'; }).length;
      var accepted  = basvurular_list.filter(function(b){ return b.durum === 'accepted'; }).length;
      var unread    = convs.reduce(function(s,c){ return s + (c.unread || 0); }, 0);

      var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
      set('ps-ilanlar', ilanlar.length);
      set('ps-basvuru', pending);
      set('ps-gorusme', accepted);
      set('ps-mesaj',   unread || convs.length);

      var yayinda = !!(profile && profile.yayinda);
      var toggle = document.getElementById('is-ariyorum-toggle');
      var statusEl = document.getElementById('is-ari-status');
      if (toggle) toggle.checked = yayinda;
      if (statusEl) statusEl.textContent = yayinda ? 'Profilin havuzda görünüyor ✓' : 'Profil havuzda görünmüyor';

      /* Gerçek ilanları suggested jobs alanına yükle */
      var jobsEl = document.getElementById('panel-suggested-jobs');
      if (jobsEl) {
        var top3 = ilanlar.slice(0, 3);
        if (!top3.length) {
          jobsEl.innerHTML = '<div style="padding:12px 0;text-align:center;font-size:.82rem;color:var(--muted)">Henüz açık ilan yok.</div>';
        } else {
          jobsEl.innerHTML = top3.map(function (j) {
            var meta   = _metaDecode(j.aciklama || '');
            var salary = (meta && meta.maas) || '';
            var colors = ['rgba(61,150,255,.13)', 'rgba(16,217,123,.12)', 'rgba(255,209,102,.12)'];
            var emojis = ['🏢', '🚀', '⚡'];
            var idx    = top3.indexOf(j);
            return _premJobCard(j.id, emojis[idx] || '🏢', j.title, j.company, salary, j.location || '', '', colors[idx] || 'rgba(61,150,255,.13)');
          }).join('');
        }
      }
    } catch(e) {}
  }

  async function _toggleIsAriyorum(checked) {
    var statusEl = document.getElementById('is-ari-status');
    if (statusEl) statusEl.textContent = 'Güncelleniyor...';
    try {
      await SB.setYayinda(checked);
      if (statusEl) statusEl.textContent = checked ? 'Profilin havuzda görünüyor ✓' : 'Profil havuzda görünmüyor';
      toast(checked ? 'İş arıyorum olarak işaretlendi' : 'İş aramıyor olarak işaretlendi');
    } catch(e) {
      if (statusEl) statusEl.textContent = 'Güncellenemedi';
      toast('Güncellenemedi');
    }
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

  function _metaDecode(aciklama) {
    if (!aciklama || aciklama.slice(0, 5) !== 'META:') return { meta: {}, desc: aciklama || '' };
    var sep = aciklama.indexOf('\n|||\n');
    if (sep < 0) return { meta: {}, desc: aciklama };
    try { return { meta: JSON.parse(aciklama.slice(5, sep)), desc: aciklama.slice(sep + 5) }; }
    catch(e) { return { meta: {}, desc: aciklama }; }
  }

  function _dbListingToIlan(l) {
    var aracMap = { moto: '🛵', aracli: '🚗', yaya: '🚶' };
    var aracEmoji = aracMap[l.arac] || (l.arac === 'Motosiklet' ? '🛵' : l.arac === 'Otomobil' ? '🚗' : '🏢');
    var parsed = _metaDecode(l.aciklama || '');
    var m = parsed.meta;
    var maas = m.maas || '';
    var tags = [l.arac || 'Kurye'];
    if (m.calisma === 'part-time') tags.push('Part-time');
    else if (m.calisma === 'gunluk') tags.push('Günlük');
    var tier = m.premium ? 'premium' : 'standart';
    if (m.acil) tags.unshift('🔥 Acil');
    return {
      id: l.id,
      emoji: aracEmoji,
      title: l.baslik || 'İlan',
      company: l.sahip || 'İşletme',
      salary: maas ? maas.replace('-', ' – ') + ' ₺/ay' : '—',
      location: [l.sehir, l.bolge].filter(Boolean).join(', ') || 'Belirtilmemiş',
      dist: '—',
      time: l.tarih || 'Yeni',
      match: 82,
      tier: tier,
      avatarBg: m.premium ? '#6C4DFF' : '#F97316',
      tags: tags,
      saved: false,
      _meta: m,
      _desc: parsed.desc,
      _raw: l
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
        var mapped = _dbListingToIlan(ilan);
        _renderIlanDetay(ilan.id, ilan.baslik, ilan.sahip || 'İşletme', mapped._desc || '', ilan.sehir || '', ilan.arac || '', mapped._meta || {});
      }).catch(function() { toast('İlan yüklenemedi'); Router.back(); });
      return;
    }

    toast('İlan bulunamadı');
    Router.back();
  }

  function _renderIlanDetay(id, title, company, aciklama, konum, tip, meta) {
    meta = meta || {};
    showAppBar(title, true);
    var calismaMap = { 'tam-zamanli': 'Tam Zamanlı', 'part-time': 'Part-time', 'gunluk': 'Günlük / Geçici' };
    var calismaLbl = calismaMap[meta.calisma] || '';
    var maas = meta.maas ? meta.maas.replace('-', ' – ') + ' ₺/ay' : '';
    renderScreen(
      '<div>' +
        '<div class="detail-hero">' +
          '<div class="detail-hero__title">' + title + '</div>' +
          '<div class="detail-hero__sub">' + company + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
            (meta.acil    ? '<span class="kb-chip kb-chip--warning">🔥 Acil Alım</span>' : '') +
            (meta.premium ? '<span class="kb-chip kb-chip--accent">⭐ Premium</span>' : '') +
            (tip    ? '<span class="kb-chip kb-chip--accent">' + tip + '</span>' : '') +
            (konum  ? '<span class="kb-chip">' + ICON.pin + konum + '</span>' : '') +
          '</div>' +
        '</div>' +

        (maas || calismaLbl ? (
          '<div class="detail-section">' +
            '<div class="detail-section__title">Ücret & Çalışma</div>' +
            (maas ? '<div class="detail-row" style="color:var(--c-accent);font-weight:700;font-size:1rem">💰 ' + maas + '</div>' : '') +
            (calismaLbl ? '<div class="detail-row">' + ICON.clock + calismaLbl + '</div>' : '') +
          '</div>'
        ) : '') +

        '<div class="detail-section">' +
          '<div class="detail-section__title">İlan Açıklaması</div>' +
          '<p style="font-size:.88rem;line-height:1.6;color:var(--text)">' +
            (aciklama || ('Firmamız için deneyimli ' + title.toLowerCase() + ' arıyoruz.')) +
          '</p>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Detaylar</div>' +
          (konum ? '<div class="detail-row">' + ICON.pin + '<span>Konum: ' + konum + '</span></div>' : '') +
          (tip   ? '<div class="detail-row">' + ICON.briefcase + '<span>Pozisyon: ' + tip + '</span></div>' : '') +
          (meta.belgeler ? '<div class="detail-row">' + ICON.doc + '<span>Belgeler: ' + meta.belgeler + '</span></div>' : '') +
          (meta.adres    ? '<div class="detail-row">' + ICON.pin + '<span>Görüşme: ' + meta.adres + '</span></div>' : '') +
          (meta.baslangic ? '<div class="detail-row">' + ICON.clock + '<span>Başlangıç: ' + meta.baslangic + '</span></div>' : '') +
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
      '</div>',
      _loadBasvurular
    );
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
  async function profil() {
    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    showBottomNav();
    setActiveNav('profil');

    /* Spinner göster, gerçek profil yükle */
    renderScreen('<div style="padding:60px 0;text-align:center"><div class="kb-spinner"></div></div>');

    var p = APP.profile || {};
    if (window.SB && SB.isOn()) {
      try { var fresh = await SB.myProfile(); if (fresh) { p = fresh; APP.profile = fresh; } } catch (e) {}
    }

    var name       = p.ad || 'Kullanıcı';
    var sehir      = p.sehir ? p.sehir + ', Türkiye' : 'Konum belirtilmedi';
    var puan       = p.puan ? String(p.puan) : null;
    var arac       = p.arac || null;
    var aracEmoji  = arac === 'Motosiklet' ? '🛵' : arac === 'Bisiklet' ? '🚲' : arac === 'Araç' ? '🚗' : arac === 'Yaya' ? '🚶' : '🛵';
    var aracLabel  = arac || 'Kurye';
    var isPremium  = p.seviye === 'premium';
    var bolgeler   = Array.isArray(p.bolgeler) ? p.bolgeler : [];
    var tamamlanan = p.tamamlanan || 0;
    var deneyim    = p.deneyim || 0;
    var puanPct    = p.puan ? Math.min(100, Math.round(p.puan / 5 * 100)) : 0;

    var avatarHtml = p.avatar_url
      ? '<img src="' + p.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : '<div class="pr-avatar__initials">' + _prInitials(name) + '</div>';

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
              avatarHtml +
              '<div class="pr-avatar__online"></div>' +
            '</div>' +
            '<div class="pr-hero__info">' +
              '<div class="pr-hero__name">' + name + '</div>' +
              '<div class="pr-hero__role">' + aracEmoji + ' ' + aracLabel + '</div>' +
              '<div class="pr-hero__loc">' +
                '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                ' ' + sehir +
              '</div>' +
              '<div class="pr-hero__status"><span class="pr-dot' + (p.yayinda ? '' : ' pr-dot--off') + '"></span>' + (p.yayinda ? 'Aktif — Havuzda görünüyorsun' : 'Pasif — Havuzda görünmüyorsun') + '</div>' +
              '<div class="pr-hero__minibadges">' +
                (deneyim ? '<span class="pr-minibadge">⏱ ' + deneyim + 'y deneyim</span>' : '') +
                (puan    ? '<span class="pr-minibadge pr-minibadge--star">⭐ ' + puan + (tamamlanan ? ' (' + tamamlanan + ')' : '') + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          (isPremium ?
            '<div class="pr-hero__premium"><div class="pr-premium-badge">' +
              '<div class="pr-premium-badge__icon">✨</div>' +
              '<div class="pr-premium-badge__label">Premium Üye</div>' +
              '<div class="pr-premium-badge__sub">Profilin öne çıkıyor</div>' +
            '</div></div>' : '') +
        '</div>' +

        /* ── Trust score card ── */
        '<div class="pr-trust">' +
          '<div class="pr-trust__head">' +
            '<div class="pr-trust__title">Profil Puanı</div>' +
            '<div class="pr-trust__score">' + (puan || '—') + ' <span>/ 5.0</span></div>' +
          '</div>' +
          '<div class="pr-trust__bar-wrap">' +
            '<div class="pr-trust__bar"><div class="pr-trust__fill" style="width:' + puanPct + '%"></div></div>' +
          '</div>' +
          '<div class="pr-trust__metrics">' +
            _prMetric(tamamlanan || '0', 'Tamamlanan Başvuru', '#6C4DFF') +
            _prMetric(p.degerlendirme || '0', 'Değerlendirme',   '#22C55E') +
            _prMetric(deneyim + 'y',           'Deneyim',         '#4A90E2') +
            _prMetric(p.dogrulama === 'full' ? 'Tam' : p.dogrulama === 'partial' ? 'Kısmi' : '—', 'Doğrulama', '#F97316') +
          '</div>' +
        '</div>' +

        /* ── Work areas ── */
        '<div class="pr-section">' +
          '<div class="pr-section__hd">' +
            '<div class="pr-section__title">Çalışabileceğim Alanlar</div>' +
            '<button class="pr-section__edit" onclick="KuryeScreens._prEditAreas()">Düzenle</button>' +
          '</div>' +
          '<div class="pr-tags">' +
            (bolgeler.length
              ? bolgeler.map(function (a) { return '<span class="pr-tag pr-tag--area">📍 ' + a + '</span>'; }).join('')
              : '<span style="font-size:.82rem;color:var(--muted)">Henüz çalışma alanı eklenmedi.</span>') +
          '</div>' +
        '</div>' +

        /* ── Settings menu ── */
        '<div class="pr-section pr-section--menu">' +
          _prMenuItem('Profil Düzenle',      'user',     '/profil-duzenle') +
          _prMenuItem('Başvurularım',        'briefcase','/kurye/basvurular') +
          _prMenuItem('Tekliflerim',         'doc',      '/teklifler') +
          _prMenuItem('Favori Havuzum',      'heart',    '/favoriler') +
          _prMenuItem('Bildirimler',         'bell',     '/bildirimler') +
          _prMenuItem('Ayarlar',             'settings', '/ayarlar') +
          _prMenuItem('Yardım & Destek',     'help',     '/yardim') +
          '<div class="pr-menu-item pr-menu-item--danger" onclick="signOut()">' +
            '<div class="pr-menu-item__icon">' + ICON.logout + '</div>' +
            '<div class="pr-menu-item__label">Çıkış Yap</div>' +
          '</div>' +
        '</div>' +

        /* ── Premium upgrade banner (only if not premium) ── */
        (!isPremium ?
          '<div class="pr-upgrade">' +
            '<div class="pr-upgrade__glow"></div>' +
            '<div class="pr-upgrade__body">' +
              '<div class="pr-upgrade__title">Profilini Öne Çıkar ✨</div>' +
              '<div class="pr-upgrade__perks">' +
                '<div class="pr-upgrade__perk">🔝 Üst sıralarda görün</div>' +
                '<div class="pr-upgrade__perk">🏅 Özel rozet kazan</div>' +
                '<div class="pr-upgrade__perk">📩 Daha fazla işveren sana ulaşsın</div>' +
              '</div>' +
              '<button class="pr-upgrade__cta" onclick="KuryeScreens._prPremium()">Detayları Gör</button>' +
            '</div>' +
          '</div>' : '') +

        '<div id="pr-reviews-section" style="padding:0 16px"></div>' +

        '<div style="height:100px"></div>' +

      '</div>',
      function () { _loadProfileReviews(p.id); }
    );
  }

  async function _loadProfileReviews(profileId) {
    var el = document.getElementById('pr-reviews-section');
    if (!el || !profileId || !window.SB || !SB.isOn()) return;
    try {
      var reviews = await SB.reviewsFor(profileId);
      if (!reviews.length) return;
      el.innerHTML =
        '<div class="pr-section" style="margin-top:0">' +
          '<div class="pr-section__hd">' +
            '<div class="pr-section__title">Değerlendirmeler (' + reviews.length + ')</div>' +
          '</div>' +
          reviews.map(function(r) {
            var stars = '';
            for (var i = 1; i <= 5; i++) {
              stars += '<svg viewBox="0 0 24 24" width="13" height="13" fill="' + (i <= r.puan ? '#F59E0B' : 'none') + '" stroke="#F59E0B" stroke-width="1.5" style="margin-right:1px"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';
            }
            return '<div style="border-bottom:1px solid rgba(255,255,255,.07);padding:12px 0;last-child{border:0}">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
                '<span style="font-size:.82rem;font-weight:700;color:var(--text)">' + (r.ad || 'Kullanıcı') + '</span>' +
                '<span style="display:flex;align-items:center">' + stars + '</span>' +
              '</div>' +
              (r.yorum ? '<p style="font-size:.78rem;color:var(--muted);margin:0;line-height:1.5">' + r.yorum + '</p>' : '') +
              '<span style="font-size:.7rem;color:var(--muted);opacity:.6">' + (r.tarih || '') + '</span>' +
            '</div>';
          }).join('') +
        '</div>';
    } catch (e) {}
  }

  /* ── Çalışma Alanları Düzenle ───────────────────────────── */
  var _editAreas = [];

  function _prEditAreas() {
    var p = APP.profile || {};
    _editAreas = Array.isArray(p.bolgeler) ? p.bolgeler.slice() : [];
    showAppBar('Çalışma Alanlarım', true);
    hideBottomNav();
    _renderAreaEdit();
  }

  function _renderAreaEdit() {
    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-card" style="margin-bottom:16px">' +
          '<div style="display:flex;gap:8px;margin-bottom:12px">' +
            '<input class="kb-input" id="area-input" type="text" placeholder="Örn: Kadıköy" style="flex:1" onkeydown="if(event.key===\'Enter\')KuryeScreens._prAreaAdd()">' +
            '<button class="btn btn--primary" style="padding:0 18px;height:44px" onclick="KuryeScreens._prAreaAdd()">Ekle</button>' +
          '</div>' +
          '<div id="area-chips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:36px">' + _areaChips() + '</div>' +
        '</div>' +
        '<button class="btn btn--primary" id="area-save-btn" onclick="KuryeScreens._prAreaSave()">Kaydet</button>' +
        '<p style="font-size:.78rem;color:var(--muted);text-align:center;margin-top:10px">İstanbul içi semtler, ilçeler veya şehirler girebilirsin.</p>' +
      '</div>'
    );
  }

  function _areaChips() {
    if (!_editAreas.length) return '<p style="color:var(--muted);font-size:.82rem;padding:4px 0">Henüz alan eklenmedi</p>';
    return _editAreas.map(function (a, i) {
      return '<span class="pr-tag pr-tag--area" style="display:inline-flex;align-items:center;gap:5px">' +
        '📍 ' + a +
        '<button onclick="KuryeScreens._prAreaRemove(' + i + ')" style="background:none;border:none;cursor:pointer;padding:0;margin-left:2px;opacity:.7;font-size:1em;line-height:1">×</button>' +
      '</span>';
    }).join('');
  }

  function _prAreaAdd() {
    var inp = document.getElementById('area-input');
    if (!inp) return;
    var val = inp.value.trim();
    if (!val || _editAreas.indexOf(val) !== -1) return;
    _editAreas.push(val);
    inp.value = '';
    var chips = document.getElementById('area-chips');
    if (chips) chips.innerHTML = _areaChips();
  }

  function _prAreaRemove(i) {
    _editAreas.splice(i, 1);
    var chips = document.getElementById('area-chips');
    if (chips) chips.innerHTML = _areaChips();
  }

  async function _prAreaSave() {
    var btn = document.getElementById('area-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
    try {
      if (!window.SB || !SB.isOn()) throw new Error('Çevrimdışı');
      await SB.updateMyProfile({ bolgeler: _editAreas });
      if (APP.profile) APP.profile.bolgeler = _editAreas.slice();
      toast('Çalışma alanları güncellendi!');
      setTimeout(function () { Router.go('/kurye/profil'); }, 600);
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Kaydet'; }
      toast((e && e.message) || 'Güncelleme başarısız.');
    }
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

  function _prViewCV() {
    var p = APP.profile || {};
    if (p.cv_url) {
      window.open(p.cv_url, '_blank');
    } else {
      toast('CV henüz yüklenmedi. Profil Düzenle\'den yükleyebilirsin.');
    }
  }

  function _prShareDoc(label) {
    toast(label + ' belgesi profil düzenleme sayfasından yönetilebilir.');
  }

  function _prPremium() {
    showAppBar('Premium Üyelik', true);
    hideBottomNav();
    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="pr-upgrade" style="margin:0 0 20px">' +
          '<div class="pr-upgrade__glow"></div>' +
          '<div class="pr-upgrade__body">' +
            '<div class="pr-upgrade__title">KuryemiBul Premium ✨</div>' +
            '<div class="pr-upgrade__perks">' +
              '<div class="pr-upgrade__perk">🔝 Kurye listesinde üst sıralarda görün</div>' +
              '<div class="pr-upgrade__perk">🏅 Özel Premium rozeti kazan</div>' +
              '<div class="pr-upgrade__perk">📩 Daha fazla işveren sana ulaşsın</div>' +
              '<div class="pr-upgrade__perk">⚡ Acil ilanlardan önce haberdar ol</div>' +
              '<div class="pr-upgrade__perk">📊 Detaylı profil istatistikleri</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="kb-card" style="text-align:center;padding:24px">' +
          '<div style="font-size:1.1rem;font-weight:700;margin-bottom:6px">Yakında</div>' +
          '<div style="font-size:.84rem;color:var(--muted)">Premium abonelik sistemi çok yakında aktif olacak.<br>Bildirim almak için bildirimlerinizi açık tutun.</div>' +
        '</div>' +
      '</div>'
    );
  }

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
    _prAreaAdd       : _prAreaAdd,
    _prAreaRemove    : _prAreaRemove,
    _prAreaSave      : _prAreaSave,
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
    _basvur           : _basvur,
    _doApply          : _doApply,
    _showApplySuccess : _showApplySuccess,
    _toggleIsAriyorum : _toggleIsAriyorum
  };

})();
