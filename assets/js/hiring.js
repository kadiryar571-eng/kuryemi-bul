(function () {
  'use strict';

  var STATES = {
    beklemede:          { label: 'Beklemede',           icon: '⏳', step: 0 },
    kisa_listede:       { label: 'Kısa Listeye Alındı', icon: '⭐', step: 1 },
    mulakat_tamamlandi: { label: 'Mülakat Tamamlandı',  icon: '✓',  step: 2 },
    kabul:              { label: 'Kabul Edildi',         icon: '✅', step: 3 },
    reddedildi:         { label: 'Reddedildi',           icon: '❌', step: -1 }
  };

  var LOG_LABELS = {
    beklemede:          'Başvuru alındı',
    shortlisted:        'Kısa listeye alındı',
    mulakat_tamamlandi: 'Mülakat tamamlandı',
    accepted:           'Kabul edildi',
    rejected:           'Reddedildi',
    note_added:         'Not eklendi',
    onboarding_started: 'Onboarding başlatıldı'
  };

  var MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
    } catch (e) { return String(iso).slice(0, 10); }
  }

  function fmtTime(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch (e) { return ''; }
  }

  // ── Storage ──────────────────────────────────────────────────────
  function decKey(jobId, kuryeId)  { return 'kb_hiring_' + jobId + '_' + kuryeId; }
  function obKey(jobId, kuryeId)   { return 'kb_hiring_ob_' + jobId + '_' + kuryeId; }
  function logKey(jobId, kuryeId)  { return 'kb_hiring_log_' + jobId + '_' + kuryeId; }
  function archKey(uid)            { return 'kb_archived_apps_' + uid; }

  function getDecision(jobId, kuryeId) {
    try { return JSON.parse(localStorage.getItem(decKey(jobId, kuryeId)) || 'null'); } catch (e) { return null; }
  }

  function saveDecision(jobId, kuryeId, dec) {
    try { localStorage.setItem(decKey(jobId, kuryeId), JSON.stringify(dec)); } catch (e) {}
  }

  function getOnboarding(jobId, kuryeId) {
    try { return JSON.parse(localStorage.getItem(obKey(jobId, kuryeId)) || 'null'); } catch (e) { return null; }
  }

  function saveOnboarding(jobId, kuryeId, ob) {
    try { localStorage.setItem(obKey(jobId, kuryeId), JSON.stringify(Object.assign({}, ob, { updatedAt: new Date().toISOString() }))); } catch (e) {}
  }

  function getLog(jobId, kuryeId) {
    try { return JSON.parse(localStorage.getItem(logKey(jobId, kuryeId)) || '[]'); } catch (e) { return []; }
  }

  function appendLog(jobId, kuryeId, event, detail) {
    try {
      var log = getLog(jobId, kuryeId);
      log.push({ event: event, detail: detail || '', at: new Date().toISOString() });
      localStorage.setItem(logKey(jobId, kuryeId), JSON.stringify(log));
    } catch (e) {}
  }

  // ── Sync helpers ─────────────────────────────────────────────────
  function syncAppStatus(jobId, kuryeId, status) {
    try {
      var apps = JSON.parse(localStorage.getItem('kb_apps_' + jobId) || '{}');
      if (!apps[kuryeId]) apps[kuryeId] = {};
      apps[kuryeId].status = status;
      apps[kuryeId].updatedAt = new Date().toISOString();
      localStorage.setItem('kb_apps_' + jobId, JSON.stringify(apps));
    } catch (e) {}
  }

  function checkJobQuota(jobId) {
    try {
      var apps = JSON.parse(localStorage.getItem('kb_apps_' + jobId) || '{}');
      var accepted = Object.values(apps).filter(function (a) { return a.status === 'kabul'; }).length;
      var quota = 1;
      if (window.KB_DATA && KB_DATA.ilanlar) {
        var job = KB_DATA.ilanlar.find(function (j) { return String(j.id) === String(jobId); });
        if (job) quota = job.kontenjan || job.adet || 1;
      }
      if (accepted >= quota) {
        if (window.IlanStatus) {
          try { IlanStatus.setStatus(jobId, 'doldu'); } catch (e2) {}
        }
        try {
          var st = JSON.parse(localStorage.getItem('kb_ilan_status_' + jobId) || '{}');
          st.durum = 'doldu'; st.updatedAt = new Date().toISOString();
          localStorage.setItem('kb_ilan_status_' + jobId, JSON.stringify(st));
        } catch (e3) {}
      }
    } catch (e) {}
  }

  function archiveApp(uid, jobId, kuryeId, dec) {
    try {
      var key = archKey(uid);
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      var idx = list.findIndex(function (a) { return a.jobId === jobId && a.kuryeId === kuryeId; });
      var entry = { jobId: jobId, kuryeId: kuryeId, dec: dec, archivedAt: new Date().toISOString() };
      if (idx >= 0) list[idx] = entry; else list.unshift(entry);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
    } catch (e) {}
  }

  function pushNotif(targetUid, type, data) {
    try {
      var key = 'kb_notifs_' + targetUid;
      var notifs = JSON.parse(localStorage.getItem(key) || '[]');
      notifs.unshift({ type: type, data: data, at: new Date().toISOString(), read: false });
      localStorage.setItem(key, JSON.stringify(notifs.slice(0, 50)));
    } catch (e) {}
    if (window.KBMotion) {
      var MAP = {
        shortlisted: ['⭐ Kısa Listeye Alındınız!', (data.job || '') + ' — ' + (data.isletme || '')],
        accepted:    ['🎉 Kabul Edildiniz!', (data.job || '') + ' pozisyonu için kabul edildiniz.'],
        rejected:    ['Başvuru Sonucu', (data.job || '') + ' için olumsuz sonuç.']
      };
      var m = MAP[type];
      if (m) KBMotion.showInAppNotif(m[0], m[1]);
    }
  }

  // ── Main action ──────────────────────────────────────────────────
  function makeDecision(uid, jobId, kuryeId, status, opts) {
    opts = opts || {};
    var now = new Date().toISOString();
    var dec = getDecision(jobId, kuryeId) || {
      jobId: jobId, kuryeId: kuryeId, isletmeId: uid,
      status: 'beklemede', note: '', reason: '',
      jobTitle: opts.jobTitle || '', kuryeAd: opts.kuryeAd || '', isletmeAd: opts.isletmeAd || '',
      threadId: opts.threadId || null,
      acceptedAt: null, rejectedAt: null, shortlistedAt: null,
      createdAt: now, updatedAt: now
    };

    dec.status = status;
    dec.updatedAt = now;
    if (opts.note) dec.note = opts.note;
    if (opts.reason) dec.reason = opts.reason;

    if (status === 'kisa_listede') {
      dec.shortlistedAt = now;
      syncAppStatus(jobId, kuryeId, 'inceleniyor');
      appendLog(jobId, kuryeId, 'shortlisted', dec.kuryeAd);
      pushNotif(kuryeId, 'shortlisted', { job: dec.jobTitle, isletme: dec.isletmeAd });

    } else if (status === 'mulakat_tamamlandi') {
      appendLog(jobId, kuryeId, 'mulakat_tamamlandi', '');

    } else if (status === 'kabul') {
      dec.acceptedAt = now;
      syncAppStatus(jobId, kuryeId, 'kabul');
      checkJobQuota(jobId);
      appendLog(jobId, kuryeId, 'accepted', dec.kuryeAd);
      pushNotif(kuryeId, 'accepted', { job: dec.jobTitle, isletme: dec.isletmeAd });
      if (dec.threadId && window.KBChat) {
        KBChat.sendMessage(uid, dec.threadId, 'system', 'system', '🎉 Tebrikler! Başvurunuz kabul edildi.');
      }

    } else if (status === 'reddedildi') {
      dec.rejectedAt = now;
      syncAppStatus(jobId, kuryeId, 'red');
      appendLog(jobId, kuryeId, 'rejected', dec.reason || dec.kuryeAd);
      pushNotif(kuryeId, 'rejected', { job: dec.jobTitle, isletme: dec.isletmeAd });
      archiveApp(uid, jobId, kuryeId, dec);
      if (dec.threadId && window.KBChat) {
        KBChat.sendMessage(uid, dec.threadId, 'system', 'system', '❌ Başvurunuz değerlendirildi, bu sefer uygun görülmedi.');
      }
    }

    saveDecision(jobId, kuryeId, dec);
    return dec;
  }

  function addNote(uid, jobId, kuryeId, note) {
    var dec = getDecision(jobId, kuryeId) || makeDecision(uid, jobId, kuryeId, 'beklemede');
    dec.note = note;
    dec.updatedAt = new Date().toISOString();
    saveDecision(jobId, kuryeId, dec);
    appendLog(jobId, kuryeId, 'note_added', note.slice(0, 60));
    return dec;
  }

  function setOnboarding(uid, jobId, kuryeId, data) {
    saveOnboarding(jobId, kuryeId, Object.assign({}, data, { sentAt: new Date().toISOString() }));
    appendLog(jobId, kuryeId, 'onboarding_started', '');
    // Notify courier via chat thread
    var dec = getDecision(jobId, kuryeId);
    if (dec && dec.threadId && window.KBChat) {
      KBChat.sendMessage(uid, dec.threadId, 'system', 'system', '📋 İşe başlangıç bilgilerin paylaşıldı. karar.html sayfanızı kontrol edin.');
    }
  }

  // ── Queries ──────────────────────────────────────────────────────
  function getPendingDecisions(uid) {
    var results = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || !k.startsWith('kb_hiring_') || k.includes('_ob_') || k.includes('_log_')) continue;
        var d = JSON.parse(localStorage.getItem(k) || 'null');
        if (d && d.isletmeId === uid && (d.status === 'beklemede' || d.status === 'kisa_listede')) results.push(d);
      }
    } catch (e) {}
    return results;
  }

  function getStats(uid) {
    var s = { beklemede: 0, kisa_listede: 0, kabul: 0, reddedildi: 0, toplam: 0 };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || !k.startsWith('kb_hiring_') || k.includes('_ob_') || k.includes('_log_')) continue;
        var d = JSON.parse(localStorage.getItem(k) || 'null');
        if (d && d.isletmeId === uid) {
          s.toplam++;
          if (s[d.status] !== undefined) s[d.status]++;
        }
      }
    } catch (e) {}
    return s;
  }

  // ── Render helpers ────────────────────────────────────────────────
  function renderChip(status) {
    var st = STATES[status] || STATES.beklemede;
    return '<span class="hd-chip hd-chip--' + esc(status) + '">' + st.icon + ' ' + esc(st.label) + '</span>';
  }

  var STEP_KEYS = ['beklemede', 'kisa_listede', 'mulakat_tamamlandi', 'kabul'];

  function renderStatusBar(status) {
    var isRej = status === 'reddedildi';
    var active = isRej ? -1 : STEP_KEYS.indexOf(status);
    return '<div class="hd-status-bar">' +
      STEP_KEYS.map(function (s, i) {
        var cls = 'hd-status-step';
        if (isRej) cls += ' is-rejected';
        else if (i < active) cls += ' is-done';
        else if (i === active) cls += ' is-active';
        var lineClass = 'hd-status-line' + (!isRej && i < active ? ' is-done' : '');
        return (i > 0 ? '<div class="' + lineClass + '"></div>' : '') +
          '<div class="' + cls + '">' +
            '<div class="hd-status-dot">' + STATES[s].icon + '</div>' +
            '<div class="hd-status-lbl">' + esc(STATES[s].label) + '</div>' +
          '</div>';
      }).join('') +
    '</div>';
  }

  function renderEmployerActions(dec, jobId, kuryeId) {
    var status = dec ? dec.status : 'beklemede';
    var isFinal = status === 'kabul' || status === 'reddedildi';
    if (isFinal) {
      return '<div class="hd-actions">' + renderChip(status) +
        '<span style="font-size:0.78rem;color:var(--text-3);margin-left:8px;">Karar verildi — ' + esc(fmtDate(dec.acceptedAt || dec.rejectedAt)) + '</span>' +
      '</div>';
    }
    return '<div class="hd-actions">' +
      (status !== 'kisa_listede' ? '<button class="btn btn--secondary btn--sm" data-hd-action="shortlist" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">⭐ Kısa Listeye Al</button>' : '') +
      '<button class="btn btn--success btn--sm" data-hd-action="accept" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">✅ Kabul Et</button>' +
      '<button class="btn btn--danger btn--sm" data-hd-action="reject" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">❌ Reddet</button>' +
      '<button class="btn btn--ghost btn--sm" data-hd-action="add-note" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">📝 Not Ekle</button>' +
    '</div>';
  }

  function renderOnboardingForm(ob, jobId, kuryeId) {
    ob = ob || {};
    return '<div class="hd-onboard-form">' +
      '<h3 class="hd-section-title">İşe Başlangıç Bilgileri</h3>' +
      '<div class="hd-form-grid">' +
        '<div><label class="form-label">Başlangıç Tarihi</label><input type="date" id="obStartDate" class="form-input" value="' + esc(ob.startDate || '') + '"></div>' +
        '<div><label class="form-label">İlk Görüşme Noktası</label><input type="text" id="obStartPoint" class="form-input" placeholder="Adres veya konum" value="' + esc(ob.startPoint || '') + '"></div>' +
        '<div><label class="form-label">İletişim Kişisi</label><input type="text" id="obContactPerson" class="form-input" placeholder="Ad Soyad" value="' + esc(ob.contactPerson || '') + '"></div>' +
        '<div><label class="form-label">İletişim Telefonu</label><input type="tel" id="obContactPhone" class="form-input" placeholder="+90 5xx..." value="' + esc(ob.contactPhone || '') + '"></div>' +
      '</div>' +
      '<div style="margin-top:10px;"><label class="form-label">Çalışma Detayları</label><textarea id="obWorkDetails" class="form-input" rows="2" placeholder="Vardiya, çalışma saatleri, ücret…">' + esc(ob.workDetails || '') + '</textarea></div>' +
      '<div style="margin-top:10px;"><label class="form-label">İlk Gün Notları</label><textarea id="obFirstDayNotes" class="form-input" rows="2" placeholder="Gerekli belgeler, kıyafet, program…">' + esc(ob.firstDayNotes || '') + '</textarea></div>' +
      '<div style="margin-top:14px;display:flex;justify-content:flex-end;">' +
        '<button class="btn btn--primary" data-hd-action="save-onboard" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">📤 Adaya Gönder</button>' +
      '</div>' +
    '</div>';
  }

  function renderOnboardingBlock(ob) {
    if (!ob) return '<p style="color:var(--text-3);font-size:0.82rem;padding:8px 0;">İşe başlangıç bilgileri henüz gönderilmedi.</p>';
    function row(ico, key, val) {
      if (!val) return '';
      return '<div class="hd-ob-row"><span class="hd-ob-ico">' + ico + '</span><div><div class="hd-ob-key">' + esc(key) + '</div><div class="hd-ob-val">' + esc(val) + '</div></div></div>';
    }
    return '<div class="hd-ob-block">' +
      '<div class="hd-ob-header">🎉 İşe Alındınız!</div>' +
      row('📅', 'Başlangıç Tarihi', ob.startDate ? fmtDate(ob.startDate + 'T00:00') : '') +
      row('📍', 'İlk Görüşme Noktası', ob.startPoint) +
      row('👤', 'İletişim Kişisi', ob.contactPerson + (ob.contactPhone ? ' — ' + ob.contactPhone : '')) +
      row('🕐', 'Çalışma Detayları', ob.workDetails) +
      row('📋', 'İlk Gün', ob.firstDayNotes) +
    '</div>';
  }

  function renderActivityLog(jobId, kuryeId) {
    var log = getLog(jobId, kuryeId);
    if (!log.length) return '<p style="color:var(--text-3);font-size:0.82rem;">Henüz işlem yok.</p>';
    return '<div class="hd-log">' +
      log.slice().reverse().map(function (entry) {
        return '<div class="hd-log-item">' +
          '<div class="hd-log-dot"></div>' +
          '<div class="hd-log-body">' +
            '<span class="hd-log-event">' + esc(LOG_LABELS[entry.event] || entry.event) + '</span>' +
            (entry.detail ? '<span class="hd-log-detail"> · ' + esc(entry.detail.slice(0, 60)) + '</span>' : '') +
            '<div class="hd-log-time">' + esc(fmtDate(entry.at)) + ' ' + esc(fmtTime(entry.at)) + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  // Compact card for mesaj-detay.html sidebar
  function renderDecisionCard(dec, ob, role, jobId, kuryeId) {
    var status = dec ? dec.status : 'beklemede';
    var isBiz = role === 'isletme' || role === 'firma';
    var isFinal = status === 'kabul' || status === 'reddedildi';
    var link = '<a href="karar.html?job=' + esc(jobId) + '&kid=' + esc(kuryeId) + '" class="hd-full-link">Tam Görünüm →</a>';

    var body = '';
    if (isBiz) {
      if (!isFinal) {
        body = '<div class="hd-actions-mini">' +
          (status !== 'kisa_listede' ? '<button class="btn btn--secondary btn--sm" data-hd-action="shortlist" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">⭐ Kısa Liste</button>' : '') +
          '<button class="btn btn--success btn--sm" data-hd-action="accept" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">✅ Kabul</button>' +
          '<button class="btn btn--danger btn--sm" data-hd-action="reject" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '">❌ Reddet</button>' +
        '</div>';
      }
      if (dec && dec.note) {
        body += '<div class="hd-note-inline">📝 ' + esc(dec.note.slice(0, 100)) + '</div>';
      }
    } else {
      if (status === 'kabul') {
        body = '<div class="hd-accepted-notice">🎉 Kabul Edildiniz! ' +
          '<a href="karar.html?job=' + esc(jobId) + '&kid=' + esc(kuryeId) + '">Başlangıç bilgilerine bakın →</a>' +
        '</div>';
      } else if (status === 'reddedildi') {
        body = '<div class="hd-rejected-notice">Bu başvurunuz değerlendirildi. Başarılar dileriz.</div>';
      } else {
        body = '<p style="font-size:0.78rem;color:var(--text-3);margin:6px 0 0;">Başvurunuz inceleniyor.</p>';
      }
    }

    return '<div class="hd-card">' +
      '<div class="hd-card-head"><span class="hd-card-title">⚖️ İşe Alım Kararı</span>' + renderChip(status) + '</div>' +
      body +
      '<div class="hd-card-foot">' + link + '</div>' +
    '</div>';
  }

  // ── Demo seed ─────────────────────────────────────────────────────
  function seedDemoData(uid) {
    if (localStorage.getItem(decKey('job_demo_1', 'k_demo_1'))) return;
    var now = new Date();
    function dAgo(d) { return new Date(now - 86400000 * d).toISOString(); }
    function dFwd(d) { var x = new Date(now); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); }

    var demos = [
      { jobId: 'job_demo_1', kuryeId: 'k_demo_1', isletmeId: uid, status: 'kabul',
        jobTitle: 'Motor Kurye', kuryeAd: 'Ahmet Yılmaz', isletmeAd: 'Hızlı Lojistik A.Ş.',
        note: 'Deneyimi uygun, haftaya başlayabilir.', reason: '',
        acceptedAt: dAgo(1), rejectedAt: null, shortlistedAt: dAgo(3),
        threadId: 'thread_demo_1', createdAt: dAgo(5), updatedAt: dAgo(1) },
      { jobId: 'job_demo_2', kuryeId: 'k_demo_2', isletmeId: uid, status: 'kisa_listede',
        jobTitle: 'Bisiklet Kurye', kuryeAd: 'Mehmet Demir', isletmeAd: 'Hızlı Lojistik A.Ş.',
        note: '', reason: '',
        acceptedAt: null, rejectedAt: null, shortlistedAt: dAgo(1),
        threadId: 'thread_demo_2', createdAt: dAgo(2), updatedAt: dAgo(1) },
      { jobId: 'job_demo_3', kuryeId: 'k_demo_3', isletmeId: uid, status: 'reddedildi',
        jobTitle: 'Araçlı Kurye', kuryeAd: 'Ali Kaya', isletmeAd: 'Hızlı Lojistik A.Ş.',
        note: '', reason: 'Ehliyet durumu uygun değil.',
        acceptedAt: null, rejectedAt: dAgo(2), shortlistedAt: null,
        threadId: 'thread_demo_3', createdAt: dAgo(4), updatedAt: dAgo(2) }
    ];

    demos.forEach(function (dec) {
      saveDecision(dec.jobId, dec.kuryeId, dec);
      appendLog(dec.jobId, dec.kuryeId, 'beklemede', '');
      if (dec.shortlistedAt) appendLog(dec.jobId, dec.kuryeId, 'shortlisted', dec.kuryeAd);
      if (dec.acceptedAt)    { appendLog(dec.jobId, dec.kuryeId, 'accepted', dec.kuryeAd); appendLog(dec.jobId, dec.kuryeId, 'onboarding_started', ''); }
      if (dec.rejectedAt)    appendLog(dec.jobId, dec.kuryeId, 'rejected', dec.reason);
    });

    saveOnboarding('job_demo_1', 'k_demo_1', {
      startDate:     dFwd(7),
      startPoint:    'Levent, İstanbul — Merkez Ofis',
      contactPerson: 'Zeynep Hanım (İK)',
      contactPhone:  '+90 212 000 00 00',
      workDetails:   'Pazartesi–Cumartesi, 09:00–18:00',
      firstDayNotes: 'Nüfus cüzdanı, sürücü belgesi ve 1 adet fotoğraf getirin.',
      sentAt:        dAgo(1)
    });
  }

  window.KBHiring = {
    STATES: STATES,
    getDecision: getDecision,
    saveDecision: saveDecision,
    getOnboarding: getOnboarding,
    saveOnboarding: saveOnboarding,
    setOnboarding: setOnboarding,
    getLog: getLog,
    makeDecision: makeDecision,
    addNote: addNote,
    archiveApp: archiveApp,
    getPendingDecisions: getPendingDecisions,
    getStats: getStats,
    renderChip: renderChip,
    renderStatusBar: renderStatusBar,
    renderEmployerActions: renderEmployerActions,
    renderOnboardingForm: renderOnboardingForm,
    renderOnboardingBlock: renderOnboardingBlock,
    renderActivityLog: renderActivityLog,
    renderDecisionCard: renderDecisionCard,
    seedDemoData: seedDemoData,
    fmtDate: fmtDate
  };
})();
