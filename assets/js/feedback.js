(function () {
  'use strict';

  var EMPLOYER_CRITERIA = [
    { key: 'dakiklik',         label: 'Dakiklik' },
    { key: 'iletisim',         label: 'İletişim' },
    { key: 'is_disiplini',     label: 'İş Disiplini' },
    { key: 'bolge_hakimiyeti', label: 'Bölge Hakimiyeti' },
    { key: 'genel_performans', label: 'Genel Performans' }
  ];

  var COURIER_CRITERIA = [
    { key: 'iletisim_kalitesi',        label: 'İletişim Kalitesi' },
    { key: 'is_acikliginin_dogrulugu', label: 'İş Açıklığının Doğruluğu' },
    { key: 'odeme_sureci',             label: 'Ödeme Süreci' },
    { key: 'calisma_sartlari',         label: 'Çalışma Şartları' },
    { key: 'genel_memnuniyet',         label: 'Genel Memnuniyet' }
  ];

  var COURIER_BADGES = [
    { key: 'dakik',          label: 'Dakik',               crit: 'dakiklik',         min: 4   },
    { key: 'guvenilir',      label: 'Güvenilir',            crit: 'is_disiplini',     min: 4   },
    { key: 'hizli_iletisim', label: 'Hızlı İletişim',      crit: 'iletisim',         min: 4   },
    { key: 'uzun_sureli',    label: 'Uzun Süreli Çalışma',  crit: 'genel_performans', min: 4.5 }
  ];

  var EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  /* ── Storage ── */
  function fbKey(jobId, kuryeId, role) { return 'kb_fb_' + jobId + '_' + kuryeId + '_' + role; }
  function logKey(jobId, kuryeId)      { return 'kb_fb_log_' + jobId + '_' + kuryeId; }
  function repKey(profileId)           { return 'kb_rep_' + profileId; }

  /* ── Utilities ── */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function calcAvg(ratings) {
    var vals = Object.keys(ratings).map(function(k){ return ratings[k]; })
      .filter(function(v){ return typeof v === 'number' && v > 0; });
    if (!vals.length) return 0;
    return Math.round((vals.reduce(function(a,b){ return a+b; },0) / vals.length) * 10) / 10;
  }
  function isEditable(fb) {
    if (!fb) return false;
    return Date.now() - new Date(fb.submittedAt).getTime() < EDIT_WINDOW_MS;
  }
  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', { day:'numeric', month:'short', year:'numeric' });
  }

  /* ── Eligibility ── */
  function canSubmit(jobId, kuryeId) {
    if (window.KBHiring) {
      var dec = KBHiring.getDecision(jobId, kuryeId);
      if (dec && (dec.status === 'kabul' || dec.status === 'tamamlandi')) return true;
    }
    try {
      var raw = localStorage.getItem('kb_hiring_' + jobId + '_' + kuryeId);
      if (raw) {
        var d = JSON.parse(raw);
        return d.status === 'kabul' || d.status === 'tamamlandi';
      }
    } catch(e) {}
    return false;
  }

  /* ── CRUD ── */
  function getFeedback(jobId, kuryeId, role) {
    try { return JSON.parse(localStorage.getItem(fbKey(jobId, kuryeId, role))); } catch(e) { return null; }
  }

  function submitFeedback(uid, jobId, kuryeId, isletmeId, role, ratings, text) {
    var existing = getFeedback(jobId, kuryeId, role);
    if (existing && !isEditable(existing)) return { error: 'Düzenleme süresi (7 gün) doldu.' };
    var avg = calcAvg(ratings);
    if (!avg) return { error: 'Lütfen tüm kriterleri puanlayın.' };
    var fb = {
      id:           existing ? existing.id : ('fb_' + Date.now()),
      jobId:        jobId, kuryeId: kuryeId, isletmeId: isletmeId, role: role,
      ratings:      ratings, text: text || '', avg: avg,
      submittedAt:  existing ? existing.submittedAt : new Date().toISOString(),
      editedAt:     existing ? new Date().toISOString() : null,
      reported:     existing ? existing.reported     : false,
      reportReason: existing ? existing.reportReason : '',
      reportStatus: existing ? existing.reportStatus : ''
    };
    localStorage.setItem(fbKey(jobId, kuryeId, role), JSON.stringify(fb));
    logEvent(jobId, kuryeId, existing ? 'edited' : 'submitted', role);
    updateReputation(role === 'isletme' ? kuryeId : isletmeId, role === 'isletme' ? 'kurye' : 'isletme');
    return fb;
  }

  function reportFeedback(jobId, kuryeId, role, reason) {
    var fb = getFeedback(jobId, kuryeId, role);
    if (!fb) return;
    fb.reported = true; fb.reportReason = reason; fb.reportStatus = 'pending';
    localStorage.setItem(fbKey(jobId, kuryeId, role), JSON.stringify(fb));
    logEvent(jobId, kuryeId, 'reported', role);
  }

  /* ── Log ── */
  function logEvent(jobId, kuryeId, action, role) {
    var key = logKey(jobId, kuryeId);
    var log = [];
    try { log = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
    log.push({ action: action, role: role, at: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(log));
  }
  function getLog(jobId, kuryeId) {
    try { return JSON.parse(localStorage.getItem(logKey(jobId, kuryeId)) || '[]'); } catch(e) { return []; }
  }

  /* ── Reputation ── */
  function getReputation(profileId, profileRole) {
    var allFbs = [];
    for (var k in localStorage) {
      if (!k.startsWith('kb_fb_') || k.includes('_log_')) continue;
      try {
        var fb = JSON.parse(localStorage.getItem(k));
        if (!fb) continue;
        if (fb.reported && fb.reportStatus === 'resolved') continue;
        if (profileRole === 'kurye'   && fb.kuryeId   === profileId && fb.role === 'isletme') allFbs.push(fb);
        if (profileRole === 'isletme' && fb.isletmeId === profileId && fb.role === 'kurye')   allFbs.push(fb);
      } catch(e) {}
    }
    if (!allFbs.length) return null;

    var totalSum = 0;
    var criteriaMap = {};
    allFbs.forEach(function(fb) {
      totalSum += fb.avg;
      Object.keys(fb.ratings).forEach(function(key) {
        if (!criteriaMap[key]) criteriaMap[key] = [];
        criteriaMap[key].push(fb.ratings[key]);
      });
    });
    var avgScore = Math.round((totalSum / allFbs.length) * 10) / 10;
    var criteriaAvgs = {};
    Object.keys(criteriaMap).forEach(function(key) {
      var arr = criteriaMap[key];
      criteriaAvgs[key] = Math.round((arr.reduce(function(a,b){return a+b;},0)/arr.length)*10)/10;
    });
    var badges = [];
    if (profileRole === 'kurye') {
      COURIER_BADGES.forEach(function(b) {
        if (criteriaAvgs[b.crit] && criteriaAvgs[b.crit] >= b.min) badges.push(b);
      });
    }
    return {
      profileId: profileId, profileRole: profileRole,
      totalCount: allFbs.length, avgScore: avgScore,
      criteriaAvgs: criteriaAvgs, badges: badges,
      recentFeedbacks: allFbs.slice(-3).reverse(),
      reputationScore: calcReputationScore(avgScore, allFbs.length)
    };
  }

  function calcReputationScore(avg, count) {
    return Math.round(((avg - 1) / 4) * 70 + Math.min(count / 50, 1) * 30);
  }

  function updateReputation(profileId, profileRole) {
    var rep = getReputation(profileId, profileRole);
    if (rep) localStorage.setItem(repKey(profileId), JSON.stringify(rep));
    return rep;
  }
  function getCachedReputation(profileId) {
    try { return JSON.parse(localStorage.getItem(repKey(profileId))); } catch(e) { return null; }
  }

  function getPendingFeedbacks(uid, role) {
    var pending = [];
    var isBiz = (role === 'isletme' || role === 'firma');
    for (var k in localStorage) {
      if (!k.startsWith('kb_hiring_') || k.includes('_ob_') || k.includes('_log_')) continue;
      try {
        var dec = JSON.parse(localStorage.getItem(k));
        if (!dec) continue;
        if (dec.status !== 'kabul' && dec.status !== 'tamamlandi') continue;
        var relevantUid = isBiz ? dec.isletmeId : dec.kuryeId;
        if (relevantUid !== uid) continue;
        var myFbRole = isBiz ? 'isletme' : 'kurye';
        if (!getFeedback(dec.jobId, dec.kuryeId, myFbRole)) pending.push(dec);
      } catch(e) {}
    }
    return pending;
  }

  /* ── Render helpers ── */
  function renderStarInput(name, value) {
    var html = '<div class="fb-star-input" data-name="' + esc(name) + '">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="fb-star' + (i <= (value||0) ? ' active' : '') + '" data-val="' + i + '">★</span>';
    }
    return html + '</div>';
  }

  function renderStarDisplay(value) {
    var rounded = Math.round(value||0);
    var html = '<span class="fb-stars-display">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="fb-star-d' + (i <= rounded ? ' active' : '') + '">★</span>';
    }
    return html + '</span><span class="fb-avg-num">' + (+(value||0)).toFixed(1) + '</span>';
  }

  function renderForm(jobId, kuryeId, isletmeId, role, existing) {
    if (existing && !isEditable(existing)) {
      return '<div class="fb-locked"><span>🔒</span><p>Düzenleme süresi doldu (7 gün).</p></div>';
    }
    var criteria = role === 'isletme' ? EMPLOYER_CRITERIA : COURIER_CRITERIA;
    var ratings  = existing ? existing.ratings : {};
    var html = '<div class="fb-form" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) + '" data-iid="' + esc(isletmeId) + '" data-role="' + esc(role) + '">';
    html += '<div class="fb-criteria">';
    criteria.forEach(function(c) {
      html += '<div class="fb-criterion"><span class="fb-crit-label">' + esc(c.label) + '</span>' +
        renderStarInput(c.key, ratings[c.key]||0) + '</div>';
    });
    html += '</div><div class="fb-text-wrap"><textarea class="fb-text" placeholder="Ek yorum (isteğe bağlı)…" rows="3">' +
      esc(existing ? existing.text : '') + '</textarea></div>';
    html += '<button class="btn btn--primary fb-submit" style="width:100%;margin-top:4px;">' +
      (existing ? 'Güncelle' : 'Gönder') + '</button></div>';
    return html;
  }

  function renderCard(fb, opts) {
    if (!fb) return '';
    opts = opts || {};
    var criteria = fb.role === 'isletme' ? EMPLOYER_CRITERIA : COURIER_CRITERIA;
    var html = '<div class="fb-card">';
    html += '<div class="fb-card-hdr"><div class="fb-card-avg">' + renderStarDisplay(fb.avg) + '</div>';
    html += '<div class="fb-card-meta"><span class="fb-card-date">' + formatDate(fb.submittedAt) + '</span>';
    if (fb.editedAt) html += '<span class="fb-card-edited">Düzenlendi</span>';
    html += '</div></div><div class="fb-card-criteria">';
    criteria.forEach(function(c) {
      var val = fb.ratings[c.key]||0;
      html += '<div class="fb-crit-row"><span class="fb-crit-name">' + esc(c.label) + '</span>' +
        '<div class="fb-crit-bar"><div class="fb-crit-fill" style="width:' + (val/5*100) + '%"></div></div>' +
        '<span class="fb-crit-val">' + val + '</span></div>';
    });
    html += '</div>';
    if (fb.text) html += '<p class="fb-card-text">"' + esc(fb.text) + '"</p>';
    if (fb.reported) {
      var sLabels = { pending:'⏳ İnceleniyor', resolved:'✅ Çözüldü', dismissed:'❌ Reddedildi' };
      html += '<p class="fb-reported-notice">' + (sLabels[fb.reportStatus]||'⚠️ Şikayet edildi') + '</p>';
    }
    html += '<div class="fb-card-actions">';
    if (opts.canEdit && isEditable(fb)) html += '<button class="btn btn--ghost btn--sm" data-fb-action="edit">Düzenle</button>';
    if (opts.canReport && !fb.reported)  html += '<button class="btn btn--ghost btn--sm" data-fb-action="report" style="color:var(--error)">Şikayet Et</button>';
    return html + '</div></div>';
  }

  function renderReputationBlock(profileId, profileRole) {
    var rep = getReputation(profileId, profileRole);
    if (!rep) return '<p class="fb-empty">Henüz değerlendirme yok.</p>';
    var html = '<div class="fb-rep-block">';
    html += '<div class="fb-rep-score"><div class="fb-rep-big">' + rep.avgScore.toFixed(1) + '</div>';
    html += '<div class="fb-rep-stars">' + renderStarDisplay(rep.avgScore) + '</div>';
    html += '<div class="fb-rep-count">' + rep.totalCount + ' değerlendirme</div></div>';
    if (rep.badges && rep.badges.length) {
      html += '<div class="fb-badges">';
      rep.badges.forEach(function(b) { html += '<span class="fb-badge">' + esc(b.label) + '</span>'; });
      html += '</div>';
    }
    if (rep.recentFeedbacks && rep.recentFeedbacks.length) {
      html += '<div class="fb-recent"><div class="fb-recent-title">Son Yorumlar</div>';
      rep.recentFeedbacks.forEach(function(fb) {
        html += '<div class="fb-recent-item">' + renderStarDisplay(fb.avg);
        if (fb.text) html += '<p class="fb-recent-text">"' + esc(fb.text) + '"</p>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '<div class="fb-rep-score-bar"><span class="fb-rep-score-label">İtibar Puanı</span>';
    html += '<div class="fb-rep-bar-wrap"><div class="fb-rep-bar-fill" style="width:' + rep.reputationScore + '%"></div></div>';
    html += '<span class="fb-rep-score-num">' + rep.reputationScore + '/100</span></div>';
    return html + '</div>';
  }

  function renderMiniRep(profileId) {
    var rep = getCachedReputation(profileId) || getReputation(profileId, 'kurye') || getReputation(profileId, 'isletme');
    if (!rep) return '';
    return '<span class="fb-mini-rep">' + renderStarDisplay(rep.avgScore) +
      ' <span class="fb-mini-count">(' + rep.totalCount + ')</span></span>';
  }

  function renderLog(jobId, kuryeId) {
    var log = getLog(jobId, kuryeId);
    if (!log.length) return '<p class="fb-empty">Henüz kayıt yok.</p>';
    var LOG_LABELS = {
      submitted:        'Değerlendirme gönderildi',
      edited:           'Değerlendirme güncellendi',
      reported:         'Şikayet edildi',
      report_resolved:  'Şikayet çözüldü',
      report_dismissed: 'Şikayet reddedildi'
    };
    var ROLE_LABELS = { isletme:'Esnaf', kurye:'Kurye' };
    var html = '<div class="fb-log">';
    log.slice().reverse().forEach(function(item) {
      html += '<div class="fb-log-item"><div class="fb-log-dot"></div><div style="flex:1">';
      html += '<span class="fb-log-text">' + (LOG_LABELS[item.action]||item.action) + '</span>';
      html += ' <span style="color:var(--text-3);font-size:0.72rem;">· ' + (ROLE_LABELS[item.role]||item.role) + '</span>';
      html += '<div class="fb-log-time">' + formatDate(item.at) + '</div></div></div>';
    });
    return html + '</div>';
  }

  /* ── Mini card for mesaj-detay sidebar ── */
  function renderMiniCard(jobId, kuryeId, isletmeId, role) {
    if (!canSubmit(jobId, kuryeId)) return '';
    var isBiz = (role === 'isletme' || role === 'firma');
    var myFbRole = isBiz ? 'isletme' : 'kurye';
    var fb = getFeedback(jobId, kuryeId, myFbRole);
    var url = 'geri-bildirim.html?job=' + esc(jobId) + '&kid=' + esc(kuryeId) + '&iid=' + esc(isletmeId);
    var html = '<div class="mdt-card fb-mini-wrap">';
    html += '<div class="mdt-card-hdr"><span class="mdt-card-title">⭐ Geri Bildirim</span>';
    if (fb) html += '<span style="font-size:0.72rem;color:var(--success);">✓ Gönderildi</span>';
    html += '</div>';
    if (fb) {
      html += '<div style="margin:8px 0 4px">' + renderStarDisplay(fb.avg) + '</div>';
      if (fb.text) html += '<p style="font-size:0.78rem;color:var(--text-2);font-style:italic;margin:4px 0;">"' +
        esc(fb.text.slice(0,80)) + (fb.text.length > 80 ? '…' : '') + '"</p>';
      html += '<a href="' + url + '" class="btn btn--ghost btn--sm" style="margin-top:8px;width:100%;justify-content:center;">Düzenle →</a>';
    } else {
      html += '<p style="font-size:0.78rem;color:var(--text-3);margin:6px 0 10px;">İşe alım tamamlandı. Değerlendirmenizi paylaşın.</p>';
      html += '<a href="' + url + '" class="btn btn--primary btn--sm" style="width:100%;justify-content:center;">Değerlendirme Ver →</a>';
    }
    return html + '</div>';
  }

  /* ── Demo seed ── */
  function seedDemoData() {
    var demoJob = 'job_demo1', demoKurye = 'demo_kurye', demoIsletme = 'demo';
    var hiringKey = 'kb_hiring_' + demoJob + '_' + demoKurye;
    if (!localStorage.getItem(hiringKey)) {
      localStorage.setItem(hiringKey, JSON.stringify({
        id:'hd_demo_fb', jobId:demoJob, kuryeId:demoKurye, isletmeId:demoIsletme,
        status:'kabul', jobTitle:'Motosiklet Kurye', kuryeAd:'Ali Yılmaz', isletmeAd:'KuryemiBul Demo'
      }));
    }
    if (!getFeedback(demoJob, demoKurye, 'isletme')) {
      localStorage.setItem(fbKey(demoJob, demoKurye, 'isletme'), JSON.stringify({
        id:'fb_demo1', jobId:demoJob, kuryeId:demoKurye, isletmeId:demoIsletme, role:'isletme',
        ratings:{ dakiklik:5, iletisim:4, is_disiplini:5, bolge_hakimiyeti:4, genel_performans:5 },
        text:'İletişimi güçlü ve zamanında teslimat yaptı.', avg:4.6,
        submittedAt:new Date(Date.now()-2*24*60*60*1000).toISOString(),
        editedAt:null, reported:false, reportReason:'', reportStatus:''
      }));
      logEvent(demoJob, demoKurye, 'submitted', 'isletme');
    }
    if (!getFeedback(demoJob, demoKurye, 'kurye')) {
      localStorage.setItem(fbKey(demoJob, demoKurye, 'kurye'), JSON.stringify({
        id:'fb_demo2', jobId:demoJob, kuryeId:demoKurye, isletmeId:demoIsletme, role:'kurye',
        ratings:{ iletisim_kalitesi:4, is_acikliginin_dogrulugu:5, odeme_sureci:4, calisma_sartlari:4, genel_memnuniyet:4 },
        text:'Şartlar netti, ödeme zamanında geldi.', avg:4.2,
        submittedAt:new Date(Date.now()-2*24*60*60*1000).toISOString(),
        editedAt:null, reported:false, reportReason:'', reportStatus:''
      }));
      logEvent(demoJob, demoKurye, 'submitted', 'kurye');
    }
    updateReputation(demoKurye, 'kurye');
    updateReputation(demoIsletme, 'isletme');
  }

  window.KBFeedback = {
    EMPLOYER_CRITERIA:     EMPLOYER_CRITERIA,
    COURIER_CRITERIA:      COURIER_CRITERIA,
    COURIER_BADGES:        COURIER_BADGES,
    canSubmit:             canSubmit,
    getFeedback:           getFeedback,
    submitFeedback:        submitFeedback,
    reportFeedback:        reportFeedback,
    getReputation:         getReputation,
    getCachedReputation:   getCachedReputation,
    updateReputation:      updateReputation,
    getPendingFeedbacks:   getPendingFeedbacks,
    renderForm:            renderForm,
    renderCard:            renderCard,
    renderReputationBlock: renderReputationBlock,
    renderMiniRep:         renderMiniRep,
    renderMiniCard:        renderMiniCard,
    renderLog:             renderLog,
    renderStarDisplay:     renderStarDisplay,
    isEditable:            isEditable,
    seedDemoData:          seedDemoData
  };
})();
