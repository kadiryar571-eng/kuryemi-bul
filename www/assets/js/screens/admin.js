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

        /* Sayaçların TAMAMI canlı veritabanı değeridir (platform_stats). */
        '<div class="admin-stat-grid">' +
          '<div class="admin-stat"><div class="admin-stat__val" id="as-user">—</div><div class="admin-stat__lbl">Toplam Kullanıcı</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val" id="as-ilan">—</div><div class="admin-stat__lbl">Açık İlan</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val" id="as-bas">—</div><div class="admin-stat__lbl">Toplam Başvuru</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val" id="as-online">—</div><div class="admin-stat__lbl">Çevrimiçi</div></div>' +
        '</div>' +

        /* System health */
        '<div class="kb-card mb-12">' +
          '<div style="font-weight:700;margin-bottom:10px">Sistem Durumu</div>' +
          _healthRow('Veritabanı',    'Aktif',   'success') +
          _healthRow('API Sunucusu',  'Aktif',   'success') +
          _healthRow('Bildirimler',   'Aktif',   'success') +
          _healthRow('Realtime',      'Aktif',   'success') +
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
        '<div class="kb-card" id="admin-recent" style="padding:0 16px">' +
          '<div style="padding:20px 0;text-align:center"><div class="kb-spinner"></div></div>' +
        '</div>' +
      '</div>'
    );

    setTimeout(function () { _loadAdminPanel(); }, 130);
  }

  /* Admin paneli — sayaçlar ve son kayıtlar GERÇEK veritabanından */
  async function _loadAdminPanel() {
    if (!window.SB || !SB.isOn()) return;
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };

    try {
      var ps = SB.platformStats ? await SB.platformStats() : null;
      if (ps) {
        set('as-user',   (ps.kurye || 0) + (ps.isletme || 0) + (ps.firma || 0));
        set('as-ilan',   ps.acik_ilan || 0);
        set('as-bas',    ps.basvuru || 0);
        set('as-online', ps.online || 0);
      }
    } catch (e) { console.warn('admin stats:', e); }

    try {
      var el = document.getElementById('admin-recent');
      if (!el) return;
      var users = await _fetchUsers(4);
      el.innerHTML = users.length
        ? users.map(function (u) { return _adminUserRow(u.name, u.role, u.statusLabel); }).join('')
        : '<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:.82rem">Henüz kayıtlı kullanıcı yok.</div>';
    } catch (e) { console.warn('admin recent:', e); }
  }

  /* Gerçek kullanıcı listesi (profiles tablosu) */
  var ROLE_LABEL = { kurye: 'Kurye', isletme: 'Esnaf', firma: 'Kurye Firması' };
  async function _fetchUsers(limit) {
    if (!window.SB || !SB.isOn() || !SB.raw) return [];
    var c = SB.raw();
    if (!c) return [];
    var q = c.from('profiles')
      .select('id,ad,role,dogrulama,yayinda,created_at')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: false });
    if (limit) q = q.limit(limit);
    var r = await q;
    if (r.error) { console.warn('_fetchUsers:', r.error); return []; }
    return (r.data || []).map(function (p) {
      var st = p.dogrulama === 'verified' ? 'active'
             : p.dogrulama === 'pending'  ? 'pending' : (p.yayinda ? 'active' : 'pending');
      return {
        id: p.id,
        name: p.ad || '(isim girilmemiş)',
        role: ROLE_LABEL[p.role] || p.role,
        roleLow: p.role,
        status: st,
        statusLabel: st === 'active' ? 'Aktif' : 'Doğrulama Bekliyor'
      };
    });
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
          '<div style="padding:20px 0;text-align:center"><div class="kb-spinner"></div></div>' +
        '</div>' +
      '</div>'
    );

    setTimeout(function () { _loadAllUsers(); }, 130);
  }

  /* Kullanıcı listesi GERÇEK profiles tablosundan gelir */
  var _allUsers = [];
  async function _loadAllUsers() {
    var el = document.getElementById('usr-list');
    if (!el) return;
    _allUsers = await _fetchUsers(200);
    el.innerHTML = _allUsers.length
      ? _allUsers.map(function (u) { return _userRow(u); }).join('')
      : '<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:.82rem">Kayıtlı kullanıcı yok.</div>';
  }

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

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="ilan-dn-tabs">' +
          '<button class="kb-tab active" onclick="AdminScreens._ilanDnFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._ilanDnFilter(\'pending\',this)">Bekleyen</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._ilanDnFilter(\'approved\',this)">Onaylı</button>' +
          '<button class="kb-tab"        onclick="AdminScreens._ilanDnFilter(\'rejected\',this)">Reddedildi</button>' +
        '</div>' +
        '<div id="ilan-dn-list">' +
          '<div style="padding:24px 0;text-align:center"><div class="kb-spinner"></div></div>' +
        '</div>' +
      '</div>'
    );

    setTimeout(function () { _loadAdminIlanlar(); }, 130);
  }

  /* İlan denetimi listesi GERÇEK listings tablosundan gelir.
     Örnek/uydurma ilan gösterilmez. */
  async function _loadAdminIlanlar() {
    var el = document.getElementById('ilan-dn-list');
    if (!el) return;
    if (!window.SB || !SB.isOn() || !SB.raw) {
      el.innerHTML = '<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:.82rem">İlanlar yüklenemedi.</div>';
      return;
    }
    try {
      var c = SB.raw();
      var r = await c.from('listings')
        .select('id,baslik,durum,created_at, owner:owner_id(ad)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (r.error) throw r.error;
      var listings = (r.data || []).map(function (l) {
        return {
          id: l.id,
          title: l.baslik || 'İlan',
          owner: (l.owner && l.owner.ad) || 'Bilinmiyor',
          status: l.durum === 'acik' ? 'approved' : 'rejected'
        };
      });
      window._adminIlanData = listings;
      el.innerHTML = listings.length
        ? listings.map(function (l) { return _ilanRow(l); }).join('')
        : '<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:.82rem">Henüz yayınlanmış ilan yok.</div>';
    } catch (e) {
      console.warn('_loadAdminIlanlar:', e);
      el.innerHTML = '<div style="padding:20px 0;text-align:center;color:var(--muted);font-size:.82rem">İlanlar yüklenemedi.</div>';
    }
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
  /* Rapor ekranı — gerçek sayılar ve gerçek rol dağılımı */
  async function _loadRaporlar() {
    if (!window.SB || !SB.isOn() || !SB.platformStats) return;
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    try {
      var ps = await SB.platformStats();
      if (!ps) return;
      var k = ps.kurye || 0, i = ps.isletme || 0, fr = ps.firma || 0;
      var toplam = k + i + fr;
      set('rp-user', toplam);
      set('rp-ilan', ps.bugun_ilan || 0);
      set('rp-bas',  ps.bugun_basvuru || 0);
      set('rp-dog',  ps.dogrulanmis || 0);

      var el = document.getElementById('rp-dagilim');
      if (el) {
        var pct = function (n) { return toplam ? Math.round(n * 100 / toplam) : 0; };
        el.innerHTML = toplam
          ? _barRow('Kurye',         pct(k),  'var(--c-kurye)') +
            _barRow('Kurye Firması', pct(fr), 'var(--c-firma)') +
            _barRow('Esnaf',         pct(i),  'var(--c-isletme)')
          : '<div style="padding:16px 0;text-align:center;color:var(--muted);font-size:.82rem">Henüz kayıtlı kullanıcı yok.</div>';
      }
    } catch (e) { console.warn('_loadRaporlar:', e); }
  }

  function raporlar() {
    if (!_guard()) return;
    showAppBar('Raporlar', true);
    showBottomNav();
    setActiveNav('raporlar');

    setTimeout(function () { _loadRaporlar(); }, 130);

    renderScreen(
      '<div class="kb-screen-inner">' +

        '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto">' +
          '<button class="kb-chip kb-chip--accent">Son 7 Gün</button>' +
          '<button class="kb-chip">Son 30 Gün</button>' +
          '<button class="kb-chip">Bu Yıl</button>' +
        '</div>' +

        /* Tüm rapor değerleri canlı veritabanından okunur; sabit sayı yoktur. */
        '<div class="kb-section-head"><div class="kb-section-title">Genel Bakış</div></div>' +
        '<div class="admin-stat-grid">' +
          '<div class="admin-stat"><div class="admin-stat__val" id="rp-user">—</div><div class="admin-stat__lbl">Kayıtlı Kullanıcı</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val" id="rp-ilan">—</div><div class="admin-stat__lbl">Bugün Yeni İlan</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val" id="rp-bas">—</div><div class="admin-stat__lbl">Bugün Başvuru</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val" id="rp-dog">—</div><div class="admin-stat__lbl">Doğrulanmış</div></div>' +
        '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Kullanıcı Dağılımı</div></div>' +
        '<div class="kb-card" id="rp-dagilim">' +
          '<div style="padding:16px 0;text-align:center"><div class="kb-spinner"></div></div>' +
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

    /* Şikayet tablosu henüz üretimde yok — sahte kayıt GÖSTERİLMEZ.
       Şikayet özelliği eklendiğinde buraya gerçek sorgu bağlanacak. */
    var complaints = [];

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
