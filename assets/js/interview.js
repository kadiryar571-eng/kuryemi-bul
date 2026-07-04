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

  // Storage: per user (stored in BOTH isletme + kurye keys for two-way access)
  function storageKey(uid) { return 'kb_ivs_' + uid; }
  function logKey(ivId) { return 'kb_iv_log_' + ivId; }

  function getAll(uid) {
    try { return JSON.parse(localStorage.getItem(storageKey(uid)) || '[]'); } catch (e) { return []; }
  }

  function saveAll(uid, list) {
    try { localStorage.setItem(storageKey(uid), JSON.stringify(list)); } catch (e) {}
  }

  function getOne(uid, id) {
    return getAll(uid).find(function (iv) { return iv.id === id; }) || null;
  }

  function upsertOne(uid, iv) {
    var list = getAll(uid);
    var idx = list.findIndex(function (x) { return x.id === iv.id; });
    if (idx >= 0) list[idx] = iv; else list.push(iv);
    saveAll(uid, list);
  }

  // Dual-party sync: write to both isletme and kurye keys
  function syncInterview(iv) {
    upsertOne(iv.isletmeId, iv);
    upsertOne(iv.kuryeId, iv);
  }

  function logEvent(ivId, event) {
    try {
      var log = JSON.parse(localStorage.getItem(logKey(ivId)) || '[]');
      log.push({ event: event, at: new Date().toISOString() });
      localStorage.setItem(logKey(ivId), JSON.stringify(log));
    } catch (e) {}
  }

  function getLog(ivId) {
    try { return JSON.parse(localStorage.getItem(logKey(ivId)) || '[]'); } catch (e) { return []; }
  }

  // Create a new interview — called by employer
  function create(isletmeId, data) {
    var iv = {
      id: makeId(),
      threadId: data.threadId || '',
      jobId: data.jobId || '',
      jobTitle: data.jobTitle || '',
      kuryeId: data.kuryeId || '',
      kurye: data.kurye || { id: data.kuryeId, ad: 'Kurye', avatar: '' },
      isletmeId: isletmeId,
      isletme: data.isletme || { id: isletmeId, ad: 'İşletme', avatar: '' },
      date: data.date || '',
      time: data.time || '',
      type: data.type || 'yüz yüze',
      location: data.location || '',
      meetingLink: data.meetingLink || '',
      note: data.note || '',
      status: 'bekliyor',
      postNote: '',
      decision: null,
      rescheduleHistory: [],
      rescheduleRequest: null,
      reminders: { sent24h: false, sent1h: false },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    syncInterview(iv);
    logEvent(iv.id, 'created');
    if (window.KBChat && data.threadId) {
      KBChat.saveInterview(data.threadId, { id: iv.id, status: iv.status });
    }
    return iv;
  }

  function update(uid, id, patch) {
    var iv = getOne(uid, id);
    if (!iv) return null;
    Object.assign(iv, patch, { updatedAt: new Date().toISOString() });
    syncInterview(iv);
    return iv;
  }

  function findByThread(uid, threadId) {
    return getAll(uid).filter(function (iv) { return iv.threadId === threadId; });
  }

  function findByJob(uid, jobId) {
    return getAll(uid).filter(function (iv) { return iv.jobId === jobId; });
  }

  // Courier response: 'onayla' | 'reddet'
  function respond(uid, id, action) {
    var iv = getOne(uid, id);
    if (!iv) return null;
    var newStatus = action === 'onayla' ? 'onaylandi' : 'reddedildi';
    iv.status = newStatus;
    iv.updatedAt = new Date().toISOString();
    syncInterview(iv);
    logEvent(id, action === 'onayla' ? 'confirmed' : 'declined');
    if (window.KBChat && iv.threadId) {
      var msg = action === 'onayla'
        ? '✅ Görüşme daveti onaylandı — ' + formatDatetime(iv.date, iv.time)
        : '❌ Görüşme daveti reddedildi.';
      KBChat.sendMessage(uid, iv.threadId, msg, 'system');
    }
    return iv;
  }

  // Courier requests reschedule
  function requestReschedule(uid, id, data) {
    var iv = getOne(uid, id);
    if (!iv) return null;
    var req = {
      date: data.date,
      time: data.time,
      type: data.type || iv.type,
      location: data.location || iv.location,
      reason: data.reason || '',
      requestedBy: uid,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };
    iv.rescheduleRequest = req;
    iv.status = 'yeniden_planlandi';
    iv.updatedAt = new Date().toISOString();
    syncInterview(iv);
    logEvent(id, 'reschedule_requested');
    return iv;
  }

  // Employer accepts reschedule request
  function acceptReschedule(uid, id) {
    var iv = getOne(uid, id);
    if (!iv || !iv.rescheduleRequest) return null;
    var req = iv.rescheduleRequest;
    iv.rescheduleHistory.push({ from: { date: iv.date, time: iv.time }, to: { date: req.date, time: req.time }, reason: req.reason, at: req.requestedAt });
    iv.date = req.date;
    iv.time = req.time;
    if (req.type) iv.type = req.type;
    if (req.location) iv.location = req.location;
    iv.rescheduleRequest = null;
    iv.status = 'onaylandi';
    iv.updatedAt = new Date().toISOString();
    syncInterview(iv);
    logEvent(id, 'reschedule_accepted');
    if (window.KBChat && iv.threadId) {
      KBChat.sendMessage(uid, iv.threadId, '📅 Yeniden planlama kabul edildi — ' + formatDatetime(iv.date, iv.time), 'system');
    }
    return iv;
  }

  // Employer marks interview complete
  function complete(uid, id) {
    return update(uid, id, { status: 'tamamlandi' });
  }

  // Employer cancels interview
  function cancelInterview(uid, id) {
    var iv = update(uid, id, { status: 'iptal' });
    if (iv) logEvent(id, 'cancelled');
    return iv;
  }

  // Post-interview note (both sides)
  function addPostNote(uid, id, note) {
    var iv = update(uid, id, { postNote: note });
    if (iv) logEvent(id, 'note_added');
    return iv;
  }

  // Employer makes hiring decision
  function makeDecision(uid, id, decision) {
    var iv = update(uid, id, { decision: decision });
    if (iv) {
      logEvent(id, 'decision_' + decision);
      if (window.KBChat && iv.threadId) {
        var label = DECISION[decision] ? DECISION[decision].label : decision;
        KBChat.sendMessage(uid, iv.threadId, '📋 Görüşme kararı: ' + label, 'system');
      }
    }
    return iv;
  }

  // Reminder check — call on page load, returns list of due interviews
  function checkReminders(uid) {
    var now = Date.now();
    var due = [];
    var list = getAll(uid);
    list.forEach(function (iv) {
      if (iv.status !== 'onaylandi') return;
      var ivTime = new Date(iv.date + 'T' + (iv.time || '09:00')).getTime();
      if (ivTime < now) return;
      var diff = ivTime - now;
      if (diff <= 86400000 && !iv.reminders.sent24h) {
        iv.reminders.sent24h = true;
        syncInterview(iv);
        due.push({ iv: iv, type: '24h' });
        if (window.KBMotion) {
          KBMotion.showInAppNotif('Yarın Görüşmen Var', iv.isletme.ad + ' — ' + formatDatetime(iv.date, iv.time));
        }
      }
      if (diff <= 3600000 && !iv.reminders.sent1h) {
        iv.reminders.sent1h = true;
        syncInterview(iv);
        due.push({ iv: iv, type: '1h' });
        if (window.KBMotion) {
          KBMotion.showInAppNotif('1 Saat Sonra Görüşmen Var!', iv.isletme.ad + ' — ' + iv.time);
        }
      }
    });
    return due;
  }

  function getUpcoming(uid, limit) {
    var now = new Date().toISOString().slice(0, 10);
    var list = getAll(uid).filter(function (iv) {
      return (iv.status === 'onaylandi' || iv.status === 'bekliyor') && iv.date >= now;
    });
    list.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    return limit ? list.slice(0, limit) : list;
  }

  function getStats(uid) {
    var list = getAll(uid);
    var stats = { toplam: list.length, bekliyor: 0, onaylandi: 0, tamamlandi: 0, iptal: 0 };
    list.forEach(function (iv) {
      if (stats[iv.status] !== undefined) stats[iv.status]++;
    });
    return stats;
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

  function seedDemoData(uid) {
    if (getAll(uid).length) return;
    var now = new Date();
    var d2 = new Date(now); d2.setDate(d2.getDate() + 2);
    var d5 = new Date(now); d5.setDate(d5.getDate() + 5);
    var dm3 = new Date(now); dm3.setDate(dm3.getDate() - 3);
    function fmt(d) { return d.toISOString().slice(0, 10); }

    var isletmeId = 'demo_isletme';
    var kuryeId = uid;

    var demos = [
      { id: makeId(), threadId: 'thread_demo_1', jobId: 'job_1', jobTitle: 'Motor Kurye', kuryeId: kuryeId, kurye: { id: kuryeId, ad: 'Ahmet Yılmaz', avatar: '' }, isletmeId: isletmeId, isletme: { id: isletmeId, ad: 'Hızlı Lojistik A.Ş.', avatar: '' }, date: fmt(d2), time: '14:00', type: 'yüz yüze', location: 'Levent, İstanbul', meetingLink: '', note: 'Deneyimlerinizi görüşeceğiz.', status: 'onaylandi', postNote: '', decision: null, rescheduleHistory: [], rescheduleRequest: null, reminders: { sent24h: false, sent1h: false }, createdAt: new Date(now - 86400000 * 3).toISOString(), updatedAt: new Date().toISOString() },
      { id: makeId(), threadId: 'thread_demo_2', jobId: 'job_2', jobTitle: 'Depo Sorumlusu', kuryeId: kuryeId, kurye: { id: kuryeId, ad: 'Ahmet Yılmaz', avatar: '' }, isletmeId: 'demo_isletme_2', isletme: { id: 'demo_isletme_2', ad: 'FastShip Kargo', avatar: '' }, date: fmt(d5), time: '10:30', type: 'online', location: '', meetingLink: 'https://meet.google.com/xyz', note: '', status: 'bekliyor', postNote: '', decision: null, rescheduleHistory: [], rescheduleRequest: null, reminders: { sent24h: false, sent1h: false }, createdAt: new Date(now - 86400000).toISOString(), updatedAt: new Date().toISOString() },
      { id: makeId(), threadId: 'thread_demo_3', jobId: 'job_3', jobTitle: 'Kurye', kuryeId: kuryeId, kurye: { id: kuryeId, ad: 'Ahmet Yılmaz', avatar: '' }, isletmeId: 'demo_isletme_3', isletme: { id: 'demo_isletme_3', ad: 'Metro Teslimat', avatar: '' }, date: fmt(dm3), time: '11:00', type: 'yüz yüze', location: 'Kadıköy, İstanbul', meetingLink: '', note: '', status: 'tamamlandi', postNote: 'Çok iyi bir görüşmeydi, teknik sorular başarıyla yanıtlandı.', decision: 'kabul', rescheduleHistory: [], rescheduleRequest: null, reminders: { sent24h: true, sent1h: true }, createdAt: new Date(now - 86400000 * 10).toISOString(), updatedAt: new Date(now - 86400000 * 3).toISOString() }
    ];

    demos.forEach(function (iv) {
      upsertOne(uid, iv);
      logEvent(iv.id, 'created');
      if (iv.status === 'onaylandi') logEvent(iv.id, 'confirmed');
      if (iv.status === 'tamamlandi') { logEvent(iv.id, 'confirmed'); logEvent(iv.id, 'completed'); logEvent(iv.id, 'decision_' + iv.decision); }
    });
  }

  window.KBInterview = {
    create: create,
    update: update,
    getAll: getAll,
    getOne: getOne,
    getLog: getLog,
    findByThread: findByThread,
    findByJob: findByJob,
    respond: respond,
    complete: complete,
    addPostNote: addPostNote,
    makeDecision: makeDecision,
    cancelInterview: cancelInterview,
    requestReschedule: requestReschedule,
    acceptReschedule: acceptReschedule,
    checkReminders: checkReminders,
    getUpcoming: getUpcoming,
    getStats: getStats,
    renderBadge: renderBadge,
    renderCard: renderCard,
    renderUpcomingWidget: renderUpcomingWidget,
    seedDemoData: seedDemoData,
    formatDatetime: formatDatetime,
    STATUS: STATUS
  };
})();
