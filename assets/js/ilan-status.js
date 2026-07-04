/* ── IlanStatus — Job Status System (c) KuryemiBul ── */
window.IlanStatus = (function () {
  'use strict';

  /* ─── Status definitions ─────────────────────────────────────── */
  var DEFS = {
    taslak:       { lbl:'Taslak',       short:'Taslak',      ico:'📝', cls:'ilds-badge--taslak',  visible:false, searchable:false, accepting:false },
    yayinda:      { lbl:'Yayında',      short:'Açık',        ico:'🟢', cls:'ilds-badge--yayinda', visible:true,  searchable:true,  accepting:true  },
    inceleniyor:  { lbl:'İnceleniyor',  short:'İnceleniyor', ico:'🔍', cls:'ilds-badge--incelen', visible:false, searchable:false, accepting:false },
    durduruldu:   { lbl:'Durduruldu',   short:'Durduruldu',  ico:'⏸', cls:'ilds-badge--durdu',   visible:false, searchable:false, accepting:false },
    doldu:        { lbl:'Doldu',        short:'Doldu',       ico:'✅', cls:'ilds-badge--doldu',   visible:true,  searchable:false, accepting:false },
    suresi_doldu: { lbl:'Süresi Doldu', short:'Süresi Doldu',ico:'⌛', cls:'ilds-badge--suresi',  visible:true,  searchable:false, accepting:false },
    iptal:        { lbl:'İptal Edildi', short:'Kapalı',      ico:'❌', cls:'ilds-badge--iptal',   visible:false, searchable:false, accepting:false }
  };

  /* ─── Action definitions ─────────────────────────────────────── */
  var ACTION_DEFS = {
    yayinla:         { lbl:'Yayınla',            ico:'🚀', cls:'btn--primary',   toStatus:'yayinda',    logEvent:'published',  confirm:null },
    taslaga_al:      { lbl:'Taslağa Al',          ico:'📝', cls:'btn--ghost',     toStatus:'taslak',     logEvent:'drafted',    confirm:'İlan taslağa alınacak ve herkese görünmez olacak. Devam et?' },
    durdur:          { lbl:'Durdur',              ico:'⏸', cls:'btn--secondary', toStatus:'durduruldu', logEvent:'paused',     confirm:'İlan duraklatılacak. Yeni başvuru almaz, mevcut başvurular korunur.' },
    yeniden_yayinla: { lbl:'Yeniden Yayınla',     ico:'🔄', cls:'btn--primary',   toStatus:'yayinda',    logEvent:'resumed',    confirm:null },
    kapat:           { lbl:'Doldu Olarak Kapat',  ico:'✅', cls:'btn--secondary', toStatus:'doldu',      logEvent:'filled',     confirm:'İlan "Doldu" olarak kapatılacak. Yeni başvuru almaz.' },
    iptal:           { lbl:'İptal Et',            ico:'❌', cls:'btn--danger',    toStatus:'iptal',      logEvent:'canceled',   confirm:'İlan kalıcı olarak iptal edilecek. Bu işlem geri alınamaz.' }
  };

  /* ─── Allowed actions per status ─────────────────────────────── */
  var ALLOWED = {
    taslak:       ['yayinla', 'iptal'],
    yayinda:      ['durdur', 'kapat', 'taslaga_al', 'iptal'],
    inceleniyor:  [],
    durduruldu:   ['yeniden_yayinla', 'kapat', 'iptal'],
    doldu:        ['yeniden_yayinla', 'iptal'],
    suresi_doldu: ['yeniden_yayinla', 'iptal'],
    iptal:        []
  };

  /* ─── Activity event labels ──────────────────────────────────── */
  var EVENT_LABELS = {
    created:      { lbl:'İlan oluşturuldu',                ico:'📝' },
    published:    { lbl:'İlan yayınlandı',                 ico:'🚀' },
    drafted:      { lbl:'Taslağa alındı',                  ico:'📋' },
    paused:       { lbl:'İlan durduruldu',                 ico:'⏸' },
    resumed:      { lbl:'İlan yeniden yayınlandı',         ico:'🔄' },
    filled:       { lbl:'İlan doldu olarak kapatıldı',     ico:'✅' },
    canceled:     { lbl:'İlan iptal edildi',               ico:'❌' },
    auto_expired: { lbl:'Süre doldu — otomatik kapatıldı', ico:'⌛' },
    auto_filled:  { lbl:'Kontenjan doldu — otomatik kapatıldı', ico:'✅' }
  };

  /* ─── Helpers ────────────────────────────────────────────────── */
  function simpleHash(s) {
    var h = 0, str = String(s);
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function getUid() {
    try { if (window.KB && KB.session) { var s = KB.session(); if (s && s.user && s.user.id) return s.user.id; } } catch(e) {}
    return 'demo';
  }
  function relTime(dateStr) {
    if (!dateStr) return '';
    var d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (d === 0) return 'Bugün';
    if (d === 1) return 'Dün';
    if (d < 0)   return Math.abs(d) + ' gün sonra';
    return d + ' gün önce';
  }

  /* ─── LocalStorage job CRUD ──────────────────────────────────── */
  function getJobs(uid) {
    try { return JSON.parse(localStorage.getItem('kb_my_ilanlar_' + (uid || getUid()))) || []; } catch(e) { return []; }
  }
  function saveJobs(jobs, uid) {
    try { localStorage.setItem('kb_my_ilanlar_' + (uid || getUid()), JSON.stringify(jobs)); } catch(e) {}
  }
  function getJob(jobId, uid) {
    var jobs = getJobs(uid);
    for (var i = 0; i < jobs.length; i++) { if (jobs[i].id === jobId) return jobs[i]; }
    return null;
  }
  function updateJob(jobId, patch, uid) {
    var jobs = getJobs(uid), found = false;
    for (var i = 0; i < jobs.length; i++) {
      if (jobs[i].id === jobId) {
        jobs[i] = Object.assign({}, jobs[i], patch, { updated_at: new Date().toISOString() });
        found = true;
        break;
      }
    }
    if (found) saveJobs(jobs, uid);
    return found;
  }

  /* ─── Activity log ────────────────────────────────────────────── */
  function logActivity(jobId, event, note) {
    var key = 'kb_ilan_log_' + jobId, log = [];
    try { log = JSON.parse(localStorage.getItem(key)) || []; } catch(e) {}
    log.unshift({ event: event, note: note || '', date: new Date().toISOString() });
    try { localStorage.setItem(key, JSON.stringify(log.slice(0, 100))); } catch(e) {}
  }
  function getLog(jobId) {
    try { return JSON.parse(localStorage.getItem('kb_ilan_log_' + jobId)) || []; } catch(e) { return []; }
  }

  /* ─── Notification sender ────────────────────────────────────── */
  function notify(uid, msg, link) {
    var key = 'kb_notifications_' + uid, notes = [];
    try { notes = JSON.parse(localStorage.getItem(key)) || []; } catch(e) {}
    notes.unshift({ msg: msg, link: link || '', date: new Date().toISOString(), read: false });
    try { localStorage.setItem(key, JSON.stringify(notes.slice(0, 100))); } catch(e) {}
  }

  function sendStatusNotification(job, logEvent) {
    var uid   = getUid();
    var title = job.baslik || 'İlanınız';
    var OWNER = {
      published:    '🚀 "' + title + '" ilanın yayınlandı. Başvurular alınıyor.',
      paused:       '⏸ "' + title + '" ilanın durduruldu.',
      filled:       '🎉 "' + title + '" ilanın doldu! Tebrikler.',
      canceled:     '❌ "' + title + '" ilanın iptal edildi.',
      resumed:      '🔄 "' + title + '" ilanın yeniden yayınlandı.',
      auto_expired: '⌛ "' + title + '" ilanının başvuru süresi doldu. Yeniden yayınlayabilirsin.',
      auto_filled:  '🎉 "' + title + '" ilanı kontenjanı doldu!'
    };
    if (OWNER[logEvent]) notify(uid, OWNER[logEvent], 'ilan-durum.html?job=' + job.id);

    /* Notify applicants when closed */
    if (['filled','canceled','auto_expired','auto_filled','paused'].indexOf(logEvent) !== -1) {
      var saved = {};
      try { saved = JSON.parse(localStorage.getItem('kb_apps_' + job.id)) || {}; } catch(e) {}
      var APP_MSG = {
        filled:       'Başvurduğun "' + title + '" ilanı doldu.',
        canceled:     'Başvurduğun "' + title + '" ilanı kaldırıldı.',
        auto_expired: 'Başvurduğun "' + title + '" ilanının süresi doldu.',
        auto_filled:  'Başvurduğun "' + title + '" ilanı doldu.',
        paused:       'Başvurduğun "' + title + '" ilanı geçici olarak durduruldu.'
      };
      var msg = APP_MSG[logEvent];
      if (msg) {
        Object.keys(saved).forEach(function(kId) {
          notify(kId, msg, 'ilanlar.html');
        });
      }
    }
  }

  /* ─── Stats helpers ──────────────────────────────────────────── */
  function getAcceptedCount(jobId) {
    try {
      var saved = JSON.parse(localStorage.getItem('kb_apps_' + jobId)) || {};
      return Object.keys(saved).filter(function(k) { return saved[k].status === 'kabul'; }).length;
    } catch(e) { return 0; }
  }
  function getStats(jobId) {
    var views = 0, appCount = 0, shortlisted = 0, accepted = getAcceptedCount(jobId);
    try { views = parseInt(localStorage.getItem('kb_job_views_' + jobId) || '0', 10); } catch(e) {}
    if (!views) views = 20 + (simpleHash(jobId + 'v') % 80);
    try {
      var saved = JSON.parse(localStorage.getItem('kb_apps_' + jobId)) || {};
      appCount   = Object.keys(saved).length;
      shortlisted = Object.keys(saved).filter(function(k) { return saved[k].shortlisted; }).length;
    } catch(e) {}
    if (!appCount) appCount = 4 + (simpleHash(jobId) % 4);
    return { views: views, apps: appCount, shortlisted: shortlisted, accepted: accepted };
  }

  /* ─── Auto-check (run on page load) ─────────────────────────── */
  function autoCheck(uid) {
    var jobs = getJobs(uid), now = new Date(), changed = false;
    jobs.forEach(function(job) {
      if (job.durum !== 'yayinda') return;
      /* Deadline check */
      if (job.son_basvuru && new Date(job.son_basvuru + 'T23:59:59') < now) {
        updateJob(job.id, { durum: 'suresi_doldu' }, uid);
        logActivity(job.id, 'auto_expired', '');
        sendStatusNotification(job, 'auto_expired');
        changed = true;
      }
      /* Filled check */
      if (job.ihtiyac_sayisi && parseInt(job.ihtiyac_sayisi, 10) > 0) {
        var acc = getAcceptedCount(job.id);
        if (acc >= parseInt(job.ihtiyac_sayisi, 10)) {
          updateJob(job.id, { durum: 'doldu' }, uid);
          logActivity(job.id, 'auto_filled', '');
          sendStatusNotification(job, 'auto_filled');
          changed = true;
        }
      }
    });
    return changed;
  }

  /* ─── Public API ─────────────────────────────────────────────── */
  function getDef(status) { return DEFS[status] || DEFS.taslak; }

  function getAllowedActions(status) {
    return (ALLOWED[status] || []).map(function(k) { return Object.assign({ key: k }, ACTION_DEFS[k]); });
  }

  function doAction(jobId, actionKey, uid) {
    var actDef = ACTION_DEFS[actionKey];
    if (!actDef) return false;
    var job = getJob(jobId, uid);
    if (!job) return false;
    updateJob(jobId, { durum: actDef.toStatus }, uid);
    logActivity(jobId, actDef.logEvent, '');
    sendStatusNotification(Object.assign({}, job), actDef.logEvent);
    return true;
  }

  /* No `durum` on a job = demo/legacy data, treat as publicly active */
  function isPubliclyVisible(job) { return getDef(job.durum || 'yayinda').visible; }
  function isAccepting(job)       { return getDef(job.durum || 'yayinda').accepting; }
  function isSearchable(job)      { return getDef(job.durum || 'yayinda').searchable; }

  function courierLabel(status) {
    return { yayinda:'Açık', doldu:'Doldu', suresi_doldu:'Süresi Doldu', iptal:'Kapalı', durduruldu:'Durduruldu', inceleniyor:'İnceleniyor', taslak:'Taslak' }[status] || 'Bilinmiyor';
  }

  function getEventLabel(event) { return EVENT_LABELS[event] || { lbl: event, ico: '•' }; }

  function renderBadge(status, large) {
    var s = status || 'yayinda';
    var d = getDef(s);
    return '<span class="ilds-badge ' + d.cls + (large ? ' ilds-badge--lg' : '') + '">' + d.ico + ' ' + d.lbl + '</span>';
  }

  function renderCourierBadge(status) {
    var s   = status || 'yayinda';
    var d   = getDef(s);
    var cls = d.accepting ? 'chip chip--success' : 'chip chip--muted';
    return '<span class="' + cls + '">' + courierLabel(s) + '</span>';
  }

  /* Find all jobs a kurye applied to (scans localStorage) */
  function findAppliedJobs(kId, uid) {
    var result = [];
    /* Scan localStorage keys matching kb_apps_* */
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!key || key.indexOf('kb_apps_') !== 0) continue;
        var jobId = key.slice('kb_apps_'.length);
        var saved = {};
        try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch(e) {}
        if (saved[kId]) {
          result.push({ jobId: jobId, app: saved[kId] });
        }
      }
    } catch(e) {}
    return result;
  }

  return {
    DEFS:               DEFS,
    ACTION_DEFS:        ACTION_DEFS,
    ALLOWED:            ALLOWED,
    EVENT_LABELS:       EVENT_LABELS,
    getDef:             getDef,
    getAllowedActions:   getAllowedActions,
    doAction:           doAction,
    autoCheck:          autoCheck,
    logActivity:        logActivity,
    getLog:             getLog,
    isPubliclyVisible:  isPubliclyVisible,
    isAccepting:        isAccepting,
    isSearchable:       isSearchable,
    courierLabel:       courierLabel,
    getEventLabel:      getEventLabel,
    getStats:           getStats,
    renderBadge:        renderBadge,
    renderCourierBadge: renderCourierBadge,
    findAppliedJobs:    findAppliedJobs,
    getJob:             getJob,
    getJobs:            getJobs,
    updateJob:          updateJob,
    notify:             notify,
    relTime:            relTime
  };
})();
