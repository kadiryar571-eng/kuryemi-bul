/* ============================================================
   KuryemiBul — screens/firma.js
   8 Kurye Firması ekranı: Panel, Harita, İlanlarım, Yeni İlan,
                   Başvurular, Aday Detayı, Mesajlar, Profil
   ============================================================ */
window.FirmaScreens = (function () {
  'use strict';

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  var MOCK_ILANLAR = [
    { id: '1', title: 'Motorlu Kurye', type: 'Tam Zamanlı', salary: '25.000 - 35.000 ₺', basvuru: 8,  active: true  },
    { id: '2', title: 'Yaya Kurye',    type: 'Part Time',   salary: '15.000 - 22.000 ₺', basvuru: 14, active: true  },
    { id: '3', title: 'Araçlı Kurye',  type: 'Tam Zamanlı', salary: '28.000 - 34.000 ₺', basvuru: 3,  active: false }
  ];

  var MOCK_ADAYLAR = [
    { id: '1', name: 'Mehmet Kaya',   score: '4.8', exp: '3.5 yıl deneyim', loc: 'Kadıköy, İstanbul', status: 'pending'   },
    { id: '2', name: 'Ayşe Demir',    score: '4.7', exp: '2 yıl deneyim',   loc: 'Beşiktaş, İstanbul', status: 'reviewed' },
    { id: '3', name: 'Can Bağlar',    score: '4.6', exp: '1 yıl deneyim',   loc: 'Ümraniye, İstanbul', status: 'pending'  },
    { id: '4', name: 'Deniz Aksoy',   score: '4.9', exp: '4 yıl deneyim',   loc: 'Kartal, İstanbul',   status: 'accepted' }
  ];

  var MOCK_MESAJLAR = [
    { id: '1', name: 'Mehmet Kaya', preview: 'Merhaba, profilimi incelemenizi...', time: '15:20', unread: 1 },
    { id: '2', name: 'Ayşe Demir', preview: 'Görüşme için uygun saatler...', time: '13:45', unread: 0 }
  ];

  var _ilanlarimCache = [];
  var _editIlanId = null;
  var _basCache = [];

  function _adayCard(a, role) {
    var name  = a.ad || a.name || 'Kurye';
    var score = a.puan != null && a.puan > 0 ? Number(a.puan).toFixed(1) : (a.score || '—');
    var sub   = a.sehir || a.loc || 'Başvurdu';
    var badge = a.durum === 'reviewed' ? '<span class="kb-chip kb-chip--success" style="font-size:.7rem;padding:2px 8px">İncelendi</span>' :
                a.durum === 'accepted' ? '<span class="kb-chip kb-chip--accent" style="font-size:.7rem;padding:2px 8px">Kabul</span>' :
                a.ilanBaslik ? '<span style="font-size:.7rem;color:var(--muted)">' + a.ilanBaslik + '</span>' : '';
    return '<div class="person-card kb-card--pressable" onclick="Router.go(\'/' + role + '/aday/' + a.id + '\')">' +
      '<div class="kb-avatar" style="background:var(--c-firma)">' + initials(name) + '</div>' +
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
      heroRoute:    '/firma/profil',
      heroBadge:    ICON.star + ' Kurye Firması',
      heroTitle:    'Kurye Firması Puanınız',
      heroScoreBig: '4.6',
      heroDenom:    '/ 5.0',
      heroDesc:     'Puanınız arttıkça en iyi kuryeler sizinle çalışmak ister',
      heroCtaLabel: 'Profilimi Gör',
      heroCtaRoute: '/firma/profil',
      stats: [
        { id: 'fps-ilan',    num: '—', label: 'Açık İlan',          icon: 'list',  color: 'green',  route: '/firma/ilanlarim',  action: 'Yönet'    },
        { id: 'fps-bas',     num: '—', label: 'Yeni Başvuru',        icon: 'check', color: 'blue',   route: '/firma/basvurular', action: 'İncele'   },
        { id: 'fps-mesaj',   num: '—', label: 'Okunmamış Mesaj',     icon: 'msg',   color: 'orange', route: '/firma/mesajlar',   action: 'Detaylar' },
        { id: 'fps-goruntu', num: '—', label: 'Profil Görüntülenme', icon: 'eye',   color: 'purple', route: '/firma/profil',     action: 'Detaylar' }
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

    setTimeout(function () { _loadFirmaPanelStats(); }, 130);
  }

  async function _loadFirmaPanelStats() {
    if (!window.SB || !SB.isOn()) return;
    try {
      var results = await Promise.allSettled([SB.myListings(), SB.myConvs()]);
      var ilanlar = results[0].status === 'fulfilled' ? results[0].value : [];
      var convs   = results[1].status === 'fulfilled' ? results[1].value : [];
      var acikIlanlar = ilanlar.filter(function(il){ return (il.durum || '') === 'acik'; }).length;
      var unread = convs.reduce(function(s,c){ return s + (c.unread || 0); }, 0);
      var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
      set('fps-ilan',  acikIlanlar);
      set('fps-bas',   ilanlar.length);
      set('fps-mesaj', unread || convs.length);
    } catch(e) {}
  }

  /* ── Kurye Firması dashboard helpers ─────────────────────────────── */
  function _fMCard(icon, val, lbl, iconBg, iconColor, route) {
    return '<div class="metric-card" onclick="Router.go(\'' + route + '\')">' +
      '<div class="metric-card__icon" style="background:' + iconBg + ';color:' + iconColor + '">' + ICON[icon] + '</div>' +
      '<div class="metric-card__val">' + val + '</div>' +
      '<div class="metric-card__lbl">' + lbl + '</div>' +
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
      setTimeout(function() { window.initPremiumMap('firma'); }, 200);
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
        '<div id="firma-ilan-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
        '<button class="btn btn--primary mt-16" onclick="Router.go(\'/firma/ilan/yeni\')">' +
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
      '<div style="font-size:.82rem;color:var(--c-accent);font-weight:600">' + (il.tarih || il.date || '') + '</div>' +
      '<div class="flex" style="gap:8px;margin-top:10px">' +
        '<button class="btn btn--outline btn--sm" onclick="Router.go(\'/firma/basvurular\')">Başvuruları Gör</button>' +
        (il.id ? '<button class="btn btn--ghost btn--sm" onclick="Router.go(\'/firma/ilan/duzenle/' + il.id + '\')">Düzenle</button>' : '') +
        (il.id ? '<button class="btn btn--ghost btn--sm" onclick="FirmaScreens._ilanToggle(\'' + il.id + '\',' + !isAcik + ')">' + (isAcik ? 'Pasif Yap' : 'Yayınla') + '</button>' : '') +
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
    var el = document.getElementById('firma-ilan-list');
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
      var cur = document.getElementById('firma-ilan-list');
      if (cur) cur.innerHTML = _renderIlanList(_ilanlarimCache);
    } catch(e) {
      if (!_ilanlarimCache.length) {
        var cur2 = document.getElementById('firma-ilan-list');
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
    var el = document.getElementById('firma-ilan-list');
    if (el) el.innerHTML = _renderIlanList(filtered);
  }

  async function _ilanToggle(id, setAcik) {
    try {
      await SB.updateListingStatus(id, setAcik ? 'acik' : 'kapali');
      toast(setAcik ? 'İlan yayınlandı' : 'İlan pasife alındı');
      _loadIlanlarim();
    } catch(e) { toast('İşlem başarısız'); }
  }

  /* ── 4. YENİ İLAN OLUŞTUR ──────────────────────────────── */
  var FAYDA_LIST = ['SGK / Sigorta','Yemek Kartı','Servis / Ulaşım','Araç Yakıtı','Aidat Desteği','Ekipman'];
  var GEREK_LIST = ['Ehliyet (B)','Motorsiklet','Araç Sahibi','Akıllı Telefon','App Kullanımı'];

  function _sectionTitle(t) {
    return '<div style="font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--c-firma,#00C896);margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid rgba(0,200,150,.2)">' + t + '</div>';
  }
  function _chipChecks(list, prefix) {
    return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">' +
      list.map(function(item, i) {
        var id = prefix + i;
        return '<label style="display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;border:1.5px solid rgba(34,197,94,.35);background:var(--surface2,rgba(34,197,94,.08));font-size:.82rem;cursor:pointer;color:inherit">' +
          '<input type="checkbox" id="' + id + '" value="' + item + '" style="accent-color:var(--c-firma,#22C55E);width:15px;height:15px;flex-shrink:0"> ' + item + '</label>';
      }).join('') +
    '</div>';
  }

  function ilanYeni(ctx) {
    _editIlanId = (ctx && ctx.params && ctx.params.id) || null;
    showAppBar(_editIlanId ? 'İlanı Düzenle' : 'Yeni İlan Oluştur', true);
    showBottomNav();

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
          '<input class="kb-input" id="il-maas-min" type="number" placeholder="Min (28.000)">' +
          '<input class="kb-input" id="il-maas-max" type="number" placeholder="Max (34.000)">' +
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
        _chipChecks(FAYDA_LIST, 'il-fayda-') +
      '</div>' +
      '<div class="kb-form-group"><label class="kb-label">Gereksinimler</label>' +
        _chipChecks(GEREK_LIST, 'il-gerek-') +
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
      '<button id="il-yayinla-btn" class="btn btn--primary" style="width:100%" onclick="FirmaScreens._yayinla()">' + (_editIlanId ? 'Kaydet' : 'İlan Yayınla') + '</button>' +
      '<div id="il-hata" style="display:none;margin-top:12px;padding:12px;background:rgba(239,68,68,.12);border-radius:10px;color:#DC2626;font-size:.84rem;text-align:center"></div>' +
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
      } else {
        var newIlan = await SB.createListing(fields);
        if (newIlan) _ilanlarimCache = [newIlan].concat(_ilanlarimCache);
        toast('İlanınız yayınlandı! ✓');
      }
      setTimeout(function () { Router.go('/firma/ilanlarim'); }, 800);
    } catch(e) {
      if (btn)  { btn.disabled = false; btn.textContent = idleLabel; }
      if (hata) { hata.textContent = (e && e.message) || 'Bir hata oluştu. Tekrar deneyin.'; hata.style.display = 'block'; }
    }
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
          '<button class="kb-tab"        onclick="FirmaScreens._basFilter(\'deger\',this)">İncelendi</button>' +
        '</div>' +
        '<div id="firma-bas-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>'
    );

    setTimeout(function () { _loadBasvurularAsync(); }, 130);
  }

  async function _loadBasvurularAsync() {
    var el = document.getElementById('firma-bas-list');
    if (!el) return;

    if (!window.SB || !SB.isOn()) {
      el.innerHTML = MOCK_ADAYLAR.map(function(a) { return _adayCard(a, 'firma'); }).join('');
      return;
    }

    try {
      var apps = await SB.allMyListingApplications();
      _basCache = apps || [];
      el.innerHTML = _basCache.length
        ? _basCache.map(function(a) { return _adayCard(a, 'firma'); }).join('')
        : '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Henüz başvuru yok</div><div class="kb-empty__sub">İlan oluşturun, başvurular burada görünür.</div></div>';
    } catch(e) {
      console.warn('_loadBasvurularAsync:', e);
      el.innerHTML = MOCK_ADAYLAR.map(function(a) { return _adayCard(a, 'firma'); }).join('');
    }
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#firma-bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');

    var list = _basCache.length ? _basCache : MOCK_ADAYLAR;
    var filtered = list;
    if (type === 'yeni')  filtered = list.filter(function (a) { return (a.durum || a.status) === 'pending' || !(a.durum || a.status); });
    if (type === 'deger') filtered = list.filter(function (a) { return (a.durum || a.status) === 'reviewed'; });

    var el = document.getElementById('firma-bas-list');
    if (el) el.innerHTML = filtered.length
      ? filtered.map(function(a) { return _adayCard(a, 'firma'); }).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">🔍</div><div class="kb-empty__title">Bu filtrede sonuç yok</div></div>';
  }

  /* ── 5b. ÇALIŞANLAR (anlaştığı kuryeler) ───────────────────── */
  function calisanlar() {
    showAppBar('Çalışanlar', true);
    showBottomNav();
    setActiveNav('profil');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<p style="font-size:.82rem;color:var(--muted);margin-bottom:14px">Kabul ettiğiniz ve ekibinize kattığınız kuryeler.</p>' +
        '<div id="firma-calisan-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>'
    );

    setTimeout(function () { _loadCalisanlarAsync(); }, 130);
  }

  async function _loadCalisanlarAsync() {
    var el = document.getElementById('firma-calisan-list');
    if (!el) return;

    function render(list) {
      var accepted = list.filter(function (a) { return (a.durum || a.status) === 'accepted'; });
      el.innerHTML = accepted.length
        ? accepted.map(function(a) { return _adayCard(a, 'firma'); }).join('')
        : '<div class="kb-empty"><div class="kb-empty__icon">🤝</div><div class="kb-empty__title">Henüz anlaştığınız kurye yok</div><div class="kb-empty__sub">Başvurulardan bir adayı kabul edince burada görünür.</div></div>';
    }

    if (!window.SB || !SB.isOn()) { render(MOCK_ADAYLAR); return; }

    try {
      var apps = await SB.allMyListingApplications();
      _basCache = apps || [];
      render(_basCache);
    } catch (e) {
      console.warn('_loadCalisanlarAsync:', e);
      render(MOCK_ADAYLAR);
    }
  }

  /* ── 6. ADAY DETAY ──────────────────────────────────────── */
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
            '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-firma)">' + initials(name) + '</div>' +
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

        '<div class="detail-cta" style="display:flex;flex-direction:column;gap:8px">' +
          '<div style="display:flex;gap:10px">' +
            '<button class="btn btn--outline" onclick="Router.go(\'/firma/mesajlar\')" style="flex:1">Mesaj Gönder</button>' +
            '<button class="btn btn--success" onclick="FirmaScreens._kabul(\'' + id + '\')" style="flex:1">Kabul Et</button>' +
          '</div>' +
          (durum !== 'reviewed' && durum !== 'accepted' ?
            '<button class="btn btn--ghost btn--sm" onclick="FirmaScreens._degerlendir(\'' + id + '\')">İncelendi olarak işaretle</button>' : '') +
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

  function _degerlendir(id) {
    if (window.SB && SB.isOn()) {
      SB.updateApplication(id, 'reviewed').catch(function() {});
      var idx = _basCache.findIndex(function(x) { return x.id === id; });
      if (idx >= 0) _basCache[idx].durum = 'reviewed';
    }
    toast('Aday değerlendirmeye alındı.');
    setTimeout(function () { Router.back(); }, 700);
  }

  function _kabul(id) {
    if (window.SB && SB.isOn()) {
      SB.updateApplication(id, 'accepted').catch(function() {});
      var idx = _basCache.findIndex(function(x) { return x.id === id; });
      if (idx >= 0) _basCache[idx].durum = 'accepted';
    } else {
      var mi = MOCK_ADAYLAR.findIndex(function(x) { return x.id === id; });
      if (mi >= 0) MOCK_ADAYLAR[mi].status = 'accepted';
    }
    toast('Kurye ekibinize katıldı! ✓');
    setTimeout(function () { Router.back(); }, 700);
  }

  /* ── 6b. PUANLAMALAR ────────────────────────────────────── */
  function puanlamalar() {
    showAppBar('Puanlamalar', true);
    showBottomNav();
    setActiveNav('profil');

    var puan = (APP.profile && APP.profile.puan) || 0;
    var adet = (APP.profile && APP.profile.degerlendirme) || 0;

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-card" style="text-align:center;margin-bottom:16px">' +
          '<div style="font-size:2.2rem;font-weight:800;color:var(--c-firma)">' + (puan > 0 ? Number(puan).toFixed(1) : '—') + '</div>' +
          '<div class="kb-stars" style="justify-content:center;margin:4px 0">' + ICON.star + ' ' + adet + ' değerlendirme</div>' +
        '</div>' +
        '<div id="firma-puan-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>'
    );

    setTimeout(function () { _loadPuanlamalarAsync(); }, 130);
  }

  async function _loadPuanlamalarAsync() {
    var el = document.getElementById('firma-puan-list');
    if (!el) return;
    var empty = '<div class="kb-empty"><div class="kb-empty__icon">⭐</div><div class="kb-empty__title">Henüz değerlendirme yok</div></div>';

    if (!window.SB || !SB.isOn() || !APP.profile || !APP.profile.id) { el.innerHTML = empty; return; }

    try {
      var list = await SB.reviewsFor(APP.profile.id);
      el.innerHTML = list.length ? list.map(function (r) {
        return '<div class="kb-card">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
            '<div style="font-weight:700">' + _esc(r.ad) + '</div>' +
            '<div class="kb-stars">' + ICON.star + ' ' + r.puan + '</div>' +
          '</div>' +
          (r.yorum ? '<div style="font-size:.86rem;color:var(--text2);line-height:1.5">' + _esc(r.yorum) + '</div>' : '') +
          '<div style="font-size:.7rem;color:var(--muted);margin-top:6px">' + (r.tarih || '') + '</div>' +
        '</div>';
      }).join('') : empty;
    } catch (e) {
      console.warn('_loadPuanlamalarAsync:', e);
      el.innerHTML = empty;
    }
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
    showAppBar('Kurye Firması Profilim', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/ayarlar\')">' + ICON.settings + '</button>'
    );
    showBottomNav();
    setActiveNav('profil');

    var name = (APP.profile && (APP.profile.full_name || APP.profile.company_name)) || 'Kurye Firması';

    renderScreen(
      '<div>' +
        '<div class="profile-hero">' +
          '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-firma)">' + initials(name) + '</div>' +
          '<div class="profile-hero__name">' + name + '</div>' +
          '<div class="profile-hero__sub">Kurye Firması</div>' +
          '<div class="profile-hero__badges">' +
            '<span class="kb-chip kb-chip--success">' + ICON.shield + ' Doğrulandı</span>' +
            '<span class="kb-chip kb-chip--accent">' + ICON.star + ' 4.6</span>' +
          '</div>' +
        '</div>' +

        '<div class="kb-card" style="margin:0 16px 16px;padding:0 0 0 0">' +
          _mi('Profil Düzenle',      'user',        '/profil-duzenle') +
          _mi('Kurye Firması Bilgileri',     'briefcase',  '/firma/bilgiler') +
          _mi('Çalışanlar',          'users',       '/firma/calisanlar') +
          _mi('Puanlamalar',         'star',        '/firma/puanlamalar') +
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

  /* ── 9. KURYE FİRMASI BİLGİLERİ ─────────────────────────── */
  function bilgiler() {
    showAppBar('Kurye Firması Bilgileri', true);
    showBottomNav();
    setActiveNav('profil');

    var p = APP.profile || {};
    var dogrulama = p.dogrulama || 'none';
    var dBadge = dogrulama === 'verified' ? '<span class="kb-chip kb-chip--success">' + ICON.shield + ' Doğrulandı</span>' :
                 dogrulama === 'pending'  ? '<span class="kb-chip kb-chip--warning">⏳ Doğrulama Bekliyor</span>' :
                 '<span class="kb-chip">' + ICON.shield + ' Doğrulanmadı</span>';

    var hizmetler = p.hizmetler || [];
    var belgeler  = p.belgeler || [];
    var fotograflar = p.fotograflar || [];

    renderScreen(
      '<div class="kb-screen-inner">' +

        '<div class="kb-card">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
            '<div style="font-weight:800">Temel Bilgiler</div>' + dBadge +
          '</div>' +
          '<div class="detail-row">' + ICON.pin + (p.sehir || 'Şehir belirtilmemiş') + '</div>' +
          '<div class="detail-row">' + ICON.briefcase + 'Kapasite: ' + (p.kapasite || 0) + ' kurye' + '</div>' +
          (hizmetler.length ? '<div class="job-card__tags" style="margin-top:8px">' +
            hizmetler.map(function (h) { return '<span class="kb-chip">' + _esc(h) + '</span>'; }).join('') +
          '</div>' : '') +
          (p.aciklama ? '<div style="font-size:.84rem;color:var(--text2);margin-top:10px;line-height:1.5">' + _esc(p.aciklama) + '</div>' : '') +
        '</div>' +

        '<div class="kb-card">' +
          '<div class="kb-label">Açık Adres / İşletme Yeri</div>' +
          '<textarea id="fb-adres" class="kb-input" rows="3" style="resize:none;height:auto" placeholder="Ofis / depo / şube adresi…">' + _esc(p.adres || '') + '</textarea>' +
          '<button class="btn btn--primary btn--sm" style="margin-top:8px;width:auto;padding:8px 16px" onclick="FirmaScreens._saveAdres()">Kaydet</button>' +
        '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Belgeler</div>' +
          '<button class="kb-section-link" onclick="FirmaScreens._pickBelge()">+ Ekle</button>' +
        '</div>' +
        '<div class="pr-docs" id="fb-belge-list" style="margin-bottom:16px">' + _belgeList(belgeler) + '</div>' +

        '<div class="kb-section-head"><div class="kb-section-title">Fotoğraflar</div>' +
          '<button class="kb-section-link" onclick="FirmaScreens._pickFoto()">+ Ekle</button>' +
        '</div>' +
        '<div id="fb-foto-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">' + _fotoGrid(fotograflar) + '</div>' +

      '</div>'
    );
  }

  function _belgeList(belgeler) {
    if (!belgeler.length) return '<div class="kb-empty" style="padding:20px 0"><div class="kb-empty__sub">Henüz belge eklenmedi.</div></div>';
    return belgeler.map(function (path) {
      var name = path.split('/').pop();
      return '<div class="pr-doc">' +
        '<div class="pr-doc__icon">' + ICON.doc + '</div>' +
        '<div class="pr-doc__label">' + _esc(name) + '</div>' +
        '<div class="pr-doc__status pr-doc__status--ok">Yüklendi</div>' +
      '</div>';
    }).join('');
  }

  function _fotoGrid(fotograflar) {
    if (!fotograflar.length) return '<div class="kb-empty" style="grid-column:1/-1;padding:20px 0"><div class="kb-empty__sub">Henüz fotoğraf eklenmedi.</div></div>';
    return fotograflar.map(function (url) {
      return '<div style="aspect-ratio:1;border-radius:10px;overflow:hidden;background:var(--surface2)">' +
        '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover">' +
      '</div>';
    }).join('');
  }

  function _saveAdres() {
    var el = document.getElementById('fb-adres');
    var adres = el ? el.value.trim() : '';
    if (!window.SB || !SB.isOn()) { toast('Adres kaydedildi ✓'); return; }
    SB.updateMyProfile({ adres: adres }).then(function (updated) {
      APP.profile = updated;
      toast('Adres kaydedildi ✓');
    }).catch(function () { toast('Adres kaydedilemedi'); });
  }

  function _pickBelge() {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*,application/pdf';
    inp.onchange = function () {
      if (!inp.files || !inp.files[0]) return;
      var file = inp.files[0];
      if (!window.SB || !SB.isOn()) { toast('Belge yüklendi ✓'); return; }
      toast('Belge yükleniyor…');
      SB.uploadFirmaBelge(file).then(function (path) {
        var arr = (APP.profile.belgeler || []).concat([path]);
        return SB.updateMyProfile({ belgeler: arr });
      }).then(function (updated) {
        APP.profile = updated;
        toast('Belge yüklendi ✓');
        bilgiler();
      }).catch(function () { toast('Belge yüklenemedi'); });
    };
    inp.click();
  }

  function _pickFoto() {
    if (typeof KBPickPhoto !== 'function') { toast('Kamera erişimi yok'); return; }
    KBPickPhoto(function (dataUrl) {
      if (!window.SB || !SB.isOn()) { toast('Fotoğraf yüklendi ✓'); return; }
      toast('Fotoğraf yükleniyor…');
      fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (blob) {
        var file = new File([blob], 'foto.jpg', { type: blob.type || 'image/jpeg' });
        return SB.uploadFirmaFoto(file);
      }).then(function (url) {
        if (!url) return;
        var arr = (APP.profile.fotograflar || []).concat([url]);
        return SB.updateMyProfile({ fotograflar: arr });
      }).then(function (updated) {
        if (!updated) return;
        APP.profile = updated;
        toast('Fotoğraf yüklendi ✓');
        bilgiler();
      }).catch(function () { toast('Fotoğraf yüklenemedi'); });
    });
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
    calisanlar  : calisanlar,
    puanlamalar : puanlamalar,
    bilgiler    : bilgiler,
    _ilanFilter  : _ilanFilter,
    _ilanToggle  : _ilanToggle,
    _basFilter   : _basFilter,
    _yayinla     : _yayinla,
    _degerlendir : _degerlendir,
    _kabul       : _kabul,
    _saveAdres   : _saveAdres,
    _pickBelge   : _pickBelge,
    _pickFoto    : _pickFoto
  };

})();
