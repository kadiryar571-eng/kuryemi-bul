/* ============================================================
   KuryemiBul — screens/admin.js
   Komuta Merkezi — SADECE admin rolünde görünür
   ============================================================ */
window.AdminScreens = (function () {
  'use strict';

  function _guard() { return requireAdmin(); }

  /* ── PANEL ──────────────────────────────────────────────── */
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
          '<div class="admin-stat"><div class="admin-stat__val" id="ap-stat-users">…</div><div class="admin-stat__lbl">Toplam Kullanıcı</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val" id="ap-stat-kyc">…</div><div class="admin-stat__lbl">Bekleyen KYC</div></div>' +
        '</div>' +
        '<div class="kb-section-head"><div class="kb-section-title">Hızlı Erişim</div></div>' +
        '<div class="quick-actions">' +
          _qBtn('👥', 'Kullanıcılar',  '/admin/kullanicilar') +
          _qBtn('🪪', 'KYC Onayları',  '/admin/kyc') +
          _qBtn('📋', 'İlanlar',        '/admin/ilanlar') +
          _qBtn('⚠️', 'Şikayetler',    '/admin/sikayetler') +
        '</div>' +
        '<div id="ap-recent">' +
          '<div class="kb-section-head">' +
            '<div class="kb-section-title">Son Kayıtlar</div>' +
            '<button class="kb-section-link" onclick="Router.go(\'/admin/kullanicilar\')">Tümü</button>' +
          '</div>' +
          '<div class="kb-card" style="padding:16px;text-align:center;color:var(--muted)">Yükleniyor…</div>' +
        '</div>' +
      '</div>',
      _loadPanelData
    );
  }

  function _qBtn(icon, label, route) {
    return '<button class="quick-btn" onclick="Router.go(\'' + route + '\')">' +
      '<div class="quick-btn__icon">' + icon + '</div>' +
      '<div class="quick-btn__label">' + label + '</div>' +
    '</button>';
  }

  async function _loadPanelData() {
    if (!window.SB || !SB.isOn()) return;
    try {
      var s = await SB.adminStats();
      var eu = document.getElementById('ap-stat-users');
      var ek = document.getElementById('ap-stat-kyc');
      if (eu) eu.textContent = (s.totalUsers || 0).toLocaleString('tr-TR');
      if (ek) ek.textContent = s.pendingKyc || 0;
    } catch (e) {}

    try {
      var users = await SB.adminListUsers('tumu');
      var el = document.getElementById('ap-recent');
      if (!el) return;
      var rows = users.slice(0, 5).map(function (u) { return _userRow(u); }).join('');
      el.innerHTML =
        '<div class="kb-section-head">' +
          '<div class="kb-section-title">Son Kayıtlar</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/admin/kullanicilar\')">Tümü</button>' +
        '</div>' +
        '<div class="kb-card" style="padding:0 16px">' +
          (rows || '<div style="padding:16px;text-align:center;color:var(--muted)">Henüz kullanıcı yok.</div>') +
        '</div>';
    } catch (e) {}
  }

  /* ── KULLANICILAR ───────────────────────────────────────── */
  function kullanicilar() {
    if (!_guard()) return;
    showAppBar('Kullanıcılar', true,
      '<button class="kb-appbar__action">' + ICON.search + '</button>'
    );
    showBottomNav();
    setActiveNav('kullanicilar');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="usr-tabs">' +
          '<button class="kb-tab active" onclick="AdminScreens._userFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab" onclick="AdminScreens._userFilter(\'kurye\',this)">Kurye</button>' +
          '<button class="kb-tab" onclick="AdminScreens._userFilter(\'firma\',this)">Firma</button>' +
          '<button class="kb-tab" onclick="AdminScreens._userFilter(\'isletme\',this)">İşletme</button>' +
        '</div>' +
        '<div id="usr-list"><div style="padding:32px;text-align:center;color:var(--muted)">Yükleniyor…</div></div>' +
      '</div>',
      function () { _loadUsers('tumu'); }
    );
  }

  async function _loadUsers(role) {
    var el = document.getElementById('usr-list');
    if (!el) return;
    el.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">Yükleniyor…</div>';
    try {
      var users = await SB.adminListUsers(role);
      if (!users.length) {
        el.innerHTML = '<div class="kb-card" style="padding:16px;text-align:center;color:var(--muted)">Kullanıcı bulunamadı.</div>';
        return;
      }
      el.innerHTML = '<div class="kb-card" style="padding:0 16px">' +
        users.map(function (u) { return _userRow(u); }).join('') +
      '</div>';
    } catch (e) {
      el.innerHTML = '<div class="kb-card" style="padding:16px;text-align:center;color:var(--muted)">Veri yüklenemedi.</div>';
    }
  }

  function _userFilter(role, btn) {
    document.querySelectorAll('#usr-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    _loadUsers(role);
  }

  function _userRow(u) {
    var roleMap = { kurye: 'Kurye', firma: 'Firma', isletme: 'İşletme' };
    var dogLabel = { none: 'Doğrulanmamış', pending: 'Bekliyor', verified: 'Doğrulandı', rejected: 'Reddedildi' }[u.dogrulama] || '—';
    var dogClass = { verified: 'kb-chip--success', pending: 'kb-chip--warning', rejected: 'kb-chip--danger', none: '' }[u.dogrulama] || '';
    return '<div class="admin-user-row">' +
      '<div class="kb-avatar" style="background:var(--c-admin)">' + initials(u.ad || '?') + '</div>' +
      '<div class="admin-user-row__info">' +
        '<div class="admin-user-row__name">' + (u.ad || 'İsimsiz') + '</div>' +
        '<div class="admin-user-row__sub">' + (roleMap[u.role] || u.role) + '</div>' +
      '</div>' +
      '<span class="kb-chip ' + dogClass + '" style="font-size:.72rem">' + dogLabel + '</span>' +
    '</div>';
  }

  /* ── KYC LİSTESİ ────────────────────────────────────────── */
  function kycListesi() {
    if (!_guard()) return;
    showAppBar('KYC Başvuruları', true);
    showBottomNav();

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div id="kyc-list"><div style="padding:40px;text-align:center;color:var(--muted)">Yükleniyor…</div></div>' +
      '</div>',
      _loadKycList
    );
  }

  async function _loadKycList() {
    var el = document.getElementById('kyc-list');
    if (!el) return;
    var list = [];
    try { list = await SB.listPendingKyc(); } catch (e) {}

    if (!list.length) {
      el.innerHTML =
        '<div class="kb-card" style="padding:32px;text-align:center">' +
          '<div style="font-size:2.5rem;margin-bottom:10px">✅</div>' +
          '<div style="font-weight:700;margin-bottom:4px">Bekleyen başvuru yok</div>' +
          '<div style="font-size:.85rem;color:var(--muted)">Tüm KYC başvuruları incelendi.</div>' +
        '</div>';
      return;
    }

    el.innerHTML = list.map(function (k) {
      var tcMasked = k.tc_no ? k.tc_no.slice(0, 3) + '****' + k.tc_no.slice(-2) : '—';
      return '<div class="kb-card" style="margin-bottom:10px" id="kyc-' + k.profile_id + '">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
          '<div class="kb-avatar" style="background:var(--c-admin)">' + initials(k.ad || '?') + '</div>' +
          '<div>' +
            '<div style="font-weight:700">' + (k.ad || 'İsimsiz') + '</div>' +
            '<div style="font-size:.75rem;color:var(--muted)">' + (k.role || '') + ' · ' + _timeAgo(k.created_at) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="background:var(--surface2);border-radius:8px;padding:10px 12px;font-size:.82rem;margin-bottom:10px;line-height:1.8">' +
          '<div><b>Ad Soyad:</b> ' + (k.ad_soyad || '—') + '</div>' +
          '<div><b>TC No:</b> ' + tcMasked + '</div>' +
          '<div><b>Belge Türü:</b> ' + (k.belge_turu || '—') + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn--success btn--sm" style="flex:1" ' +
            'onclick="AdminScreens._kycReview(\'' + k.profile_id + '\',\'verified\',this)">✅ Onayla</button>' +
          '<button class="btn btn--danger btn--sm" style="flex:1" ' +
            'onclick="AdminScreens._kycReview(\'' + k.profile_id + '\',\'rejected\',this)">❌ Reddet</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  async function _kycReview(profileId, decision, btn) {
    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = '…';
    try {
      await SB.reviewKyc(profileId, decision);
      var card = document.getElementById('kyc-' + profileId);
      if (card) {
        var color = decision === 'verified' ? 'var(--c-success)' : 'var(--c-danger)';
        card.innerHTML =
          '<div style="padding:16px;text-align:center;font-weight:700;color:' + color + '">' +
            (decision === 'verified' ? '✅ Onaylandı' : '❌ Reddedildi') +
          '</div>';
      }
      toast(decision === 'verified' ? 'KYC onaylandı.' : 'KYC reddedildi.');
    } catch (e) {
      toast('Hata: ' + (e.message || 'İşlem başarısız.'));
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  function _timeAgo(isoStr) {
    if (!isoStr) return '';
    var diff = Math.floor((Date.now() - new Date(isoStr)) / 60000);
    if (diff < 60)   return diff + ' dk önce';
    if (diff < 1440) return Math.floor(diff / 60) + ' saat önce';
    return Math.floor(diff / 1440) + ' gün önce';
  }

  /* ── İLAN DENETİMİ ──────────────────────────────────────── */
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
    window._adminIlanData = listings;

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="ilan-dn-tabs">' +
          '<button class="kb-tab active" onclick="AdminScreens._ilanDnFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab" onclick="AdminScreens._ilanDnFilter(\'pending\',this)">Bekleyen</button>' +
          '<button class="kb-tab" onclick="AdminScreens._ilanDnFilter(\'approved\',this)">Onaylı</button>' +
          '<button class="kb-tab" onclick="AdminScreens._ilanDnFilter(\'rejected\',this)">Reddedildi</button>' +
        '</div>' +
        '<div id="ilan-dn-list">' +
          listings.map(function (l) { return _ilanRow(l); }).join('') +
        '</div>' +
      '</div>'
    );
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
          '<button class="btn btn--success btn--sm" style="flex:1" onclick="AdminScreens._ilanOnay(this,\'approved\')">Onayla</button>' +
          '<button class="btn btn--danger btn--sm" style="flex:1" onclick="AdminScreens._ilanOnay(this,\'rejected\')">Reddet</button>' +
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
    if (!card) return;
    var badge = card.querySelector('.kb-chip');
    if (badge) {
      badge.className = 'kb-chip ' + (action === 'approved' ? 'kb-chip--success' : 'kb-chip--danger');
      badge.textContent = action === 'approved' ? 'Onaylandı' : 'Reddedildi';
    }
    var btnRow = btn.closest('.flex');
    if (btnRow) btnRow.remove();
  }

  /* ── RAPORLAR ───────────────────────────────────────────── */
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
          '<div class="admin-stat"><div class="admin-stat__val" id="r-new-users">…</div><div class="admin-stat__lbl">Yeni Kullanıcı</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">—</div><div class="admin-stat__lbl">Yeni İlan</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">—</div><div class="admin-stat__lbl">Başvuru</div></div>' +
          '<div class="admin-stat"><div class="admin-stat__val">—</div><div class="admin-stat__lbl">Eşleşme</div></div>' +
        '</div>' +
        '<div class="kb-section-head"><div class="kb-section-title">Kullanıcı Dağılımı</div></div>' +
        '<div class="kb-card" id="r-dist">Yükleniyor…</div>' +
      '</div>',
      _loadRaporlar
    );
  }

  async function _loadRaporlar() {
    if (!window.SB || !SB.isOn()) return;
    try {
      var users = await SB.adminListUsers('tumu');
      var total = users.length;
      var byRole = { kurye: 0, firma: 0, isletme: 0 };
      users.forEach(function (u) { if (byRole[u.role] !== undefined) byRole[u.role]++; });

      var week = new Date(Date.now() - 7 * 86400000).toISOString();
      var newUsers = users.filter(function (u) { return u.created_at > week; }).length;

      var el = document.getElementById('r-new-users');
      if (el) el.textContent = '+' + newUsers;

      var dist = document.getElementById('r-dist');
      if (dist && total > 0) {
        dist.innerHTML =
          _barRow('Kurye',   Math.round(byRole.kurye   / total * 100), 'var(--c-kurye)') +
          _barRow('Firma',   Math.round(byRole.firma   / total * 100), 'var(--c-firma)') +
          _barRow('İşletme', Math.round(byRole.isletme / total * 100), 'var(--c-isletme)');
      }
    } catch (e) {}
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

  /* ── ŞİKAYETLER ─────────────────────────────────────────── */
  function sikayetler() {
    if (!_guard()) return;
    showAppBar('Şikayetler', true);
    showBottomNav();

    var complaints = [
      { id: '1', reporter: 'Mehmet Kaya', target: 'ABC Lojistik',  type: 'Spam',           time: '2 saat önce' },
      { id: '2', reporter: 'Ayşe Demir', target: 'XYZ Kargo',      type: 'Yanıltıcı İlan', time: '5 saat önce' },
      { id: '3', reporter: 'Can Bağlar', target: 'Hub Dağıtım',    type: 'Hakaret',         time: 'Dün' }
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

  /* ── SİSTEM AYARLARI ────────────────────────────────────── */
  function ayarlar() {
    if (!_guard()) return;
    showAppBar('Sistem Ayarları', true);
    showBottomNav();
    setActiveNav('ayarlar');

    renderScreen(
      '<div class="kb-screen-inner">' +
        _sect('KYC & Doğrulama', [
          { icon: 'shield', label: 'Bekleyen KYC Başvuruları', fn: "Router.go('/admin/kyc')" },
          { icon: 'check',  label: 'Onay Geçmişi',             fn: "toast('Bu özellik yakında aktif edilecek.')" }
        ]) +
        _sect('Kullanıcı Yönetimi', [
          { icon: 'users',    label: 'Tüm Kullanıcılar',  fn: "Router.go('/admin/kullanicilar')" },
          { icon: 'settings', label: 'Hesap Yönetimi',    fn: "toast('Bu özellik yakında aktif edilecek.')" }
        ]) +
        _sect('İlan & Şikayet', [
          { icon: 'list', label: 'İlan Denetimi', fn: "Router.go('/admin/ilanlar')" },
          { icon: 'flag', label: 'Şikayetler',    fn: "Router.go('/admin/sikayetler')" }
        ]) +
        _sect('Yasal Metinler', [
          { icon: 'doc', label: 'Kullanıcı Sözleşmesi', fn: "window.open('/sartlar.html','_blank')" },
          { icon: 'doc', label: 'Gizlilik Politikası',  fn: "window.open('/gizlilik.html','_blank')" },
          { icon: 'doc', label: 'KVKK Metni',           fn: "window.open('/kvkk.html','_blank')" }
        ]) +
        _sect('Sistem', [
          { icon: 'settings', label: 'Supabase Bağlantısı', fn: "AdminScreens._pingSupabase()" },
          { icon: 'settings', label: 'Uygulama Versiyonu',  fn: "AdminScreens._showVersion()" },
          { icon: 'bell',     label: 'Push Bildirimleri',   fn: "toast('Bu özellik yakında aktif edilecek.')" }
        ]) +
      '</div>'
    );
  }

  function _sect(title, items) {
    return '<div style="margin-bottom:16px">' +
      '<div style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px">' + title + '</div>' +
      '<div class="kb-card" style="padding:0 16px">' +
        items.map(function (it) {
          return '<div class="profile-menu-item" style="cursor:pointer" onclick="' + it.fn + '">' +
            '<div class="profile-menu-item__icon">' + ICON[it.icon] + '</div>' +
            '<div class="profile-menu-item__label">' + it.label + '</div>' +
            '<div class="profile-menu-item__chevron">' + ICON.chevron + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  async function _pingSupabase() {
    if (!window.SB || !SB.isOn()) { toast('Supabase: bağlantı yok (demo mod)'); return; }
    toast('Supabase kontrol ediliyor…');
    try {
      var ok = await SB.amIAdmin();
      toast('Supabase: bağlı ✓ | Admin yetkisi: ' + (ok ? 'Evet ✓' : 'Hayır ✗'));
    } catch (e) {
      toast('Bağlantı hatası: ' + (e.message || 'bilinmiyor'));
    }
  }

  function _showVersion() {
    fetch('/version.json')
      .then(function (r) { return r.json(); })
      .then(function (v) { toast('v' + (v.version || '?') + ' · ' + (v.date || '')); })
      .catch(function () { toast('Versiyon bilgisi alınamadı.'); });
  }

  /* ── EXPORT ─────────────────────────────────────────────── */
  return {
    panel        : panel,
    kullanicilar : kullanicilar,
    kycListesi   : kycListesi,
    ilanlar      : ilanlar,
    raporlar     : raporlar,
    sikayetler   : sikayetler,
    ayarlar      : ayarlar,
    _userFilter  : _userFilter,
    _ilanDnFilter: _ilanDnFilter,
    _ilanOnay    : _ilanOnay,
    _kycReview   : _kycReview,
    _pingSupabase: _pingSupabase,
    _showVersion : _showVersion
  };

})();
