/* ============================================================
   KuryemiBul — screens/admin.js
   6 Komuta Merkezi ekranı — SADECE admin rolünde görünür
   ============================================================ */
window.AdminScreens = (function () {
  'use strict';

  function _guard() {
    if (!requireAdmin()) return false;
    return true;
  }

  /* ── 1. KOMUTA MERKEZİ ANA EKRAN ───────────────────────── */
  function panel() {
    if (!_guard()) return;
    showAppBar('Komuta Merkezi', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/bildirimler\')">' + ICON.bell + '</button>'
    );
    showBottomNav();
    setActiveNav('panel');

    renderScreen(
      '<div class="kb-screen-inner">' +

        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">' +
          '<div class="kb-avatar kb-avatar--lg" style="background:var(--c-admin)">' + ICON.crown + '</div>' +
          '<div>' +
            '<div style="font-size:1rem;font-weight:800">Komuta Merkezi</div>' +
            '<div style="font-size:.78rem;color:var(--muted)">Yetkili Paneli</div>' +
          '</div>' +
        '</div>' +

        '<div class="admin-stat-grid">' +
          '<div class="admin-stat"><div class="admin-stat__val">24.580</div><div class="admin-stat__lbl">Toplam Kullanıcı</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">8.742</div><div class="admin-stat__lbl">Toplam İlan</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">5.431</div><div class="admin-stat__lbl">Aktif Başvuru</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">98</div><div class="admin-stat__lbl">Bekleyen Onay</div></div>' +
        '</div>' +

        /* System health */
        '<div class="kb-card mb-12">' +
          '<div style="font-weight:700;margin-bottom:10px">Sistem Durumu</div>' +
          _healthRow('Veritabanı',    'Aktif',   'success') +
          _healthRow('API Sunucusu',  'Aktif',   'success') +
          _healthRow('Bildirimler',   'Aktif',   'success') +
          _healthRow('Depolama',      '%78 dolu','warning') +
        '</div>' +

        /* Quick nav */
        '<div class="kb-section-head"><div class="kb-section-title">Hızlı Erişim</div></div>' +
        '<div class="quick-actions">' +
          _adminQBtn('👥', 'Kullanıcılar',  '/admin/kullanicilar', '#EFF6FF') +
          _adminQBtn('📋', 'İlan Denetimi', '/admin/ilanlar',      '#F0FDF4') +
          _adminQBtn('📊', 'Raporlar',      '/admin/raporlar',     '#F5F3FF') +
          _adminQBtn('⚠️', 'Şikayetler',   '/admin/sikayetler',   '#FFF7ED') +
        '</div>' +

        /* Recent users */
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Son Kayıtlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/admin/kullanicilar\')">Tümü</button>' +
        '</div>' +
        '<div class="kb-card" style="padding:0 16px">' +
          _adminUserRow('Mehmet Kaya',      'Kurye',   'Aktif') +
          _adminUserRow('Lezzet Dükkanım',  'Esnaf', 'Aktif') +
          _adminUserRow('XYZ Kargo',        'Kurye Firması',   'Doğrulama Bekliyor') +
          _adminUserRow('Aday Kurye',       'Kurye',   'Askıda') +
        '</div>' +
      '</div>'
    );
  }

  function _healthRow(label, val, type) {
    var colors = { success: 'var(--c-success)', warning: 'var(--c-warning)', danger: 'var(--c-danger)' };
    return '<div class="flex items-center justify-between" style="padding:6px 0;border-bottom:1px solid var(--border)">' +
      '<span style="font-size:.85rem">' + label + '</span>' +
      '<span style="font-size:.82rem;font-weight:700;color:' + (colors[type] || 'var(--muted)') + '">' + val + '</span>' +
    '</div>';
  }

  function _adminQBtn(icon, label, route, bg) {
    return '<button class="quick-btn" onclick="Router.go(\'' + route + '\')">' +
      '<div class="quick-btn__icon" style="background:' + bg + '">' + icon + '</div>' +
      '<div class="quick-btn__label">' + label + '</div>' +
    '</button>';
  }

  function _adminUserRow(name, role, status) {
    var statusClass = status === 'Aktif' ? 'kb-chip--success' : status === 'Askıda' ? 'kb-chip--danger' : 'kb-chip--warning';
    return '<div class="admin-user-row">' +
      '<div class="kb-avatar" style="background:var(--c-admin)">' + initials(name) + '</div>' +
      '<div class="admin-user-row__info">' +
        '<div class="admin-user-row__name">' + name + '</div>' +
        '<div class="admin-user-row__sub">' + role + '</div>' +
      '</div>' +
      '<span class="kb-chip ' + statusClass + '">' + status + '</span>' +
    '</div>';
  }

  /* ── 2. KULLANICILAR ────────────────────────────────────── */
  function kullanicilar() {
    if (!_guard()) return;
    showAppBar('Kullanıcılar', true,
      '<button class="kb-appbar__action">' + ICON.search + '</button>'
    );
    showBottomNav();
    setActiveNav('kullanicilar');

    var users = [
      { name: 'Mehmet Kaya',     role: 'Kurye',   status: 'active'   },
      { name: 'ABC Lojistik',    role: 'Kurye Firması',   status: 'active'   },
      { name: 'Lezzet Dükkanım', role: 'Esnaf', status: 'active'   },
      { name: 'Ayşe Demir',      role: 'Kurye',   status: 'active'   },
      { name: 'XYZ Kargo',       role: 'Kurye Firması',   status: 'pending'  },
      { name: 'Deneme Kullanıcı',role: 'Kurye',   status: 'suspended'}
    ];

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-search">' + ICON.search + '<input type="text" placeholder="Kullanıcı ara..."></div>' +
        '<div class="kb-tabs" id="usr-tabs">' +
          '<button class="kb-tab active" onclick="AdminScreens._userFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._userFilter(\'kurye\',this)">Kurye</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._userFilter(\'firma\',this)">Kurye Firması</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._userFilter(\'isletme\',this)">Esnaf</button>' +
        '</div>' +
        '<div id="usr-list" class="kb-card" style="padding:0 16px">' +
          users.map(function (u) { return _userRow(u); }).join('') +
        '</div>' +
      '</div>'
    );
  }

  var _allUsers = [
    { name: 'Mehmet Kaya',     role: 'Kurye',   roleLow: 'kurye',   status: 'active'    },
    { name: 'ABC Lojistik',    role: 'Kurye Firması',   roleLow: 'firma',   status: 'active'    },
    { name: 'Lezzet Dükkanım', role: 'Esnaf', roleLow: 'isletme', status: 'active'    },
    { name: 'Ayşe Demir',      role: 'Kurye',   roleLow: 'kurye',   status: 'active'    },
    { name: 'XYZ Kargo',       role: 'Kurye Firması',   roleLow: 'firma',   status: 'pending'   },
    { name: 'Deneme',          role: 'Kurye',   roleLow: 'kurye',   status: 'suspended' }
  ];

  function _userRow(u) {
    var sc = u.status === 'active' ? 'kb-chip--success' : u.status === 'pending' ? 'kb-chip--warning' : 'kb-chip--danger';
    var sl = u.status === 'active' ? 'Aktif' : u.status === 'pending' ? 'Bekliyor' : 'Askıda';
    return '<div class="admin-user-row">' +
      '<div class="kb-avatar" style="background:var(--c-admin)">' + initials(u.name) + '</div>' +
      '<div class="admin-user-row__info">' +
        '<div class="admin-user-row__name">' + u.name + '</div>' +
        '<div class="admin-user-row__sub">' + u.role + '</div>' +
      '</div>' +
      '<div class="admin-actions">' +
        '<span class="kb-chip ' + sc + '" style="padding:4px 8px">' + sl + '</span>' +
        '<button class="kb-chip" onclick="AdminScreens._userAction(\'' + u.name + '\')">' + ICON.settings + '</button>' +
      '</div>' +
    '</div>';
  }

  function _userFilter(type, btn) {
    document.querySelectorAll('#usr-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var filtered = type === 'tumu' ? _allUsers : _allUsers.filter(function (u) { return u.roleLow === type; });
    var el = document.getElementById('usr-list');
    if (el) el.innerHTML = filtered.map(function (u) { return _userRow(u); }).join('');
  }

  function _userAction(name) {
    toast(name + ' için işlem menüsü yakında.');
  }

  /* ── 3. İLAN DENETİMİ ──────────────────────────────────── */
  function ilanlar() {
    if (!_guard()) return;
    showAppBar('İlan Denetimi', true);
    showBottomNav();
    setActiveNav('ilanlar');

    var listings = [
      { title: 'Motorlu Kurye',  owner: 'ABC Lojistik',    status: 'approved' },
      { title: 'Yaya Kurye',     owner: 'Lezzet Dükkanım', status: 'pending'  },
      { title: 'Araçlı Kurye',   owner: 'XYZ Kargo',       status: 'approved' },
      { title: 'Motorlu Kurye',  owner: 'Hızlı Kargo',     status: 'rejected' },
      { title: 'Yaya Kurye',     owner: 'Kasap Ali',       status: 'pending'  }
    ];

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="ilan-dn-tabs">' +
          '<button class="kb-tab active" onclick="AdminScreens._ilanDnFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._ilanDnFilter(\'pending\',this)">Bekleyen</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._ilanDnFilter(\'approved\',this)">Onaylı</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._ilanDnFilter(\'rejected\',this)">Reddedildi</button>' +
        '</div>' +
        '<div id="ilan-dn-list">' +
          listings.map(function (l) { return _ilanRow(l); }).join('') +
        '</div>' +
      '</div>'
    );

    window._adminIlanData = listings;
  }

  function _ilanRow(l) {
    var sc = l.status === 'approved' ? 'kb-chip--success' : l.status === 'pending' ? 'kb-chip--warning' : 'kb-chip--danger';
    var sl = l.status === 'approved' ? 'Onaylandı' : l.status === 'pending' ? 'Bekliyor' : 'Reddedildi';
    return '<div class="kb-card" style="margin-bottom:8px">' +
      '<div class="flex items-center justify-between mb-8">' +
        '<div style="font-weight:700">' + l.title + '</div>' +
        '<span class="kb-chip ' + sc + '">' + sl + '</span>' +
      '</div>' +
      '<div style="font-size:.82rem;color:var(--muted);margin-bottom:8px">' + l.owner + '</div>' +
      (l.status === 'pending' ?
        '<div class="flex" style="gap:8px">' +
          '<button class="btn btn--success btn--sm" style="flex:1" onclick="AdminScreens._ilanOnay(this, \'approved\')">Onayla</button>' +
          '<button class="btn btn--danger btn--sm" style="flex:1" onclick="AdminScreens._ilanOnay(this, \'rejected\')">Reddet</button>' +
        '</div>' : '') +
    '</div>';
  }

  function _ilanDnFilter(type, btn) {
    document.querySelectorAll('#ilan-dn-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var data = window._adminIlanData || [];
    var filtered = type === 'tumu' ? data : data.filter(function (l) { return l.status === type; });
    var el = document.getElementById('ilan-dn-list');
    if (el) el.innerHTML = filtered.map(function (l) { return _ilanRow(l); }).join('');
  }

  function _ilanOnay(btn, action) {
    toast(action === 'approved' ? 'İlan onaylandı.' : 'İlan reddedildi.');
    var card = btn.closest('.kb-card');
    if (card) {
      var badge = card.querySelector('.kb-chip');
      if (badge) {
        badge.className = 'kb-chip ' + (action === 'approved' ? 'kb-chip--success' : 'kb-chip--danger');
        badge.textContent = action === 'approved' ? 'Onaylandı' : 'Reddedildi';
      }
      var btnRow = card.querySelector('.flex');
      if (btnRow && btnRow.children.length === 2) btnRow.remove();
    }
  }

  /* ── 4. RAPORLAR ────────────────────────────────────────── */
  function raporlar() {
    if (!_guard()) return;
    showAppBar('Raporlar', true);
    showBottomNav();
    setActiveNav('raporlar');

    renderScreen(
      '<div class="kb-screen-inner">' +

        '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto">' +
          '<button class="kb-chip kb-chip--accent">Son 7 Gün</button>' +
          '<button class="kb-chip">Son 30 Gün</button>' +
          '<button class="kb-chip">Bu Yıl</button>' +
        '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Genel Bakış</div></div>' +
        '<div class="admin-stat-grid">' +
          '<div class="admin-stat"><div class="admin-stat__val">+842</div><div class="admin-stat__lbl">Yeni Kullanıcı (7g)</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">+156</div><div class="admin-stat__lbl">Yeni İlan (7g)</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">+2.3K</div><div class="admin-stat__lbl">Başvuru (7g)</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">%87</div><div class="admin-stat__lbl">Eşleşme Oranı</div></div>' +
        '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Kullanıcı Dağılımı</div></div>' +
        '<div class="kb-card">' +
          _barRow('Kurye',   65, 'var(--c-kurye)') +
          _barRow('Kurye Firması',   20, 'var(--c-firma)') +
          _barRow('Esnaf', 15, 'var(--c-isletme)') +
        '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Aktivite Grafiği</div></div>' +
        '<div class="chart-placeholder">📊 Grafik verisi yükleniyor...</div>' +
      '</div>'
    );
  }

  function _barRow(label, pct, color) {
    return '<div style="margin-bottom:12px">' +
      '<div class="flex justify-between mb-8" style="font-size:.82rem">' +
        '<span style="font-weight:600">' + label + '</span>' +
        '<span style="color:var(--muted)">' + pct + '%</span>' +
      '</div>' +
      '<div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">' +
        '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:4px;transition:width .4s"></div>' +
      '</div>' +
    '</div>';
  }

  /* ── 5. ŞİKAYETLER ─────────────────────────────────────── */
  function sikayetler() {
    if (!_guard()) return;
    showAppBar('Şikayetler', true);
    showBottomNav();

    var complaints = [
      { id: '1', reporter: 'Mehmet Kaya',   target: 'ABC Lojistik',   type: 'Spam',          time: '2 saat önce' },
      { id: '2', reporter: 'Ayşe Demir',    target: 'XYZ Kargo',      type: 'Yanıltıcı İlan', time: '5 saat önce' },
      { id: '3', reporter: 'Can Bağlar',    target: 'Hub Dağıtım',    type: 'Hakaret',        time: 'Dün'         }
    ];

    renderScreen(
      '<div class="kb-screen-inner">' +
        complaints.map(function (c) {
          return '<div class="kb-card" style="margin-bottom:10px">' +
            '<div class="flex items-center justify-between mb-8">' +
              '<span class="kb-chip kb-chip--danger">' + c.type + '</span>' +
              '<span style="font-size:.72rem;color:var(--muted)">' + c.time + '</span>' +
            '</div>' +
            '<div style="font-size:.85rem;margin-bottom:4px">' +
              '<b>' + c.reporter + '</b> → <b>' + c.target + '</b> hakkında şikayet' +
            '</div>' +
            '<div class="flex" style="gap:8px;margin-top:10px">' +
              '<button class="btn btn--outline btn--sm" style="flex:1" onclick="toast(\'İncelemeye alındı.\')">İncele</button>' +
              '<button class="btn btn--danger btn--sm" style="flex:1" onclick="toast(\'Kullanıcı uyarıldı.\')">Uyar</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>'
    );
  }

  /* ── 6. SİSTEM AYARLARI ─────────────────────────────────── */
  function ayarlar() {
    if (!_guard()) return;
    showAppBar('Sistem Ayarları', true);
    showBottomNav();
    setActiveNav('ayarlar');

    renderScreen(
      '<div class="kb-screen-inner">' +

        _adminSection('Genel Ayarlar', [
          'Uygulama adı ve sloganı',
          'Desteklenen diller',
          'Para birimi ayarları'
        ]) +

        _adminSection('Bildirim Ayarları', [
          'Push bildirim şablonları',
          'E-posta bildirimleri',
          'SMS bildirimleri'
        ]) +

        _adminSection('Güvenlik', [
          'İki faktörlü doğrulama',
          'Oturum zaman aşımı',
          'IP beyaz listesi'
        ]) +

        _adminSection('Rol & Yetki Yönetimi', [
          'Admin rolleri tanımla',
          'Bölge yetkilisi ata',
          'İzin grupları'
        ]) +

        _adminSection('Sözleşmeler', [
          'Kullanıcı Sözleşmesi',
          'Gizlilik Politikası',
          'KVKK Metni'
        ]) +

        _adminSection('Sistem Logları', [
          'Hata logları',
          'Erişim logları',
          'Değişiklik geçmişi'
        ]) +
      '</div>'
    );
  }

  function _adminSection(title, items) {
    return '<div style="margin-bottom:16px">' +
      '<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px">' + title + '</div>' +
      '<div class="kb-card" style="padding:0 16px">' +
        items.map(function (item) {
          return '<div class="profile-menu-item" style="padding:12px 0">' +
            '<div class="profile-menu-item__icon">' + ICON.settings + '</div>' +
            '<div class="profile-menu-item__label">' + item + '</div>' +
            '<div class="profile-menu-item__chevron">' + ICON.chevron + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  return {
    panel         : panel,
    kullanicilar  : kullanicilar,
    ilanlar       : ilanlar,
    raporlar      : raporlar,
    sikayetler    : sikayetler,
    ayarlar       : ayarlar,
    _userFilter   : _userFilter,
    _userAction   : _userAction,
    _ilanDnFilter : _ilanDnFilter,
    _ilanOnay     : _ilanOnay
  };

})();
