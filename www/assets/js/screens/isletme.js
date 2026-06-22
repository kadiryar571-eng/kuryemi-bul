/* ============================================================
   KuryemiBul — screens/isletme.js
   7 İşletme ekranı: Panel, Harita, İlan Oluştur,
                     Başvurular, Aday Detayı, Mesajlar, Profil
   ============================================================ */
window.IsletmeScreens = (function () {
  'use strict';

  var MOCK_ADAYLAR = [
    { id: '1', name: 'Ayşe Demir',   score: '4.7', exp: '1.5 yıl yaya kurye', loc: 'Kadıköy',  time: '5 dk önce'  },
    { id: '2', name: 'Can Bağlar',   score: '4.5', exp: '1 yıl deneyim',      loc: 'Beşiktaş', time: '10 dk önce' },
    { id: '3', name: 'Fatma Yıldız', score: '4.8', exp: '3 yıl deneyim',      loc: 'Üsküdar',  time: '25 dk önce' }
  ];

  var MOCK_MESAJLAR = [
    { id: '1', name: 'Ayşe Demir', preview: 'Merhaba, ilanınızı gördüm...', time: '14:30', unread: 1 }
  ];

  function _adayCard(a) {
    return '<div class="person-card kb-card--pressable" onclick="Router.go(\'/isletme/aday/' + a.id + '\')">' +
      '<div class="kb-avatar" style="background:var(--c-isletme)">' + initials(a.name) + '</div>' +
      '<div class="person-card__info">' +
        '<div class="person-card__name">' + a.name + '</div>' +
        '<div class="person-card__sub">' + a.exp + '</div>' +
        '<div class="person-card__meta">' +
          '<span class="kb-stars">' + ICON.star + a.score + '</span>' +
          '<span class="person-card__time">' + a.time + '</span>' +
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
      heroRoute:    '/isletme/profil',
      heroBadge:    ICON.star + ' İşletme',
      heroTitle:    'İşletme Puanınız',
      heroScoreBig: '4.7',
      heroDenom:    '/ 5.0',
      heroDesc:     'Puanınız arttıkça daha nitelikli kuryeler başvurur',
      heroCtaLabel: 'Profilimi Gör',
      heroCtaRoute: '/isletme/profil',
      stats: [
        { num: '3',  label: 'Aktif Talep',          icon: 'briefcase', color: 'orange', route: '/isletme/basvurular', action: 'Detaylar' },
        { num: '12', label: 'Gelen Başvuru',          icon: 'check',     color: 'blue',   route: '/isletme/basvurular', action: 'İncele'   },
        { num: '2',  label: 'Aktif Kurye',            icon: 'users',     color: 'green',  route: '/isletme/basvurular', action: 'Yönet'    },
        { num: '67', label: 'Profil Görüntülenme',    icon: 'eye',       color: 'purple', route: '/isletme/profil',     action: 'Detaylar' }
      ],
      upgradeBanner: true,
      contentHtml: (
        '<div class="kb-section-head" style="margin-top:4px">' +
          '<div class="kb-section-title">Son Başvurular</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/isletme/basvurular\')">Tümünü Gör</button>' +
        '</div>' +
        _iCandCard('1', 'Ayşe Demir', '1.5 yıl yaya kurye', 'Kadıköy',  '4.7') +
        _iCandCard('2', 'Can Bağlar', '1 yıl deneyim',       'Beşiktaş', '4.5') +

        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Son Mesajlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/isletme/mesajlar\')">Tümünü Gör</button>' +
        '</div>' +
        '<div class="kb-card" style="background:var(--surface2);border-color:var(--border);padding:0 16px;margin-bottom:12px">' +
          _iMiniMsg('Ayşe Demir', 'Merhaba, ilanınızı gördüm...', '14:30', 1) +
          _iMiniMsg('Can Bağlar', 'Yarın başlayabilirim.',         'Dün',   0) +
        '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Hızlı İşlemler</div></div>' +
        '<div class="quick-actions" style="margin-bottom:0">' +
          '<button class="quick-btn" onclick="Router.go(\'/isletme/ilan/yeni\')">' +
            '<div class="quick-btn__icon">📋</div><div class="quick-btn__label">İlan Oluştur</div>' +
          '</button>' +
          '<button class="quick-btn" onclick="Router.go(\'/isletme/mesajlar\')">' +
            '<div class="quick-btn__icon">💬</div><div class="quick-btn__label">Mesajlar</div>' +
          '</button>' +
        '</div>'
      )
    }));
  }

  /* ── İşletme dashboard helpers ──────────────────────────── */
  function _iMCard(icon, val, lbl, iconBg, iconColor, route) {
    return '<div class="metric-card" onclick="Router.go(\'' + route + '\')">' +
      '<div class="metric-card__icon" style="background:' + iconBg + ';color:' + iconColor + '">' + ICON[icon] + '</div>' +
      '<div class="metric-card__val">' + val + '</div>' +
      '<div class="metric-card__lbl">' + lbl + '</div>' +
    '</div>';
  }

  function _iAppCard(ico, title, desc, statusLbl, statusCls, time) {
    return '<div class="actapp-card" onclick="Router.go(\'/isletme/basvurular\')">' +
      '<div class="actapp-card__top">' +
        '<div class="actapp-card__ico">' + ico + '</div>' +
        '<div class="actapp-card__info">' +
          '<div class="actapp-card__title">' + title + '</div>' +
          '<div class="actapp-card__company">' + desc + '</div>' +
        '</div>' +
        '<div class="actapp-card__time">' + time + '</div>' +
      '</div>' +
      '<div class="actapp-card__bottom"><span class="app-status app-status--' + statusCls + '">' + statusLbl + '</span></div>' +
    '</div>';
  }

  function _iCandCard(id, name, exp, loc, score) {
    return '<div class="rec-cand-card" onclick="Router.go(\'/isletme/aday/' + id + '\')">' +
      '<div class="kb-avatar" style="background:var(--c-isletme)">' + initials(name) + '</div>' +
      '<div class="rec-cand-card__info">' +
        '<div class="rec-cand-card__name">' + name + '</div>' +
        '<div class="rec-cand-card__sub">' + exp + ' · ' + loc + '</div>' +
        '<div class="rec-cand-card__meta"><span class="kb-stars">' + ICON.star + score + '</span></div>' +
      '</div>' +
      ICON.chevron +
    '</div>';
  }

  function _iMiniMsg(name, preview, time, unread) {
    return '<div class="mini-msg" onclick="Router.go(\'/isletme/mesajlar\')">' +
      '<div class="kb-avatar" style="width:36px;height:36px;font-size:.78rem;background:var(--c-isletme)">' + initials(name) + '</div>' +
      '<div class="mini-msg__info"><div class="mini-msg__name">' + name + '</div><div class="mini-msg__preview">' + preview + '</div></div>' +
      '<div class="mini-msg__meta"><span class="mini-msg__time">' + time + '</span>' + (unread > 0 ? '<span class="mini-msg__badge" style="background:var(--c-isletme)">' + unread + '</span>' : '') + '</div>' +
    '</div>';
  }

  function _iBar(pct, day) {
    var h = Math.max(4, Math.round(pct * 0.44));
    return '<div class="perf-week__col"><div class="perf-week__bar perf-week__bar--fill" style="height:' + h + 'px;background:rgba(249,115,22,.35)"></div><div class="perf-week__day">' + day + '</div></div>';
  }
  function _iBarToday(pct, day) {
    var h = Math.max(4, Math.round(pct * 0.44));
    return '<div class="perf-week__col"><div class="perf-week__bar perf-week__bar--today" style="height:' + h + 'px;background:var(--c-isletme);box-shadow:0 0 10px rgba(249,115,22,.4)"></div><div class="perf-week__day" style="color:var(--c-isletme);font-weight:700">' + day + '</div></div>';
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
      setTimeout(function() { window.initPremiumMap('isletme'); }, 50);
    } else {
      window._spmPendingRole = 'isletme';
    }
  }

  /* ── 3. İLAN OLUŞTUR ────────────────────────────────────── */
  function ilanYeni() {
    showAppBar('İlan Oluştur', true);
    showBottomNav();
    setActiveNav('yeni');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Pozisyon</label>' +
          '<select class="kb-select" id="il-poz">' +
            '<option>Yaya Kurye</option>' +
            '<option>Motorlu Kurye</option>' +
            '<option>Araçlı Kurye</option>' +
          '</select>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Çalışma Türü</label>' +
          '<select class="kb-select" id="il-tur">' +
            '<option>Part Time</option>' +
            '<option>Tam Zamanlı</option>' +
            '<option>Sözleşmeli</option>' +
          '</select>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Maaş (₺/ay)</label>' +
          '<div class="flex" style="gap:8px">' +
            '<input class="kb-input" type="number" placeholder="15.000">' +
            '<input class="kb-input" type="number" placeholder="20.000">' +
          '</div>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Çalışma Saatleri</label>' +
          '<div class="flex" style="gap:8px">' +
            '<input class="kb-input" type="time" value="13:00">' +
            '<input class="kb-input" type="time" value="18:00">' +
          '</div>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Konum</label>' +
          '<input class="kb-input" type="text" placeholder="Kadıköy, İstanbul">' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Açıklama (Opsiyonel)</label>' +
          '<textarea class="kb-input" rows="3" placeholder="Ek bilgi..."></textarea>' +
        '</div>' +
        '<button class="btn btn--primary" style="background:var(--c-isletme)" onclick="IsletmeScreens._yayinla()">' +
          'İlan Yayınla' +
        '</button>' +
      '</div>'
    );
  }

  function _yayinla() {
    toast('İlanınız yayınlandı!');
    setTimeout(function () { Router.go('/isletme/basvurular'); }, 800);
  }

  /* ── 4. BAŞVURULAR ──────────────────────────────────────── */
  function basvurular() {
    showAppBar('Başvurular', false);
    showBottomNav();
    setActiveNav('basvurular');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="isletme-bas-tabs">' +
          '<button class="kb-tab active" onclick="IsletmeScreens._basFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._basFilter(\'yeni\',this)">Yeni</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._basFilter(\'deger\',this)">Değerlendirilen</button>' +
        '</div>' +
        '<div id="isletme-bas-list">' + MOCK_ADAYLAR.map(_adayCard).join('') + '</div>' +
      '</div>'
    );
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#isletme-bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
  }

  /* ── 5. ADAY DETAY ──────────────────────────────────────── */
  function adayDetay(ctx) {
    var id = ctx.params.id;
    var a  = MOCK_ADAYLAR.find(function (x) { return x.id === id; }) || MOCK_ADAYLAR[0];

    showAppBar(a.name, true);
    showBottomNav();

    renderScreen(
      '<div>' +
        '<div class="detail-hero">' +
          '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">' +
            '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-isletme)">' + initials(a.name) + '</div>' +
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
          '<div class="detail-row">' + ICON.clock + 'Müsaitlik: 13:00 – 18:00</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Maaş Beklentisi</div>' +
          '<div style="font-size:1rem;font-weight:700;color:var(--c-isletme)">15.000 – 20.000 ₺/ay</div>' +
        '</div>' +

        '<div class="detail-cta" style="display:flex;gap:10px">' +
          '<button class="btn btn--outline btn--sm" onclick="Router.go(\'/isletme/mesajlar\')" style="flex:1;--c-accent:var(--c-isletme)">Mesaj Gönder</button>' +
          '<button class="btn btn--success btn--sm" onclick="IsletmeScreens._kabul(\'' + id + '\')" style="flex:1">Kabul Et</button>' +
        '</div>' +
      '</div>'
    );
  }

  function _kabul(id) {
    toast('Aday kabul edildi!');
    setTimeout(function () { Router.back(); }, 700);
  }

  /* ── 6. MESAJLAR ────────────────────────────────────────── */
  function mesajlar() {
    SharedScreens.sharedMesajlar('isletme', MOCK_MESAJLAR);
  }

  /* ── 6b. CHAT ───────────────────────────────────────────── */
  function mesajChat(ctx) {
    SharedScreens.sharedMesajChat(ctx, 'isletme');
  }

  /* ── 7. PROFİL ──────────────────────────────────────────── */
  function profil() {
    showAppBar('İşletme Profilim', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/ayarlar\')">' + ICON.settings + '</button>'
    );
    showBottomNav();
    setActiveNav('profil');

    var name = (APP.profile && (APP.profile.full_name || APP.profile.business_name)) || 'İşletme';

    renderScreen(
      '<div>' +
        '<div class="profile-hero">' +
          '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-isletme)">' + initials(name) + '</div>' +
          '<div class="profile-hero__name">' + name + '</div>' +
          '<div class="profile-hero__sub">Esnaf / İşletme</div>' +
          '<div class="profile-hero__badges">' +
            '<span class="kb-chip kb-chip--warning">⭐ 4.5</span>' +
            '<span class="kb-chip kb-chip--success">' + ICON.shield + ' Doğrulandı</span>' +
          '</div>' +
        '</div>' +

        '<div class="kb-card" style="margin:0 16px 16px;padding:0">' +
          _mi('İşletme Bilgileri', 'briefcase', '/ayarlar') +
          _mi('Puanlamalar',       'star',       '/ayarlar') +
          _mi('Bildirimler',       'bell',       '/bildirimler') +
          _mi('Ayarlar',           'settings',   '/ayarlar') +
          _mi('Yardım & Destek',   'help',       '/yardim') +
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
      '<div class="profile-menu-item__icon" style="color:var(--c-isletme)">' + ICON[icon] + '</div>' +
      '<div class="profile-menu-item__label">' + label + '</div>' +
      '<div class="profile-menu-item__chevron">' + ICON.chevron + '</div>' +
    '</div>';
  }

  return {
    panel      : panel,
    harita     : harita,
    ilanYeni   : ilanYeni,
    basvurular : basvurular,
    adayDetay  : adayDetay,
    mesajlar   : mesajlar,
    mesajChat  : mesajChat,
    profil     : profil,
    _basFilter : _basFilter,
    _yayinla   : _yayinla,
    _kabul     : _kabul
  };

})();
