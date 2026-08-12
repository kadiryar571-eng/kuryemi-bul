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

  /* Kaçış işlevi merkezîdir: components.js → KB.esc.
     Yerel kopya kaldırıldı (' karakterini kaçırmıyordu). */
  function esc(s) {
    if (window.KB && KB.esc) return KB.esc(s);
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
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

  /* ============================================================
     VERİ KATMANI — public.hiring_decisions + public.onboarding
     (migration-16 + 19)

     Eskiden localStorage'daydı: işveren kararı kendi tarayıcısında
     kalıyordu, aday hiç göremiyordu. Artık tek kaynak veritabanı;
     bildirimler de sunucu trigger'larıyla gerçek alıcıya gidiyor.

     İmzalardaki ilk "uid" parametresi geriye dönük uyum için duruyor.
     ============================================================ */
  var _decs = [];        // işe alım kararları
  var _obs  = {};        // decisionId -> onboarding
  var _loaded = false;
  var _loading = null;

  function on() { return !!(window.SB && SB.isOn && SB.isOn()); }
  function _toast(msg) {
    if (window.KBMotion && KBMotion.showErrorToast) KBMotion.showErrorToast(msg);
  }
  function _err(r) { return r && r.error ? r.error : null; }

  function load(force) {
    if (!on()) { _loaded = true; return Promise.resolve([]); }
    if (_loading) return _loading;
    if (_loaded && !force) return Promise.resolve(_decs);
    _loading = SB.myHiringDecisions()
      .then(function (list) {
        _decs = list || [];
        // Kabul edilenlerin onboarding kayıtlarını da çek
        var kabul = _decs.filter(function (d) { return d.status === 'kabul'; });
        return Promise.all(kabul.map(function (d) {
          return SB.getOnboarding(d.id).then(function (ob) { if (ob) _obs[d.id] = ob; });
        }));
      })
      .catch(function (e) { console.warn('KBHiring.load:', e); })
      .then(function () { _loaded = true; _loading = null; return _decs; });
    return _loading;
  }

  /* ---- Önbellekten okuma (senkron; önce load() çağır) ---- */
  function _find(jobId, kuryeId) {
    return _decs.filter(function (d) {
      return String(d.kuryeId) === String(kuryeId) &&
             (jobId ? String(d.jobId) === String(jobId) : !d.jobId);
    })[0] || null;
  }
  function getDecision(jobId, kuryeId) { return _find(jobId, kuryeId); }
  function getOnboarding(jobId, kuryeId) {
    var d = _find(jobId, kuryeId);
    return d ? (_obs[d.id] || null) : null;
  }

  /* Etkinlik günlüğü ayrı tabloda tutulmuyor; karar kaydının
     zaman damgalarından türetilir — uydurma kayıt üretilmez. */
  function getLog(jobId, kuryeId) {
    var d = _find(jobId, kuryeId);
    if (!d) return [];
    var log = [{ event: 'beklemede', detail: '', at: d.createdAt }];
    var EV = { kisa_listede: 'shortlisted', kabul: 'accepted', reddedildi: 'rejected',
               mulakat_planli: 'beklemede', tamamlandi: 'accepted' };
    if (d.status !== 'beklemede' && d.updatedAt) {
      log.push({ event: EV[d.status] || d.status, detail: d.reason || d.note || '', at: d.updatedAt });
    }
    var ob = _obs[d.id];
    if (ob) log.push({ event: 'onboarding_started', detail: '', at: ob.sentAt || d.updatedAt });
    return log;
  }

  function _put(dec) {
    if (!dec || !dec.id) return dec;
    var i = _decs.findIndex(function (x) { return x.id === dec.id; });
    if (i >= 0) _decs[i] = dec; else _decs.push(dec);
    return dec;
  }

  /* ---- Başvuru durumunu da senkronla ----
     Karar 'kabul'/'reddedildi' olduğunda applications.durum da güncellenir,
     böylece başvurular ekranı ile karar ekranı ayrışmaz. */
  async function _syncApplication(jobId, kuryeId, status) {
    if (!on() || !jobId || !SB.listingApplications) return;
    var db = { kabul: 'accepted', reddedildi: 'rejected' }[status];
    if (!db) return;
    try {
      var apps = await SB.listingApplications(jobId);
      var mine = (apps || []).filter(function (a) { return String(a.applicantId) === String(kuryeId); })[0];
      if (mine && mine.durum !== db) await SB.updateApplication(mine.id, db);
    } catch (e) { console.warn('_syncApplication:', e); }
  }

  /* ---- Kontenjan doldu mu? Gerçek kabul sayısına bakar ---- */
  async function _checkQuota(jobId) {
    if (!on() || !jobId || !SB.listingStats) return;
    try {
      var st = await SB.listingStats(jobId);
      var jobs = (window.IlanStatus && IlanStatus.getJobs) ? IlanStatus.getJobs() : [];
      var job = jobs.filter(function (j) { return String(j.id) === String(jobId); })[0];
      var kota = (job && (job.kontenjan || job.ihtiyac_sayisi)) || 0;
      if (kota > 0 && (st.accepted || 0) >= kota && SB.updateListingStatus) {
        await SB.updateListingStatus(jobId, 'kapali');
      }
    } catch (e) { console.warn('_checkQuota:', e); }
  }

  /* ---- Ana işlem: karar ver ---- */
  async function makeDecision(uid, jobId, kuryeId, status, opts) {
    opts = opts || {};
    if (!on()) { _toast('Bağlantı yok — karar kaydedilemedi'); return null; }
    if (!kuryeId) { _toast('Aday belirtilmedi'); return null; }

    var mevcut = _find(jobId, kuryeId);
    var r;
    if (mevcut) {
      var patch = { status: status };
      if (opts.note   !== undefined) patch.note   = opts.note;
      if (opts.reason !== undefined) patch.reason = opts.reason;
      r = await SB.updateHiringDecision(mevcut.id, patch);
    } else {
      r = await SB.createHiringDecision({
        applicant_id: kuryeId,
        listing_id:   jobId || null,
        application_id: opts.application_id || null,
        interview_id:   opts.interview_id || null,
        status: status,
        note:   opts.note || null,
        reason: opts.reason || null
      });
    }
    var e = _err(r);
    if (e) { _toast('Karar kaydedilemedi: ' + e); return null; }
    _put(r);

    /* Yan etkiler — hepsi gerçek veri üzerinde */
    if (status === 'kabul' || status === 'reddedildi') {
      await _syncApplication(jobId, kuryeId, status);
    }
    if (status === 'kabul') await _checkQuota(jobId);

    /* Adaya bildirim SUNUCUDA üretilir (migration-19 trigger'ları).
       İstemciden sahte bildirim yazılmaz. */
    return r;
  }

  async function addNote(uid, jobId, kuryeId, note) {
    var dec = _find(jobId, kuryeId);
    if (!dec) return makeDecision(uid, jobId, kuryeId, 'beklemede', { note: note });
    if (!on()) { _toast('Bağlantı yok'); return null; }
    var r = await SB.updateHiringDecision(dec.id, { note: note });
    var e = _err(r);
    if (e) { _toast('Not kaydedilemedi: ' + e); return null; }
    return _put(r);
  }

  /* ---- Onboarding (işe başlangıç bilgileri) ---- */
  async function setOnboarding(uid, jobId, kuryeId, data) {
    var dec = _find(jobId, kuryeId);
    if (!dec) { _toast('Önce adayı kabul edin.'); return null; }
    if (!on()) { _toast('Bağlantı yok'); return null; }
    var r = await SB.saveOnboarding(dec.id, kuryeId, data);
    var e = _err(r);
    if (e) { _toast('Kaydedilemedi: ' + e); return null; }
    _obs[dec.id] = r;
    return r;
  }

  /* Aday "işe başlangıcı tamamladım" der */
  async function setOnboardingComplete(jobId, kuryeId) {
    var dec = _find(jobId, kuryeId);
    if (!dec || !on()) return null;
    var r = await SB.completeOnboarding(dec.id);
    var e = _err(r);
    if (e) { _toast('Kaydedilemedi: ' + e); return null; }
    _obs[dec.id] = r;
    return r;
  }

  /* ---- Sorgular (önbellekten) ---- */
  /* Ham karar listesi (geri bildirim modülü kullanır) */
  function getDecisionsRaw() { return _decs.slice(); }

  function getPendingDecisions() {
    return _decs.filter(function (d) {
      return d.status === 'beklemede' || d.status === 'kisa_listede';
    });
  }
  function getStats() {
    var s = { beklemede: 0, kisa_listede: 0, kabul: 0, reddedildi: 0, toplam: _decs.length };
    _decs.forEach(function (d) { if (s[d.status] !== undefined) s[d.status]++; });
    return s;
  }

  /* CANLI: karşı taraf karar verince önbellek tazelenir */
  var _liveOff = null;
  function subscribe(cb) {
    if (_liveOff || !on() || !SB.subscribeHiringDecisions) return function () {};
    var deb = null;
    _liveOff = SB.subscribeHiringDecisions(function () {
      if (deb) clearTimeout(deb);
      deb = setTimeout(function () {
        load(true).then(function () { if (cb) try { cb(_decs); } catch (e) {} });
      }, 400);
    });
    return _liveOff;
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
    if (!log.length) return '<p class="text-muted-xs">Henüz işlem yok.</p>';
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
  /* Demo/örnek veri üreticisi kaldırıldı — üretimde sahte kayıt oluşturulmaz. */
  window.KBHiring = {
    STATES: STATES,
    /* veri (async) */
    load: load,
    makeDecision: makeDecision,
    addNote: addNote,
    setOnboarding: setOnboarding,
    setOnboardingComplete: setOnboardingComplete,
    subscribe: subscribe,
    /* önbellekten (senkron) — önce load() çağır */
    getDecision: getDecision,
    getDecisionsRaw: getDecisionsRaw,
    getOnboarding: getOnboarding,
    getLog: getLog,
    getPendingDecisions: getPendingDecisions,
    getStats: getStats,
    /* render */
    renderChip: renderChip,
    renderStatusBar: renderStatusBar,
    renderEmployerActions: renderEmployerActions,
    renderOnboardingForm: renderOnboardingForm,
    renderOnboardingBlock: renderOnboardingBlock,
    renderActivityLog: renderActivityLog,
    renderDecisionCard: renderDecisionCard,
    fmtDate: fmtDate
  };
})();
