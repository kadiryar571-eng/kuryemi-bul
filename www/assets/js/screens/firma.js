/* ============================================================
   KuryemiBul — screens/firma.js
   8 Firma ekranı: Panel, Harita, İlanlarım, Yeni İlan,
                   Başvurular, Aday Detayı, Mesajlar, Profil
   ============================================================ */
window.FirmaScreens = (function () {
  'use strict';

  var _adaylarCache = [];

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

    _loadFirmaPanelStats();
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
      setTimeout(function() { window.initPremiumMap('firma'); }, 200);
    } else {
      window._spmPendingRole = 'firma';
    }
  }

  /* ── 3. İLANLARIM ──────────────────────────────────────── */
  var _ilanlarimCache = [];

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

    _loadIlanlarim();
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
        (il.id ? '<button class="btn btn--ghost btn--sm" onclick="FirmaScreens._ilanToggle(\'' + il.id + '\',' + !isAcik + ')">' + (isAcik ? 'Pasif Yap' : 'Yayınla') + '</button>' : '') +
      '</div>' +
    '</div>';
  }

  function _renderIlanList(list) {
    if (!list.length) return '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">İlan yok</div><div class="kb-empty__sub">Yeni ilan oluştur.</div></div>';
    return list.map(_ilanCard).join('');
  }

  async function _loadIlanlarim() {
    var el = document.getElementById('firma-ilan-list');
    if (!el) return;
    try {
      var items = (window.SB && SB.isOn()) ? await SB.myListings() : [];
      _ilanlarimCache = items;
      if (el) el.innerHTML = _renderIlanList(items);
    } catch(e) {
      _ilanlarimCache = [];
      if (el) el.innerHTML = _renderIlanList([]);
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
        '<button id="il-yayinla-btn" class="btn btn--primary" onclick="FirmaScreens._yayinla()">İlan Yayınla</button>' +
        '<div id="il-hata" style="display:none;margin-top:12px;padding:12px;background:rgba(239,68,68,.12);border-radius:10px;color:#EF4444;font-size:.84rem;text-align:center"></div>' +
      '</div>'
    );
  }

  async function _yayinla() {
    var btn   = document.getElementById('il-yayinla-btn');
    var hata  = document.getElementById('il-hata');
    if (btn)  { btn.disabled = true; btn.textContent = 'Yayınlanıyor…'; }
    if (hata) hata.style.display = 'none';

    var pozEl  = document.getElementById('il-pozisyon');
    var konEl  = document.getElementById('il-konum');
    var acEl   = document.getElementById('il-aciklama');
    var maasMinEl = document.getElementById('il-maas-min');
    var maasMaxEl = document.getElementById('il-maas-max');

    var baslik   = pozEl  ? pozEl.value.trim()  : '';
    var sehir    = konEl  ? konEl.value.trim()  : '';
    var aciklama = acEl   ? acEl.value.trim()   : '';
    var maasMin  = maasMinEl ? maasMinEl.value : '';
    var maasMax  = maasMaxEl ? maasMaxEl.value : '';

    if (!baslik) {
      if (btn)  { btn.disabled = false; btn.textContent = 'İlan Yayınla'; }
      if (hata) { hata.textContent = 'Pozisyon seçiniz.'; hata.style.display = 'block'; }
      return;
    }

    var maasAciklama = (maasMin || maasMax) ? ((maasMin || '?') + ' – ' + (maasMax || '?') + ' ₺/ay') : '';
    var fullAciklama = aciklama + (maasAciklama ? '\n\nMaaş: ' + maasAciklama : '');

    try {
      await SB.createListing({ baslik: baslik, sehir: sehir, aciklama: fullAciklama.trim() });
      toast('İlanınız yayınlandı! ✓');
      setTimeout(function () { Router.go('/firma/ilanlarim'); }, 800);
    } catch(e) {
      if (btn)  { btn.disabled = false; btn.textContent = 'İlan Yayınla'; }
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
          '<button class="kb-tab"        onclick="FirmaScreens._basFilter(\'deger\',this)">Değerlendirilen</button>' +
        '</div>' +
        '<div id="firma-bas-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>'
    );
    _loadAdaylar();
  }

  async function _loadAdaylar() {
    var el = document.getElementById('firma-bas-list');
    if (!el) return;
    try {
      var items = (window.SB && SB.isOn()) ? await SB.myApplications() : [];
      _adaylarCache = items;
      el.innerHTML = items.length
        ? items.map(function (a) { return _adayCard(a, 'firma'); }).join('')
        : '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Başvuru yok</div></div>';
    } catch(e) {
      _adaylarCache = [];
      el.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Başvuru yüklenemedi</div></div>';
    }
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#firma-bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var filtered = _adaylarCache;
    if (type === 'yeni')  filtered = _adaylarCache.filter(function (a) { return (a.durum || a.status) === 'pending'; });
    if (type === 'deger') filtered = _adaylarCache.filter(function (a) { return (a.durum || a.status) === 'reviewed'; });
    var el = document.getElementById('firma-bas-list');
    if (el) el.innerHTML = filtered.length
      ? filtered.map(function (a) { return _adayCard(a, 'firma'); }).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Başvuru yok</div></div>';
  }

  /* ── 6. ADAY DETAY ──────────────────────────────────────── */
  function adayDetay(ctx) {
    var id = ctx.params.id;
    var a  = _adaylarCache.find(function (x) { return String(x.id) === String(id); })
          || { id: id, name: 'Aday', score: '—', exp: '—', loc: '—', status: 'pending' };

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
    SharedScreens.sharedMesajlar('firma');
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
          _mi('Profil Düzenle',      'user',        '/profil-duzenle') +
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
    _ilanFilter  : _ilanFilter,
    _ilanToggle  : _ilanToggle,
    _basFilter   : _basFilter,
    _yayinla     : _yayinla,
    _degerlendir : _degerlendir
  };

})();
