(function () {
  'use strict';

  // 8 communication states — ordered by lifecycle progression
  var STATES = {
    yeni_basvuru:       { label: 'Yeni Başvuru',         icon: '📋', step: 0 },
    ilk_mesaj:          { label: 'İlk Mesaj Gönderildi', icon: '💬', step: 1 },
    aktif_gorusme:      { label: 'Aktif Görüşme',         icon: '🔄', step: 2 },
    mulakat_planlandi:  { label: 'Mülakat Planlandı',     icon: '📅', step: 3 },
    mulakat_tamamlandi: { label: 'Mülakat Tamamlandı',    icon: '☑️', step: 4 },
    karar_bekleniyor:   { label: 'Karar Bekleniyor',      icon: '🔍', step: 5 },
    ise_alindi:         { label: 'İşe Alındı',            icon: '✅', step: 6 },
    olumsuz:            { label: 'Olumsuz Sonuçlandı',    icon: '❌', step: -1 }
  };

  var STEP_KEYS = ['yeni_basvuru','ilk_mesaj','aktif_gorusme','mulakat_planlandi','mulakat_tamamlandi','karar_bekleniyor','ise_alindi'];
  var STEP_ORDER = STEP_KEYS.concat(['olumsuz']);

  // Next-action guidance per state per role
  var NEXT_ACTIONS = {
    isletme: {
      yeni_basvuru:       { title: 'Başvuruyu İncele',       desc: 'Başvuruyu değerlendirin ve kurye ile iletişime geçin.',            btnLabel: '💬 Mesaj Gönder',       btnAction: 'focus-input' },
      ilk_mesaj:          { title: 'Görüşmeyi Sürdür',       desc: 'Yanıt verin veya mülakat planlamaya başlayın.',                    btnLabel: '📅 Mülakat Planla',     btnAction: 'show-iv-form' },
      aktif_gorusme:      { title: 'Mülakat Planla',         desc: 'Yeterli bilgiye sahipseniz mülakat davetini oluşturun.',           btnLabel: '📅 Mülakat Planla',     btnAction: 'show-iv-form' },
      mulakat_planlandi:  { title: 'Mülakatı Gerçekleştir', desc: 'Planlanan mülakatı bekleyin. Değişiklik gerekirse yeniden planlayın.', btnLabel: null, btnAction: null },
      mulakat_tamamlandi: { title: 'Karar Verin',            desc: 'Mülakat tamamlandı. Son kararınızı belirtin.',                     btnLabel: '⚖️ Karar Ver',         btnAction: 'goto-karar' },
      karar_bekleniyor:   { title: 'İşe Alım Kararı',        desc: 'Adayı kabul edin, kısa listeye alın veya reddedin.',               btnLabel: '⚖️ Karar Ver',         btnAction: 'goto-karar' },
      ise_alindi:         { title: 'Onboarding Gönder',       desc: 'Başlangıç bilgilerini ve evrak listesini adaya gönderin.',         btnLabel: '📋 Bilgileri Gönder',   btnAction: 'goto-karar' },
      olumsuz:            { title: 'Tamamlandı',              desc: 'Bu başvuru olumsuz sonuçlandı, arşive taşındı.',                   btnLabel: null, btnAction: null }
    },
    kurye: {
      yeni_basvuru:       { title: 'Yanıt Bekleniyor',        desc: 'Başvurunuz alındı. İşveren inceleyecek.',                          btnLabel: null, btnAction: null },
      ilk_mesaj:          { title: 'Mesajı Yanıtla',          desc: 'İşveren size mesaj gönderdi. Yanıtlayın.',                         btnLabel: '💬 Yanıtla',            btnAction: 'focus-input' },
      aktif_gorusme:      { title: 'Görüşmeye Devam',         desc: 'Aktif görüşme sürüyor. Mesajları takip edin.',                     btnLabel: '💬 Mesajlar',           btnAction: 'focus-input' },
      mulakat_planlandi:  { title: 'Mülakatı Onayla',         desc: 'Mülakat daveti var. Onaylayın veya yeniden planlama talep edin.',  btnLabel: '✓ Mülakatı Onayla',    btnAction: 'confirm-interview' },
      mulakat_tamamlandi: { title: 'Karar Bekleniyor',        desc: 'Mülakat tamamlandı. İşveren karar verecek.',                       btnLabel: null, btnAction: null },
      karar_bekleniyor:   { title: 'Sonuç Bekleniyor',        desc: 'İşveren değerlendirme aşamasında.',                                btnLabel: null, btnAction: null },
      ise_alindi:         { title: '🎉 Tebrikler!',           desc: 'Kabul Edildiniz! İşe başlangıç bilgilerine bakın.',                btnLabel: '📋 Başlangıç Bilgileri', btnAction: 'goto-karar' },
      olumsuz:            { title: 'Başvuru Sonuçlandı',      desc: 'Bu başvuru olumsuz sonuçlandı. Başarılar dileriz.',                btnLabel: null, btnAction: null }
    }
  };

  // ── Storage ──────────────────────────────────────────────────────
  function csKey(tid)  { return 'kb_cs_' + tid; }
  function logKey(tid) { return 'kb_cs_log_' + tid; }
  function archKey(uid) { return 'kb_cs_arch_' + uid; }

  function get(tid) {
    try { return JSON.parse(localStorage.getItem(csKey(tid)) || 'null'); } catch (e) { return null; }
  }

  function getLog(tid) {
    try { return JSON.parse(localStorage.getItem(logKey(tid)) || '[]'); } catch (e) { return []; }
  }

  function appendLog(tid, from, to, meta) {
    try {
      var log = getLog(tid);
      log.push({ from: from, to: to, at: new Date().toISOString(), meta: meta || {} });
      localStorage.setItem(logKey(tid), JSON.stringify(log));
    } catch (e) {}
  }

  function archive(uid, tid) {
    try {
      var key = archKey(uid);
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      if (list.indexOf(tid) < 0) list.unshift(tid);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
    } catch (e) {}
  }

  function getArchived(uid) {
    try { return JSON.parse(localStorage.getItem(archKey(uid)) || '[]'); } catch (e) { return []; }
  }

  // ── Set status ────────────────────────────────────────────────────
  function set(uid, tid, status, meta) {
    meta = meta || {};
    var now = new Date().toISOString();
    var current = get(tid);
    var prev = current ? current.status : null;

    // Only advance forward — never downgrade (except to olumsuz/ise_alindi which are terminal)
    var terminal = status === 'ise_alindi' || status === 'olumsuz';
    if (!terminal && prev && prev !== 'yeni_basvuru') {
      var prevIdx = STEP_ORDER.indexOf(prev);
      var nextIdx = STEP_ORDER.indexOf(status);
      if (prevIdx >= nextIdx && prevIdx >= 0) return current; // no downgrade
    }

    var cs = {
      tid: tid, uid: uid, status: status,
      jobId: meta.jobId || (current && current.jobId) || '',
      kuryeId: meta.kuryeId || (current && current.kuryeId) || '',
      createdAt: current ? current.createdAt : now,
      updatedAt: now
    };

    try { localStorage.setItem(csKey(tid), JSON.stringify(cs)); } catch (e) {}

    if (prev !== status) {
      appendLog(tid, prev || 'yeni_basvuru', status, meta);

      // Push notification for significant transitions
      var notable = ['mulakat_planlandi', 'mulakat_tamamlandi', 'ise_alindi', 'olumsuz', 'karar_bekleniyor'];
      if (notable.indexOf(status) >= 0 && meta.kuryeId) {
        try {
          var notifKey = 'kb_notifs_' + meta.kuryeId;
          var notifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
          notifs.unshift({ type: 'comm_status', status: status, label: STATES[status].label, at: now, read: false });
          localStorage.setItem(notifKey, JSON.stringify(notifs.slice(0, 50)));
        } catch (e) {}
      }

      // Auto-archive finalized threads
      if (status === 'ise_alindi' || status === 'olumsuz') {
        archive(uid, tid);
      }
    }

    return cs;
  }

  // ── Auto-detect from external system state ────────────────────────
  function autoDetect(uid, tid, thread, opts) {
    opts = opts || {};

    // KBHiring takes highest priority
    if (window.KBHiring && thread && thread.jobId && thread.kuryeId) {
      var hdec = KBHiring.getDecision(thread.jobId, thread.kuryeId);
      if (hdec) {
        if (hdec.status === 'kabul') return 'ise_alindi';
        if (hdec.status === 'reddedildi') return 'olumsuz';
        if (hdec.status === 'kisa_listede' || hdec.status === 'mulakat_tamamlandi') return 'karar_bekleniyor';
      }
    }

    // KBInterview
    if (window.KBInterview && thread) {
      var ivs = KBInterview.findByThread(uid, tid);
      if (ivs.length) {
        var iv = ivs[ivs.length - 1];
        if (iv.status === 'tamamlandi') return 'mulakat_tamamlandi';
        if (iv.status === 'onaylandi' || iv.status === 'bekliyor' || iv.status === 'yeniden_planlandi') return 'mulakat_planlandi';
      }
    }

    // Chat thread signals
    if (thread) {
      var cs = thread.chatStatus || '';
      var as = thread.appStatus || '';
      if (cs === 'sonuclandi') {
        if (as === 'kabul') return 'ise_alindi';
        if (as === 'red') return 'olumsuz';
        return 'karar_bekleniyor';
      }
      if (cs === 'mulakat' || as === 'mulakat') return 'mulakat_planlandi';

      // Message count heuristic
      var msgCount = opts.msgCount != null ? opts.msgCount : (thread.msgCount || 0);
      if (!msgCount && window.KBChat) {
        var msgs = KBChat.getMsgs(tid);
        msgCount = msgs ? msgs.filter(function (m) { return m.type !== 'system'; }).length : 0;
      }
      if (msgCount >= 3) return 'aktif_gorusme';
      if (msgCount >= 1 || thread.lastMsg) return 'ilk_mesaj';
    }

    return 'yeni_basvuru';
  }

  // Scan all threads and update statuses
  function observe(uid) {
    if (!window.KBChat) return;
    var threads = KBChat.getThreads(uid);
    threads.forEach(function (t) {
      var detected = autoDetect(uid, t.id, t);
      var current  = get(t.id);
      if (!current || detected !== current.status) {
        set(uid, t.id, detected, { jobId: t.jobId, kuryeId: t.kuryeId });
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtTime(iso) {
    if (!iso) return '';
    try {
      var d = new Date(iso);
      var mo = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
      return d.getDate() + ' ' + mo[d.getMonth()] + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    } catch (e) { return iso.slice(0,16).replace('T',' '); }
  }

  // ── Render ────────────────────────────────────────────────────────
  function renderBadge(status) {
    var s = STATES[status] || { label: status, icon: '?' };
    return '<span class="cs-badge cs-badge--' + esc(status) + '">' + s.icon + ' ' + esc(s.label) + '</span>';
  }

  function renderMiniStatus(status) {
    var s = STATES[status] || { label: status, icon: '?' };
    return '<span class="cs-mini cs-mini--' + esc(status) + '" title="' + esc(s.label) + '">' + s.icon + '</span>';
  }

  function renderTimeline(status) {
    var isOlumsuz = status === 'olumsuz';
    var activeIdx = STEP_KEYS.indexOf(isOlumsuz ? 'yeni_basvuru' : status);
    if (activeIdx < 0) activeIdx = 0;

    return '<div class="cs-timeline">' +
      STEP_KEYS.map(function (s, i) {
        var cls = 'cs-tl-step';
        if (isOlumsuz) cls += (i === 0 ? ' is-done' : ' is-rejected');
        else if (i < activeIdx) cls += ' is-done';
        else if (i === activeIdx) cls += ' is-active';
        var lineCls = 'cs-tl-line' + (!isOlumsuz && i < activeIdx ? ' is-done' : isOlumsuz ? ' is-rejected' : '');
        return (i > 0 ? '<div class="' + lineCls + '"></div>' : '') +
          '<div class="' + cls + '">' +
            '<div class="cs-tl-dot" title="' + esc(STATES[s].label) + '">' + STATES[s].icon + '</div>' +
          '</div>';
      }).join('') +
    '</div>' +
    (isOlumsuz ? '<div class="cs-tl-olumsuz">' + STATES.olumsuz.icon + ' ' + esc(STATES.olumsuz.label) + '</div>' : '');
  }

  function renderNextAction(status, role, opts) {
    opts = opts || {};
    var roleKey = (role === 'kurye') ? 'kurye' : 'isletme';
    var na = (NEXT_ACTIONS[roleKey] || {})[status] || { title: '—', desc: '' };
    var isFinal = status === 'ise_alindi' || status === 'olumsuz';
    var cls = 'cs-next-action' + (status === 'ise_alindi' ? ' cs-next-action--success' : status === 'olumsuz' ? ' cs-next-action--error' : '');

    var btnHtml = '';
    if (na.btnLabel && na.btnAction) {
      var href = (na.btnAction === 'goto-karar')
        ? ('karar.html?job=' + esc(opts.jobId || '') + '&kid=' + esc(opts.kuryeId || ''))
        : null;
      if (href) {
        btnHtml = '<a href="' + href + '" class="btn btn--primary btn--sm cs-na-btn">' + esc(na.btnLabel) + '</a>';
      } else {
        btnHtml = '<button class="btn btn--primary btn--sm cs-na-btn" data-mdt-action="' + esc(na.btnAction) + '">' + esc(na.btnLabel) + '</button>';
      }
    }

    return '<div class="' + cls + '">' +
      '<div class="cs-na-title">' + esc(na.title) + '</div>' +
      '<div class="cs-na-desc">' + esc(na.desc) + '</div>' +
      (btnHtml ? '<div class="cs-na-foot">' + btnHtml + '</div>' : '') +
    '</div>';
  }

  function renderActivityLog(tid) {
    var log = getLog(tid);
    if (!log.length) return '<p class="cs-log-empty">Henüz geçiş yok.</p>';
    return '<div class="cs-log">' +
      log.slice().reverse().map(function (entry) {
        var fromS = STATES[entry.from] || { label: entry.from || 'Başlangıç', icon: '·' };
        var toS   = STATES[entry.to]   || { label: entry.to,  icon: '?' };
        return '<div class="cs-log-item">' +
          '<div class="cs-log-dot"></div>' +
          '<div class="cs-log-body">' +
            (entry.from ? '<span class="cs-log-from">' + esc(fromS.icon) + ' ' + esc(fromS.label) + '</span>' +
              '<span class="cs-log-arrow"> → </span>' : '') +
            '<span class="cs-log-to">' + esc(toS.icon) + ' ' + esc(toS.label) + '</span>' +
            '<div class="cs-log-time">' + esc(fmtTime(entry.at)) + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function renderStatusCard(status, role, tid, opts) {
    return '<div class="mdt-card">' +
      '<div class="mdt-card-hdr"><span class="mdt-card-title">📡 İletişim Durumu</span>' + renderBadge(status) + '</div>' +
      renderTimeline(status) +
      renderNextAction(status, role, opts) +
      '<details class="cs-log-details">' +
        '<summary>Geçiş Geçmişi</summary>' +
        renderActivityLog(tid) +
      '</details>' +
    '</div>';
  }

  // ── Seed / init ────────────────────────────────────────────────────
  function seedDemoData(uid) {
    if (!window.KBChat) return;
    observe(uid);
  }

  window.KBCommStatus = {
    STATES: STATES,
    STEP_KEYS: STEP_KEYS,
    NEXT_ACTIONS: NEXT_ACTIONS,
    get: get,
    set: set,
    getLog: getLog,
    archive: archive,
    getArchived: getArchived,
    autoDetect: autoDetect,
    observe: observe,
    renderBadge: renderBadge,
    renderMiniStatus: renderMiniStatus,
    renderTimeline: renderTimeline,
    renderNextAction: renderNextAction,
    renderActivityLog: renderActivityLog,
    renderStatusCard: renderStatusCard,
    seedDemoData: seedDemoData
  };
})();
