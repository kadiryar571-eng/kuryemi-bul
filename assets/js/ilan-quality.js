/* ── IlanQuality — Smart Job Optimization Engine (c) KuryemiBul ── */
window.IlanQuality = (function () {
  'use strict';

  /* ─── Scoring dimensions — total 100 pts ────────────────────── */
  var DIMS = [
    { id:'title',    lbl:'Başlık Kalitesi',    max:15, color:'#6366F1' },
    { id:'salary',   lbl:'Maaş Bilgisi',       max:20, color:'#10B981' },
    { id:'location', lbl:'Konum Detayı',       max:15, color:'#3B82F6' },
    { id:'desc',     lbl:'Açıklama Derinliği', max:15, color:'#8B5CF6' },
    { id:'benefits', lbl:'Yan Haklar',         max:10, color:'#F59E0B' },
    { id:'reqs',     lbl:'Gereksinimler',      max:10, color:'#EC4899' },
    { id:'schedule', lbl:'Çalışma Planı',      max:10, color:'#14B8A6' },
    { id:'deadline', lbl:'Başvuru Tarihi',     max:5,  color:'#64748B' }
  ];

  /* ─── Checklist definitions ──────────────────────────────────── */
  var CHECKS = [
    { id:'has_salary',    lbl:'Maaş bilgisi eklendi',           icon:'💰', dim:'salary',   critical:true,  anchor:'jcMaasMin',       tip:'Maaş belirtmek başvuru sayısını %40 artırır.' },
    { id:'has_city',      lbl:'Şehir bilgisi eklendi',          icon:'📍', dim:'location', critical:true,  anchor:'jcSehir',         tip:'Şehir olmadan kuryeler bulamaz.' },
    { id:'has_vehicle',   lbl:'Araç tipi belirtildi',           icon:'🛵', dim:'reqs',     critical:true,  anchor:'jcArac',          tip:'Araç gereksinimi başvuru kalitesini artırır.' },
    { id:'has_desc',      lbl:'Görev açıklaması eklendi',       icon:'📝', dim:'desc',     critical:false, anchor:'jcGorev',         tip:'En az 50 karakter açıklama önerilir.' },
    { id:'good_desc',     lbl:'Açıklama yeterince detaylı',     icon:'📋', dim:'desc',     critical:false, anchor:'jcGorev',         tip:'200+ karakter güven oluşturur.' },
    { id:'has_benefits',  lbl:'Yan haklar belirtildi',          icon:'🎁', dim:'benefits', critical:false, anchor:'jcFaydalar',      tip:'Yan hak eklemek başvuruları %25 artırır.' },
    { id:'good_benefits', lbl:'3+ yan hak listelendi',          icon:'⭐', dim:'benefits', critical:false, anchor:'jcFaydalar',      tip:'3+ yan hak en yüksek etki sağlar.' },
    { id:'has_district',  lbl:'Bölge / mahalle eklendi',        icon:'🗺', dim:'location', critical:false, anchor:'jcBolge',         tip:'Bölge bilgisi uyum oranını artırır.' },
    { id:'good_title',    lbl:'Başlık açıklayıcı (20+ karakter)',icon:'✍️',dim:'title',    critical:false, anchor:'jcPozBaslik',     tip:'Detaylı başlık %30 daha fazla tıklanır.' },
    { id:'has_schedule',  lbl:'Çalışma saatleri / tipi eklendi',icon:'⏰', dim:'schedule', critical:false, anchor:'jcCalisma',       tip:'Çalışma saati belirsiz ilanlar daha az başvuru alır.' },
    { id:'has_shifts',    lbl:'Vardiya bilgisi eklendi',        icon:'🕐', dim:'schedule', critical:false, anchor:'jcVardiya',       tip:'Vardiya bilgisi uyum oranını artırır.' },
    { id:'has_deadline',  lbl:'Başvuru tarihi eklendi',         icon:'📅', dim:'deadline', critical:false, anchor:'jcSonBasvuru',    tip:'Son tarih belirtmek aciliyet hissi yaratır.' },
    { id:'has_experience',lbl:'Deneyim şartı belirtildi',       icon:'🎓', dim:'reqs',     critical:false, anchor:'jcDeneyim',       tip:'Deneyim şartı daha hedefli başvuru çeker.' }
  ];

  /* ─── Score calculation ──────────────────────────────────────── */
  function calcScore(job) {
    var pts = calcDimScores(job);
    var total = 0;
    for (var k in pts) total += pts[k];
    return Math.min(100, total);
  }

  function calcDimScores(job) {
    var title = job.baslik || job.poz_baslik || '';
    var desc  = job.aciklama || job.gorev_tanimi || '';
    var bens  = job.faydalar || [];

    return {
      title:    (title.length >= 2 ? 5 : 0) + (title.length >= 15 ? 5 : 0) + (title.length >= 25 ? 5 : 0),
      salary:   ((job.maas_min || job.maas) ? 12 : 0) + (job.maas_max ? 5 : 0) + (job.maas_modeli ? 3 : 0),
      location: (job.sehir ? 5 : 0) + (job.bolge ? 7 : 0) + ((job.mahalle || job.teslimat_bolge) ? 3 : 0),
      desc:     (desc.length > 30 ? 5 : 0) + (desc.length >= 100 ? 5 : 0) + (desc.length >= 300 ? 5 : 0),
      benefits: (bens.length > 0 ? 5 : 0) + (bens.length >= 3 ? 5 : 0),
      reqs:     (job.arac ? 5 : 0) + ((job.deneyim !== undefined && job.deneyim !== '' && job.deneyim !== null) ? 5 : 0),
      schedule: ((job.calisma_saatleri || job.calisma_sekli) ? 5 : 0) + (job.vardiya_tipi ? 5 : 0),
      deadline: (job.son_basvuru ? 5 : 0)
    };
  }

  /* ─── Run checklist ──────────────────────────────────────────── */
  function runChecks(job) {
    var title = job.baslik || job.poz_baslik || '';
    var desc  = job.aciklama || job.gorev_tanimi || '';
    var bens  = job.faydalar || [];

    return CHECKS.map(function (c) {
      var pass = false;
      switch (c.id) {
        case 'has_salary':    pass = !!(job.maas_min || job.maas);                    break;
        case 'has_city':      pass = !!job.sehir;                                     break;
        case 'has_vehicle':   pass = !!job.arac;                                      break;
        case 'has_desc':      pass = desc.length > 30;                                break;
        case 'good_desc':     pass = desc.length >= 200;                              break;
        case 'has_benefits':  pass = bens.length > 0;                                 break;
        case 'good_benefits': pass = bens.length >= 3;                                break;
        case 'has_district':  pass = !!(job.bolge || job.mahalle);                    break;
        case 'good_title':    pass = title.length >= 20;                              break;
        case 'has_schedule':  pass = !!(job.calisma_saatleri || job.calisma_sekli);   break;
        case 'has_shifts':    pass = !!job.vardiya_tipi;                              break;
        case 'has_deadline':  pass = !!job.son_basvuru;                               break;
        case 'has_experience':pass = !!(job.deneyim !== undefined && job.deneyim !== '' && job.deneyim !== null); break;
      }
      return Object.assign({}, c, { pass: pass });
    });
  }

  /* ─── Critical issues (block/warn publish) ────────────────────── */
  function criticalIssues(job) {
    return runChecks(job).filter(function (c) { return c.critical && !c.pass; });
  }

  /* ─── Suggestion engine ──────────────────────────────────────── */
  function getSuggestions(job) {
    var suggestions = [];
    var checks = runChecks(job);
    var failed  = checks.filter(function (c) { return !c.pass; });

    var SUGG = {
      has_salary:    { lbl:'Maaş bilgisi eklemek daha fazla başvuru almanı sağlar.', ico:'💰', anchor:'jcMaasMin', gain:'+40% başvuru' },
      has_district:  { lbl:'Çalışma bölgesini belirterek uygun kurye bulma şansını artır.', ico:'📍', anchor:'jcBolge', gain:'+25% uyum' },
      has_desc:      { lbl:'Görev tanımı ekle. Boş ilanlar %60 daha az başvuru alır.', ico:'📝', anchor:'jcGorev', gain:'+60% başvuru' },
      good_desc:     { lbl:'Açıklamanı biraz daha detaylandır — 200+ karakter önerilir.', ico:'📋', anchor:'jcGorev', gain:'+20% güven' },
      has_benefits:  { lbl:'Yan hakları belirtmek güven oluşturur ve kaliteli adaylar çeker.', ico:'🎁', anchor:'jcFaydalar', gain:'+25% kalite' },
      good_benefits: { lbl:'3 veya daha fazla yan hak ekle. En yüksek etki için 5+ önerilir.', ico:'⭐', anchor:'jcFaydalar', gain:'+15% oran' },
      has_deadline:  { lbl:'Başvuru süresi eklemek dönüşüm oranını %30 artırır.', ico:'📅', anchor:'jcSonBasvuru', gain:'+30% dönüşüm' },
      good_title:    { lbl:'Başlığını daha açıklayıcı yap — bölge ve iş türünü ekle.', ico:'✍️', anchor:'jcPozBaslik', gain:'+30% tıklama' },
      has_schedule:  { lbl:'Çalışma saatlerini belirtmek uyum oranını önemli ölçüde artırır.', ico:'⏰', anchor:'jcCalisma', gain:'+20% uyum' },
      has_vehicle:   { lbl:'Araç gereksinimini belirt — bu sayede uygun adaylar başvurur.', ico:'🛵', anchor:'jcArac', gain:'+35% kalite' },
      has_experience:{ lbl:'Deneyim şartı eklemek daha hedefli başvurular çeker.', ico:'🎓', anchor:'jcDeneyim', gain:'+20% kalite' },
      has_city:      { lbl:'Şehir bilgisini ekle — bu alan zorunlu.', ico:'📍', anchor:'jcSehir', gain:'Zorunlu alan' }
    };

    failed.forEach(function (c) {
      if (SUGG[c.id]) suggestions.push(Object.assign({ checkId: c.id }, SUGG[c.id]));
    });
    return suggestions.slice(0, 6);
  }

  /* ─── Title suggestion ────────────────────────────────────────── */
  function suggestTitle(job) {
    var title = (job.baslik || job.poz_baslik || '').trim();
    if (!title) return null;
    /* Only suggest if title is short/generic */
    if (title.length >= 25) return null;

    var parts = [];
    var bolge = job.bolge || job.sehir || '';
    var sekli = { tam_zamanli:'Tam Zamanlı', yari_zamanli:'Yarı Zamanlı', hafta_sonu:'Hafta Sonu' }[job.calisma_sekli] || '';
    var arac  = job.arac ? job.arac.split(' ')[0] : '';

    if (bolge) parts.push(bolge + ' Bölgesi');
    if (sekli) parts.push(sekli);
    if (arac && arac.toLowerCase() !== title.toLowerCase()) parts.push(arac);
    parts.push('Kurye Aranıyor');

    var suggested = parts.join(' ');
    return suggested !== title && suggested.length > title.length ? suggested : null;
  }

  /* ─── Visibility impact ──────────────────────────────────────── */
  function visibilityTier(score) {
    if (score >= 85) return { lbl:'Çok Yüksek', short:'Önerilen',  ico:'🚀', cls:'ilq-vis--5', rank:5, desc:'Arama sonuçlarında üst sıra · Önerilen ilanlar · Akıllı eşleşme' };
    if (score >= 70) return { lbl:'Yüksek',     short:'Öne Çıkan', ico:'📈', cls:'ilq-vis--4', rank:4, desc:'Yüksek görünürlük · Arama sonuçlarında öncelikli' };
    if (score >= 50) return { lbl:'Orta',        short:'Normal',    ico:'📊', cls:'ilq-vis--3', rank:3, desc:'Standart görünürlük · Geliştirme ile iyileştirilebilir' };
    if (score >= 30) return { lbl:'Düşük',       short:'Sınırlı',   ico:'📉', cls:'ilq-vis--2', rank:2, desc:'Düşük görünürlük · Arama sıralamada geride' };
    return                 { lbl:'Çok Düşük',   short:'Gizli',     ico:'⚠️', cls:'ilq-vis--1', rank:1, desc:'Neredeyse görünmez · Kritik alanlar eksik' };
  }

  /* ─── Analytics ──────────────────────────────────────────────── */
  function simpleHash(s) {
    var h = 0, str = String(s);
    for (var i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function getAnalytics(jobId) {
    var views = 0, applies = 0, saves = 0, shortlisted = 0;
    try { views = parseInt(localStorage.getItem('kb_job_views_' + jobId) || '0', 10); } catch(e) {}
    if (!views) views = 20 + (simpleHash(jobId + 'v') % 60);
    try {
      var apps = JSON.parse(localStorage.getItem('kb_apps_' + jobId)) || {};
      applies     = Object.keys(apps).length;
      shortlisted = Object.keys(apps).filter(function(k) { return apps[k].shortlisted; }).length;
      if (!applies) applies = 4 + (simpleHash(jobId) % 6);
    } catch(e) { applies = 4 + (simpleHash(jobId) % 6); }
    try {
      var saved = JSON.parse(localStorage.getItem('kb_saved_jobs')) || [];
      saves = saved.indexOf(jobId) !== -1 ? 1 : (simpleHash(jobId + 's') % 5);
    } catch(e) { saves = simpleHash(jobId + 's') % 5; }
    var conv = views > 0 ? Math.round((applies / views) * 100) : 0;
    return { views: views, applies: applies, saves: saves, shortlisted: shortlisted, conv: conv };
  }

  /* ─── Record analytics event ─────────────────────────────────── */
  function recordEvent(jobId, eventType) {
    var key = 'kb_ilan_analytics_' + jobId, data = {};
    try { data = JSON.parse(localStorage.getItem(key)) || {}; } catch(e) {}
    data[eventType] = (data[eventType] || 0) + 1;
    data.last = new Date().toISOString();
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
  }

  /* ─── Score color ─────────────────────────────────────────────── */
  function scoreColor(score) {
    if (score >= 85) return '#15803D';
    if (score >= 70) return '#22C55E';
    if (score >= 50) return '#D97706';
    if (score >= 30) return '#EF4444';
    return '#BE123C';
  }

  /* ─── Score label ─────────────────────────────────────────────── */
  function scoreLabel(score) {
    if (score >= 85) return 'Mükemmel';
    if (score >= 70) return 'İyi';
    if (score >= 50) return 'Geliştirilmeli';
    if (score >= 30) return 'Zayıf';
    return 'Kritik Eksikler';
  }

  /* ─── Score ring HTML ─────────────────────────────────────────── */
  function renderScoreRing(score, size) {
    size = size || 100;
    var inner = Math.round(size * 0.62);
    var color = scoreColor(score);
    var deg   = Math.round(score * 3.6);
    return '<div class="ilq-ring" style="width:' + size + 'px;height:' + size + 'px;background:conic-gradient(' + color + ' ' + deg + 'deg,var(--border) 0%)">' +
      '<div class="ilq-ring__inner" style="width:' + inner + 'px;height:' + inner + 'px">' +
        '<span class="ilq-ring__pct" style="color:' + color + ';font-size:' + Math.round(size * 0.22) + 'px">%' + score + '</span>' +
      '</div>' +
    '</div>';
  }

  /* ─── Compact widget HTML (for ilan-olustur sidebar) ─────────── */
  function renderWidget(job) {
    var score   = calcScore(job);
    var checks  = runChecks(job);
    var failed  = checks.filter(function(c) { return !c.pass; });
    var passed  = checks.filter(function(c) { return c.pass; });
    var vis     = visibilityTier(score);
    var color   = scoreColor(score);
    var suggs   = getSuggestions(job).slice(0, 2);
    var titleSugg = suggestTitle(job);

    var failHtml = failed.slice(0, 4).map(function(c) {
      return '<a class="ilq-check ilq-check--fail" href="#' + c.anchor + '">' +
        '<span class="ilq-check__ico">⚠</span>' +
        '<span class="ilq-check__lbl">' + c.lbl + '</span>' +
        '<span class="ilq-check__tip">' + c.tip + '</span>' +
      '</a>';
    }).join('');

    var passHtml = passed.slice(0, 3).map(function(c) {
      return '<div class="ilq-check ilq-check--pass">' +
        '<span class="ilq-check__ico">✅</span>' +
        '<span class="ilq-check__lbl">' + c.lbl + '</span>' +
      '</div>';
    }).join('');

    return '<div class="ilq-widget">' +
      '<div class="ilq-widget__head">' +
        '<div>' +
          '<div class="ilq-widget__title">İlan Kalitesi</div>' +
          '<div class="ilq-widget__sub">Optimize et, daha fazla başvur al</div>' +
        '</div>' +
        '<a href="ilan-kalite.html" class="ilq-widget__link" id="ilqFullLink" target="_blank">Tam Analiz →</a>' +
      '</div>' +
      '<div class="ilq-widget__score">' +
        renderScoreRing(score, 76) +
        '<div class="ilq-widget__score-info">' +
          '<div class="ilq-score-lbl" style="color:' + color + '">' + scoreLabel(score) + '</div>' +
          '<div class="ilq-score-sub">' + passed.length + '/' + checks.length + ' kriter karşılandı</div>' +
          '<div class="ilq-vis-tag ' + vis.cls + '">' + vis.ico + ' ' + vis.lbl + '</div>' +
        '</div>' +
      '</div>' +
      (failHtml || passHtml ? '<div class="ilq-widget__checks">' + failHtml + passHtml + '</div>' : '') +
      (titleSugg ? '<div class="ilq-title-sugg"><div class="ilq-title-sugg__lbl">✍️ Öneri başlık:</div><div class="ilq-title-sugg__txt">' + titleSugg + '</div><button class="ilq-title-sugg__btn" onclick="(function(){ var el = document.getElementById(\'jcPozBaslik\'); if(el){ el.value=\'' + titleSugg.replace(/'/g, "\\'") + '\'; el.dispatchEvent(new Event(\'input\')); } })()">Uygula</button></div>' : '') +
      (suggs.length ? '<div class="ilq-widget__suggs">' + suggs.map(function(s) { return '<a class="ilq-sugg-item" href="#' + s.anchor + '">' + s.ico + ' ' + s.lbl + (s.gain ? ' <span class="ilq-sugg-gain">' + s.gain + '</span>' : '') + '</a>'; }).join('') + '</div>' : '') +
    '</div>';
  }

  /* ─── Publish warning HTML ───────────────────────────────────── */
  function publishWarningHtml(job) {
    var issues = criticalIssues(job);
    var score  = calcScore(job);
    var lines  = issues.map(function(c) { return '<li>❌ ' + c.lbl + ' — <em>' + c.tip + '</em></li>'; }).join('');
    var scoreWarn = score < 30 ? '<li>⚠️ İlan kalitesi çok düşük (%' + score + '). Daha az başvuru alabilirsin.</li>' : '';
    return lines + scoreWarn;
  }

  return {
    DIMS:              DIMS,
    CHECKS:            CHECKS,
    calcScore:         calcScore,
    calcDimScores:     calcDimScores,
    runChecks:         runChecks,
    criticalIssues:    criticalIssues,
    getSuggestions:    getSuggestions,
    suggestTitle:      suggestTitle,
    visibilityTier:    visibilityTier,
    getAnalytics:      getAnalytics,
    recordEvent:       recordEvent,
    scoreColor:        scoreColor,
    scoreLabel:        scoreLabel,
    renderScoreRing:   renderScoreRing,
    renderWidget:      renderWidget,
    publishWarningHtml:publishWarningHtml
  };
})();
