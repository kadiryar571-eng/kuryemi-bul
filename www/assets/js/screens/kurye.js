/* ============================================================
   KuryemiBul — screens/kurye.js
   7 Kurye ekranı: Panel, Harita, İlanlar, İlan Detayı,
                   Başvurularım, Mesajlar, Profil
   ============================================================ */
window.KuryeScreens = (function () {
  'use strict';

  /* ── Mock data (Supabase dolmadan gösterilir) ───────────── */
  var MOCK_ILANLAR = [
    { id: '1', title: 'Motorlu Kurye', company: 'ABC Lojistik', salary: '28.000 - 33.000 ₺/ay', type: 'Tam Zamanlı', location: 'Kadıköy, İstanbul', cat: 'motorlu' },
    { id: '2', title: 'Yaya Kurye',    company: 'XYZ Kargo',    salary: '15.000 - 22.000 ₺/ay', type: 'Part Time',   location: 'Beşiktaş, İstanbul', cat: 'yaya' },
    { id: '3', title: 'Araçlı Kurye',  company: 'Hub Dağıtım',  salary: '25.000 - 32.000 ₺/ay', type: 'Tam Zamanlı', location: 'Ümraniye, İstanbul', cat: 'aracli' },
    { id: '4', title: 'Motorlu Kurye', company: 'Hızlı Kargo',  salary: '30.000 - 36.000 ₺/ay', type: 'Tam Zamanlı', location: 'Bağcılar, İstanbul', cat: 'motorlu' },
    { id: '5', title: 'Yaya Kurye',    company: 'Lezzet Dükkânı', salary: '13.000 - 18.000 ₺/ay', type: 'Part Time', location: 'Kadıköy, İstanbul', cat: 'yaya' }
  ];

  var MOCK_BASVURULAR = [
    { id: '1', company: 'ABC Lojistik', role: 'Motorlu Kurye', date: '16.05.2024', status: 'review'   },
    { id: '2', company: 'XYZ Kargo',    role: 'Araçlı Kurye',  date: '14.05.2024', status: 'approved' },
    { id: '3', company: 'Aday Kurye',   role: 'Yaya Kurye',    date: '13.05.2024', status: 'rejected' }
  ];

  var MOCK_MESAJLAR = [
    { id: '1', name: 'ABC Lojistik',   preview: 'Merhaba, başvurunuzu inceliyoruz...',  time: '14:32', unread: 2 },
    { id: '2', name: 'XYZ Kargo',      preview: 'Görüşme tarihimizi belirleyelim.',       time: '12:10', unread: 0 },
    { id: '3', name: 'Hub Dağıtım',    preview: 'Belgelerinizi gönderebildiniz mi?',      time: 'Dün',   unread: 1 }
  ];

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
          _statCard('23', 'Yakındaki İlanlar',    'pin',       'blue',   '/kurye/harita',     'Tümünü Gör') +
          _statCard('5',  'Aktif Başvurularım',   'briefcase', 'orange', '/kurye/basvurular', 'Detaylar')   +
          _statCard('2',  'Görüşmeye Çağrıldım', 'users',     'green',  '/kurye/basvurular', 'Randevular')  +
          _statCard('8',  'Mesajlarım',           'msg',       'purple', '/kurye/mesajlar',   'Sohbetler')   +
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
  var MOCK_MAP_ILANLAR = [
    { id: '1', emoji: '🛵', title: 'Motorlu Kurye', company: 'ABC Lojistik', salary: '32.000 ₺/ay', dist: '0.4 km', time: '2 saat önce', tags: ['Tam Zamanlı', 'Sigortalı'], match: 92, avatarBg: '#6C4DFF' },
    { id: '2', emoji: '🏢', title: 'Araçlı Kurye',  company: 'Hub Dağıtım',  salary: '28.500 ₺/ay', dist: '1.1 km', time: '5 saat önce', tags: ['Tam Zamanlı', 'Araç Sağlanır'], match: 85, avatarBg: '#22C55E' },
    { id: '3', emoji: '⚡', title: 'Premium Kurye', company: 'Hızlı Kargo',  salary: '38.000 ₺/ay', dist: '1.8 km', time: 'Bugün',       tags: ['Premium', 'Acil'],           match: 78, avatarBg: '#F59E0B' },
    { id: '4', emoji: '🚶', title: 'Yaya Kurye',    company: 'Lezzet Dükkânı', salary: '17.000 ₺/ay', dist: '2.3 km', time: 'Dün',      tags: ['Part Time'],                 match: 71, avatarBg: '#F97316' }
  ];

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
    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    showBottomNav();
    setActiveNav('harita');

    renderScreen(
      '<div class="map-screen">' +

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
          '<button class="map-chip"                  data-filter="isletme" onclick="KuryeScreens._mapCat(this,\'isletme\')">🏪 İşletmeler</button>' +
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

          /* Cluster bubbles */
          '<div class="map-cluster" style="left:22%;top:28%" onclick="KuryeScreens._mapCluster(12)"><span>12</span></div>' +
          '<div class="map-cluster map-cluster--lg" style="left:62%;top:18%" onclick="KuryeScreens._mapCluster(25)"><span>25+</span></div>' +
          '<div class="map-cluster map-cluster--sm" style="left:78%;top:62%" onclick="KuryeScreens._mapCluster(8)"><span>8</span></div>' +

          /* Colored pins */
          '<div class="map-pin map-pin--blue"   style="left:38%;top:42%" title="İş İlanı"><span>💼</span></div>' +
          '<div class="map-pin map-pin--purple" style="left:55%;top:33%" title="Firma"><span>🏢</span></div>' +
          '<div class="map-pin map-pin--green"  style="left:48%;top:58%" title="İşletme"><span>🏪</span></div>' +
          '<div class="map-pin map-pin--orange" style="left:68%;top:44%" title="İlan"><span>💼</span></div>' +
          '<div class="map-pin map-pin--gold"   style="left:30%;top:64%" title="Premium"><span>⭐</span></div>' +

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
          '<span class="map-cards-count">4 ilan</span>' +
        '</div>' +
        '<div class="map-cards-scroll" id="map-cards">' +
          MOCK_MAP_ILANLAR.map(_mapJobCard).join('') +
        '</div>' +

        /* ── AI Match FAB ── */
        '<button class="map-ai-fab" onclick="KuryeScreens._mapAI()">' +
          '<span class="map-ai-fab__icon">✨</span>' +
          '<span class="map-ai-fab__label">AI Match</span>' +
        '</button>' +

      '</div>' /* /map-screen */
    );
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
  var MOCK_ILANLAR_PREMIUM = [
    {
      id: '1', emoji: '🛵', title: 'Moto Kurye', company: 'ABC Lojistik',
      salary: '28.000 – 35.000 ₺', location: 'Kadıköy, İstanbul', dist: '0.4 km', time: '15 dk önce',
      tier: 'premium', cat: 'motorlu', match: 92,
      tags: ['Tam Zamanlı', 'Acil Alım', 'Sigortalı'], avatarBg: '#6C4DFF', saved: false
    },
    {
      id: '2', emoji: '🚗', title: 'Araçlı Kurye', company: 'Hub Dağıtım',
      salary: '25.000 – 32.000 ₺', location: 'Beşiktaş, İstanbul', dist: '1.2 km', time: '1 saat önce',
      tier: 'profesyonel', cat: 'aracli', match: 85,
      tags: ['Tam Zamanlı', 'Araç Sağlanır', 'Hafta Sonu Uygun'], avatarBg: '#22C55E', saved: true
    },
    {
      id: '3', emoji: '⚡', title: 'Premium Moto Kurye', company: 'Hızlı Kargo',
      salary: '35.000 – 42.000 ₺', location: 'Levent, İstanbul', dist: '1.8 km', time: '3 saat önce',
      tier: 'premium', cat: 'motorlu', match: 78,
      tags: ['Premium', 'Tam Zamanlı', 'Yüksek Maaş'], avatarBg: '#F59E0B', saved: false
    },
    {
      id: '4', emoji: '🚶', title: 'Yaya Kurye', company: 'Lezzet Dükkânı',
      salary: '13.000 – 18.000 ₺', location: 'Kadıköy, İstanbul', dist: '2.3 km', time: 'Dün',
      tier: 'standart', cat: 'yaya', match: 71,
      tags: ['Part Time', 'Öğrenciye Uygun'], avatarBg: '#F97316', saved: false
    },
    {
      id: '5', emoji: '🛵', title: 'Motorlu Kurye', company: 'Bağcılar Kurye',
      salary: '30.000 – 36.000 ₺', location: 'Bağcılar, İstanbul', dist: '4.1 km', time: '2 gün önce',
      tier: 'profesyonel', cat: 'motorlu', match: 68,
      tags: ['Tam Zamanlı', 'Sigortalı'], avatarBg: '#4A90E2', saved: false
    },
    {
      id: '6', emoji: '🚶', title: 'Yaya Dağıtım Görevlisi', company: 'Restoran Zinciri AŞ',
      salary: '14.500 – 19.000 ₺', location: 'Üsküdar, İstanbul', dist: '3.5 km', time: '3 gün önce',
      tier: 'standart', cat: 'yaya', match: 60,
      tags: ['Part Time', 'Akşam Vardiyası', 'Öğrenciye Uygun'], avatarBg: '#A855F7', saved: false
    }
  ];

  var _ilanState = { cat: 'tumu', sort: 'match', savedIds: { '2': true } };

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
    var data = cat === 'tumu'      ? MOCK_ILANLAR_PREMIUM.slice()
             : cat === 'tamzaman'  ? MOCK_ILANLAR_PREMIUM.filter(function (j) { return j.tags.some(function (t) { return t === 'Tam Zamanlı'; }); })
             : cat === 'parttime'  ? MOCK_ILANLAR_PREMIUM.filter(function (j) { return j.tags.some(function (t) { return t === 'Part Time'; }); })
             : cat === 'acil'      ? MOCK_ILANLAR_PREMIUM.filter(function (j) { return j.tags.some(function (t) { return t === 'Acil Alım'; }); })
             : cat === 'premium'   ? MOCK_ILANLAR_PREMIUM.filter(function (j) { return j.tier === 'premium'; })
             : MOCK_ILANLAR_PREMIUM.slice();

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
    var data = !lower ? MOCK_ILANLAR_PREMIUM : MOCK_ILANLAR_PREMIUM.filter(function (j) {
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
      var saved = MOCK_ILANLAR_PREMIUM.filter(function (j) { return !!_ilanState.savedIds[j.id]; });
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
    var filtered = cat === 'tumu' ? MOCK_ILANLAR : MOCK_ILANLAR.filter(function (j) { return j.cat === cat; });
    var list = document.getElementById('ilan-list');
    if (list) list.innerHTML = filtered.length ? filtered.map(_jobCard).join('') :
      '<div class="kb-empty"><div class="kb-empty__icon">🔍</div><div class="kb-empty__title">İlan bulunamadı</div></div>';
  }

  /* ── 4. İLAN DETAY ─────────────────────────────────────── */
  function ilanDetay(ctx) {
    var id = ctx.params.id;
    var j  = MOCK_ILANLAR.find(function (x) { return x.id === id; }) || MOCK_ILANLAR[0];

    showAppBar(j.title, true);
    showBottomNav();

    renderScreen(
      '<div>' +
        '<div class="detail-hero">' +
          '<div class="detail-hero__title">' + j.title + '</div>' +
          '<div class="detail-hero__sub">' + j.company + '</div>' +
          '<div class="detail-hero__salary">' + j.salary + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
            '<span class="kb-chip kb-chip--accent">' + j.type + '</span>' +
            '<span class="kb-chip">' + ICON.pin + j.location + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">İlan Açıklaması</div>' +
          '<p style="font-size:.88rem;line-height:1.6;color:var(--text)">Firmamız için deneyimli ' + j.title.toLowerCase() + ' arıyoruz. Paket teslimi ve evrak dağıtımı yapabilecek, aktif ve dürüst adaylarımıza bekliyoruz.</p>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Detaylar</div>' +
          '<div class="detail-row">' + ICON.clock    + '<span>Çalışma Saatleri: 09:00 – 18:00</span></div>' +
          '<div class="detail-row">' + ICON.briefcase + '<span>Çalışma Tipi: ' + j.type + '</span></div>' +
          '<div class="detail-row">' + ICON.pin       + '<span>Konum: ' + j.location + '</span></div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Aranan Özellikler</div>' +
          '<div class="detail-row">• Motorlu araç ehliyeti (A sınıfı)</div>' +
          '<div class="detail-row">• Aktif ve güvenilir olması</div>' +
          '<div class="detail-row">• Deneyimli tercih sebebidir</div>' +
        '</div>' +

        '<div class="detail-cta">' +
          '<button class="btn btn--primary" onclick="KuryeScreens._basvur(\'' + id + '\')">' +
            'Başvur' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _basvur(id) {
    toast('Başvurunuz gönderildi!');
    setTimeout(function () { Router.go('/kurye/basvurular'); }, 800);
  }

  /* ── 5. BAŞVURULARIM ────────────────────────────────────── */
  function basvurular() {
    showAppBar('Başvurularım', false);
    showBottomNav();
    setActiveNav('basvurular');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="bas-tabs">' +
          '<button class="kb-tab active" onclick="KuryeScreens._basFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="KuryeScreens._basFilter(\'aktif\',this)">Aktif</button>' +
          '<button class="kb-tab"        onclick="KuryeScreens._basFilter(\'sonuc\',this)">Sonuçlandı</button>' +
        '</div>' +
        '<div id="bas-list">' +
          MOCK_BASVURULAR.map(function (b) {
            return '<div class="kb-card" style="margin-bottom:10px">' +
              '<div class="flex items-center justify-between mb-8">' +
                '<div style="font-weight:700">' + b.company + '</div>' +
                _statusLabel(b.status) +
              '</div>' +
              '<div style="font-size:.85rem;color:var(--muted)">' + b.role + '</div>' +
              '<div style="font-size:.75rem;color:var(--muted);margin-top:4px">Başvuru: ' + b.date + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var filtered = MOCK_BASVURULAR;
    if (type === 'aktif')  filtered = MOCK_BASVURULAR.filter(function (b) { return b.status === 'review'; });
    if (type === 'sonuc')  filtered = MOCK_BASVURULAR.filter(function (b) { return b.status !== 'review'; });
    var el = document.getElementById('bas-list');
    if (el) el.innerHTML = filtered.map(function (b) {
      return '<div class="kb-card" style="margin-bottom:10px">' +
        '<div class="flex items-center justify-between mb-8">' +
          '<div style="font-weight:700">' + b.company + '</div>' +
          _statusLabel(b.status) +
        '</div>' +
        '<div style="font-size:.85rem;color:var(--muted)">' + b.role + '</div>' +
        '<div style="font-size:.75rem;color:var(--muted);margin-top:4px">Başvuru: ' + b.date + '</div>' +
      '</div>';
    }).join('');
  }

  /* ── MESAJLAR MOCK DATA ─────────────────────────────────── */
  var MOCK_KONUSMALAR = [
    {
      id: '1', emoji: '🚀', name: 'Getir', avatarBg: '#6C4DFF',
      badge: 'premium', jobType: 'Moto Kurye',
      lastMsg: 'Mülakat için yarın saat 14:00 uygun musunuz?',
      time: '14:32', unread: 2, starred: false, online: true,
      indicator: 'orange', tag: '📅 Mülakat Daveti',
      meta: 'Levent, İstanbul • 1.2 km'
    },
    {
      id: '2', emoji: '🛒', name: 'Trendyol Go', avatarBg: '#F97316',
      badge: 'premium', jobType: 'Araçlı Kurye',
      lastMsg: 'Teklifinizi inceledik, görüşelim mi?',
      time: '12:10', unread: 0, starred: true, online: true,
      indicator: 'green', tag: '✅ Teklif Alındı',
      meta: 'Şişli, İstanbul • 2.8 km'
    },
    {
      id: '3', emoji: '🍔', name: 'Yemeksepeti', avatarBg: '#EF4444',
      badge: 'standart', jobType: 'Moto Kurye',
      lastMsg: 'Belgelerinizi gönderebildiniz mi?',
      time: 'Dün', unread: 1, starred: false, online: false,
      indicator: 'blue', tag: '📋 Evrak Bekliyor',
      meta: 'Üsküdar, İstanbul • 3.5 km'
    },
    {
      id: '4', emoji: '🟣', name: 'Banabi', avatarBg: '#A855F7',
      badge: 'premium', jobType: 'Yaya Kurye',
      lastMsg: 'Harika profil! Premium pozisyon var, ilgilenir misiniz?',
      time: 'Dün', unread: 0, starred: true, online: false,
      indicator: 'purple', tag: '⭐ Premium Teklif',
      meta: 'Kadıköy, İstanbul • 0.8 km'
    },
    {
      id: '5', emoji: '📦', name: 'MNG Kargo', avatarBg: '#22C55E',
      badge: 'standart', jobType: 'Araçlı Kurye',
      lastMsg: 'Teşekkür ederiz, başvurunuzu değerlendiriyoruz.',
      time: '2g önce', unread: 0, starred: false, online: false,
      indicator: 'blue', tag: '🔍 Değerlendiriliyor',
      meta: 'Bağcılar, İstanbul • 6.1 km'
    }
  ];

  var MOCK_CHAT = {
    '1': [
      { dir: 'in',  text: 'Merhaba Kadir 👋\nMülakat için yarın saat 14:00 uygun musunuz?', time: '14:28', read: true },
      { dir: 'in',  text: 'Adresimiz: Levent Tower A Blok, Kat 8. Metro çıkışından 2 dk yürüyüş mesafesinde.', time: '14:29', read: true },
      { dir: 'out', text: 'Merhaba, evet uygunum. Adres bilgisi için teşekkürler!', time: '14:31', read: true },
      { dir: 'out', text: 'Yanımda hangi belgeler olmalı?', time: '14:31', read: true },
      { dir: 'in',  text: 'Kimlik fotokopisi ve sürücü belgeniz yeterli olacaktır. 🟣', time: '14:32', read: false }
    ],
    '2': [
      { dir: 'in',  text: 'Merhaba! Araçlı kurye pozisyonuna başvurunuzu inceledik.', time: '12:05', read: true },
      { dir: 'in',  text: 'Teklifinizi inceledik, görüşelim mi? Maaş aralığı müzakereye açık.', time: '12:10', read: true }
    ],
    '3': [
      { dir: 'in',  text: 'Başvurunuz için teşekkürler.', time: 'Dün 09:15', read: true },
      { dir: 'out', text: 'Belgeleri sisteme yükledim.', time: 'Dün 10:30', read: true },
      { dir: 'in',  text: 'Belgelerinizi gönderebildiniz mi? Hâlâ beklemekteyiz.', time: 'Dün 16:00', read: false }
    ]
  };

  var _msgState = { tab: 'tumu', activeId: null };

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
    var data = tab === 'tumu'      ? MOCK_KONUSMALAR
             : tab === 'gorusme'   ? MOCK_KONUSMALAR.filter(function (k) { return k.indicator === 'orange'; })
             : tab === 'aktif'     ? MOCK_KONUSMALAR.filter(function (k) { return k.online; })
             : tab === 'teklif'    ? MOCK_KONUSMALAR.filter(function (k) { return k.indicator === 'green' || k.indicator === 'purple'; })
             : MOCK_KONUSMALAR;
    return data.length
      ? data.map(function (k) { return _konusmaCard(k, k.id === _msgState.activeId); }).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">💬</div><div class="kb-empty__title">Konuşma yok</div></div>';
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

    var totalUnread = MOCK_KONUSMALAR.reduce(function (s, k) { return s + k.unread; }, 0);

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
            '📅 İş Görüşmeleri<span class="msg-tab__badge">1</span>' +
          '</button>' +
          '<button class="msg-tab" data-tab="aktif"    onclick="KuryeScreens._msgTab(this,\'aktif\')">' +
            '🟢 Aktif Sohbetler<span class="msg-tab__badge">2</span>' +
          '</button>' +
          '<button class="msg-tab" data-tab="teklif"   onclick="KuryeScreens._msgTab(this,\'teklif\')">' +
            '⭐ Teklifler<span class="msg-tab__badge">2</span>' +
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
  }

  function _msgTab(btn, tab) {
    document.querySelectorAll('#msg-tabs .msg-tab').forEach(function (el) { el.classList.remove('msg-tab--active'); });
    btn.classList.add('msg-tab--active');
    _msgState.tab = tab;
    var list = document.getElementById('msg-list');
    if (list) list.innerHTML = _msgConvList(tab);
  }

  function _msgStar(id) {
    var k = MOCK_KONUSMALAR.find(function (x) { return x.id === id; });
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
  function mesajChat(ctx) {
    var id = ctx.params.id;
    var k  = MOCK_KONUSMALAR.find(function (x) { return x.id === id; }) || MOCK_KONUSMALAR[0];
    var msgs = MOCK_CHAT[id] || MOCK_CHAT['1'];

    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    hideBottomNav();

    var color = _msgIndicatorColor(k.indicator);

    renderScreen(
      '<div class="chat-screen">' +

        /* ── Chat header ── */
        '<div class="chat-hdr">' +
          '<button class="chat-hdr__back" onclick="Router.back ? Router.back() : Router.go(\'/kurye/mesajlar\')">' + ICON.back + '</button>' +
          '<div class="chat-hdr__ava" style="background:' + k.avatarBg + '">' +
            k.emoji +
            (k.online ? '<div class="chat-hdr__online"></div>' : '') +
          '</div>' +
          '<div class="chat-hdr__info">' +
            '<div class="chat-hdr__name">' + k.name + '</div>' +
            '<div class="chat-hdr__status">' +
              (k.online
                ? '<span class="chat-hdr__dot"></span>Çevrimiçi'
                : 'Son görülme: ' + k.time) +
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

        /* ── Job context banner ── */
        '<div class="chat-context" style="border-color:' + color + '33">' +
          '<div class="chat-context__dot" style="background:' + color + '"></div>' +
          '<div class="chat-context__text">' +
            '<span class="chat-context__role">' + k.jobType + '</span>' +
            '<span class="chat-context__loc">' + k.meta + '</span>' +
          '</div>' +
          '<span class="chat-context__tag" style="color:' + color + '">' + k.tag + '</span>' +
        '</div>' +

        /* ── Messages ── */
        '<div class="chat-msgs" id="chat-msgs">' +
          '<div class="chat-date-sep"><span>Bugün</span></div>' +
          msgs.map(function (m) {
            return '<div class="chat-bubble chat-bubble--' + m.dir + '">' +
              '<div class="chat-bubble__text">' + m.text.replace(/\n/g, '<br>') + '</div>' +
              '<div class="chat-bubble__meta">' +
                m.time +
                (m.dir === 'out'
                  ? ' <span class="chat-tick' + (m.read ? ' chat-tick--read' : '') + '">✓✓</span>'
                  : '') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +

        /* ── Quick actions ── */
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

        /* ── Input area ── */
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

        /* ── Smart action bar ── */
        '<div class="chat-smart">' +
          '<button class="chat-smart__btn" onclick="KuryeScreens._chatQuick(\'cv\')">' +
            '<div class="chat-smart__icon">📄</div>' +
            '<div class="chat-smart__label">CV Gönder</div>' +
          '</button>' +
          '<button class="chat-smart__btn chat-smart__btn--primary" onclick="KuryeScreens._chatQuick(\'konum\')">' +
            '<div class="chat-smart__icon">📍</div>' +
            '<div class="chat-smart__label">Konum Paylaş</div>' +
          '</button>' +
          '<button class="chat-smart__btn" onclick="KuryeScreens._chatQuick(\'evrak\')">' +
            '<div class="chat-smart__icon">📁</div>' +
            '<div class="chat-smart__label">Evrak Yükle</div>' +
          '</button>' +
          '<button class="chat-smart__btn" onclick="KuryeScreens._chatQuick(\'plan\')">' +
            '<div class="chat-smart__icon">📅</div>' +
            '<div class="chat-smart__label">Görüşme Planla</div>' +
          '</button>' +
          '<button class="chat-smart__btn chat-smart__btn--offer" onclick="KuryeScreens._chatQuick(\'teklif\')">' +
            '<div class="chat-smart__icon">⭐</div>' +
            '<div class="chat-smart__label">Teklifleri Gör</div>' +
          '</button>' +
        '</div>' +

      '</div>'
    );

    /* scroll to bottom */
    setTimeout(function () {
      var msgs = document.getElementById('chat-msgs');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 60);
  }

  function _chatSend() {
    var input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = '';
    var msgs = document.getElementById('chat-msgs');
    if (!msgs) return;
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--out chat-bubble--new';
    bubble.innerHTML = '<div class="chat-bubble__text">' + text + '</div>' +
      '<div class="chat-bubble__meta">Şimdi <span class="chat-tick">✓✓</span></div>';
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
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
    showAppBar('Profilim', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/ayarlar\')">' + ICON.settings + '</button>'
    );
    showBottomNav();
    setActiveNav('profil');

    var name  = (APP.profile && APP.profile.full_name) || 'Kullanıcı';
    var score = (APP.profile && APP.profile.score) || '4.8';
    var verif = (APP.profile && APP.profile.yayinda) ? 'Doğrulandı' : 'Doğrulanmadı';

    renderScreen(
      '<div>' +
        '<div class="profile-hero">' +
          '<div class="kb-avatar kb-avatar--xl">' + initials(name) + '</div>' +
          '<div class="profile-hero__name">' + name + '</div>' +
          '<div class="profile-hero__sub">Kurye</div>' +
          '<div class="profile-hero__badges">' +
            '<span class="kb-chip kb-chip--accent">' + ICON.star + score + '</span>' +
            '<span class="kb-chip kb-chip--success">' + ICON.shield + verif + '</span>' +
          '</div>' +
        '</div>' +

        '<div class="kb-card" style="margin:0 16px 16px;padding:0 0 0 0">' +
          _menuItem('Profil Bilgileri',   'user',      '/ayarlar') +
          _menuItem('Kimlik & Belgelerim','doc',        '/ayarlar') +
          _menuItem('Puanlamalarım',      'star',       '/ayarlar') +
          _menuItem('Favori İlanlarım',   'heart',      '/favoriler') +
          _menuItem('Bildirimler',        'bell',       '/bildirimler') +
          _menuItem('Ayarlar',            'settings',   '/ayarlar') +
          _menuItem('Yardım & Destek',    'help',       '/yardim') +
          '<div class="profile-menu-item profile-menu-item--danger" onclick="signOut()">' +
            '<div class="profile-menu-item__icon">' + ICON.logout + '</div>' +
            '<div class="profile-menu-item__label">Çıkış Yap</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function _menuItem(label, icon, route) {
    return '<div class="profile-menu-item" onclick="Router.go(\'' + route + '\')" style="padding:14px 16px">' +
      '<div class="profile-menu-item__icon">' + ICON[icon] + '</div>' +
      '<div class="profile-menu-item__label">' + label + '</div>' +
      '<div class="profile-menu-item__chevron">' + ICON.chevron + '</div>' +
    '</div>';
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
    _basFilter       : _basFilter,
    _mapFilter       : _mapFilter,
    _mapCat          : _mapCat,
    _mapToggleFilter : _mapToggleFilter,
    _mapToggleLayer  : _mapToggleLayer,
    _mapCluster      : _mapCluster,
    _mapZoom         : _mapZoom,
    _mapGPS          : _mapGPS,
    _mapAI           : _mapAI,
    _basvur          : _basvur
  };

})();
