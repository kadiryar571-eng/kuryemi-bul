/* KBChat — Başvuru temelli sohbet motoru (Supabase destekli)
   ============================================================
   Her görüşme şuna bağlıdır: ilan + başvuran + işveren + başvuru durumu.

   ÖNEMLİ — 2026-08 taşıması:
   Bu modül eskiden TAMAMEN localStorage üzerinde çalışıyordu
   (kb_threads_*, kb_chat_*). Başvuru yapıldığında schema.sql'deki
   on_new_application() trigger'ı konuşmayı `conversations` +
   `conv_messages` tablolarına yazdığı için, mesajlar.html ve
   mesaj-detay.html hiçbir zaman gerçek veriyi göremiyordu:
   bildirim düşüyor ama görüşme listesi boş kalıyordu.

   Artık tek veri kaynağı Supabase'dir. localStorage yalnız
   çevrimdışı okuma için pasif bir önbellek olarak kullanılır.

   API SÖZLEŞMESİ KORUNDU: getThreads/getMsgs/getStats gibi
   fonksiyonlar hâlâ SENKRON çalışır ve bellek içi önbellekten
   okur. Sayfalar açılırken bir kez `await KBChat.load(uid, role)`
   çağırmalıdır; gerisi eskisi gibi çalışır.
   ============================================================ */
(function () {
  'use strict';

  /* ─── Çevrimdışı önbellek anahtarları ───────────────────────── */
  var S = {
    threads: function (uid) { return 'kb_threads_' + uid; },
    msgs:    function (tid) { return 'kb_chat_' + tid; },
    log:     function (tid) { return 'kb_chat_log_' + tid; }
  };

  /* ─── Bellek içi önbellek ───────────────────────────────────── */
  var _cache = {
    uid:      null,
    role:     'kurye',      // oturumdaki kullanıcının bu görüşmelerdeki rolü
    threads:  [],
    msgs:     {},           // { conversationId: [msg, ...] }
    loaded:   false
  };

  /* ─── Durum tanımları ───────────────────────────────────────── */
  var STATUS_DEFS = {
    yeni:       { lbl: 'Yeni',        cls: 'msg-badge--yeni',        ico: '🆕' },
    aktif:      { lbl: 'Aktif',       cls: 'msg-badge--aktif',       ico: '💬' },
    gorusme:    { lbl: 'Görüşme',     cls: 'msg-badge--gorusme',     ico: '📅' },
    sonuclandi: { lbl: 'Sonuçlandı',  cls: 'msg-badge--sonuclandi',  ico: '✅' }
  };

  var APP_STATUS = {
    beklemede:   'Beklemede',
    inceleniyor: 'İnceleniyor',
    mulakat:     'Mülakata Çağrıldı',
    kabul:       'Kabul Edildi',
    red:         'Reddedildi'
  };

  var QUICK_REPLIES_KURYE = [
    'Merhaba, ilgileniyorum.',
    'Görüşme için uygunum.',
    'Ek bilgi paylaşabilirim.',
    'Teşekkür ederim.',
    'Ne zaman başlayabilirim?',
    'Ücret hakkında bilgi alabilir miyim?'
  ];

  var QUICK_REPLIES_ISLETME = [
    'Merhaba, başvurunuzu aldık.',
    'Mülakata davet etmek istiyoruz.',
    'Profilinizi inceledik.',
    'Ek belgelerinizi paylaşır mısınız?',
    'Yarın sizi arayacağız.',
    'Teşekkür ederiz.'
  ];

  var BIZ_ACTIONS = {
    mulakat: {
      lbl: 'Mülakata Çağır', ico: '📅',
      appStatus: 'mulakat', chatStatus: 'gorusme',
      dbDurum: null,   // başvuru durumu değişmez, yalnız görüşme açılır
      systemMsg: 'Mülakata davet edildiniz. Esnaf sizinle görüşmek istiyor.',
      logEvent: 'interview_invite', notifType: 'interview_request'
    },
    kabul: {
      lbl: 'Kabul Et', ico: '✅',
      appStatus: 'kabul', chatStatus: 'sonuclandi',
      dbDurum: 'accepted',
      systemMsg: 'Başvurunuz kabul edildi. Tebrikler!',
      logEvent: 'accepted', notifType: 'application_accepted'
    },
    red: {
      lbl: 'Reddet', ico: '❌',
      appStatus: 'red', chatStatus: 'sonuclandi',
      dbDurum: 'rejected',
      systemMsg: 'Başvurunuz bu ilan için olumsuz sonuçlandı.',
      logEvent: 'rejected', notifType: 'application_rejected'
    }
  };

  /* ─── Yardımcılar ───────────────────────────────────────────── */
  function SBon() { return !!(window.SB && SB.isOn && SB.isOn()); }

  /* Önbellek dışarıdan görünür şekilde değiştiğinde sayfaların kendini
     tazelemesi için. Kayıt defteri kurmak yerine DOM olayı kullanıyoruz:
     dinlemek isteyen sayfa `document.addEventListener('kb-chat-change', …)`
     der, ilgilenmeyen hiçbir şey yapmaz. */
  function _emitChange() {
    try { document.dispatchEvent(new CustomEvent('kb-chat-change')); } catch (e) {}
  }

  function preview(text) {
    var s = String(text == null ? '' : text);
    return s.length > 65 ? s.slice(0, 65) + '…' : s;
  }

  /* conv_messages satırını eski mesaj şekline çevirir */
  function mapMsg(m, kuryeUser) {
    var from = 'system';
    if (m.sender_user) from = (m.sender_user === kuryeUser) ? 'kurye' : 'isletme';
    return {
      id:       m.id,
      threadId: m.conversation_id,
      from:     from,
      type:     m.message_type === 'text' ? 'text' : m.message_type,
      content:  m.content,
      metadata: m.metadata || {},
      ts:       m.created_at,
      read:     !!m.read_at
    };
  }

  /* conversations satırını eski thread şekline çevirir */
  function mapThread(c, myUid, extras) {
    var iAmKurye = c.kurye_user === myUid;
    var kuryeP    = c.kurye    || {};
    var employerP = c.employer || {};
    var L         = c.listing  || {};

    var app       = (extras && extras.app)       || null;
    var interview = (extras && extras.interview) || null;
    var decision  = (extras && extras.decision)  || null;

    // Başvuru durumu → eski appStatus sözlüğü
    var appStatus = 'inceleniyor';
    if (app && app.durum === 'accepted')      appStatus = 'kabul';
    else if (app && app.durum === 'rejected') appStatus = 'red';
    else if (interview)                       appStatus = 'mulakat';

    // Sohbet durumu — filtre çubuğu bunu kullanır
    var chatStatus;
    if (decision && ['kabul', 'reddedildi', 'tamamlandi'].indexOf(decision.status) !== -1) chatStatus = 'sonuclandi';
    else if (app && app.durum !== 'pending') chatStatus = 'sonuclandi';
    else if (interview)                      chatStatus = 'gorusme';
    else if (c._hasUserMsg)                  chatStatus = 'aktif';
    else                                     chatStatus = 'yeni';

    return {
      id:            c.id,
      applicationId: c.application_id,
      jobId:         c.listing_id,
      jobTitle:      L.baslik || 'İlan',
      jobSehir:      [L.sehir, L.bolge].filter(Boolean).join(' · '),
      kuryeId:       c.kurye_id,
      kurye:         { id: c.kurye_id,    ad: kuryeP.ad    || 'Kurye', avatar: kuryeP.avatar_url    || '' },
      isletmeId:     c.employer_id,
      isletme:       { id: c.employer_id, ad: employerP.ad || 'Esnaf', avatar: employerP.avatar_url || '' },
      appStatus:     appStatus,
      chatStatus:    chatStatus,
      lastMsg:       preview(c.last_message || ''),
      lastMsgTime:   c.last_message_at || c.created_at,
      unread:        { kurye: c.kurye_unread || 0, isletme: c.employer_unread || 0 },
      archived:      c.status === 'archived',
      createdAt:     c.created_at,
      /* oturumdaki kullanıcının bu görüşmedeki rolü — UI taraf ayrımı için */
      myRole:        iAmKurye ? 'kurye' : 'isletme',
      _kuryeUser:    c.kurye_user,
      _employerUser: c.employer_user
    };
  }

  /* ─── YÜKLEME (tek async giriş noktası) ─────────────────────── */
  async function load(uid, role) {
    _cache.uid  = uid || _cache.uid;
    _cache.role = role || _cache.role;

    if (!SBon()) {
      // Çevrimdışı: son bilinen önbelleği kullan
      try { _cache.threads = JSON.parse(localStorage.getItem(S.threads(_cache.uid)) || '[]'); }
      catch (e) { _cache.threads = []; }
      _cache.loaded = true;
      return _cache.threads;
    }

    try {
      var u = await SB.getUser();
      if (!u) { _cache.threads = []; _cache.loaded = true; return []; }
      _cache.uid = u.id;

      var raw = await SB.rawConversations();
      if (!raw || !raw.length) { _cache.threads = []; _cache.loaded = true; _persist(); return []; }

      var convIds = raw.map(function (c) { return c.id; });
      var appIds  = raw.map(function (c) { return c.application_id; }).filter(Boolean);

      var bundle = await SB.convBundle(convIds, appIds);
      var msgsByConv = bundle.messages   || {};
      var appsById   = bundle.apps       || {};
      var ivByApp    = bundle.interviews || {};
      var decByApp   = bundle.decisions  || {};

      _cache.msgs = {};
      _cache.threads = raw.map(function (c) {
        var list = msgsByConv[c.id] || [];
        c._hasUserMsg = list.some(function (m) { return m.sender_user && m.message_type === 'text'; });
        _cache.msgs[c.id] = list.map(function (m) { return mapMsg(m, c.kurye_user); });
        var iv  = ivByApp[c.application_id];
        var dec = decByApp[c.application_id];
        var t = mapThread(c, u.id, {
          app:       appsById[c.application_id],
          interview: iv,
          decision:  dec
        });
        // getInterview()/getDecision() bunları okur — doldurulmazsa
        // gorusmeler.html ve karar.html hep boş görürdü.
        t._interview = iv  || null;
        t._decision  = dec || null;
        return t;
      });

      _cache.loaded = true;
      _persist();
      return _cache.threads;
    } catch (e) {
      console.warn('KBChat.load:', e);
      _cache.loaded = true;
      return _cache.threads;
    }
  }

  /* ─── OTOMATİK YÜKLEME ──────────────────────────────────────
     chat.js'i 9 sayfa kullanıyor (mesajlar, mesaj-detay, basvurular,
     gorusmeler, karar, geri-bildirim, panel-*). Her birinde ayrı ayrı
     load() çağırmak yerine modül kendini yükler ve `KBChat.ready`
     sözünü açığa çıkarır. Sayfalar render'dan önce şunu beklemeli:
         await KBChat.ready;
     Beklemezlerse getThreads() çevrimdışı önbelleğe düşer (boş olabilir).
     ------------------------------------------------------------------ */
  var _readyPromise = null;
  function ensureLoaded() {
    if (!_readyPromise) {
      _readyPromise = (window.KB && KB.ready)
        ? KB.ready().then(function () { return load(); }).catch(function () { return load(); })
        : load();
    }
    return _readyPromise;
  }
  // Script yüklenir yüklenmez başlat — sayfalar beklerken iş zaten dönüyor olur.
  try { ensureLoaded(); } catch (e) {}

  /* Çevrimdışı okuma için pasif önbellek */
  function _persist() {
    try {
      localStorage.setItem(S.threads(_cache.uid), JSON.stringify(_cache.threads));
      Object.keys(_cache.msgs).forEach(function (tid) {
        localStorage.setItem(S.msgs(tid), JSON.stringify(_cache.msgs[tid]));
      });
    } catch (e) {}
  }

  /* ─── Okuma (SENKRON — önbellekten) ─────────────────────────── */
  function getThreads(uid) {
    if (_cache.loaded) return _cache.threads.slice();
    try { return JSON.parse(localStorage.getItem(S.threads(uid)) || '[]'); } catch (e) { return []; }
  }
  function getMsgs(tid) {
    if (_cache.msgs[tid]) return _cache.msgs[tid].slice();
    try { return JSON.parse(localStorage.getItem(S.msgs(tid)) || '[]'); } catch (e) { return []; }
  }
  function findThread(uid, jobId, kuryeId) {
    return getThreads(uid).find(function (t) {
      return String(t.jobId) === String(jobId) && String(t.kuryeId) === String(kuryeId);
    }) || null;
  }

  /* Denetim kaydı — yalnız yerel, bilgilendirme amaçlı */
  function getLog(tid) {
    try { return JSON.parse(localStorage.getItem(S.log(tid)) || '[]'); } catch (e) { return []; }
  }
  function appendLog(tid, event, detail) {
    var log = getLog(tid);
    log.push({ event: event, detail: detail || '', ts: new Date().toISOString() });
    try { localStorage.setItem(S.log(tid), JSON.stringify(log)); } catch (e) {}
  }

  /* ─── Yazma ─────────────────────────────────────────────────── */
  // Görüşmeler artık başvuru trigger'ı ile açılır; istemci oluşturamaz.
  function ensureThread(uid, jobId, kuryeId, meta) {
    return findThread(uid, jobId, kuryeId);
  }

  function updateThread(uid, tid, patch) {
    var idx = _cache.threads.findIndex(function (t) { return t.id === tid; });
    if (idx === -1) return null;
    _cache.threads[idx] = Object.assign({}, _cache.threads[idx], patch);
    _persist();
    return _cache.threads[idx];
  }

  /* Mesaj gönder — önbelleği hemen günceller (iyimser), DB'ye arka planda yazar */
  function sendMessage(uid, threadId, from, type, content) {
    var msg = {
      id:       'tmp_' + Date.now(),
      threadId: threadId,
      from:     from,
      type:     type || 'text',
      content:  content,
      ts:       new Date().toISOString(),
      read:     false
    };

    if (!_cache.msgs[threadId]) _cache.msgs[threadId] = [];
    _cache.msgs[threadId].push(msg);

    var t = _cache.threads.find(function (x) { return x.id === threadId; });
    if (t) {
      updateThread(uid, threadId, {
        lastMsg:     preview(content),
        lastMsgTime: msg.ts,
        chatStatus:  (t.chatStatus === 'yeni' && from !== 'system') ? 'aktif' : t.chatStatus
      });
    }

    // Sistem mesajlarını istemci yazamaz (RLS: sender_user = auth.uid()).
    if (SBon() && from !== 'system') {
      SB.sendConvMessage(threadId, content, type === 'text' ? 'text' : type)
        .then(function (row) { if (row && row.id) msg.id = row.id; })
        .catch(function (e) {
          /* GÖNDERİM BAŞARISIZ — kullanıcıya SÖYLENİR.
             Burada hata yalnız console.warn ile yutuluyordu. Mesaj
             iyimser olarak ekrana basıldığı için gönderen kendi
             balonunu görüyor ve iletildiğini sanıyordu; oysa karşı
             tarafa hiç ulaşmıyor, sayfa yenilenince de kayboluyordu.
             Mesajlaşma çekirdek bir akış — sessiz kayıp kabul edilemez. */
          console.warn('KBChat.sendMessage:', e);
          msg.failed = true;
          if (window.KBMotion && KBMotion.showErrorToast) {
            KBMotion.showErrorToast('Mesaj gönderilemedi — bağlantını kontrol et.');
          }
          /* Balonun "gönderilemedi" işaretini alması için ekranı tazele */
          try { _emitChange(); } catch (e2) {}
        });
    }
    return msg;
  }

  function markRead(uid, threadId, role) {
    var t = _cache.threads.find(function (x) { return x.id === threadId; });
    if (t) {
      var unread = Object.assign({ kurye: 0, isletme: 0 }, t.unread);
      unread[role] = 0;
      updateThread(uid, threadId, { unread: unread });
    }
    (_cache.msgs[threadId] || []).forEach(function (m) { if (m.from !== role) m.read = true; });
    if (SBon()) SB.markConvRead(threadId).catch(function () {});
  }

  /* ─── İş akışı eylemleri ────────────────────────────────────── */
  function doBusinessAction(uid, threadId, actionKey) {
    var action = BIZ_ACTIONS[actionKey];
    if (!action) return false;
    var t = _cache.threads.find(function (x) { return x.id === threadId; });
    if (!t) return false;

    updateThread(uid, threadId, { appStatus: action.appStatus, chatStatus: action.chatStatus });
    appendLog(threadId, action.logEvent, action.lbl);

    if (SBon()) {
      // Başvuru durumunu güncelle (yalnız ilan sahibi yapabilir — RLS korur)
      if (action.dbDurum && t.applicationId) {
        SB.setApplicationStatus(t.applicationId, action.dbDurum)
          .catch(function (e) { console.warn('doBusinessAction durum:', e); });
      }
      // Bilgilendirme mesajını kullanıcı adına gönder (sistem mesajı RLS'e takılır)
      SB.sendConvMessage(threadId, action.systemMsg, 'text')
        .catch(function (e) { console.warn('doBusinessAction mesaj:', e); });
    }
    return true;
  }

  /* ─── Arşiv ─────────────────────────────────────────────────── */
  function archiveThread(uid, threadId) {
    updateThread(uid, threadId, { archived: true });
    appendLog(threadId, 'archived', '');
    if (SBon()) SB.setConvStatus(threadId, 'archived').catch(function () {});
  }
  function unarchiveThread(uid, threadId) {
    updateThread(uid, threadId, { archived: false });
    appendLog(threadId, 'unarchived', '');
    if (SBon()) SB.setConvStatus(threadId, 'active').catch(function () {});
  }

  /* ─── Görüşme / karar (DB) ──────────────────────────────────── */
  function getInterview(threadId) {
    var t = _cache.threads.find(function (x) { return x.id === threadId; });
    return (t && t._interview) || null;
  }
  async function saveInterview(threadId, data) {
    var t = _cache.threads.find(function (x) { return x.id === threadId; });
    if (!t || !SBon()) return null;
    var row = await SB.upsertInterview(Object.assign({
      application_id: t.applicationId, listing_id: t.jobId,
      interviewer_id: t.isletmeId,     interviewee_id: t.kuryeId
    }, data));
    if (row) { t._interview = row; updateThread(_cache.uid, threadId, { chatStatus: 'gorusme' }); }
    return row;
  }
  function getDecision(threadId) {
    var t = _cache.threads.find(function (x) { return x.id === threadId; });
    return (t && t._decision) || null;
  }
  async function saveDecision(threadId, data) {
    var t = _cache.threads.find(function (x) { return x.id === threadId; });
    if (!t || !SBon()) return null;
    var row = await SB.upsertDecision(Object.assign({
      application_id: t.applicationId, listing_id: t.jobId,
      employer_id:    t.isletmeId,     applicant_id: t.kuryeId
    }, data));
    if (row) t._decision = row;
    return row;
  }

  /* ─── Bildirim ──────────────────────────────────────────────── */
  function notify() { /* bildirimler artık DB trigger'ları ile üretiliyor */ }

  /* ─── İstatistik ────────────────────────────────────────────── */
  function getStats(uid) {
    var all = getThreads(uid);
    var live = all.filter(function (t) { return !t.archived; });
    return {
      total:       live.length,
      active:      live.filter(function (t) { return t.chatStatus === 'aktif'; }).length,
      gorusme:     live.filter(function (t) { return t.chatStatus === 'gorusme'; }).length,
      totalUnread: live.reduce(function (acc, t) {
        return acc + ((t.unread && t.unread[t.myRole]) || 0);
      }, 0),
      archived:    all.filter(function (t) { return t.archived; }).length
    };
  }

  function getUnreadCount(uid, role) {
    return getThreads(uid).reduce(function (acc, t) {
      if (t.archived) return acc;
      return acc + ((t.unread && t.unread[role || t.myRole]) || 0);
    }, 0);
  }

  /* ─── Rozet ─────────────────────────────────────────────────── */
  /* DİKKAT: bu bir DOM fonksiyonu DEĞİL — HTML string döndürür.
     mesajlar.html renderDetail() içinde doğrudan innerHTML'e
     birleştiriyor: KBChat.renderBadge(thread.chatStatus). */
  function renderBadge(status) {
    var def = STATUS_DEFS[status] || STATUS_DEFS.yeni;
    return '<span class="msg-badge ' + def.cls + '">' + def.ico + ' ' + def.lbl + '</span>';
  }

  window.KBChat = {
    /* yükleme — sayfalar render'dan önce `await KBChat.ready` demeli */
    get ready()     { return ensureLoaded(); },
    load:             function (uid, role) { _readyPromise = load(uid, role); return _readyPromise; },
    reload:           function () { _readyPromise = load(); return _readyPromise; },
    isLoaded:         function () { return _cache.loaded; },
    /* veri */
    getThreads:       getThreads,
    saveThreads:      function () { _persist(); },
    getMsgs:          getMsgs,
    getLog:           getLog,
    appendLog:        appendLog,
    /* görüşmeler */
    findThread:       findThread,
    ensureThread:     ensureThread,
    updateThread:     updateThread,
    /* mesajlaşma */
    sendMessage:      sendMessage,
    markRead:         markRead,
    /* eylemler */
    doBusinessAction: doBusinessAction,
    /* arşiv */
    archiveThread:    archiveThread,
    unarchiveThread:  unarchiveThread,
    /* bildirim */
    notify:           notify,
    /* istatistik */
    getStats:         getStats,
    getUnreadCount:   getUnreadCount,
    /* render */
    renderBadge:      renderBadge,
    /* görüşme + karar */
    getInterview:     getInterview,
    saveInterview:    saveInterview,
    getDecision:      getDecision,
    saveDecision:     saveDecision,
    /* sabitler */
    STATUS_DEFS:           STATUS_DEFS,
    QUICK_REPLIES_KURYE:   QUICK_REPLIES_KURYE,
    QUICK_REPLIES_ISLETME: QUICK_REPLIES_ISLETME,
    BIZ_ACTIONS:           BIZ_ACTIONS,
    APP_STATUS:            APP_STATUS
  };

})();
