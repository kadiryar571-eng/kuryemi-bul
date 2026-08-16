/* ============================================================
   feedback.js — çok kriterli geri bildirim

   ESKİDEN: bu dosya Supabase'e HİÇ dokunmuyordu. 349 satırın tamamı
   localStorage'daydı ve iki ciddi sonucu vardı:

     1. reportFeedback() şikayeti yalnız kullanıcının kendi tarayıcısına
        yazıyordu. Ekranda "Şikayet İletildi — Admin ekibi inceleyecektir"
        yazıyor ama hiçbir yöneticiye ulaşmıyordu.
     2. İtibar puanı, rozetler ve "son yorumlar" localStorage'daki
        kayıtlardan hesaplanıp geri-bildirim.html'de gösteriliyordu —
        yani uydurma veri. (CLAUDE.md: "YALNIZ Supabase, mock yok".)

   ŞİMDİ: tek veri kaynağı `public.reviews` (migration-29 ile genişletildi:
   kriterler jsonb + hiring_id + gizli) ve `public.review_reports`.
   Ayrı bir değerlendirme sistemi KURULMADI — zaten çalışan reviews
   tablosu kullanılıyor, böylece recompute_profile_rating trigger'ı
   profil puanını gerçek veriden hesaplamaya devam ediyor.

   SENKRON API KORUNDU: çağıran sayfalar render sırasında senkron okuma
   yapıyor. hiring.js'teki desen izlendi — önce `load()` (async, bir kez),
   sonra senkron getter'lar önbellekten okur.

     await KBFeedback.load();          // sayfa açılışında bir kez
     KBFeedback.getFeedback(...)       // senkron, önbellekten

   Yükleme yapılmadan çağrılan getter'lar boş döner; uydurma veri üretmez.
   ============================================================ */
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
    { key: 'dakik',          label: 'Dakik',                crit: 'dakiklik',         min: 4   },
    { key: 'guvenilir',      label: 'Güvenilir',            crit: 'is_disiplini',     min: 4   },
    { key: 'hizli_iletisim', label: 'Hızlı İletişim',       crit: 'iletisim',         min: 4   },
    { key: 'uzun_sureli',    label: 'Uzun Süreli Çalışma',  crit: 'genel_performans', min: 4.5 }
  ];

  var EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  /* ── Durum ───────────────────────────────────────────────── */
  var _mine    = [];     // benim YAZDIKLARIM
  var _about   = [];     // benim HAKKIMDA yazılanlar
  var _myPid   = null;   // kendi profil id'im
  var _reports = {};     // review_id -> şikayet kaydı
  var _repCache = {};    // profileId -> itibar (loadReputation ile dolar)
  var _loaded  = false;
  var _loading = null;

  function on() { return !!(window.SB && SB.isOn && SB.isOn()); }

  /* Kaçış merkezîdir: components.js → KB.esc. Yerel kopya TANIMLANMAZ. */
  function esc(s) {
    if (window.KB && KB.esc) return KB.esc(s);
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function calcAvg(ratings) {
    var vals = Object.keys(ratings || {}).map(function (k) { return ratings[k]; })
      .filter(function (v) { return typeof v === 'number' && v > 0; });
    if (!vals.length) return 0;
    return Math.round((vals.reduce(function (a, b) { return a + b; }, 0) / vals.length) * 10) / 10;
  }

  function isEditable(fb) {
    if (!fb || !fb.submittedAt) return false;
    return Date.now() - new Date(fb.submittedAt).getTime() < EDIT_WINDOW_MS;
  }

  function formatDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /* DB satırını sayfaların beklediği biçime çevirir. Eski localStorage
     nesnesiyle alan adları uyumlu tutuldu ki çağıran kod değişmesin. */
  function shape(row) {
    if (!row) return null;
    var r = _reports[row.id];
    return {
      id:           row.id,
      hiringId:     row.hiringId,
      targetId:     row.targetId,
      ratings:      row.kriterler || {},
      text:         row.yorum || '',
      avg:          calcAvg(row.kriterler),
      puan:         row.puan,
      submittedAt:  row.createdAt,
      editedAt:     null,          // reviews'ta ayrı bir updated_at yok
      gizli:        !!row.gizli,
      reported:     !!r,
      reportReason: r ? r.reason : '',
      reportStatus: r ? r.durum  : '',
      ad:           row.ad,
      rol:          row.rol
    };
  }

  /* ── Yükleme ─────────────────────────────────────────────── */
  function load(force) {
    if (!on()) { _loaded = true; return Promise.resolve([]); }
    if (_loading) return _loading;
    if (_loaded && !force) return Promise.resolve(_mine);

    _loading = SB.myProfile()
      .then(function (me) {
        _myPid = (me && me.id) || null;
        return Promise.all([
          SB.myFeedbacks(),
          SB.myReviewReports(),
          /* Hakkımda yazılanlar. Eski kod bunu kendi localStorage'ından
             okumaya çalışıyordu — karşı tarafın kaydı benim tarayıcımda
             asla bulunmayacağı için "aldığın değerlendirme" bölümü hiç
             görünmüyordu. Sessiz bir hataydı; artık DB'den geliyor. */
          _myPid ? SB.feedbacksFor(_myPid) : Promise.resolve([])
        ]);
      })
      .then(function (res) {
        _mine  = res[0] || [];
        _about = res[2] || [];
        _reports = {};
        (res[1] || []).forEach(function (r) { _reports[r.review_id] = r; });
      })
      .catch(function (e) { console.warn('KBFeedback.load:', e); })
      .then(function () { _loaded = true; _loading = null; return _mine; });
    return _loading;
  }

  /* Bir profilin itibarını DB'den çeker ve önbelleğe alır.
     renderReputationBlock() senkron olduğu için önce bu çağrılmalı. */
  function loadReputation(profileId) {
    if (!on() || !profileId) return Promise.resolve(null);
    return SB.feedbacksFor(profileId)
      .then(function (rows) {
        _repCache[profileId] = computeReputation(rows || []);
        return _repCache[profileId];
      })
      .catch(function (e) { console.warn('KBFeedback.loadReputation:', e); return null; });
  }

  /* ── Uygunluk ────────────────────────────────────────────── */
  /* Değerlendirme yalnız GERÇEK bir işe alımdan sonra yapılabilir.
     Kaynak: public.hiring_decisions (KBHiring önbelleği). */
  function canSubmit(jobId, kuryeId) {
    if (!window.KBHiring) return false;
    var dec = KBHiring.getDecision(jobId, kuryeId);
    return !!(dec && (dec.status === 'kabul' || dec.status === 'tamamlandi'));
  }

  /* ── Okuma (senkron, önbellekten) ────────────────────────── */
  /* İmza geriye dönük uyumlu: (jobId, kuryeId, role).
     Eskiden anahtar bu üçlüydü; şimdi hiring kaydı üzerinden hedef
     profili bulup kendi değerlendirmemi arıyoruz. */
  function getFeedback(jobId, kuryeId, role) {
    var target = _targetFor(jobId, kuryeId, role);
    if (!target) return null;
    var dec = window.KBHiring ? KBHiring.getDecision(jobId, kuryeId) : null;
    var hid = dec ? dec.id : null;
    var row = _mine.filter(function (m) {
      return String(m.targetId) === String(target) &&
             String(m.hiringId || '') === String(hid || '');
    })[0];
    return shape(row);
  }

  /* Kimi değerlendiriyorum? İşveren rolündeysem kuryeyi, kurye
     rolündeysem işvereni. */
  function _targetFor(jobId, kuryeId, role) {
    if (role === 'isletme' || role === 'firma') return kuryeId;
    var dec = window.KBHiring ? KBHiring.getDecision(jobId, kuryeId) : null;
    return dec ? dec.isletmeId : null;
  }

  /* Karşı tarafın BENİM hakkımda, bu iş için yazdığı değerlendirme.
     Kaynak `_about` — yani DB. */
  function getFeedbackAbout(jobId, kuryeId) {
    var dec = window.KBHiring ? KBHiring.getDecision(jobId, kuryeId) : null;
    var hid = dec ? dec.id : null;
    var row = _about.filter(function (a) {
      return String(a.hiringId || '') === String(hid || '');
    })[0];
    return shape(row);
  }

  /* ── Yazma (async) ───────────────────────────────────────── */
  /* Eski imza: submitFeedback(uid, jobId, kuryeId, isletmeId, role, ratings, text)
     Geriye dönük tutuldu ama artık Promise döner. Çağıran taraf await etmeli. */
  function submitFeedback(uid, jobId, kuryeId, isletmeId, role, ratings, text) {
    if (!on()) return Promise.resolve({ error: 'Sunucuya bağlanılamadı.' });

    var existing = getFeedback(jobId, kuryeId, role);
    if (existing && !isEditable(existing)) {
      return Promise.resolve({ error: 'Düzenleme süresi (7 gün) doldu.' });
    }
    if (!calcAvg(ratings)) {
      return Promise.resolve({ error: 'Lütfen tüm kriterleri puanlayın.' });
    }

    var isBiz  = (role === 'isletme' || role === 'firma');
    var target = isBiz ? kuryeId : isletmeId;
    var dec    = window.KBHiring ? KBHiring.getDecision(jobId, kuryeId) : null;

    if (!target) return Promise.resolve({ error: 'Değerlendirilecek kişi bulunamadı.' });

    return SB.submitFeedback(target, dec ? dec.id : null, ratings, text)
      .then(function (row) {
        // Önbelleği tazele ki aynı sayfada anında görünsün
        return load(true).then(function () { return shape(row); });
      })
      .catch(function (e) {
        return { error: (e && e.message) || 'Değerlendirme kaydedilemedi.' };
      });
  }

  /* Şikayet — artık gerçekten veritabanına yazılıyor.

     Şikayet edilen kayıt, KARŞI TARAFIN BENİM HAKKIMDA yazdığı
     değerlendirmedir; kendi yazdığımı şikayet edemem.

     Eskiden burada getFeedback(jobId, kuryeId, karsiRol) çağrılıyordu.
     O fonksiyon `_mine` içinde, yani BENİM yazdıklarımın arasında arıyor —
     karşı tarafın kaydı orada asla bulunmaz. Sonuç: şikayet her zaman
     "Şikayet edilecek değerlendirme bulunamadı" ile düşüyordu.
     (localStorage döneminden kalma bir artıktı; o zaman da çalışmıyordu.)

     `role` parametresi kaldırıldı: hangi kaydın şikayet edileceği roldden
     değil, işe alım kaydından belirleniyor. */
  function reportFeedback(jobId, kuryeId, reason) {
    if (!on()) return Promise.resolve({ error: 'Sunucuya bağlanılamadı.' });
    var fb = getFeedbackAbout(jobId, kuryeId);
    if (!fb) return Promise.resolve({ error: 'Şikayet edilecek değerlendirme bulunamadı.' });

    return SB.reportReview(fb.id, reason)
      .then(function (r) {
        _reports[fb.id] = { review_id: fb.id, reason: reason, durum: r ? r.durum : 'pending' };
        return { ok: true };
      })
      .catch(function (e) {
        return { error: (e && e.message) || 'Şikayet iletilemedi.' };
      });
  }

  /* ── İtibar — GERÇEK verilerden ──────────────────────────── */
  function computeReputation(rows) {
    if (!rows || !rows.length) return null;

    var totalSum = 0, criteriaMap = {};
    rows.forEach(function (row) {
      totalSum += calcAvg(row.kriterler);
      Object.keys(row.kriterler || {}).forEach(function (key) {
        if (!criteriaMap[key]) criteriaMap[key] = [];
        criteriaMap[key].push(row.kriterler[key]);
      });
    });

    var avgScore = Math.round((totalSum / rows.length) * 10) / 10;
    var criteriaAvgs = {};
    Object.keys(criteriaMap).forEach(function (key) {
      var arr = criteriaMap[key];
      criteriaAvgs[key] = Math.round((arr.reduce(function (a, b) { return a + b; }, 0) / arr.length) * 10) / 10;
    });

    var badges = [];
    COURIER_BADGES.forEach(function (b) {
      if (criteriaAvgs[b.crit] && criteriaAvgs[b.crit] >= b.min) badges.push(b);
    });

    return {
      totalCount: rows.length,
      avgScore: avgScore,
      criteriaAvgs: criteriaAvgs,
      badges: badges,
      recentFeedbacks: rows.slice(0, 3).map(shape),
      reputationScore: calcReputationScore(avgScore, rows.length)
    };
  }

  function calcReputationScore(avg, count) {
    return Math.round(((avg - 1) / 4) * 70 + Math.min(count / 50, 1) * 30);
  }

  function getReputation(profileId) {
    return _repCache[profileId] || null;
  }

  /* Kendi PROFİL id'im. Sayfalardaki getUid() auth.users id'sini döndürür;
     itibar ve değerlendirme kayıtları ise profiles.id ile çalışır. İkisi
     karıştırılırsa sorgu sessizce boş döner. load() sonrası doludur. */
  function myProfileId() { return _myPid; }

  /* ── Bekleyen değerlendirmeler ───────────────────────────── */
  function getPendingFeedbacks(uid, role) {
    if (!window.KBHiring || !KBHiring.getDecisionsRaw) return [];
    var isBiz = (role === 'isletme' || role === 'firma');
    var myFbRole = isBiz ? 'isletme' : 'kurye';
    return KBHiring.getDecisionsRaw().filter(function (dec) {
      if (dec.status !== 'kabul' && dec.status !== 'tamamlandi') return false;
      return !getFeedback(dec.jobId, dec.kuryeId, myFbRole);
    });
  }

  /* ── Render yardımcıları ─────────────────────────────────── */
  function renderStarInput(name, value) {
    var html = '<div class="fb-star-input" data-name="' + esc(name) + '">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="fb-star' + (i <= (value || 0) ? ' active' : '') + '" data-val="' + i + '">★</span>';
    }
    return html + '</div>';
  }

  function renderStarDisplay(value) {
    var rounded = Math.round(value || 0);
    var html = '<span class="fb-stars-display">';
    for (var i = 1; i <= 5; i++) {
      html += '<span class="fb-star-d' + (i <= rounded ? ' active' : '') + '">★</span>';
    }
    return html + '</span><span class="fb-avg-num">' + (+(value || 0)).toFixed(1) + '</span>';
  }

  function renderForm(jobId, kuryeId, isletmeId, role, existing) {
    if (existing && !isEditable(existing)) {
      return '<div class="fb-locked"><span>🔒</span><p>Düzenleme süresi doldu (7 gün).</p></div>';
    }
    var criteria = role === 'isletme' ? EMPLOYER_CRITERIA : COURIER_CRITERIA;
    var ratings  = existing ? existing.ratings : {};
    var html = '<div class="fb-form" data-job="' + esc(jobId) + '" data-kid="' + esc(kuryeId) +
               '" data-iid="' + esc(isletmeId) + '" data-role="' + esc(role) + '">';
    html += '<div class="fb-criteria">';
    criteria.forEach(function (c) {
      html += '<div class="fb-criterion"><span class="fb-crit-label">' + esc(c.label) + '</span>' +
        renderStarInput(c.key, ratings[c.key] || 0) + '</div>';
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
    var criteria = (opts.role === 'isletme' || fb.rol === 'isletme' || fb.rol === 'firma')
      ? EMPLOYER_CRITERIA : COURIER_CRITERIA;
    var html = '<div class="fb-card">';
    html += '<div class="fb-card-hdr"><div class="fb-card-avg">' + renderStarDisplay(fb.avg) + '</div>';
    html += '<div class="fb-card-meta"><span class="fb-card-date">' + esc(formatDate(fb.submittedAt)) + '</span>';
    html += '</div></div><div class="fb-card-criteria">';
    criteria.forEach(function (c) {
      var val = fb.ratings[c.key] || 0;
      html += '<div class="fb-crit-row"><span class="fb-crit-name">' + esc(c.label) + '</span>' +
        '<div class="fb-crit-bar"><div class="fb-crit-fill" style="width:' + (val / 5 * 100) + '%"></div></div>' +
        '<span class="fb-crit-val">' + val + '</span></div>';
    });
    html += '</div>';
    if (fb.text) html += '<p class="fb-card-text">"' + esc(fb.text) + '"</p>';
    if (fb.reported) {
      var sLabels = { pending: '⏳ İnceleniyor', resolved: '✅ Çözüldü', dismissed: '❌ Reddedildi' };
      html += '<p class="fb-reported-notice">' + esc(sLabels[fb.reportStatus] || '⚠️ Şikayet edildi') + '</p>';
    }
    html += '<div class="fb-card-actions">';
    if (opts.canEdit && isEditable(fb)) html += '<button class="btn btn--ghost btn--sm" data-fb-action="edit">Düzenle</button>';
    if (opts.canReport && !fb.reported)  html += '<button class="btn btn--ghost btn--sm" data-fb-action="report" style="color:var(--error)">Şikayet Et</button>';
    return html + '</div></div>';
  }

  /* Senkron: önbellekten okur. Önce loadReputation(profileId) çağrılmalı;
     çağrılmadıysa boş durum basılır — uydurma sayı ÜRETİLMEZ. */
  function renderReputationBlock(profileId) {
    var rep = getReputation(profileId);
    if (!rep) return '<p class="fb-empty">Henüz değerlendirme yok.</p>';

    var html = '<div class="fb-rep-block">';
    html += '<div class="fb-rep-score"><div class="fb-rep-big">' + rep.avgScore.toFixed(1) + '</div>';
    html += '<div class="fb-rep-stars">' + renderStarDisplay(rep.avgScore) + '</div>';
    html += '<div class="fb-rep-count">' + rep.totalCount + ' değerlendirme</div></div>';

    if (rep.badges && rep.badges.length) {
      html += '<div class="fb-badges">';
      rep.badges.forEach(function (b) { html += '<span class="fb-badge">' + esc(b.label) + '</span>'; });
      html += '</div>';
    }
    if (rep.recentFeedbacks && rep.recentFeedbacks.length) {
      html += '<div class="fb-recent"><div class="fb-recent-title">Son Yorumlar</div>';
      rep.recentFeedbacks.forEach(function (fb) {
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

  /* Etkinlik günlüğü ayrı tabloda tutulmuyor; değerlendirme kaydının
     kendi zaman damgalarından türetilir — uydurma kayıt üretilmez.
     (hiring.js'teki getLog ile aynı yaklaşım.) */
  function renderLog(jobId, kuryeId, role) {
    var fb = getFeedback(jobId, kuryeId, role || 'isletme');
    if (!fb) return '<p class="fb-empty">Henüz kayıt yok.</p>';

    var items = [{ text: 'Değerlendirme gönderildi', at: fb.submittedAt }];
    if (fb.reported) {
      var L = { pending: 'Şikayet edildi', resolved: 'Şikayet çözüldü', dismissed: 'Şikayet reddedildi' };
      items.push({ text: L[fb.reportStatus] || 'Şikayet edildi', at: null });
    }
    var html = '<div class="fb-log">';
    items.reverse().forEach(function (item) {
      html += '<div class="fb-log-item"><div class="fb-log-dot"></div><div class="flex-1">';
      html += '<span class="fb-log-text">' + esc(item.text) + '</span>';
      if (item.at) html += '<div class="fb-log-time">' + esc(formatDate(item.at)) + '</div>';
      html += '</div></div>';
    });
    return html + '</div>';
  }

  /* mesaj-detay.html kenar çubuğu için mini kart */
  function renderMiniCard(jobId, kuryeId, isletmeId, role) {
    if (!canSubmit(jobId, kuryeId)) return '';
    var isBiz = (role === 'isletme' || role === 'firma');
    var myFbRole = isBiz ? 'isletme' : 'kurye';
    var fb = getFeedback(jobId, kuryeId, myFbRole);
    var url = 'geri-bildirim.html?job=' + encodeURIComponent(jobId) +
              '&kid=' + encodeURIComponent(kuryeId) +
              '&iid=' + encodeURIComponent(isletmeId);
    var html = '<div class="mdt-card fb-mini-wrap">';
    html += '<div class="mdt-card-hdr"><span class="mdt-card-title">⭐ Geri Bildirim</span>';
    if (fb) html += '<span style="font-size:0.72rem;color:var(--success);">✓ Gönderildi</span>';
    html += '</div>';
    if (fb) {
      html += '<div style="margin:8px 0 4px">' + renderStarDisplay(fb.avg) + '</div>';
      if (fb.text) html += '<p style="font-size:0.78rem;color:var(--text-2);font-style:italic;margin:4px 0;">"' +
        esc(fb.text.slice(0, 80)) + (fb.text.length > 80 ? '…' : '') + '"</p>';
      html += '<a href="' + esc(url) + '" class="btn btn--ghost btn--sm" style="margin-top:8px;width:100%;justify-content:center;">Düzenle →</a>';
    } else {
      html += '<p style="font-size:0.78rem;color:var(--text-3);margin:6px 0 10px;">İşe alım tamamlandı. Değerlendirmenizi paylaşın.</p>';
      html += '<a href="' + esc(url) + '" class="btn btn--primary btn--sm" style="width:100%;justify-content:center;">Değerlendirme Ver →</a>';
    }
    return html + '</div>';
  }

  window.KBFeedback = {
    EMPLOYER_CRITERIA:     EMPLOYER_CRITERIA,
    COURIER_CRITERIA:      COURIER_CRITERIA,
    COURIER_BADGES:        COURIER_BADGES,

    /* async — sayfa açılışında çağrılmalı */
    load:                  load,
    loadReputation:        loadReputation,

    /* senkron okuma (önbellekten) */
    canSubmit:             canSubmit,
    getFeedback:           getFeedback,
    getFeedbackAbout:      getFeedbackAbout,
    getReputation:         getReputation,
    myProfileId:           myProfileId,
    getPendingFeedbacks:   getPendingFeedbacks,
    isEditable:            isEditable,

    /* async yazma — Promise döner */
    submitFeedback:        submitFeedback,
    reportFeedback:        reportFeedback,

    /* render */
    renderForm:            renderForm,
    renderCard:            renderCard,
    renderReputationBlock: renderReputationBlock,
    renderMiniCard:        renderMiniCard,
    renderLog:             renderLog,
    renderStarDisplay:     renderStarDisplay
  };
})();
