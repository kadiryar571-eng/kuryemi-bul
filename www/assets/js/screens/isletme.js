/* ============================================================
   KuryemiBul — screens/isletme.js
   İşletme ekranları: Panel, Harita, İlanlarım, İlan Oluştur/Düzenle,
                      Başvurular, Aday Detayı, Mesajlar, Profil
   ============================================================ */
window.IsletmeScreens = (function () {
  'use strict';

  var _adaylarCache = [];

  /* ── Metadata helpers ───────────────────────────────────── */
  function _metaEncode(meta, desc) {
    return 'META:' + JSON.stringify(meta) + '\n|||\n' + (desc || '');
  }
  function _metaDecode(aciklama) {
    if (!aciklama || aciklama.slice(0, 5) !== 'META:') return { meta: {}, desc: aciklama || '' };
    var sep = aciklama.indexOf('\n|||\n');
    if (sep < 0) return { meta: {}, desc: aciklama };
    try { return { meta: JSON.parse(aciklama.slice(5, sep)), desc: aciklama.slice(sep + 5) }; }
    catch(e) { return { meta: {}, desc: aciklama }; }
  }

  /* ── Aday card ──────────────────────────────────────────── */
  function _adayCard(a) {
    var name = a.ad || a.name || 'Aday';
    var puan = typeof a.puan !== 'undefined' ? a.puan : (a.score || '—');
    var sehir = a.sehir || a.loc || '—';
    var ilanBaslik = a.ilanBaslik || '';
    var durum = a.durum || 'pending';
    var durumLbl = durum === 'pending' ? 'Bekliyor' : durum === 'accepted' ? 'Kabul' : durum === 'rejected' ? 'Reddedildi' : durum;
    var durumCls  = durum === 'accepted' ? 'kb-chip--success' : durum === 'rejected' ? 'kb-chip--danger' : 'kb-chip--warning';
    return '<div class="person-card kb-card--pressable" onclick="Router.go(\'/isletme/aday/' + a.id + '\')">' +
      '<div class="kb-avatar" style="background:var(--c-isletme)">' + initials(name) + '</div>' +
      '<div class="person-card__info">' +
        '<div class="person-card__name">' + name + '</div>' +
        '<div class="person-card__sub">' + (ilanBaslik || sehir) + '</div>' +
        '<div class="person-card__meta">' +
          '<span class="kb-stars">' + ICON.star + puan + '</span>' +
          '<span class="kb-chip ' + durumCls + '" style="padding:2px 8px;font-size:.7rem">' + durumLbl + '</span>' +
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
        { id: 'ips-ilan',  num: '—', label: 'Açık İlan',          icon: 'briefcase', color: 'orange', route: '/isletme/ilanlarim',  action: 'Yönet'   },
        { id: 'ips-bas',   num: '—', label: 'Gelen Başvuru',       icon: 'check',     color: 'blue',   route: '/isletme/basvurular', action: 'İncele'  },
        { id: 'ips-mesaj', num: '—', label: 'Okunmamış Mesaj',     icon: 'msg',       color: 'green',  route: '/isletme/mesajlar',   action: 'Oku'     },
        { id: 'ips-puan',  num: '—', label: 'Profil Görüntülenme', icon: 'eye',       color: 'purple', route: '/isletme/profil',     action: 'Detaylar'}
      ],
      upgradeBanner: true,
      contentHtml: (
        '<div class="kb-section-head" style="margin-top:4px">' +
          '<div class="kb-section-title">Son Başvurular</div>' +
          '<button class="kb-section-link" onclick="Router.go(\'/isletme/basvurular\')">Tümünü Gör</button>' +
        '</div>' +
        '<div id="isletme-panel-adaylar"><div class="kb-empty" style="padding:16px 0"><div class="kb-empty__sub">Yükleniyor...</div></div></div>' +

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

    _loadIsletmePanelStats();
  }

  async function _loadIsletmePanelStats() {
    if (!window.SB || !SB.isOn()) return;
    try {
      var results = await Promise.allSettled([SB.myListings(), SB.myConvs(), SB.myListingsApplications()]);
      var ilanlar = results[0].status === 'fulfilled' ? results[0].value : [];
      var convs   = results[1].status === 'fulfilled' ? results[1].value : [];
      var apps    = results[2].status === 'fulfilled' ? results[2].value : [];
      var acikIlanlar = ilanlar.filter(function(il){ return (il.durum || '') === 'acik'; }).length;
      var yeniBas = apps.filter(function(a){ return (a.durum || '') === 'pending'; }).length;
      var unread = convs.reduce(function(s,c){ return s + (c.unread || 0); }, 0);
      var set = function(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
      set('ips-ilan',  acikIlanlar);
      set('ips-bas',   yeniBas);
      set('ips-mesaj', unread || convs.length);

      var panelAdayEl = document.getElementById('isletme-panel-adaylar');
      if (panelAdayEl) {
        var recentApps = apps.slice(0, 3);
        panelAdayEl.innerHTML = recentApps.length
          ? recentApps.map(_adayCard).join('')
          : '<div class="kb-empty" style="padding:16px 0"><div class="kb-empty__icon">📋</div><div class="kb-empty__sub">Henüz başvuru yok</div></div>';
      }
    } catch(e) {}
  }

  /* ── İşletme dashboard helpers ──────────────────────────── */
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

  /* ── 3. İLANLARIM ──────────────────────────────────────── */
  var _ilanlarimCache = [];

  function ilanlarim() {
    showAppBar('İlanlarım', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/isletme/ilan/yeni\')">' + ICON.plus + '</button>'
    );
    showBottomNav();
    setActiveNav('ilanlarim');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="isletme-ilan-tabs">' +
          '<button class="kb-tab active" onclick="IsletmeScreens._ilanFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._ilanFilter(\'acik\',this)">Açık</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._ilanFilter(\'pasif\',this)">Pasif</button>' +
        '</div>' +
        '<div id="isletme-ilan-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
        '<button class="btn btn--primary mt-16" style="background:var(--c-isletme)" onclick="Router.go(\'/isletme/ilan/yeni\')">' +
          ICON.plus + ' Yeni İlan Oluştur' +
        '</button>' +
      '</div>',
      _loadIlanlarim
    );
  }

  function _ilanCard(il) {
    var id = il.id || '';
    var isAcik = (il.durum || '') === 'acik';
    var parsed = _metaDecode(il.aciklama || '');
    var m = parsed.meta;
    var maas = m.maas || '';
    return '<div class="kb-card" style="margin-bottom:10px">' +
      '<div class="flex items-center justify-between mb-8">' +
        '<div style="font-weight:700;flex:1;margin-right:8px">' + (il.baslik || 'İlan') + '</div>' +
        '<span class="kb-chip ' + (isAcik ? 'kb-chip--success' : '') + '">' + (isAcik ? 'Açık' : 'Pasif') + '</span>' +
      '</div>' +
      (m.acil ? '<div><span class="kb-chip kb-chip--warning" style="margin-bottom:6px">🔥 Acil Alım</span></div>' : '') +
      ((il.sehir || il.bolge) ? '<div style="font-size:.82rem;color:var(--muted);margin-bottom:4px">' + ICON.pin + ' ' + [il.sehir, il.bolge].filter(Boolean).join(', ') + '</div>' : '') +
      (maas ? '<div style="font-size:.82rem;color:var(--c-isletme);font-weight:600;margin-bottom:6px">💰 ' + maas.replace('-', ' – ') + ' ₺/ay</div>' : '') +
      '<div style="font-size:.78rem;color:var(--muted)">' + (il.tarih || '') + '</div>' +
      '<div class="flex" style="gap:8px;margin-top:10px;flex-wrap:wrap">' +
        '<button class="btn btn--outline btn--sm" style="--c-accent:var(--c-isletme)" onclick="Router.go(\'/isletme/basvurular\')">Başvurular</button>' +
        (id ? '<button class="btn btn--ghost btn--sm" onclick="Router.go(\'/isletme/ilan/' + id + '/duzenle\')">Düzenle</button>' : '') +
        (id ? '<button class="btn btn--ghost btn--sm" onclick="IsletmeScreens._ilanToggle(\'' + id + '\',' + !isAcik + ')">' + (isAcik ? 'Pasife Al' : 'Yayınla') + '</button>' : '') +
        (id ? '<button class="btn btn--ghost btn--sm" style="color:#EF4444" onclick="IsletmeScreens._ilanSil(\'' + id + '\')">Sil</button>' : '') +
      '</div>' +
    '</div>';
  }

  function _renderIlanList(list) {
    if (!list.length) return '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">İlan yok</div><div class="kb-empty__sub">Yeni ilan oluşturarak kurye almaya başla.</div></div>';
    return list.map(_ilanCard).join('');
  }

  async function _loadIlanlarim() {
    var el = document.getElementById('isletme-ilan-list');
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
    document.querySelectorAll('#isletme-ilan-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var all = _ilanlarimCache;
    var filtered = type === 'tumu' ? all
      : type === 'acik'  ? all.filter(function (x) { return (x.durum || '') === 'acik'; })
      : all.filter(function (x) { return (x.durum || '') !== 'acik'; });
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

  async function _ilanSil(id) {
    if (!confirm('Bu ilanı silmek istediğinizden emin misiniz?')) return;
    try {
      await SB.deleteListing(id);
      toast('İlan silindi');
      _loadIlanlarim();
    } catch(e) { toast('Silinemedi'); }
  }

  /* ── 4. İLAN FORM ──────────────────────────────────────── */
  var _ilanFormState = { editId: null };

  function ilanYeni() {
    _ilanFormState.editId = null;
    showAppBar('İlan Oluştur', true);
    showBottomNav();
    setActiveNav('yeni');
    _renderIlanForm(null);
  }

  async function ilanDuzenle(ctx) {
    var id = ctx.params.id;
    _ilanFormState.editId = id;
    showAppBar('İlan Düzenle', true);
    showBottomNav();
    renderScreen('<div class="kb-screen-inner" style="padding-top:40px;text-align:center"><div class="kb-spinner"></div></div>');
    try {
      var ilan = (window.SB && SB.isOn()) ? await SB.listingById(id) : null;
      if (!ilan) { toast('İlan bulunamadı'); Router.back(); return; }
      _renderIlanForm(ilan);
    } catch(e) { toast('İlan yüklenemedi'); Router.back(); }
  }

  function _renderIlanForm(ilan) {
    var parsed = ilan ? _metaDecode(ilan.aciklama || '') : { meta: {}, desc: '' };
    var m = parsed.meta;
    var desc = parsed.desc;
    var maas = m.maas || '';
    var maasMin = '', maasMax = '';
    if (maas && maas.indexOf('-') >= 0) {
      var parts = maas.split('-');
      maasMin = parts[0].trim();
      maasMax = parts[1] ? parts[1].trim() : '';
    }
    var isEdit = !!(_ilanFormState.editId);

    function sel(val, opt) { return val === opt ? ' selected' : ''; }
    function esc(s) { return (s || '').replace(/"/g, '&quot;'); }

    renderScreen(
      '<div class="kb-screen-inner">' +

      '<div class="ilan-form-section">' +
        '<div class="ilan-form-section__title">Pozisyon Bilgileri</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Pozisyon Türü *</label>' +
          '<select class="kb-select" id="ilf-arac">' +
            '<option value="yaya"'   + sel(ilan && ilan.arac, 'yaya')   + '>Yaya Kurye</option>' +
            '<option value="moto"'   + sel(ilan && ilan.arac, 'moto')   + '>Moto Kurye</option>' +
            '<option value="aracli"' + sel(ilan && ilan.arac, 'aracli') + '>Araçlı Kurye</option>' +
          '</select>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">İlan Başlığı *</label>' +
          '<input class="kb-input" id="ilf-baslik" placeholder="Örn: Yaya Kurye Aranıyor" value="' + esc(ilan && ilan.baslik) + '">' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Çalışma Tipi</label>' +
          '<select class="kb-select" id="ilf-calisma">' +
            '<option value="part-time"'   + sel(m.calisma, 'part-time')   + '>Part-time</option>' +
            '<option value="tam-zamanli"' + sel(m.calisma, 'tam-zamanli') + '>Tam Zamanlı</option>' +
            '<option value="gunluk"'      + sel(m.calisma, 'gunluk')      + '>Günlük / Geçici</option>' +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div class="ilan-form-section">' +
        '<div class="ilan-form-section__title">Ücret & Konum</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Maaş Aralığı (₺/ay)</label>' +
          '<div class="salary-row">' +
            '<input class="kb-input" type="number" id="ilf-maas-min" placeholder="15000" value="' + esc(maasMin) + '">' +
            '<span class="salary-row__sep">—</span>' +
            '<input class="kb-input" type="number" id="ilf-maas-max" placeholder="22000" value="' + esc(maasMax) + '">' +
          '</div>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Şehir</label>' +
          '<input class="kb-input" id="ilf-sehir" placeholder="İstanbul" value="' + esc(ilan && ilan.sehir) + '">' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">İlçe / Bölge</label>' +
          '<input class="kb-input" id="ilf-bolge" placeholder="Kadıköy" value="' + esc(ilan && ilan.bolge) + '">' +
        '</div>' +
      '</div>' +

      '<div class="ilan-form-section">' +
        '<div class="ilan-form-section__title">İlan Detayları</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Açıklama</label>' +
          '<textarea class="kb-input" id="ilf-aciklama" rows="4" placeholder="Görev tanımı, aranan nitelikler...">' + (desc || '') + '</textarea>' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Gereken Belgeler</label>' +
          '<input class="kb-input" id="ilf-belgeler" placeholder="Kimlik, Sağlık raporu..." value="' + esc(m.belgeler) + '">' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Görüşme Adresi</label>' +
          '<input class="kb-input" id="ilf-adres" placeholder="Mağaza adresi" value="' + esc(m.adres) + '">' +
        '</div>' +
        '<div class="kb-form-group">' +
          '<label class="kb-label">Başlangıç Tarihi</label>' +
          '<input class="kb-input" type="date" id="ilf-baslangic" value="' + esc(m.baslangic) + '">' +
        '</div>' +
      '</div>' +

      '<div class="ilan-form-section">' +
        '<div class="ilan-form-section__title">Özellikler</div>' +
        '<div class="ilan-toggle-row">' +
          '<div class="ilan-toggle-row__body">' +
            '<div class="ilan-toggle-row__label">🔥 Acil Alım</div>' +
            '<div class="ilan-toggle-row__sub">İlanın öne çıkar, hızlı başvuru alır</div>' +
          '</div>' +
          '<label class="ilan-toggle"><input type="checkbox" id="ilf-acil"' + (m.acil ? ' checked' : '') + '><span class="ilan-toggle__knob"></span></label>' +
        '</div>' +
      '</div>' +

      '<div id="ilf-err" style="display:none;margin-bottom:12px;padding:10px;background:rgba(239,68,68,.12);border-radius:10px;color:#EF4444;font-size:.84rem;text-align:center"></div>' +
      '<button id="ilf-submit" class="btn btn--primary" style="background:var(--c-isletme)" onclick="IsletmeScreens._yayinla()">' + (isEdit ? 'Güncelle' : 'İlanı Yayınla') + '</button>' +
      '</div>'
    );
  }

  async function _yayinla() {
    var btn   = document.getElementById('ilf-submit');
    var errEl = document.getElementById('ilf-err');
    var baslik    = (document.getElementById('ilf-baslik')    || {}).value || '';
    var arac      = (document.getElementById('ilf-arac')      || {}).value || '';
    var calisma   = (document.getElementById('ilf-calisma')   || {}).value || '';
    var maasMin   = (document.getElementById('ilf-maas-min')  || {}).value || '';
    var maasMax   = (document.getElementById('ilf-maas-max')  || {}).value || '';
    var sehir     = (document.getElementById('ilf-sehir')     || {}).value || '';
    var bolge     = (document.getElementById('ilf-bolge')     || {}).value || '';
    var aciklama  = (document.getElementById('ilf-aciklama')  || {}).value || '';
    var belgeler  = (document.getElementById('ilf-belgeler')  || {}).value || '';
    var adres     = (document.getElementById('ilf-adres')     || {}).value || '';
    var baslangic = (document.getElementById('ilf-baslangic') || {}).value || '';
    var acil      = !!(document.getElementById('ilf-acil')    || {}).checked;

    if (!baslik.trim()) {
      if (errEl) { errEl.textContent = 'İlan başlığı zorunlu.'; errEl.style.display = ''; }
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
    if (errEl) errEl.style.display = 'none';

    var maas = (maasMin || maasMax) ? (maasMin || '?') + '-' + (maasMax || '?') : '';
    var meta = { calisma: calisma, maas: maas, belgeler: belgeler, adres: adres, baslangic: baslangic, acil: acil };
    var encoded = _metaEncode(meta, aciklama);
    var fields = { baslik: baslik.trim(), aciklama: encoded, sehir: sehir.trim(), bolge: bolge.trim(), arac: arac };

    try {
      var editId = _ilanFormState.editId;
      if (editId) {
        await SB.updateListing(editId, fields);
        toast('İlan güncellendi ✓');
      } else {
        await SB.createListing(fields);
        toast('İlanınız yayınlandı ✓');
      }
      setTimeout(function() { Router.go('/isletme/ilanlarim'); }, 800);
    } catch(e) {
      if (btn) { btn.disabled = false; btn.textContent = _ilanFormState.editId ? 'Güncelle' : 'İlanı Yayınla'; }
      if (errEl) { errEl.textContent = (e && e.message) || 'Bir hata oluştu.'; errEl.style.display = ''; }
    }
  }

  /* ── 5. BAŞVURULAR ──────────────────────────────────────── */
  function basvurular() {
    showAppBar('Başvurular', false);
    showBottomNav();
    setActiveNav('basvurular');

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-tabs" id="isletme-bas-tabs">' +
          '<button class="kb-tab active" onclick="IsletmeScreens._basFilter(\'tumu\',this)">Tümü</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._basFilter(\'yeni\',this)">Bekliyor</button>' +
          '<button class="kb-tab"        onclick="IsletmeScreens._basFilter(\'deger\',this)">Kararlananlar</button>' +
        '</div>' +
        '<div id="isletme-bas-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>',
      _loadAdaylar
    );
  }

  async function _loadAdaylar() {
    var el = document.getElementById('isletme-bas-list');
    if (!el) return;
    try {
      var items = (window.SB && SB.isOn()) ? await SB.myListingsApplications() : [];
      _adaylarCache = items;
      el.innerHTML = items.length
        ? items.map(_adayCard).join('')
        : '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Henüz başvuru yok</div><div class="kb-empty__sub">İlanlarınıza kurye başvurunca burada görünür</div></div>';
    } catch(e) {
      _adaylarCache = [];
      el.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Başvurular yüklenemedi</div></div>';
    }
  }

  function _basFilter(type, btn) {
    document.querySelectorAll('#isletme-bas-tabs .kb-tab').forEach(function (el) { el.classList.remove('active'); });
    btn.classList.add('active');
    var filtered = _adaylarCache;
    if (type === 'yeni')  filtered = _adaylarCache.filter(function (a) { return (a.durum || '') === 'pending'; });
    if (type === 'deger') filtered = _adaylarCache.filter(function (a) { return (a.durum || '') === 'accepted' || (a.durum || '') === 'rejected'; });
    var el = document.getElementById('isletme-bas-list');
    if (el) el.innerHTML = filtered.length
      ? filtered.map(_adayCard).join('')
      : '<div class="kb-empty"><div class="kb-empty__icon">📋</div><div class="kb-empty__title">Başvuru yok</div></div>';
  }

  /* ── 6. ADAY DETAY ──────────────────────────────────────── */
  function adayDetay(ctx) {
    var id = ctx.params.id;
    var a  = _adaylarCache.find(function (x) { return String(x.id) === String(id); });

    if (!a) {
      showAppBar('Aday Detayı', true);
      showBottomNav();
      renderScreen('<div class="kb-screen-inner"><div class="kb-empty" style="padding-top:48px"><div class="kb-empty__icon">👤</div><div class="kb-empty__title">Aday bulunamadı</div><div class="kb-empty__sub">Başvurular listesine dönün</div></div></div>');
      return;
    }

    var name  = a.ad || 'Aday';
    var puan  = typeof a.puan !== 'undefined' ? a.puan : '—';
    var sehir = a.sehir || '—';
    var durum = a.durum || 'pending';
    var durumLbl = durum === 'pending' ? 'Bekliyor' : durum === 'accepted' ? 'Kabul Edildi' : durum === 'rejected' ? 'Reddedildi' : durum;
    var durumCls = durum === 'accepted' ? 'kb-chip--success' : durum === 'rejected' ? 'kb-chip--danger' : 'kb-chip--warning';

    showAppBar(name, true);
    showBottomNav();

    renderScreen(
      '<div>' +
        '<div class="detail-hero">' +
          '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">' +
            '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-isletme)">' + initials(name) + '</div>' +
            '<div>' +
              '<div style="font-size:1.1rem;font-weight:800">' + name + '</div>' +
              '<div class="kb-stars" style="margin:4px 0">' + ICON.star + ' ' + puan + '</div>' +
              '<span class="kb-chip ' + durumCls + '">' + durumLbl + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<div class="detail-section__title">Konum & Rol</div>' +
          (sehir !== '—' ? '<div class="detail-row">' + ICON.pin + sehir + '</div>' : '') +
          (a.rol ? '<div class="detail-row">' + ICON.briefcase + (a.rol === 'kurye' ? 'Kurye' : a.rol) + '</div>' : '') +
        '</div>' +

        (a.ilanBaslik ? (
          '<div class="detail-section">' +
            '<div class="detail-section__title">Başvurulan İlan</div>' +
            '<div class="detail-row">' + ICON.doc + a.ilanBaslik + '</div>' +
            (a.tarih ? '<div class="detail-row" style="font-size:.78rem;color:var(--muted)">' + ICON.clock + a.tarih + '</div>' : '') +
          '</div>'
        ) : '') +

        (a.mesaj ? (
          '<div class="detail-section">' +
            '<div class="detail-section__title">Başvuru Mesajı</div>' +
            '<p style="font-size:.88rem;line-height:1.6;color:var(--text)">' + a.mesaj + '</p>' +
          '</div>'
        ) : '') +

        '<div class="detail-cta" style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="btn btn--outline btn--sm" onclick="Router.go(\'/isletme/mesajlar\')" style="flex:1;--c-accent:var(--c-isletme)">Mesaj Gönder</button>' +
          (durum === 'pending' ? (
            '<button class="btn btn--primary btn--sm" onclick="IsletmeScreens._kabul(\'' + id + '\')" style="flex:1;background:var(--c-isletme)">Kabul Et</button>' +
            '<button class="btn btn--ghost btn--sm" onclick="IsletmeScreens._reddet(\'' + id + '\')" style="flex:1;color:#EF4444">Reddet</button>'
          ) : '') +
        '</div>' +
      '</div>'
    );
  }

  async function _kabul(id) {
    try {
      await SB.updateApplication(id, 'accepted');
      var idx = _adaylarCache.findIndex(function(x){ return String(x.id) === String(id); });
      if (idx >= 0) _adaylarCache[idx].durum = 'accepted';
      toast('Aday kabul edildi! ✓');
      Router.back();
    } catch(e) { toast('İşlem başarısız'); }
  }

  async function _reddet(id) {
    try {
      await SB.updateApplication(id, 'rejected');
      var idx = _adaylarCache.findIndex(function(x){ return String(x.id) === String(id); });
      if (idx >= 0) _adaylarCache[idx].durum = 'rejected';
      toast('Başvuru reddedildi.');
      Router.back();
    } catch(e) { toast('İşlem başarısız'); }
  }

  /* ── 7. MESAJLAR ────────────────────────────────────────── */
  function mesajlar() {
    SharedScreens.sharedMesajlar('isletme');
  }

  /* ── 7b. CHAT ───────────────────────────────────────────── */
  function mesajChat(ctx) {
    SharedScreens.sharedMesajChat(ctx, 'isletme');
  }

  /* ── 8. PROFİL ──────────────────────────────────────────── */
  async function profil() {
    showAppBar('İşletme Profilim', false,
      '<button class="kb-appbar__action" onclick="Router.go(\'/ayarlar\')">' + ICON.settings + '</button>'
    );
    showBottomNav();
    setActiveNav('profil');

    var p = APP.profile || {};
    if (window.SB && SB.isOn()) {
      try { var fresh = await SB.myProfile(); if (fresh) { p = fresh; APP.profile = fresh; } } catch (e) {}
    }

    var name  = p.ad || 'İşletme';
    var puan  = p.puan ? String(p.puan) : null;
    var sehir = p.sehir || '';
    var avatarHtml = p.avatar_url
      ? '<img src="' + p.avatar_url + '" style="width:72px;height:72px;border-radius:50%;object-fit:cover">'
      : '<div class="kb-avatar kb-avatar--xl" style="background:var(--c-isletme)">' + initials(name) + '</div>';

    renderScreen(
      '<div>' +
        '<div class="profile-hero">' +
          avatarHtml +
          '<div class="profile-hero__name">' + name + '</div>' +
          '<div class="profile-hero__sub">Esnaf / İşletme' + (sehir ? ' · ' + sehir : '') + '</div>' +
          '<div class="profile-hero__badges">' +
            (puan ? '<span class="kb-chip kb-chip--warning">' + ICON.star + ' ' + puan + '</span>' : '') +
            (p.dogrulama === 'full' ? '<span class="kb-chip kb-chip--success">' + ICON.shield + ' Doğrulandı</span>' : '') +
          '</div>' +
        '</div>' +

        '<div class="kb-card" style="margin:0 16px 16px;padding:0">' +
          _mi('Profil Düzenle',    'user',      '/profil-duzenle') +
          _mi('İlanlarım',        'briefcase', '/isletme/ilanlarim') +
          _mi('Başvurular',       'users',     '/isletme/basvurular') +
          _mi('Bildirimler',      'bell',      '/bildirimler') +
          _mi('Ayarlar',          'settings',  '/ayarlar') +
          _mi('Yardım & Destek',  'help',      '/yardim') +
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
    panel        : panel,
    harita       : harita,
    ilanlarim    : ilanlarim,
    ilanYeni     : ilanYeni,
    ilanDuzenle  : ilanDuzenle,
    basvurular   : basvurular,
    adayDetay    : adayDetay,
    mesajlar     : mesajlar,
    mesajChat    : mesajChat,
    profil       : profil,
    _ilanFilter  : _ilanFilter,
    _ilanToggle  : _ilanToggle,
    _ilanSil     : _ilanSil,
    _basFilter   : _basFilter,
    _yayinla     : _yayinla,
    _kabul       : _kabul,
    _reddet      : _reddet
  };

})();
