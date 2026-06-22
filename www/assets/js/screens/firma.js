/* ============================================================
   KuryemiBul — screens/firma.js
   8 Firma ekranı: Panel, Harita, İlanlarım, Yeni İlan,
                   Başvurular, Aday Detayı, Mesajlar, Profil
   ============================================================ */
window.FirmaScreens = (function () {
  'use strict';

  var MOCK_ILANLAR = [
    { id: '1', title: 'Motorlu Kurye', type: 'Tam Zamanlı', salary: '25.000 - 35.000 ₺', basvuru: 8,  active: true  },
    { id: '2', title: 'Yaya Kurye',    type: 'Part Time',   salary: '15.000 - 22.000 ₺', basvuru: 14, active: true  },
    { id: '3', title: 'Araçlı Kurye',  type: 'Tam Zamanlı', salary: '28.000 - 34.000 ₺', basvuru: 3,  active: false }
  ];

  var MOCK_ADAYLAR = [
    { id: '1', name: 'Mehmet Kaya',   score: '4.8', exp: '3.5 yıl deneyim', loc: 'Kadıköy, İstanbul', status: 'pending'   },
    { id: '2', name: 'Ayşe Demir',    score: '4.7', exp: '2 yıl deneyim',   loc: 'Beşiktaş, İstanbul', status: 'reviewed' },
    { id: '3', name: 'Can Bağlar',    score: '4.6', exp: '1 yıl deneyim',   loc: 'Ümraniye, İstanbul', status: 'pending'  }
  ];

  var MOCK_MESAJLAR = [
    { id: '1', name: 'Mehmet Kaya', preview: 'Merhaba, profilimi incelemenizi...', time: '15:20', unread: 1 },
    { id: '2', name: 'Ayşe Demir', preview: 'Görüşme için uygun saatler...', time: '13:45', unread: 0 }
  ];

  function _adayCard(a, role) {
    return '<div class="person-card kb-card--pressable" onclick="Router.go(\'/' + role + '/aday/' + a.id + '\')">' +
      '<div class="kb-avatar">' + initials(a.name) + '</div>' +
      '<div class="person-card__info">' +
        '<div class="person-card__name">' + a.name + '</div>' +
        '<div class="person-card__sub">' + a.exp + '</div>' +
        '<div class="person-card__meta">' +
          '<span class="kb-stars">' + ICON.star + a.score + '</span>' +
          '<span class="kb-chip" style="padding:2px 8px;font-size:.7rem">' + ICON.pin + a.loc + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="profile-menu-item__chevron">' + ICON.chevron + '</div>' +
    '</div>';
  }

  /* ── 1. PANEL ───────────────────────────────────────────── */
  function panel() {
    showDashboardBar();
    showBottomNav();
    setActiveNav('panel');

    renderScreen(SharedScreens.premDashPanel({
      heroRoute:    '/firma/profil',
      heroBadge:    ICON.star + ' Firma',
      heroTitle:    'Firma Puanınız',
      heroScoreBig: '4.6',
      heroDenom:    '/ 5.0',
      heroDesc:     'Puanınız arttıkça en iyi kuryeler sizinle çalışmak ister',
      heroCtaLabel: 'Profilimi Gör',
      heroCtaRoute: '/firma/profil',
      stats: [
        { num: '8',   label: 'Açık İlan',            icon: 'list',      color: 'green',  route: '/firma/ilanlarim',  action: 'Yönet'    },
        { num: '14',  label: 'Yeni Başvuru',          icon: 'check',     color: 'blue',   route: '/firma/basvurular', action: 'İncele'   },
        { num: '3',   label: 'Aktif Aday',            icon: 'users',     color: 'orange', route: '/firma/basvurular', action: 'Detaylar' },
        { num: '245', label: 'Profil Görüntülenme',   icon: 'eye',       color: 'purple', route: '/firma/profil',     action: 'Detaylar' }
      ],
      upgradeBanner: true,
      contentHtml: (
        '<div class="kb-section-head" style="margin-top:4px">' +
          '<div class="kb-section-title">Son Başvurular</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/firma/basvurular\')">Tümünü Gör</button>' +
        '</div>' +
        _fCandCard('1', 'Mehmet Kaya', '3.5 yıl deneyim', 'Kadıköy',  '4.8') +
        _fCandCard('2', 'Ayşe Demir',  '2 yıl deneyim',   'Beşiktaş', '4.7') +

        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Son Mesajlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/firma/mesajlar\')">Tümünü Gör</button>' +
        '</div>' +
        '<div class="kb-card" style="background:var(--surface2);border-color:var(--border);padding:0 16px;margin-bottom:12px">' +
          _fMiniMsg('Mehmet Kaya', 'Merhaba, profilimi incelemenizi...', '15:20', 1) +
          _fMiniMsg('Ayşe Demir',  'Görüşme için uygun saatler...',       '13:45', 0) +
        '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Hızlı İşlemler</div></div>' +
        '<div class="quick-actions" style="margin-bottom:0">' +
          '<button class="quick-btn" onclick="Router.go(\'/firma/ilan/yeni\')">' +
            '<div class="quick-btn__icon">📋</div><div class="quick-btn__label">Yeni İlan Oluştur</div>' +
          '</button>' +
          '<button class="quick-btn" onclick="Router.go(\'/firma/mesajlar\')">' +
            '<div class="quick-btn__icon">💬</div><div class="quick-btn__label">Mesajlar</div>' +
          '</button>' +
        '</div>'
      )
    }));
  }

  /* ── Firma dashboard helpers ─────────────────────────────── */
  function _fMCard(icon, val, lbl, iconBg, iconColor, route) {
    return '<div class="metric-card" onclick="Router.go(\'' + route + '\')">' +
      '<div class="metric-card__icon" style="background:' + iconBg + ';color:' + iconColor + '">' + ICON[icon] + '</div>' +
      '<div class="metric-card__val">' + val + '</div>' +
      '<div class="metric-card__lbl">' + lbl + '</div>' +
    '</div>';
  }

  function _fAppCard(abbr, name, exp, statusLbl, statusCls, time) {
    return '<div class="actapp-card" onclick="Router.go(\'/firma/basvurular\')">' +
      '<div class="actapp-card__top">' +
        '<div class="kb-avatar" style="width:38px;height:38px;font-size:.78rem;background:var(--c-firma);flex-shrink:0">' + abbr + '</div>' +
        '<div class="actapp-card__info">' +
          '<div class="actapp-card__title">' + name + '</div>' +
          '<div class="actapp-card__company">' + exp + '</div>' +
        '</div>' +
        '<div class="actapp-card__time">' + time + '</div>' +
      '</div>' +
      '<div class="actapp-card__bottom"><span class="app-status app-status--' + statusCls + '">' + statusLbl + '</span></div>' +
    '</div>';
  }

  function _fCandCard(id, name, exp, loc, score) {
    return '<div class="rec-cand-card" onclick="Router.go(\'/firma/aday/' + id + '\')">' +
      '<div class="kb-avatar" style="background:var(--c-firma)">' + initials(name) + '</div>' +
      '<div class="rec-cand-card__info">' +
        '<div class="rec-cand-card__name">' + name + '</div>' +
        '<div class="rec-cand-card__sub">' + exp + ' · ' + loc + '</div>' +
        '<div class="rec-cand-card__meta"><span class="kb-stars">' + ICON.star + score + '</span></div>' +
      '</div>' +
      ICON.chevron +
    '</div>';
  }

  function _fMiniMsg(name, preview, time, unread) {
    return '<div class="mini-msg" onclick="Router.go(\'/firma/mesajlar\')">' +
      '<div class="kb-avatar" style="width:36px;height:36px;font-size:.78rem;background:var(--c-firma)">' + initials(name) + '</div>' +
      '<div class="mini-msg__info"><div class="mini-msg__name">' + name + '</div><div class="mini-msg__preview">' + preview + '</div></div>' +
      '<div class="mini-msg__meta"><span class="mini-msg__time">' + time + '</span>' + (unread > 0 ? '<span class="mini-msg__badge">' + unread + '</span>' : '') + '</div>' +
    '</div>';
  }

  function _fBar(pct, day) {
    var h = Math.max(4, Math.round(pct * 0.44));
    return '<div class="perf-week__col"><div class="perf-week__bar perf-week__bar--fill" style="height:' + h + 'px;background:rgba(34,197,94,.35)"></div><div class="perf-week__day">' + day + '</div></div>';
  }
  function _fBarToday(pct, day) {
    var h = Math.max(4, Math.round(pct * 0.44));
    return '<div class="perf-week__col"><div class="perf-week__bar perf-week__bar--today" style="height:' + h + 'px;background:var(--c-firma);box-shadow:0 0 10px rgba(34,197,94,.4)"></div><div class="perf-week__day" style="color:var(--c-firma);font-weight:700">' + day + '</div></div>';
  }

  /* ── 2. HARİTA ──────────────────────────────────────────── */
  function harita() {
    var bar = document.getElementById('kb-appbar');
    if (bar) bar.style.display = 'none';
    showBottomNav();
    setActiveNav('harita');
    var kbScreen = document.getElementById('kb-screen');
    if (kbScreen) kbScreen.style.overflow = 'hidden';
    renderScreen(window._spmShell ? window._spmShell() : '<div id="spm-map" style="height:100%;background:#0f0b1e"></div>');
    if (window._spmMapsReady && window.initPremiumMap) {
      setTimeout(function() { window.initPremiumMap('firma'); }, 50);
    } else {
      window._spmPendingRole = 'firma';
    }
  }

  /* ── 3. İLANLARIM ──────────────────────────────────────── */
  function ilanlarim() {
    showAppBar('İlanlarım', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/firma/ilan/yeni\')">' + ICON.plus + '</button>'
    );
    showBottomNav();
    setActiveNav('ilanlarim');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="ilan-tabs">' +
          '<button class="kb-tab active" onclick="FirmaScreens._ilanFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="FirmaScreens._ilanFilter(\'acik\',this)">Açık</button>' +
          '<button class="kb-tab"        onclick="FirmaScreens._ilanFilter(\'pasif\',this)">Pasif</button>' +
        '</div>' +
        '<div id="firma-ilan-list">' + _renderIlanList(MOCK_ILANLAR) + '</div>' +
        '<button class="btn btn--primary mt-16" onclick="Router.go(\'/firma/ilan/yeni\')">' +
          ICON.plus + 'Yeni İlan Oluştur' +
        '</button>' +
      '</div>'
    );
  }

  function _renderIlanList(list) {
    return list.map(function (il) {
      return '<div class="kb-card" style="margin-bottom:10px">' +
        '<div class="flex items-center justify-between mb-8">' +
          '<div style="font-weight:700">' + il.title + '</div>' +
          '<span class="kb-chip ' + (il.active ? 'kb-chip--success' : '') + '">' + (il.active ? 'Açık' : 'Pasif') + '</span>' +
        '</div>' +
        '<div style="font-size:.82rem;color:var(--muted);margin-bottom:6px">' + il.type + ' · ' + il.salary + '</div>' +
        '<div style="font-size:.82rem;color:var(--c-accent);font-weight:600">' + il.basvuru + ' başvuru</div>' +
        '<div class="flex" style="gap:8px;margin-top:10px">' +
          '<button class="btn btn--outline btn--sm" onclick="Router.go(\'/firma/basvurular\')">Başvuruları Gör</button>' +
          '<button class="btn btn--ghost btn--sm">Düzenle</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function _ilanFilter(type, btn) {
    document.querySelectorAll('#ilan-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var filtered = type === 'tumu' ? MOCK_ILANLAR
      : type === 'acik'  ? MOCK_ILANLAR.filter(function (x) { return x.active; })
      : MOCK_ILANLAR.filter(function (x) { return !x.active; });
    var el = document.getElementById('firma-ilan-list');
    if (el) el.innerHTML = _renderIlanList(filtered);
  }

  /* ── 4. YENİ İLAN OLUŞTUR ──────────────────────────────── */
  function ilanYeni() {
    showAppBar('Yeni İlan Oluştur', true);
    showBottomNav();

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Pozisyon</label>' +
          '<select class="kb-select" id="il-pozisyon">' +
            '<option>Motorlu Kurye</option>' +
            '<option>Yaya Kurye</option>' +
            '<option>Araçlı Kurye</option>' +
          '</select>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Çalışma Türü</label>' +
          '<select class="kb-select" id="il-tur">' +
            '<option>Tam Zamanlı</option>' +
            '<option>Part Time</option>' +
            '<option>Sözleşmeli</option>' +
          '</select>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Maaş (₺/ay)</label>' +
          '<div class="flex" style="gap:8px">' +
            '<input class="kb-input" type="number" id="il-maas-min" placeholder="28.000">' +
            '<input class="kb-input" type="number" id="il-maas-max" placeholder="34.000">' +
          '</div>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Çalışma Saatleri</label>' +
          '<div class="flex" style="gap:8px">' +
            '<input class="kb-input" type="time" id="il-saat-bas" value="09:00">' +
            '<input class="kb-input" type="time" id="il-saat-bit" value="18:00">' +
          '</div>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">İl</label>' +
          '<input class="kb-input" type="text" id="il-konum" placeholder="İstanbul, Kadıköy">' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">İlan Açıklaması</label>' +
          '<textarea class="kb-input" id="il-aciklama" rows="4" placeholder="Aranan özellikler, görev tanımı..."></textarea>' +
        '</div>' +
        '<button class="btn btn--primary" onclick="FirmaScreens._yayinla()">' +
          'İlan Yayınla' +
        '</button>' +
      '</div>'
    );
  }

  function _yayinla() {
    toast('İlanınız yayınlandı!');
    setTimeout(function () { Router.go('/firma/ilanlarim'); }, 800);
  }

  /* ── 5. BAŞVURULAR ──────────────────────────────────────── */
  function basvurular() {
    showAppBar('Başvurular', false);
    showBottomNav();
    setActiveNav('basvurular');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="firma-bas-tabs">' +
          '<button class="kb-tab active" onclick="FirmaScreens._basFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="FirmaScreens._basFilter(\'yeni\',this)">Yeni</button>' +
          '<button class="kb-tab"        onclick="FirmaScreens._basFilter(\'deger\',this)">Değerlendirilen</button>' +
        '</div>' +
        '<div id="firma-bas-list">' +
          MOCK_ADAYLAR.map(function (a) { return _adayCard(a, 'firma'); }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#firma-bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var filtered = MOCK_ADAYLAR;
    if (type === 'yeni')  filtered = MOCK_ADAYLAR.filter(function (a) { return a.status === 'pending'; });
    if (type === 'deger') filtered = MOCK_ADAYLAR.filter(function (a) { return a.status === 'reviewed'; });
    var el = document.getElementById('firma-bas-list');
    if (el) el.innerHTML = filtered.map(function (a) { return _adayCard(a, 'firma'); }).join('');
  }

  /* ── 6. ADAY DETAY ──────────────────────────────────────── */
  function adayDetay(ctx) {
    var id = ctx.params.id;
    var a  = MOCK_ADAYLAR.find(function (x) { return x.id === id; }) || MOCK_ADAYLAR[0];

    showAppBar(a.name, true);
    showBottomNav();

    renderScreen(
      '<div>' +
        '<div class="detail-hero">' +
          '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">' +
            '<div class="kb-avatar kb-avatar--xl">' + initials(a.name) + '</div>' +
            '<div>' +
              '<div style="font-size:1.1rem;font-weight:800">' + a.name + '</div>' +
              '<div class="kb-stars" style="margin:4px 0">' + ICON.star + ' ' + a.score + '</div>' +
              '<span class="kb-chip kb-chip--success">' + ICON.shield + ' Doğrulandı</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Deneyim & Konum</div>' +
          '<div class="detail-row">' + ICON.briefcase + a.exp + '</div>' +
          '<div class="detail-row">' + ICON.pin + a.loc + '</div>' +
          '<div class="detail-row">' + ICON.clock + 'Çalışma saatleri: 09:00 – 18:00</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Belgeler</div>' +
          '<div class="detail-row">' + ICON.doc + 'Ehliyet (A sınıfı)</div>' +
          '<div class="detail-row">' + ICON.doc + 'SRC Belgesi</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Maaş Beklentisi</div>' +
          '<div style="font-size:1rem;font-weight:700;color:var(--c-accent)">28.000 – 34.000 ₺/ay</div>' +
        '</div>' +

        '<div class="detail-cta" style="display:flex;gap:10px">' +
          '<button class="btn btn--outline" onclick="Router.go(\'/firma/mesajlar\')" style="flex:1">Mesaj Gönder</button>' +
          '<button class="btn btn--primary" onclick="FirmaScreens._degerlendir(\'' + id + '\')" style="flex:1">Değerlendir</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _degerlendir(id) {
    toast('Aday değerlendirmeye alındı.');
    setTimeout(function () { Router.back(); }, 700);
  }

  /* ── 7. MESAJLAR ────────────────────────────────────────── */
  function mesajlar() {
    SharedScreens.sharedMesajlar('firma', MOCK_MESAJLAR);
  }

  /* ── 7b. CHAT ───────────────────────────────────────────── */
  function mesajChat(ctx) {
    SharedScreens.sharedMesajChat(ctx, 'firma');
  }

  /* ── 8. PROFİL ──────────────────────────────────────────── */
  function profil() {
    showAppBar('Firma Profilim', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/ayarlar\')">' + ICON.settings + '</button>'
    );
    showBottomNav();
    setActiveNav('profil');

    var name = (APP.profile && (APP.profile.full_name || APP.profile.company_name)) || 'Firma';

    renderScreen(
      '<div>' +
        '<div class="profile-hero">' +
          '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-firma)">' + initials(name) + '</div>' +
          '<div class="profile-hero__name">' + name + '</div>' +
          '<div class="profile-hero__sub">Firma</div>' +
          '<div class="profile-hero__badges">' +
            '<span class="kb-chip kb-chip--success">' + ICON.shield + ' Doğrulandı</span>' +
            '<span class="kb-chip kb-chip--accent">' + ICON.star + ' 4.6</span>' +
          '</div>' +
        '</div>' +

        '<div class="kb-card" style="margin:0 16px 16px;padding:0 0 0 0">' +
          _mi('Firma Bilgileri',     'briefcase',  '/ayarlar') +
          _mi('Çalışanlar',          'users',       '/ayarlar') +
          _mi('Puanlamalar',         'star',        '/ayarlar') +
          _mi('Bildirimler',         'bell',        '/bildirimler') +
          _mi('Ayarlar',             'settings',    '/ayarlar') +
          _mi('Yardım & Destek',     'help',        '/yardim') +
          '<div class="profile-menu-item profile-menu-item--danger" onclick="signOut()" style="padding:14px 16px">' +
            '<div class="profile-menu-item__icon">' + ICON.logout + '</div>' +
            '<div class="profile-menu-item__label">Çıkış Yap</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function _mi(label, icon, route) {
    return '<div class="profile-menu-item" onclick="Router.go(\'' + route + '\')" style="padding:14px 16px">' +
      '<div class="profile-menu-item__icon">' + ICON[icon] + '</div>' +
      '<div class="profile-menu-item__label">' + label + '</div>' +
      '<div class="profile-menu-item__chevron">' + ICON.chevron + '</div>' +
    '</div>';
  }

  return {
    panel       : panel,
    harita      : harita,
    ilanlarim   : ilanlarim,
    ilanYeni    : ilanYeni,
    basvurular  : basvurular,
    adayDetay   : adayDetay,
    mesajlar    : mesajlar,
    mesajChat   : mesajChat,
    profil      : profil,
    _ilanFilter : _ilanFilter,
    _basFilter  : _basFilter,
    _yayinla    : _yayinla,
    _degerlendir: _degerlendir
  };

})();
