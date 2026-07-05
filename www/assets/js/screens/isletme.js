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

  var _basCache = [];
  var _ilanlarimCache = [];
  var _editIlanId = null;

  function _adayCard(a) {
    var name  = a.ad || a.name || 'Kurye';
    var score = a.puan != null && a.puan > 0 ? Number(a.puan).toFixed(1) : (a.score || '—');
    var sub   = a.sehir || a.loc || 'Başvurdu';
    var badge = a.durum === 'reviewed' ? '<span class="kb-chip kb-chip--success" style="font-size:.7rem;padding:2px 8px">İncelendi</span>' :
                a.durum === 'accepted' ? '<span class="kb-chip kb-chip--accent" style="font-size:.7rem;padding:2px 8px">Kabul</span>' :
                a.ilanBaslik ? '<span style="font-size:.7rem;color:var(--muted)">' + a.ilanBaslik + '</span>' : '';
    return '<div class="person-card kb-card--pressable" onclick="Router.go(\'/isletme/aday/' + a.id + '\')">' +
      '<div class="kb-avatar" style="background:var(--c-isletme)">' + initials(name) + '</div>' +
      '<div class="person-card__info">' +
        '<div class="person-card__name">' + name + '</div>' +
        '<div class="person-card__sub">' + sub + '</div>' +
        '<div class="person-card__meta"><span class="kb-stars">' + ICON.star + score + '</span>' + badge + '</div>' +
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
        { id: 'ips-ilan',  num: '—', label: 'Açık İlan',          icon: 'briefcase', color: 'orange', route: '/isletme/ilanlarim',  action: 'Yönet'  },
        { id: 'ips-bas',   num: '—', label: 'Gelen Başvuru',       icon: 'check',     color: 'blue',   route: '/isletme/basvurular', action: 'İncele'   },
        { id: 'ips-mesaj', num: '—', label: 'Okunmamış Mesaj',     icon: 'msg',       color: 'green',  route: '/isletme/mesajlar',   action: 'Oku'      },
        { id: 'ips-puan',  num: '—', label: 'Profil Görüntülenme', icon: 'eye',       color: 'purple', route: '/isletme/profil',     action: 'Detaylar' }
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
          '<button class="quick-btn" onclick="Router.go(\'/isletme/kurye-ilanlari\')">' +
            '<div class="quick-btn__icon">🛵</div><div class="quick-btn__label">Kurye İlanları</div>' +
          '</button>' +
          '<button class="quick-btn" onclick="Router.go(\'/isletme/mesajlar\')">' +
            '<div class="quick-btn__icon">💬</div><div class="quick-btn__label">Mesajlar</div>' +
          '</button>' +
        '</div>'
      )
    }));

    setTimeout(function () { _loadIsletmePanelStats(); }, 130);
  }

  async function _loadIsletmePanelStats() {
    if (!window.SB || !SB.isOn()) return;
    try {
      var results = await Promise.allSettled([SB.myListings(), SB.myConvs()]);
      var ilanlar = results[0].status === 'fulfilled' ? results[0].value : [];
      var convs   = results[1].status === 'fulfilled' ? results[1].value : [];
      var acikIlanlar = ilanlar.filter(function(il){ return (il.durum || '') === 'acik'; }).length;
      var unread = convs.reduce(function(s,c){ return s + (c.unread || 0); }, 0);
      var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
      set('ips-ilan',  acikIlanlar);
      set('ips-bas',   ilanlar.length);
      set('ips-mesaj', unread || convs.length);
    } catch(e) {}
  }

  /* ── İşletme dashboard helpers ──────────────────────────── */
  function _iMCard(icon, val, lbl, iconBg, iconColor, route) {
    return '<div class="metric-card" onclick="Router.go(\'' + route + '\')">' +
      '<div class="metric-card__icon" style="background:' + iconBg + ';color:' + iconColor + '">' + ICON[icon] + '</div>' +
      '<div class="metric-card__val">' + val + '</div>' +
      '<div class="metric-card__lbl">' + lbl + '</div>' +
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
      setTimeout(function() { window.initPremiumMap('isletme'); }, 200);
    } else {
      window._spmPendingRole = 'isletme';
    }
  }

  /* ── 3. İLAN OLUŞTUR ────────────────────────────────────── */
  var FAYDA_LIST = ['SGK / Sigorta','Yemek Kartı','Servis / Ulaşım','Araç Yakıtı','Aidat Desteği','Ekipman'];
  var GEREK_LIST = ['Ehliyet (B)','Motorsiklet','Araç Sahibi','Akıllı Telefon','App Kullanımı'];

  function _sectionTitle(t) {
    return '<div style="font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--c-isletme,#FF6B35);margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid rgba(255,107,53,.2)">' + t + '</div>';
  }
  function _chipChecks(ids, list, prefix) {
    return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">' +
      list.map(function(item, i) {
        var id = prefix + i;
        return '<label style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;border:1.5px solid rgba(255,107,53,.35);background:var(--surface2,rgba(255,107,53,.08));font-size:.82rem;cursor:pointer;color:inherit">' +
          '<input type="checkbox" id="' + id + '" value="' + item + '" style="accent-color:var(--c-isletme,#FF6B35);width:15px;height:15px;flex-shrink:0"> ' + item + '</label>';
      }).join('') +
    '</div>';
  }

  /* ── 3b. İLANLARIM (yönetim listesi) ───────────────────── */
  function ilanlarim() {
    showAppBar('İlanlarım', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/isletme/ilan/yeni\')">' + ICON.plus + '</button>'
    );
    showBottomNav();

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="ilan-tabs">' +
          '<button class="kb-tab active" onclick="IsletmeScreens._ilanFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._ilanFilter(\'acik\',this)">Açık</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._ilanFilter(\'pasif\',this)">Pasif</button>' +
        '</div>' +
        '<div id="isletme-ilan-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
        '<button class="btn btn--primary mt-16" style="background:var(--c-isletme,#FF6B35)" onclick="Router.go(\'/isletme/ilan/yeni\')">' +
          ICON.plus + 'Yeni İlan Oluştur' +
        '</button>' +
      '</div>'
    );

    setTimeout(function () { _loadIlanlarim(); }, 130);
  }

  function _ilanCard(il) {
    var isAcik = (il.durum || il.active === true) === 'acik' || il.active === true;
    return '<div class="kb-card" style="margin-bottom:10px">' +
      '<div class="flex items-center justify-between mb-8">' +
        '<div style="font-weight:700">' + (il.baslik || il.title || 'İlan') + '</div>' +
        '<span class="kb-chip ' + (isAcik ? 'kb-chip--success' : '') + '">' + (isAcik ? 'Açık' : 'Pasif') + '</span>' +
      '</div>' +
      ((il.sehir || il.type) ? '<div style="font-size:.82rem;color:var(--muted);margin-bottom:6px">' + [(il.type || ''), (il.sehir || '')].filter(Boolean).join(' · ') + '</div>' : '') +
      '<div style="font-size:.82rem;color:var(--c-isletme,#FF6B35);font-weight:600">' + (il.tarih || il.date || '') + '</div>' +
      '<div class="flex" style="gap:8px;margin-top:10px">' +
        '<button class="btn btn--outline btn--sm" onclick="Router.go(\'/isletme/basvurular\')">Başvuruları Gör</button>' +
        (il.id ? '<button class="btn btn--ghost btn--sm" onclick="Router.go(\'/isletme/ilan/duzenle/' + il.id + '\')">Düzenle</button>' : '') +
        (il.id ? '<button class="btn btn--ghost btn--sm" onclick="IsletmeScreens._ilanToggle(\'' + il.id + '\',' + !isAcik + ')">' + (isAcik ? 'Pasif Yap' : 'Yayınla') + '</button>' : '') +
      '</div>' +
    '</div>';
  }

  function _emptyIlan() {
    return '<div style="padding:48px 24px;text-align:center">' +
      '<div style="font-size:2.5rem;margin-bottom:12px">📋</div>' +
      '<div style="font-weight:700;font-size:1rem;margin-bottom:6px">Henüz ilan yok</div>' +
      '<div style="font-size:.84rem;color:var(--muted)">Yeni İlan Oluştur butonuna tıklayın.</div>' +
    '</div>';
  }

  function _renderIlanList(list) {
    if (!list || !list.length) return _emptyIlan();
    return list.map(_ilanCard).join('');
  }

  async function _loadIlanlarim() {
    var el = document.getElementById('isletme-ilan-list');
    if (!el) return;

    if (_ilanlarimCache.length > 0) {
      el.innerHTML = _renderIlanList(_ilanlarimCache);
    }

    if (!(window.SB && SB.isOn())) {
      if (!_ilanlarimCache.length) el.innerHTML = _emptyIlan();
      return;
    }
    try {
      var items = await SB.myListings();
      _ilanlarimCache = items || [];
      var cur = document.getElementById('isletme-ilan-list');
      if (cur) cur.innerHTML = _renderIlanList(_ilanlarimCache);
    } catch(e) {
      if (!_ilanlarimCache.length) {
        var cur2 = document.getElementById('isletme-ilan-list');
        if (cur2) cur2.innerHTML = _emptyIlan();
      }
    }
  }

  function _ilanFilter(type, btn) {
    document.querySelectorAll('#ilan-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var all = _ilanlarimCache;
    var filtered = type === 'tumu' ? all
      : type === 'acik'  ? all.filter(function (x) { return (x.durum || '') === 'acik' || x.active === true; })
      : all.filter(function (x) { return (x.durum || '') !== 'acik' && x.active !== true; });
    var el = document.getElementById('isletme-ilan-list');
    if (el) el.innerHTML = _renderIlanList(filtered);
  }

  async function _ilanToggle(id, setAcik) {
    try {
      await SB.updateListingStatus(id, setAcik ? 'acik' : 'kapali');
      toast(setAcik ? 'İlan yayınlandı' : 'İlan pasife alındı');
      _loadIlanlarim();
    } catch(e) { toast('İşlem başarısız'); }
  }

  function ilanYeni(ctx) {
    _editIlanId = (ctx && ctx.params && ctx.params.id) || null;
    showAppBar(_editIlanId ? 'İlanı Düzenle' : 'İlan Oluştur', true);
    showBottomNav();
    setActiveNav('yeni');

    renderScreen(
      '<div class="kb-screen-inner">' +

      _sectionTitle('Temel Bilgiler') +
      '<div class="kb-form-group"><label class="kb-label">Pozisyon *</label>' +
        '<select class="kb-select" id="il-poz">' +
          '<option value="">Seçiniz</option>' +
          '<option>Yaya Kurye</option><option>Bisiklet Kurye</option>' +
          '<option>Motorlu Kurye</option><option>Araçlı Kurye</option><option>Cargo Kurye</option>' +
        '</select></div>' +
      '<div class="kb-form-group"><label class="kb-label">Kategori</label>' +
        '<select class="kb-select" id="il-kat">' +
          '<option value="">Seçiniz</option>' +
          '<option>Yemek Teslimatı</option><option>Kargo / Paket</option>' +
          '<option>Market / Alışveriş</option><option>Motokurye</option><option>Genel Kurye</option>' +
        '</select></div>' +
      '<div class="kb-form-group"><label class="kb-label">Şehir *</label>' +
        '<input class="kb-input" id="il-sehir" type="text" placeholder="İstanbul"></div>' +
      '<div class="kb-form-group"><label class="kb-label">İlçe / Bölge</label>' +
        '<input class="kb-input" id="il-bolge" type="text" placeholder="Kadıköy"></div>' +
      '<div class="kb-form-group"><label class="kb-label">Mahalle / Teslimat Bölgesi</label>' +
        '<input class="kb-input" id="il-mahalle" type="text" placeholder="Moda, Caddebostan..."></div>' +

      _sectionTitle('Çalışma Detayları') +
      '<div class="kb-form-group"><label class="kb-label">Çalışma Şekli</label>' +
        '<select class="kb-select" id="il-sekli">' +
          '<option value="">Seçiniz</option>' +
          '<option>Tam Zamanlı</option><option>Yarı Zamanlı</option>' +
          '<option>Sözleşmeli</option><option>Freelance</option>' +
        '</select></div>' +
      '<div class="kb-form-group"><label class="kb-label">Vardiya Tipi</label>' +
        '<select class="kb-select" id="il-vardiya">' +
          '<option value="">Seçiniz</option>' +
          '<option>Gündüz (08-18)</option><option>Akşam (16-24)</option>' +
          '<option>Gece (22-08)</option><option>Esnek</option>' +
        '</select></div>' +
      '<div class="kb-form-group"><label class="kb-label">Maaş Modeli</label>' +
        '<select class="kb-select" id="il-maas-model">' +
          '<option value="aylık">Aylık (₺/ay)</option>' +
          '<option value="günlük">Günlük (₺/gün)</option>' +
          '<option value="saatlik">Saatlik (₺/sa)</option>' +
        '</select></div>' +
      '<div class="kb-form-group"><label class="kb-label">Maaş Aralığı (₺)</label>' +
        '<div class="flex" style="gap:8px">' +
          '<input class="kb-input" id="il-maas-min" type="number" placeholder="Min (25.000)">' +
          '<input class="kb-input" id="il-maas-max" type="number" placeholder="Max (35.000)">' +
        '</div></div>' +
      '<div class="kb-form-group"><label class="kb-label">Çalışma Saatleri</label>' +
        '<input class="kb-input" id="il-saat" type="text" placeholder="09:00 - 18:00"></div>' +
      '<div class="kb-form-group"><label class="kb-label">Araç Tipi</label>' +
        '<select class="kb-select" id="il-arac">' +
          '<option value="">Seçiniz</option>' +
          '<option>Yaya</option><option>Bisiklet</option>' +
          '<option>Motorsiklet</option><option>Otomobil</option><option>Van / Minibüs</option>' +
        '</select></div>' +
      '<div class="kb-form-group"><label class="kb-label">Deneyim</label>' +
        '<select class="kb-select" id="il-deneyim">' +
          '<option value="">Seçiniz</option>' +
          '<option>Tecrübesiz (Kabul)</option><option>0-6 ay</option>' +
          '<option>6-12 ay</option><option>1-2 yıl</option><option>2+ yıl</option>' +
        '</select></div>' +

      _sectionTitle('İş Tanımı') +
      '<div class="kb-form-group"><label class="kb-label">Görev Tanımı</label>' +
        '<textarea class="kb-input" id="il-gorev" rows="4" placeholder="Kurye görev ve sorumlulukları..."></textarea></div>' +
      '<div class="kb-form-group"><label class="kb-label">Beklentiler</label>' +
        '<textarea class="kb-input" id="il-beklenti" rows="3" placeholder="Adaydan beklentiler, aranan özellikler..."></textarea></div>' +
      '<div class="kb-form-group"><label class="kb-label">Ek Açıklama</label>' +
        '<textarea class="kb-input" id="il-aciklama" rows="3" placeholder="Diğer bilgiler..."></textarea></div>' +

      _sectionTitle('Faydalar & Haklar') +
      '<div class="kb-form-group"><label class="kb-label">Sigorta</label>' +
        '<select class="kb-select" id="il-sigorta">' +
          '<option value="">Seçiniz</option>' +
          '<option value="SGK">SGK Sigortalı</option>' +
          '<option value="Bağkur">Bağkur</option>' +
          '<option value="Yok">Sigortasız</option>' +
        '</select></div>' +
      '<div class="kb-form-group"><label class="kb-label">Prim / Bonus</label>' +
        '<input class="kb-input" id="il-prim" type="text" placeholder="Haftalık performans primi..."></div>' +
      '<div class="kb-form-group"><label class="kb-label">Sağlanan Faydalar</label>' +
        _chipChecks(FAYDA_LIST, FAYDA_LIST, 'il-fayda-') +
      '</div>' +
      '<div class="kb-form-group"><label class="kb-label">Gereksinimler</label>' +
        _chipChecks(GEREK_LIST, GEREK_LIST, 'il-gerek-') +
      '</div>' +

      _sectionTitle('Ek Bilgiler') +
      '<div class="kb-form-group"><label class="kb-label">Kontenjan (Kişi Sayısı)</label>' +
        '<input class="kb-input" id="il-kontenjan" type="number" placeholder="1" min="1"></div>' +
      '<div class="kb-form-group"><label class="kb-label">Son Başvuru Tarihi</label>' +
        '<input class="kb-input" id="il-sonbas" type="date"></div>' +
      '<div class="kb-form-group"><label class="kb-label">Öncelik</label>' +
        '<select class="kb-select" id="il-oncelik">' +
          '<option value="normal">Normal</option>' +
          '<option value="acil">🔥 Acil</option>' +
        '</select></div>' +

      '<div style="height:16px"></div>' +
      '<button id="il-yayinla-btn" class="btn btn--primary" style="background:var(--c-isletme,#FF6B35);width:100%" onclick="IsletmeScreens._yayinla()">' + (_editIlanId ? 'Kaydet' : 'İlan Yayınla') + '</button>' +
      '<div id="il-hata" style="display:none;margin-top:12px;padding:12px;background:rgba(239,68,68,.12);border-radius:10px;color:#EF4444;font-size:.84rem;text-align:center"></div>' +
      '<div style="height:32px"></div>' +
      '</div>'
    );

    if (_editIlanId) {
      setTimeout(function () { _loadIlanForEdit(_editIlanId); }, 130);
    }
  }

  function _setChecks(prefix, list, values) {
    values = values || [];
    for (var i = 0; i < list.length; i++) {
      var el = document.getElementById(prefix + i);
      if (el) el.checked = values.indexOf(list[i]) !== -1;
    }
  }

  async function _loadIlanForEdit(id) {
    try {
      var il = await SB.listingById(id);
      if (!il) return;
      function set(elId, val) { var el = document.getElementById(elId); if (el) el.value = (val == null ? '' : val); }
      set('il-poz', il.baslik); set('il-kat', il.kategori);
      set('il-sehir', il.sehir); set('il-bolge', il.bolge); set('il-mahalle', il.mahalle);
      set('il-sekli', il.calisma_sekli); set('il-vardiya', il.vardiya_tipi);
      set('il-maas-model', il.maas_modeli); set('il-maas-min', il.maas_min); set('il-maas-max', il.maas_max);
      set('il-saat', il.calisma_saatleri); set('il-arac', il.arac); set('il-deneyim', il.deneyim);
      set('il-gorev', il.gorev_tanimi); set('il-beklenti', il.beklentiler); set('il-aciklama', il.aciklama);
      set('il-sigorta', il.sigorta); set('il-prim', il.bonus);
      set('il-kontenjan', il.kontenjan); set('il-sonbas', il.son_basvuru); set('il-oncelik', il.oncelik);
      _setChecks('il-fayda-', FAYDA_LIST, il.faydalar);
      _setChecks('il-gerek-', GEREK_LIST, il.gereksinimler);
    } catch (e) {}
  }

  async function _yayinla() {
    var btn  = document.getElementById('il-yayinla-btn');
    var hata = document.getElementById('il-hata');
    var idleLabel = _editIlanId ? 'Kaydet' : 'İlan Yayınla';
    if (btn)  { btn.disabled = true; btn.textContent = _editIlanId ? 'Kaydediliyor…' : 'Yayınlanıyor…'; }
    if (hata) hata.style.display = 'none';

    function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    function checks(prefix, count) {
      var out = [];
      for (var i = 0; i < count; i++) {
        var el = document.getElementById(prefix + i);
        if (el && el.checked) out.push(el.value);
      }
      return out;
    }

    var baslik = v('il-poz');
    var sehir  = v('il-sehir');

    if (!baslik) {
      if (btn)  { btn.disabled = false; btn.textContent = idleLabel; }
      if (hata) { hata.textContent = 'Pozisyon seçiniz.'; hata.style.display = 'block'; }
      return;
    }
    if (!sehir) {
      if (btn)  { btn.disabled = false; btn.textContent = idleLabel; }
      if (hata) { hata.textContent = 'Şehir giriniz.'; hata.style.display = 'block'; }
      return;
    }

    var fields = {
      baslik: baslik, kategori: v('il-kat'),
      sehir: sehir, bolge: v('il-bolge'), mahalle: v('il-mahalle'),
      calisma_sekli: v('il-sekli'), vardiya_tipi: v('il-vardiya'),
      maas_modeli: v('il-maas-model'), maas_min: v('il-maas-min'), maas_max: v('il-maas-max'),
      calisma_saatleri: v('il-saat'), arac: v('il-arac'), deneyim: v('il-deneyim'),
      gorev_tanimi: v('il-gorev'), beklentiler: v('il-beklenti'), aciklama: v('il-aciklama'),
      sigorta: v('il-sigorta'), bonus: v('il-prim'),
      faydalar: checks('il-fayda-', FAYDA_LIST.length),
      gereksinimler: checks('il-gerek-', GEREK_LIST.length),
      kontenjan: parseInt(v('il-kontenjan'), 10) || 1,
      son_basvuru: v('il-sonbas') || null, oncelik: v('il-oncelik') || 'normal',
      tip: 'kurye-ilani'
    };

    try {
      if (_editIlanId) {
        var updated = await SB.updateListing(_editIlanId, fields);
        if (updated) _ilanlarimCache = _ilanlarimCache.map(function (x) { return x.id === _editIlanId ? updated : x; });
        toast('İlan güncellendi ✓');
        setTimeout(function () { Router.go('/isletme/ilanlarim'); }, 800);
      } else {
        var newIlan = await SB.createListing(fields);
        if (newIlan) _ilanlarimCache = [newIlan].concat(_ilanlarimCache);
        toast('İlanınız yayınlandı! ✓');
        setTimeout(function () { Router.go('/isletme/ilanlarim'); }, 800);
      }
    } catch(e) {
      if (btn)  { btn.disabled = false; btn.textContent = idleLabel; }
      if (hata) { hata.textContent = (e && e.message) || 'Bir hata oluştu. Tekrar deneyin.'; hata.style.display = 'block'; }
    }
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
          '<button class="kb-tab"        onclick="IsletmeScreens._basFilter(\'deger\',this)">İncelendi</button>' +
        '</div>' +
        '<div id="isletme-bas-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>'
    );

    setTimeout(function () { _loadBasvurularAsync(); }, 130);
  }

  async function _loadBasvurularAsync() {
    var el = document.getElementById('isletme-bas-list');
    if (!el) return;

    if (!window.SB || !SB.isOn()) {
      el.innerHTML = MOCK_ADAYLAR.map(_adayCard).join('');
      return;
    }

    try {
      var apps = await SB.allMyListingApplications();
      _basCache = apps || [];
      el.innerHTML = _basCache.length
        ? _basCache.map(_adayCard).join('')
        : '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Henüz başvuru yok</div><div class="kb-empty__sub">İlan oluşturun, başvurular burada görünür.</div></div>';
    } catch(e) {
      console.warn('_loadBasvurularAsync:', e);
      el.innerHTML = MOCK_ADAYLAR.map(_adayCard).join('');
    }
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#isletme-bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');

    var list = _basCache.length ? _basCache : MOCK_ADAYLAR;
    var filtered = list;
    if (type === 'yeni')  filtered = list.filter(function (a) { return (a.durum || a.status) === 'pending' || !(a.durum || a.status); });
    if (type === 'deger') filtered = list.filter(function (a) { return (a.durum || a.status) === 'reviewed'; });

    var el = document.getElementById('isletme-bas-list');
    if (el) el.innerHTML = filtered.length
      ? filtered.map(_adayCard).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">🔍</div><div class="kb-empty__title">Bu filtrede sonuç yok</div></div>';
  }

  /* ── 5. ADAY DETAY ──────────────────────────────────────── */
  function adayDetay(ctx) {
    var id = ctx.params.id;
    var a  = _basCache.find(function(x) { return x.id === id; }) ||
             MOCK_ADAYLAR.find(function(x) { return x.id === id; }) ||
             MOCK_ADAYLAR[0];

    var name  = a.ad || a.name || 'Kurye';
    var score = a.puan != null && a.puan > 0 ? Number(a.puan).toFixed(1) : (a.score || '—');
    var sub   = a.sehir || a.loc || '';
    var durum = a.durum || a.status || '';

    showAppBar(name, true);
    showBottomNav();

    var durumBadge = durum === 'reviewed' ?
      '<span class="kb-chip kb-chip--success">✓ İncelendi</span>' :
      durum === 'accepted' ?
      '<span class="kb-chip kb-chip--accent">✓ Kabul Edildi</span>' :
      '<span class="kb-chip">⏳ Değerlendiriliyor</span>';

    renderScreen(
      '<div>' +
        '<div class="detail-hero">' +
          '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">' +
            '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-isletme)">' + initials(name) + '</div>' +
            '<div>' +
              '<div style="font-size:1.1rem;font-weight:800">' + name + '</div>' +
              '<div class="kb-stars" style="margin:4px 0">' + ICON.star + ' ' + score + '</div>' +
              durumBadge +
            '</div>' +
          '</div>' +
        '</div>' +

        (sub ? '<div class="detail-section"><div class="detail-row">' + ICON.pin + sub + '</div></div>' : '') +

        (a.ilanBaslik ? '<div class="detail-section"><div class="detail-section__title">Başvurulan İlan</div>' +
          '<div class="detail-row">' + ICON.briefcase + a.ilanBaslik + '</div></div>' : '') +

        (a.mesaj ? '<div class="detail-section"><div class="detail-section__title">Başvuru Mesajı</div>' +
          '<div style="font-size:.88rem;color:var(--text);line-height:1.6;padding:4px 0">' + a.mesaj + '</div></div>' : '') +

        (a.tarih ? '<div class="detail-section"><div class="detail-row" style="color:var(--muted)">' + ICON.clock + 'Başvuru tarihi: ' + a.tarih + '</div></div>' : '') +

        '<div id="aday-profil-extra"></div>' +

        '<div class="detail-cta" style="display:flex;gap:10px">' +
          '<button class="btn btn--outline btn--sm" onclick="Router.go(\'/isletme/mesajlar\')" style="flex:1;--c-accent:var(--c-isletme)">Mesaj Gönder</button>' +
          '<button class="btn btn--success btn--sm" onclick="IsletmeScreens._kabul(\'' + id + '\')" style="flex:1">Kabul Et</button>' +
        '</div>' +
      '</div>'
    );

    if (a.applicantId && window.SB && SB.isOn()) {
      SB.profileById(a.applicantId).then(function(p) {
        if (!p) return;
        var el = document.getElementById('aday-profil-extra');
        if (!el) return;
        var rows = [];
        if (p.experience || p.exp) rows.push('<div class="detail-row">' + ICON.briefcase + (p.experience || p.exp) + '</div>');
        if (p.vehicle)   rows.push('<div class="detail-row">' + ICON.pin + 'Araç: ' + p.vehicle + '</div>');
        if (p.bio)       rows.push('<div style="font-size:.84rem;color:var(--muted);margin-top:6px;line-height:1.5">' + p.bio + '</div>');
        if (rows.length) {
          el.innerHTML = '<div class="detail-section"><div class="detail-section__title">Profil</div>' + rows.join('') + '</div>';
        }
      }).catch(function() {});
    }
  }

  function _kabul(id) {
    if (window.SB && SB.isOn()) {
      SB.updateApplication(id, 'reviewed').catch(function() {});
      var idx = _basCache.findIndex(function(x) { return x.id === id; });
      if (idx >= 0) _basCache[idx].durum = 'reviewed';
    }
    toast('Aday kabul edildi! ✓');
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
          _mi('Profil Düzenle',    'user',       '/profil-duzenle') +
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
    ilanlarim  : ilanlarim,
    ilanYeni   : ilanYeni,
    basvurular : basvurular,
    adayDetay  : adayDetay,
    mesajlar   : mesajlar,
    mesajChat  : mesajChat,
    profil     : profil,
    _basFilter : _basFilter,
    _ilanFilter: _ilanFilter,
    _ilanToggle: _ilanToggle,
    _yayinla   : _yayinla,
    _kabul     : _kabul
  };

})();
