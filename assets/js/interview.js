(function () {
  'use strict';

  var STATUS = {
    bekliyor: { label: 'Bekliyor', color: 'warning' },
    onaylandi: { label: 'Onaylandı', color: 'success' },
    reddedildi: { label: 'Reddedildi', color: 'error' },
    yeniden_planlandi: { label: 'Yeniden Planlandı', color: 'info' },
    tamamlandi: { label: 'Tamamlandı', color: 'neutral' },
    iptal: { label: 'İptal Edildi', color: 'muted' }
  };

  var DECISION = {
    kabul: { label: 'Kabul Edildi', icon: '✅' },
    red: { label: 'Reddedildi', icon: '❌' },
    sonraki_asama: { label: 'Sonraki Aşama', icon: '➡️' }
  };

  var MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  function makeId() {
    return 'iv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function formatDatetime(date, time) {
    if (!date) return '';
    try {
      var d = new Date(date);
      var label = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      return time ? label + ' ' + time : label;
    } catch (e) { return date + (time ? ' ' + time : ''); }
  }

  function relativeDay(date) {
    if (!date) return '';
    try {
      var now = new Date(); now.setHours(0, 0, 0, 0);
      var d = new Date(date); d.setHours(0, 0, 0, 0);
      var diff = Math.round((d - now) / 86400000);
      if (diff === 0) return 'Bugün';
      if (diff === 1) return 'Yarın';
      if (diff === -1) return 'Dün';
      if (diff > 0) return diff + ' gün sonra';
      return Math.abs(diff) + ' gün önce';
    } catch (e) { return date; }
  }

  /* ============================================================
     VERİ KATMANI — public.interviews (migration-16 + 19)
     Eskiden localStorage'daydı: işveren görüşme oluşturduğunda kayıt
     yalnız kendi tarayıcısında kalıyordu, kurye hiç göremiyordu.
     Artık tek kaynak veritabanı; her iki taraf da aynı satırı görür.

     Not: fonksiyon imzalarındaki ilk "uid" parametresi geriye dönük
     uyumluluk için duruyor, kullanılmıyor (kimlik auth.uid()'den gelir).
     ============================================================ */
  var _cache = [];      // son yüklenen görüşmeler
  var _loaded = false;
  var _loading = null;

  function on() { return !!(window.SB && SB.isOn && SB.isOn()); }

  /* Veritabanından tazele. Aynı anda birden çok çağrı gelirse tek istek atar. */
  function load(force) {
    if (!on()) { _loaded = true; return Promise.resolve([]); }
    if (_loading) return _loading;
    if (_loaded && !force) return Promise.resolve(_cache);
    _loading = SB.myInterviews()
      .then(function (list) { _cache = list || []; _loaded = true; return _cache; })
      .catch(function (e) { console.warn('KBInterview.load:', e); return _cache; })
      .then(function (r) { _loading = null; return r; });
    return _loading;
  }

  /* Render için senkron erişim — önce load() çağrılmış olmalı */
  function getAll()      { return _cache.slice(); }
  function getOne(a, b) {
    var id = (b === undefined) ? a : b;          // getOne(id) veya getOne(uid, id)
    for (var i = 0; i < _cache.length; i++) if (_cache[i].id === id) return _cache[i];
    return null;
  }
  function findByJob(a, b) {
    var jobId = (b === undefined) ? a : b;
    return _cache.filter(function (iv) { return String(iv.jobId) === String(jobId); });
  }
  /* Sohbet thread'i localStorage kavramıydı; DB'de karşılığı ilan+aday.
     Geriye dönük uyum için boş döner. */
  function findByThread() { return []; }
  function getLog() { return []; }   // ayrı log tablosu yok; durum geçmişi bildirimlerde

  /* Yerel önbelleği güncelle (DB yanıtı ile) */
  function _put(iv) {
    if (!iv || !iv.id) return iv;
    var i = _cache.findIndex(function (x) { return x.id === iv.id; });
    if (i >= 0) _cache[i] = iv; else _cache.push(iv);
    return iv;
  }
  function _err(r) { return r && r.error ? r.error : null; }
  function _toast(msg) {
    if (window.KBMotion && KBMotion.showErrorToast) KBMotion.showErrorToast(msg);
  }

  /* ---- Görüşme oluştur (işveren) ---- */
  async function create(uid, data) {
    if (arguments.length === 1) { data = uid; }      // create(data) da desteklenir
    if (!on()) { _toast('Bağlantı yok — görüşme oluşturulamadı'); return null; }
    var r = await SB.createInterview({
      interviewee_id: data.kuryeId || data.interviewee_id,
      listing_id:     data.jobId || data.listing_id || null,
      application_id: data.application_id || null,
      date: data.date, time: data.time, type: data.type,
      location: data.location, meetingLink: data.meetingLink, note: data.note,
      status: 'bekliyor'
    });
    var e = _err(r);
    if (e) { _toast('Görüşme oluşturulamadı: ' + e); return null; }
    return _put(r);
  }

  async function update(uid, id, patch) {
    if (!on()) { _toast('Bağlantı yok'); return null; }
    var r = await SB.updateInterview(id, patch);
    var e = _err(r);
    if (e) { _toast('Güncellenemedi: ' + e); return null; }
    return _put(r);
  }

  /* ---- Kurye yanıtı: onayla / reddet ---- */
  async function respond(uid, id, action) {
    return update(uid, id, { status: action === 'onayla' ? 'onaylandi' : 'reddedildi' });
  }

  /* ---- Kurye yeniden planlama talep eder ---- */
  async function requestReschedule(uid, id, data) {
    return update(uid, id, {
      status: 'yeniden_planlandi',
      reschedule_req: {
        date: data.date, time: data.time,
        type: data.type || null, location: data.location || null,
        reason: data.reason || '',
        requestedAt: new Date().toISOString(),
        status: 'pending'
      }
    });
  }

  /* ---- İşveren yeniden planlamayı kabul eder ---- */
  async function acceptReschedule(uid, id) {
    var iv = getOne(id);
    var req = iv && iv.rescheduleRequest;
    if (!req) return null;
    var patch = { status: 'onaylandi', reschedule_req: null, date: req.date, time: req.time };
    if (req.type) patch.type = req.type;
    if (req.location) patch.location = req.location;
    return update(uid, id, patch);
  }

  async function complete(uid, id)        { return update(uid, id, { status: 'tamamlandi' }); }
  async function cancelInterview(uid, id) { return update(uid, id, { status: 'iptal' }); }
  async function addPostNote(uid, id, note) { return update(uid, id, { post_note: note }); }
  async function makeDecision(uid, id, decision) { return update(uid, id, { decision: decision }); }

  /* ---- Hatırlatıcılar ----
     "Gösterildi" bilgisi kullanıcıya/cihaza özel bir arayüz durumudur,
     localStorage'da tutulur. Görüşmenin kendisi veritabanındadır. */
  function _remKey(id, kind) { return 'kb_iv_rem_' + id + '_' + kind; }
  function checkReminders() {
    var now = Date.now(), due = [];
    _cache.forEach(function (iv) {
      if (iv.status !== 'onaylandi' || !iv.date) return;
      var t = new Date(iv.date + 'T' + (iv.time || '09:00')).getTime();
      if (isNaN(t) || t < now) return;
      var diff = t - now;
      [['24h', 86400000], ['1h', 3600000]].forEach(function (p) {
        if (diff > p[1]) return;
        var k = _remKey(iv.id, p[0]);
        if (localStorage.getItem(k)) return;
        try { localStorage.setItem(k, '1'); } catch (e) {}
        due.push({ iv: iv, type: p[0] });
        if (window.KBMotion) {
          KBMotion.showInAppNotif(
            p[0] === '24h' ? 'Yarın görüşmen var' : '1 saat sonra görüşmen var!',
            (iv.isletme && iv.isletme.ad ? iv.isletme.ad + ' — ' : '') + formatDatetime(iv.date, iv.time));
        }
      });
    });
    return due;
  }

  function getUpcoming(uid, limit) {
    if (typeof uid === 'number') { limit = uid; }   // getUpcoming(3) de çalışsın
    var today = new Date().toISOString().slice(0, 10);
    var list = _cache.filter(function (iv) {
      return (iv.status === 'onaylandi' || iv.status === 'bekliyor') && iv.date && iv.date >= today;
    });
    list.sort(function (a, b) { return (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')); });
    return limit ? list.slice(0, limit) : list;
  }

  function getStats() {
    var st = { toplam: _cache.length, bekliyor: 0, onaylandi: 0, tamamlandi: 0, iptal: 0 };
    _cache.forEach(function (iv) { if (st[iv.status] !== undefined) st[iv.status]++; });
    return st;
  }

  /* CANLI: karşı taraf görüşmeyi güncelleyince önbellek tazelenir */
  var _liveOff = null;
  function subscribe(cb) {
    if (_liveOff || !on() || !SB.subscribeInterviews) return function () {};
    var deb = null;
    _liveOff = SB.subscribeInterviews(function () {
      if (deb) clearTimeout(deb);
      deb = setTimeout(function () {
        load(true).then(function () { if (cb) try { cb(_cache); } catch (e) {} });
      }, 400);
    });
    return _liveOff;
  }

  // Render helpers
  function renderBadge(status) {
    var s = STATUS[status] || { label: status, color: 'muted' };
    return '<span class="iv-badge iv-badge--' + esc(status) + '">' + esc(s.label) + '</span>';
  }

  function renderCard(iv, role, opts) {
    opts = opts || {};
    var isBiz = role === 'isletme' || role === 'firma';
    var other = isBiz ? iv.kurye : iv.isletme;
    var otherName = (other && other.ad) || '?';
    var otherAvatar = (other && other.avatar) || '';
    var canRespond = !isBiz && iv.status === 'bekliyor';
    var canReschedule = !isBiz && (iv.status === 'onaylandi' || iv.status === 'bekliyor');
    var canComplete = isBiz && iv.status === 'onaylandi';
    var canCancel = isBiz && (iv.status === 'bekliyor' || iv.status === 'onaylandi');
    var canDecide = isBiz && iv.status === 'tamamlandi' && !iv.decision;
    var hasRescheduleReq = isBiz && iv.rescheduleRequest && iv.rescheduleRequest.status === 'pending';

    var ava = otherAvatar
      ? '<img src="' + esc(otherAvatar) + '" alt="' + esc(otherName) + '">'
      : '<span class="iv-card__avatar-text">' + esc(initials(otherName)) + '</span>';

    var typeIcon = iv.type === 'online' ? '💻' : '📍';
    var locationInfo = iv.type === 'online'
      ? (iv.meetingLink ? '<a href="' + esc(iv.meetingLink) + '" class="iv-link" target="_blank">Bağlantıyı Aç</a>' : 'Online')
      : esc(iv.location || 'Konum belirtilmedi');

    var actions = '';
    if (canRespond) {
      actions += '<button class="btn btn--success btn--sm" data-iv-action="onayla" data-iv-id="' + iv.id + '">✓ Onayla</button>';
      actions += '<button class="btn btn--danger btn--sm" data-iv-action="reddet" data-iv-id="' + iv.id + '">✕ Reddet</button>';
    }
    if (canReschedule) {
      actions += '<button class="btn btn--secondary btn--sm" data-iv-action="reschedule" data-iv-id="' + iv.id + '">📅 Yeniden Planla</button>';
    }
    if (canComplete) {
      actions += '<button class="btn btn--secondary btn--sm" data-iv-action="complete" data-iv-id="' + iv.id + '">✓ Tamamlandı</button>';
    }
    if (canCancel) {
      actions += '<button class="btn btn--ghost btn--sm" data-iv-action="cancel" data-iv-id="' + iv.id + '">İptal Et</button>';
    }
    if (hasRescheduleReq) {
      var req = iv.rescheduleRequest;
      actions += '<div class="iv-reschedule-alert">'
        + '<span>⚠️ Yeniden planlama talebi: ' + esc(formatDatetime(req.date, req.time)) + '</span>'
        + '<button class="btn btn--primary btn--sm" data-iv-action="accept-reschedule" data-iv-id="' + iv.id + '">Kabul Et</button>'
        + '</div>';
    }
    if (canDecide) {
      actions += '<div class="iv-post-decision">'
        + '<button class="btn btn--success btn--sm" data-iv-action="decide-kabul" data-iv-id="' + iv.id + '">✅ Kabul Et</button>'
        + '<button class="btn btn--secondary btn--sm" data-iv-action="decide-sonraki" data-iv-id="' + iv.id + '">➡️ Sonraki Aşama</button>'
        + '<button class="btn btn--danger btn--sm" data-iv-action="decide-red" data-iv-id="' + iv.id + '">❌ Reddet</button>'
        + '</div>';
    }
    if (isBiz && iv.status === 'tamamlandi' && iv.decision) {
      var dec = DECISION[iv.decision] || { label: iv.decision, icon: '' };
      actions += '<div class="iv-post-decision"><span class="iv-decision-badge">' + dec.icon + ' ' + esc(dec.label) + '</span></div>';
    }

    var noteHtml = iv.note ? '<p class="iv-note">' + esc(iv.note) + '</p>' : '';
    var postNoteHtml = iv.postNote ? '<p class="iv-postnote">' + esc(iv.postNote) + '</p>' : '';

    if (opts.mini) {
      return '<div class="iv-mini-card" data-iv-id="' + iv.id + '">'
        + '<div class="iv-mini-card__left">'
        + renderBadge(iv.status)
        + '<span class="iv-mini-card__title">' + esc(iv.jobTitle) + '</span>'
        + '<span class="iv-mini-card__sub">' + esc(otherName) + '</span>'
        + '</div>'
        + '<div class="iv-mini-card__right">'
        + '<span class="iv-mini-card__date">' + esc(relativeDay(iv.date)) + '</span>'
        + '<span class="iv-mini-card__time">' + esc(iv.time) + '</span>'
        + '</div>'
        + '</div>';
    }

    return '<div class="iv-card iv-card--' + esc(iv.status) + '" data-iv-id="' + iv.id + '">'
      + '<div class="iv-card__head">'
        + '<div class="iv-card__avatar">' + ava + '</div>'
        + '<div class="iv-card__meta">'
          + '<div class="iv-card__name">' + esc(otherName) + '</div>'
          + '<div class="iv-card__job">' + esc(iv.jobTitle) + '</div>'
        + '</div>'
        + renderBadge(iv.status)
      + '</div>'
      + '<div class="iv-card__body">'
        + '<div class="iv-info-row"><span class="iv-info-icon">📅</span><span>' + esc(formatDatetime(iv.date, iv.time)) + '</span><span class="iv-info-rel">(' + esc(relativeDay(iv.date)) + ')</span></div>'
        + '<div class="iv-info-row"><span class="iv-info-icon">' + typeIcon + '</span><span>' + locationInfo + '</span></div>'
        + noteHtml + postNoteHtml
      + '</div>'
      + (actions ? '<div class="iv-card__acts">' + actions + '</div>' : '')
      + '</div>';
  }

  // Mini card list for panel widgets
  function renderUpcomingWidget(uid, role, limit) {
    var list = getUpcoming(uid, limit || 3);
    if (!list.length) return '<p style="color:var(--text-3);font-size:0.82rem;padding:8px 0;">Yaklaşan görüşme yok.</p>';
    return list.map(function (iv) { return renderCard(iv, role, { mini: true }); }).join('');
  }

  window.KBInterview = {
    /* veri (async) */
    load: load,
    create: create,
    update: update,
    respond: respond,
    complete: complete,
    addPostNote: addPostNote,
    makeDecision: makeDecision,
    cancelInterview: cancelInterview,
    requestReschedule: requestReschedule,
    acceptReschedule: acceptReschedule,
    /* önbellekten (senkron) — önce load() çağır */
    getAll: getAll,
    getOne: getOne,
    getLog: getLog,
    findByThread: findByThread,
    findByJob: findByJob,
    getUpcoming: getUpcoming,
    getStats: getStats,
    checkReminders: checkReminders,
    subscribe: subscribe,
    /* render */
    renderBadge: renderBadge,
    renderCard: renderCard,
    renderUpcomingWidget: renderUpcomingWidget,
    formatDatetime: formatDatetime,
    STATUS: STATUS
  };
})();
