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

    var name = (APP.profile && (APP.profile.full_name || APP.profile.business_name)) || 'İşletme';

    renderScreen(
      '<div class="kb-screen-inner">' +

        /* ── S1: Profile Summary ── */
        '<div class="dash-profile-card" onclick="Router.go(\'/isletme/profil\')">' +
          '<div class="dash-profile-card__avatar">' +
            '<div class="kb-avatar kb-avatar--lg" style="background:var(--c-isletme)">' + initials(name) + '</div>' +
            '<div class="dash-profile-card__verified">✓</div>' +
          '</div>' +
          '<div class="dash-profile-card__info">' +
            '<div class="dash-profile-card__name">' + name + '</div>' +
            '<div class="dash-profile-card__role" style="background:rgba(249,115,22,.14);color:var(--c-isletme)">Esnaf / İşletme</div>' +
            '<div class="dash-profile-card__score">' + ICON.star + '<span>4.7</span><span style="color:var(--muted);font-size:.68rem;font-weight:400">&nbsp;/ 5.0</span></div>' +
            '<div class="kb-progress" style="margin-top:8px">' +
              '<div class="kb-progress__track"><div class="kb-progress__fill" style="width:70%;background:linear-gradient(90deg,var(--c-isletme),#FCD34D)"></div></div>' +
              '<div class="kb-progress__labels"><span>İşletme profili</span><span>70%</span></div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* ── S2: Quick Metrics ── */
        '<div class="metric-grid">' +
          _iMCard('briefcase', '3',  'Aktif Talep',         'rgba(249,115,22,.12)', '#F97316', '/isletme/basvurular') +
          _iMCard('check',     '12', 'Gelen Başvuru',       'rgba(59,130,246,.12)', '#3B82F6', '/isletme/basvurular') +
          _iMCard('users',     '2',  'Aktif Kurye',         'rgba(34,197,94,.12)',  '#22C55E', '/isletme/basvurular') +
          _iMCard('eye',       '67', 'Profil Görüntülenme', 'rgba(168,85,247,.12)', '#A855F7', '/isletme/profil')     +
        '</div>' +

        /* ── S3: Active Requests ── */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Aktif Taleplerim</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/isletme/basvurular\')">Tümünü Gör</button>' +
        '</div>' +
        _iAppCard('🛵', 'Yaya Kurye Talebi',   'Hafta içi 09:00-18:00', 'Başvuru Bekleyen', 'pending', '1 saat önce') +
        _iAppCard('🚗', 'Araçlı Kurye Talebi', 'Cumartesi 10:00-22:00', 'İnceleniyor',      'review',  'Dün') +

        /* ── S4: Recommended Candidates ── */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Önerilen Kuryeler</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/isletme/harita\')">Haritada Gör</button>' +
        '</div>' +
        _iCandCard('1', 'Ayşe Demir',   '1.5 yıl yaya kurye', 'Kadıköy',  '4.7') +
        _iCandCard('2', 'Can Bağlar',   '1 yıl deneyim',       'Beşiktaş', '4.5') +

        /* ── S5: Recent Messages ── */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Son Mesajlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/isletme/mesajlar\')">Tümünü Gör</button>' +
        '</div>' +
        '<div class="kb-card" style="background:var(--surface2);border-color:var(--border);padding:0 16px;margin-bottom:12px">' +
          _iMiniMsg('Ayşe Demir', 'Merhaba, ilanınızı gördüm, müsaitim...', '14:30', 1) +
          _iMiniMsg('Can Bağlar', 'Yarın saat kaçta başlayacağım?',          'Dün',   0) +
        '</div>' +

        /* ── S6: Recent Notifications ── */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Son Bildirimler</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/bildirimler\')">Tümünü Gör</button>' +
        '</div>' +
        '<div class="kb-card" style="background:var(--surface2);border-color:var(--border);padding:0 16px;margin-bottom:12px">' +
          '<div class="notif-item"><div class="notif-item__dot" style="background:var(--c-isletme)"></div><div class="notif-item__text"><div class="notif-item__title">Yeni başvuru!</div><div class="notif-item__sub">Ayşe Demir talebi kabul etti.</div></div><div class="notif-item__time">5 dk</div></div>' +
          '<div class="notif-item"><div class="notif-item__dot notif-item__dot--read"></div><div class="notif-item__text"><div class="notif-item__title">İlanınız yayında</div><div class="notif-item__sub">Yaya kurye talebiniz onaylandı.</div></div><div class="notif-item__time">2 sa</div></div>' +
        '</div>' +

        /* ── S7: Weekly Activity ── */
        '<div class="kb-section-head"><div class="kb-section-title">Bu Hafta</div></div>' +
        '<div class="kb-card" style="background:var(--surface2);border-color:var(--border);margin-bottom:12px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
            '<span style="font-size:.82rem;font-weight:700">Talep Aktivitesi</span>' +
            '<span style="font-size:.75rem;color:var(--c-isletme);font-weight:600">+5% bu hafta</span>' +
          '</div>' +
          '<div class="perf-week">' +
            _iBar(20,'Pzt') + _iBar(40,'Sal') + _iBar(60,'Çar') +
            _iBar(35,'Per') + _iBar(70,'Cum') + _iBar(50,'Cmt') + _iBarToday(80,'Paz') +
          '</div>' +
          '<div style="display:flex;gap:20px;margin-top:10px">' +
            '<div><div style="font-size:1.2rem;font-weight:800">12</div><div style="font-size:.7rem;color:var(--muted)">Gelen Başvuru</div></div>' +
            '<div><div style="font-size:1.2rem;font-weight:800">3</div><div style="font-size:.7rem;color:var(--muted)">Aktif Talep</div></div>' +
            '<div><div style="font-size:1.2rem;font-weight:800;color:var(--c-isletme)">2</div><div style="font-size:.7rem;color:var(--muted)">Çalışan Kurye</div></div>' +
          '</div>' +
        '</div>' +

        /* ── S8: Quick Actions ── */
        '<div class="kb-section-head"><div class="kb-section-title">Hızlı İşlemler</div></div>' +
        '<div class="quick-actions" style="margin-bottom:0">' +
          '<button class="quick-btn" onclick="Router.go(\'/isletme/ilan/yeni\')">' +
            '<div class="quick-btn__icon">📋</div>' +
            '<div class="quick-btn__label">İlan Oluştur</div>' +
          '</button>' +
          '<button class="quick-btn" onclick="Router.go(\'/isletme/basvurular\')">' +
            '<div class="quick-btn__icon">👥</div>' +
            '<div class="quick-btn__label">Başvuruları Gör</div>' +
          '</button>' +
        '</div>' +

      '</div>'
    );
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
    showAppBar('Yakınımdaki Kuryeler', false);
    showBottomNav();
    setActiveNav('harita');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-search">' + ICON.search + '<input type="text" placeholder="Kurye ara..."></div>' +
        '<div class="kb-map">' +
          '<div class="kb-map-pin kb-map-pin--kurye" style="left:40%;top:40%"><span>🛵</span></div>' +
          '<div class="kb-map-pin kb-map-pin--kurye" style="left:60%;top:55%"><span>🚶</span></div>' +
          '<div style="position:relative;z-index:1;text-align:center;padding:20px">' +
            '<div style="font-size:.8rem;color:var(--muted)">Yakınındaki kuryeler</div>' +
          '</div>' +
        '</div>' +
        '<div class="kb-section-head"><div class="kb-section-title">Yakındaki Kuryeler</div></div>' +
        MOCK_ADAYLAR.map(_adayCard).join('') +
      '</div>'
    );
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
    showAppBar('Mesajlar', false);
    showBottomNav();
    setActiveNav('mesajlar');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-search">' + ICON.search + '<input type="text" placeholder="Konuşma ara..."></div>' +
        '<div class="kb-card" style="padding:0 16px">' +
          (MOCK_MESAJLAR.length ? MOCK_MESAJLAR.map(function (m) {
            return '<div class="msg-item" onclick="Router.go(\'/isletme/mesaj/' + m.id + '\')">' +
              '<div class="kb-avatar" style="background:var(--c-isletme)">' + initials(m.name) + '</div>' +
              '<div class="msg-item__info">' +
                '<div class="msg-item__name">' + m.name + '</div>' +
                '<div class="msg-item__preview">' + m.preview + '</div>' +
              '</div>' +
              '<div class="msg-item__meta">' +
                '<div class="msg-item__time">' + m.time + '</div>' +
                (m.unread ? '<span class="kb-bottomnav__badge" style="position:static;display:inline-flex">' + m.unread + '</span>' : '') +
              '</div>' +
            '</div>';
          }).join('') :
          '<div class="kb-empty"><div class="kb-empty__icon">💬</div><div class="kb-empty__title">Henüz mesajınız yok</div></div>') +
        '</div>' +
      '</div>'
    );
  }

  /* ── 6b. CHAT ───────────────────────────────────────────── */
  function mesajChat(ctx) {
    var id = ctx.params.id;
    var m  = MOCK_MESAJLAR.find(function (x) { return x.id === id; }) || MOCK_MESAJLAR[0];
    showAppBar(m ? m.name : 'Sohbet', true);
    hideBottomNav();

    renderScreen(
      '<div class="chat-wrap">' +
        '<div class="chat-messages">' +
          '<div class="chat-bubble chat-bubble--in">Merhaba, ilanınızı gördüm. Uygun muyum?<div class="chat-bubble__time">10:15</div></div>' +
          '<div class="chat-bubble chat-bubble--out">Profiliniz çok uygun görünüyor.<div class="chat-bubble__time">10:20</div></div>' +
        '</div>' +
        '<div class="chat-input-bar">' +
          '<textarea placeholder="Mesaj yaz..." rows="1"></textarea>' +
          '<button class="chat-send" style="background:var(--c-isletme)">' + ICON.send + '</button>' +
        '</div>' +
      '</div>'
    );
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
