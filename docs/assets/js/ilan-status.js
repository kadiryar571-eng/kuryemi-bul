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

  /* ─── İlan kaynağı: VERİTABANI ────────────────────────────────
     İlanlar public.listings tablosundan gelir. localStorage yalnız
     son çekilen kaydın önbelleği ve işverenin ayrıntılı durum
     etiketi (taslak / durduruldu / doldu) için kullanılır — ilanın
     kendisi asla yerelde uydurulmaz.
     Herkese açık görünürlük DB'deki durum alanıdır: acik | kapali. */
  var UI_TO_DB = {
    yayinda:'acik', taslak:'kapali', inceleniyor:'kapali',
    durduruldu:'kapali', doldu:'kapali', suresi_doldu:'kapali', iptal:'kapali'
  };

  function getJobs(uid) {
    try { return JSON.parse(localStorage.getItem('kb_my_ilanlar_' + (uid || getUid()))) || []; } catch(e) { return []; }
  }
  function saveJobs(jobs, uid) {
    try { localStorage.setItem('kb_my_ilanlar_' + (uid || getUid()), JSON.stringify(jobs)); } catch(e) {}
  }

  /* Veritabanından gerçek ilanları çek, önbelleği tazele.
     Sayfalar render'dan önce bunu await eder. */
  async function syncFromDb(uid) {
    if (!(window.SB && SB.isOn() && SB.myListings)) return getJobs(uid);
    var rows = [];
    try { rows = await SB.myListings(); } catch(e) { console.warn('syncFromDb:', e); return getJobs(uid); }
    var prev = {}, today = new Date().toISOString().slice(0, 10);
    getJobs(uid).forEach(function(j) { prev[j.id] = j; });
    var jobs = rows.map(function(l) {
      var old = prev[l.id] || {};
      var durum;
      if (l.durum === 'acik') {
        durum = (l.son_basvuru && l.son_basvuru < today) ? 'suresi_doldu' : 'yayinda';
      } else {
        // DB kapalı: işverenin daha ayrıntılı etiketi varsa onu koru
        durum = ['taslak','durduruldu','doldu','iptal','suresi_doldu'].indexOf(old.durum) !== -1
          ? old.durum : 'taslak';
      }
      return Object.assign({}, l, {
        durum: durum,
        ihtiyac_sayisi: l.kontenjan || 0,
        created_at: l.created_at || l.tarih,
        updated_at: old.updated_at || l.tarih
      });
    });
    saveJobs(jobs, uid);
    return jobs;
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

  /* ─── Bildirimler ─────────────────────────────────────────────
     İstemci tarafında bildirim ÜRETİLMEZ. Eski sürüm, alıcının
     kullanıcı kimliğiyle localStorage'a yazıyordu — bu bildirim asla
     karşı tarafa ulaşmıyordu, yani sahte bir bildirimdi.
     İlan/başvuru olaylarının bildirimleri Supabase trigger'ları ile
     gerçek alıcının hesabına üretilir (bkz. migration-12, migration-18). */
  function sendStatusNotification() { /* sunucu tarafında üretilir */ }

  /* ─── Stats — TAMAMI VERİTABANINDAN ───────────────────────────
     Uydurma görüntülenme/başvuru sayısı üretilmez. Değerler
     SB.listingStats() ile gerçek listing_views ve applications
     tablolarından gelir. Kısa liste, işverenin kendi çalışma notudur. */
  function shortlistCount(jobId) {
    try {
      var saved = JSON.parse(localStorage.getItem('kb_apps_' + jobId)) || {};
      return Object.keys(saved).filter(function(k) { return saved[k].shortlisted; }).length;
    } catch(e) { return 0; }
  }
  async function getStats(jobId) {
    var out = { views: 0, apps: 0, shortlisted: shortlistCount(jobId), accepted: 0, pending: 0 };
    if (!(window.SB && SB.isOn() && SB.listingStats)) return out;
    try {
      var s = await SB.listingStats(jobId);
      out.views = s.views || 0;
      out.apps = s.apps || 0;
      out.accepted = s.accepted || 0;
      out.pending = s.pending || 0;
    } catch(e) {}
    return out;
  }
  async function getAcceptedCount(jobId) {
    var s = await getStats(jobId);
    return s.accepted;
  }

  /* ─── Auto-check (run on page load) ─────────────────────────── */
  /* Süresi dolan / kontenjanı dolan ilanları kapat.
     Kabul sayısı gerçek applications tablosundan okunur. */
  async function autoCheck(uid) {
    var jobs = getJobs(uid), now = new Date(), changed = false;
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      if (job.durum !== 'yayinda') continue;
      /* Deadline check */
      if (job.son_basvuru && new Date(job.son_basvuru + 'T23:59:59') < now) {
        updateJob(job.id, { durum: 'suresi_doldu' }, uid);
        logActivity(job.id, 'auto_expired', '');
        sendStatusNotification(job, 'auto_expired');
        changed = true;
        continue;
      }
      /* Filled check — gerçek kabul sayısı */
      var need = parseInt(job.ihtiyac_sayisi, 10) || 0;
      if (need > 0) {
        var acc = await getAcceptedCount(job.id);
        if (acc >= need) {
          updateJob(job.id, { durum: 'doldu' }, uid);
          logActivity(job.id, 'auto_filled', '');
          sendStatusNotification(job, 'auto_filled');
          changed = true;
        }
      }
    }
    return changed;
  }

  /* ─── Public API ─────────────────────────────────────────────── */
  function getDef(status) { return DEFS[status] || DEFS.taslak; }

  function getAllowedActions(status) {
    return (ALLOWED[status] || []).map(function(k) { return Object.assign({ key: k }, ACTION_DEFS[k]); });
  }

  /* Durum değişikliği ÖNCE veritabanına yazılır; ancak DB kabul ederse
     yerel etiket güncellenir. Böylece iş akışı ile herkese açık
     görünürlük hiçbir zaman ayrışmaz. */
  async function doAction(jobId, actionKey, uid) {
    var actDef = ACTION_DEFS[actionKey];
    if (!actDef) return false;
    var job = getJob(jobId, uid);
    if (!job) return false;

    var dbDurum = UI_TO_DB[actDef.toStatus] || 'kapali';
    if (window.SB && SB.isOn() && SB.updateListingStatus) {
      try {
        var r = await SB.updateListingStatus(jobId, dbDurum);
        if (r && r.error) { console.warn('updateListingStatus:', r.error); return false; }
      } catch (e) { console.warn('updateListingStatus:', e); return false; }
    } else {
      return false;   // bağlantı yoksa durum değiştirilemez
    }

    updateJob(jobId, { durum: actDef.toStatus }, uid);
    logActivity(jobId, actDef.logEvent, '');
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
    syncFromDb:         syncFromDb,
    renderBadge:        renderBadge,
    renderCourierBadge: renderCourierBadge,
    findAppliedJobs:    findAppliedJobs,
    getJob:             getJob,
    getJobs:            getJobs,
    updateJob:          updateJob,
    /* notify KALDIRILDI: bu dosyada hiç tanımlı değildi (tek geçtiği yer
       burasıydı). Bildirim üretimi DB trigger'larına taşınırken silinmiş ama
       dışa aktarım listesinden çıkarılmamış. Sonuç: bu satır ReferenceError
       fırlatıyor, window.IlanStatus ATANAMIYOR ve dosyayı yükleyen 10 sayfada
       nesne undefined kalıyordu — ilan durum rozetleri basılmıyor,
       IlanStatus.logActivity / autoCheck korumasız çağrıldığı yerlerde
       (ilan-olustur.html:732-734, panel-isletme.html:265) hata veriyordu.
       IlanStatus.notify'ı çağıran hiçbir yer yok; kodda geçen .notify(
       çağrılarının hepsi KBChat.notify'dır. */
    relTime:            relTime
  };
})();
