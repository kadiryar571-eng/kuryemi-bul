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
    showAppBar('', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/bildirimler\')">' + ICON.bell + '</button>'
    );
    showBottomNav();
    setActiveNav('harita');

    var name = (APP.profile && (APP.profile.full_name || APP.profile.display_name)) || 'Kullanıcı';
    var score = (APP.profile && APP.profile.score) || '4.8';

    renderScreen(
      '<div class="kb-screen-inner">' +

        /* Greeting */
        '<div class="flex items-center justify-between mb-16">' +
          '<div>' +
            '<div style="font-size:.85rem;color:var(--muted)">Merhaba,</div>' +
            '<div style="font-size:1.1rem;font-weight:800">' + name + '</div>' +
          '</div>' +
          '<div class="kb-avatar kb-avatar--lg" onclick="Router.go(\'/kurye/profil\')">' +
            initials(name) +
          '</div>' +
        '</div>' +

        /* Stats */
        '<div class="kb-stats">' +
          '<div class="kb-stat"><div class="kb-stat__val">⭐ ' + score + '</div><div class="kb-stat__lbl">Puan</div></div>' +
          '<div class="kb-stat"><div class="kb-stat__val">8</div><div class="kb-stat__lbl">Başvurum</div></div>' +
          '<div class="kb-stat"><div class="kb-stat__val">3</div><div class="kb-stat__lbl">Görüşme</div></div>' +
        '</div>' +

        /* Suggested jobs */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Öne Çıkan İlanlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/kurye/ilanlar\')">Tümü</button>' +
        '</div>' +
        MOCK_ILANLAR.slice(0, 3).map(_jobCard).join('') +

        /* Nearby */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Yakınındaki İlanlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/kurye/harita\')">Haritada Gör</button>' +
        '</div>' +
        MOCK_ILANLAR.slice(3, 5).map(_jobCard).join('') +

      '</div>'
    );
  }

  /* ── 2. HARİTA ──────────────────────────────────────────── */
  function harita() {
    showAppBar('Harita', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/bildirimler\')">' + ICON.bell + '</button>'
    );
    showBottomNav();
    setActiveNav('harita');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-search">' +
          ICON.search +
          '<input type="text" placeholder="İş ilanı veya firma ara...">' +
        '</div>' +

        /* Filter chips */
        '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px">' +
          '<button class="kb-chip kb-chip--accent" id="f-tumü"    onclick="KuryeScreens._mapFilter(\'tumu\')">Tümü</button>' +
          '<button class="kb-chip"                 id="f-motorlu" onclick="KuryeScreens._mapFilter(\'motorlu\')">🛵 Motorlu</button>' +
          '<button class="kb-chip"                 id="f-yaya"    onclick="KuryeScreens._mapFilter(\'yaya\')">🚶 Yaya</button>' +
          '<button class="kb-chip"                 id="f-aracli"  onclick="KuryeScreens._mapFilter(\'aracli\')">🚗 Araçlı</button>' +
        '</div>' +

        /* Map */
        '<div class="kb-map" id="kb-map">' +
          '<div class="kb-map-pin kb-map-pin--kurye"  style="left:35%;top:40%"><span>🛵</span></div>' +
          '<div class="kb-map-pin kb-map-pin--firma"  style="left:55%;top:30%"><span>🏢</span></div>' +
          '<div class="kb-map-pin kb-map-pin--isletme" style="left:45%;top:60%"><span>🏪</span></div>' +
          '<div class="kb-map-pin kb-map-pin--firma"  style="left:70%;top:50%"><span>🏢</span></div>' +
          '<div style="position:relative;z-index:1;text-align:center;padding:20px">' +
            '<div style="font-size:.8rem;color:var(--muted)">Gerçek harita yakında</div>' +
            '<div style="font-size:.7rem;color:var(--border);margin-top:4px">Leaflet.js entegrasyonu Faz 2\'de</div>' +
          '</div>' +
        '</div>' +

        /* Near jobs */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Yakınındaki İlanlar</div>' +
        '</div>' +
        MOCK_ILANLAR.slice(0, 4).map(_jobCard).join('') +
      '</div>'
    );
  }

  function _mapFilter(type) {
    /* visual only for now */
    document.querySelectorAll('.kb-map + div .kb-chip, .kb-screen-inner > div[style*="overflow-x"] .kb-chip').forEach(function (el) {
      el.classList.remove('kb-chip--accent');
    });
  }

  /* ── 3. İLANLAR ────────────────────────────────────────── */
  function ilanlar() {
    showAppBar('İş İlanları', false,
      '<button class="kb-appbar__action">' + ICON.search + '</button>'
    );
    showBottomNav();
    setActiveNav('ilanlar');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="ilan-tabs">' +
          '<button class="kb-tab active" onclick="KuryeScreens._ilanFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="KuryeScreens._ilanFilter(\'motorlu\',this)">Motorlu</button>' +
          '<button class="kb-tab"        onclick="KuryeScreens._ilanFilter(\'yaya\',this)">Yaya</button>' +
          '<button class="kb-tab"        onclick="KuryeScreens._ilanFilter(\'aracli\',this)">Araçlı</button>' +
        '</div>' +
        '<div id="ilan-list">' +
          MOCK_ILANLAR.map(_jobCard).join('') +
        '</div>' +
      '</div>'
    );
  }

  function _ilanFilter(cat, btn) {
    document.querySelectorAll('#ilan-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
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

  /* ── 6. MESAJLAR ────────────────────────────────────────── */
  function mesajlar() {
    showAppBar('Mesajlar', false);
    showBottomNav();
    setActiveNav('mesajlar');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-search">' +
          ICON.search + '<input type="text" placeholder="Konuşma ara...">' +
        '</div>' +
        '<div class="kb-card" style="padding:0 16px">' +
          MOCK_MESAJLAR.map(function (m) {
            return '<div class="msg-item" onclick="Router.go(\'/kurye/mesaj/' + m.id + '\')">' +
              '<div class="kb-avatar">' + initials(m.name) + '</div>' +
              '<div class="msg-item__info">' +
                '<div class="msg-item__name">' + m.name + '</div>' +
                '<div class="msg-item__preview">' + m.preview + '</div>' +
              '</div>' +
              '<div class="msg-item__meta">' +
                '<div class="msg-item__time">' + m.time + '</div>' +
                (m.unread ? '<span class="kb-bottomnav__badge" style="position:static;display:inline-flex">' + m.unread + '</span>' : '') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
  }

  /* ── 6b. MESAJ CHAT ─────────────────────────────────────── */
  function mesajChat(ctx) {
    var id = ctx.params.id;
    var m  = MOCK_MESAJLAR.find(function (x) { return x.id === id; }) || MOCK_MESAJLAR[0];

    showAppBar(m.name, true);
    hideBottomNav();

    renderScreen(
      '<div class="chat-wrap">' +
        '<div class="chat-messages">' +
          '<div class="chat-bubble chat-bubble--in">Merhaba! Başvurunuzu aldık.<div class="chat-bubble__time">10:15</div></div>' +
          '<div class="chat-bubble chat-bubble--out">Teşekkürler, görüşmeyi bekliyorum.<div class="chat-bubble__time">10:18</div></div>' +
          '<div class="chat-bubble chat-bubble--in">Yarın saat 14:00 uygun mu?<div class="chat-bubble__time">10:20</div></div>' +
          '<div class="chat-bubble chat-bubble--out">Evet, uygun.<div class="chat-bubble__time">10:22</div></div>' +
        '</div>' +
        '<div class="chat-input-bar">' +
          '<textarea placeholder="Mesaj yaz..." rows="1"></textarea>' +
          '<button class="chat-send">' + ICON.send + '</button>' +
        '</div>' +
      '</div>'
    );
  }

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
    _ilanFilter : _ilanFilter,
    _basFilter  : _basFilter,
    _mapFilter  : _mapFilter,
    _basvur     : _basvur
  };

})();
