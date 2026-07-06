/* KBChat — Application-Based Chat Engine
   Every thread is tied to: job + applicant + employer + application status */
(function () {
  'use strict';

  /* ─── Storage keys ─────────────────────────────────────────── */
  var S = {
    threads: function (uid) { return 'kb_threads_' + uid; },
    msgs:    function (tid) { return 'kb_chat_' + tid; },
    log:     function (tid) { return 'kb_chat_log_' + tid; }
  };

  /* ─── Status definitions ────────────────────────────────────── */
  var STATUS_DEFS = {
    yeni:       { lbl: 'Yeni',        cls: 'msg-badge--yeni',        ico: '🆕' },
    aktif:      { lbl: 'Aktif',       cls: 'msg-badge--aktif',       ico: '💬' },
    gorusme:    { lbl: 'Görüşme',     cls: 'msg-badge--gorusme',     ico: '📅' },
    sonuclandi: { lbl: 'Sonuçlandı',  cls: 'msg-badge--sonuclandi',  ico: '✅' }
  };

  /* ─── Application status labels ────────────────────────────── */
  var APP_STATUS = {
    beklemede:   'Beklemede',
    inceleniyor: 'İnceleniyor',
    mulakat:     'Mülakata Çağrıldı',
    kabul:       'Kabul Edildi',
    red:         'Reddedildi'
  };

  /* ─── Quick replies ─────────────────────────────────────────── */
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

  /* ─── Business action definitions ──────────────────────────── */
  var BIZ_ACTIONS = {
    mulakat: {
      lbl:       'Mülakata Çağır',
      ico:       '📅',
      appStatus: 'mulakat',
      chatStatus:'gorusme',
      systemMsg: 'Mülakata davet edildiniz. Esnaf sizinle görüşmek istiyor.',
      logEvent:  'interview_invite',
      notifType: 'interview_request'
    },
    kabul: {
      lbl:       'Kabul Et',
      ico:       '✅',
      appStatus: 'kabul',
      chatStatus:'sonuclandi',
      systemMsg: 'Tebrikler! Başvurunuz kabul edildi.',
      logEvent:  'hired',
      notifType: 'hiring_decision'
    },
    red: {
      lbl:       'Reddet',
      ico:       '❌',
      appStatus: 'red',
      chatStatus:'sonuclandi',
      systemMsg: 'Başvurunuz değerlendirildi, bu sefer uygun görülmedi. Başarılar dileriz.',
      logEvent:  'rejected',
      notifType: 'hiring_decision'
    }
  };

  /* ─── Storage helpers ───────────────────────────────────────── */
  function getThreads(uid) {
    try { return JSON.parse(localStorage.getItem(S.threads(uid)) || '[]'); } catch (e) { return []; }
  }
  function saveThreads(uid, threads) {
    localStorage.setItem(S.threads(uid), JSON.stringify(threads));
  }
  function getMsgs(tid) {
    try { return JSON.parse(localStorage.getItem(S.msgs(tid)) || '[]'); } catch (e) { return []; }
  }
  function saveMsgs(tid, msgs) {
    localStorage.setItem(S.msgs(tid), JSON.stringify(msgs));
  }
  function getLog(tid) {
    try { return JSON.parse(localStorage.getItem(S.log(tid)) || '[]'); } catch (e) { return []; }
  }
  function appendLog(tid, event, detail) {
    var log = getLog(tid);
    log.push({ event: event, detail: detail || '', ts: new Date().toISOString() });
    localStorage.setItem(S.log(tid), JSON.stringify(log));
  }

  /* ─── Thread CRUD ───────────────────────────────────────────── */
  function makeId(jobId, kuryeId) {
    return 'thread_' + String(jobId) + '_' + String(kuryeId);
  }

  function findThread(uid, jobId, kuryeId) {
    var tid = makeId(jobId, kuryeId);
    return getThreads(uid).find(function (t) { return t.id === tid; }) || null;
  }

  function ensureThread(uid, jobId, kuryeId, meta) {
    var existing = findThread(uid, jobId, kuryeId);
    if (existing) return existing;

    var thread = {
      id:          makeId(jobId, kuryeId),
      jobId:       jobId,
      jobTitle:    meta.jobTitle    || 'İlan',
      kuryeId:     kuryeId,
      kurye:       meta.kurye      || { id: kuryeId, ad: 'Kurye', avatar: '' },
      isletmeId:   meta.isletmeId  || '',
      isletme:     meta.isletme    || { id: meta.isletmeId, ad: 'Esnaf', avatar: '' },
      appStatus:   meta.appStatus  || 'inceleniyor',
      chatStatus:  'yeni',
      lastMsg:     '',
      lastMsgTime: new Date().toISOString(),
      unread:      { kurye: 0, isletme: 0 },
      archived:    false,
      createdAt:   meta.createdAt  || new Date().toISOString()
    };

    var threads = getThreads(uid);
    threads.unshift(thread);
    saveThreads(uid, threads);
    appendLog(thread.id, 'thread_created', 'Görüşme başlatıldı');
    return thread;
  }

  function updateThread(uid, tid, patch) {
    var threads = getThreads(uid);
    var idx = threads.findIndex(function (t) { return t.id === tid; });
    if (idx === -1) return null;
    threads[idx] = Object.assign({}, threads[idx], patch);
    saveThreads(uid, threads);
    return threads[idx];
  }

  /* ─── Messaging ─────────────────────────────────────────────── */
  function sendMessage(uid, threadId, from, type, content) {
    var msg = {
      id:       'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      threadId: threadId,
      from:     from,
      type:     type || 'text',
      content:  content,
      ts:       new Date().toISOString(),
      read:     false
    };

    var msgs = getMsgs(threadId);
    msgs.push(msg);
    saveMsgs(threadId, msgs);

    /* update thread metadata */
    var threads = getThreads(uid);
    var thread  = threads.find(function (t) { return t.id === threadId; });
    if (thread) {
      var unread = Object.assign({ kurye: 0, isletme: 0 }, thread.unread);
      if (from === 'kurye')   unread.isletme = (unread.isletme || 0) + 1;
      else if (from !== 'system') unread.kurye = (unread.kurye || 0) + 1;

      var newChatStatus = (thread.chatStatus === 'yeni' && from !== 'system')
        ? 'aktif' : thread.chatStatus;
      var preview = String(content);
      if (preview.length > 65) preview = preview.slice(0, 65) + '…';

      updateThread(uid, threadId, {
        lastMsg:     preview,
        lastMsgTime: msg.ts,
        unread:      unread,
        chatStatus:  newChatStatus
      });
    }

    return msg;
  }

  function markRead(uid, threadId, role) {
    var threads = getThreads(uid);
    var thread  = threads.find(function (t) { return t.id === threadId; });
    if (!thread) return;
    var unread = Object.assign({ kurye: 0, isletme: 0 }, thread.unread);
    unread[role] = 0;
    updateThread(uid, threadId, { unread: unread });

    var msgs = getMsgs(threadId);
    msgs.forEach(function (m) { if (m.from !== role) m.read = true; });
    saveMsgs(threadId, msgs);
  }

  /* ─── Business actions ──────────────────────────────────────── */
  function doBusinessAction(uid, threadId, actionKey) {
    var action = BIZ_ACTIONS[actionKey];
    if (!action) return false;

    var threads = getThreads(uid);
    var thread  = threads.find(function (t) { return t.id === threadId; });
    if (!thread) return false;

    updateThread(uid, threadId, {
      appStatus:  action.appStatus,
      chatStatus: action.chatStatus
    });

    sendMessage(uid, threadId, 'system', 'system', action.systemMsg);
    appendLog(threadId, action.logEvent, action.lbl);

    /* sync to kb_apps_{jobId} */
    try {
      var appKey = 'kb_apps_' + thread.jobId;
      var apps   = JSON.parse(localStorage.getItem(appKey) || '{}');
      if (apps[thread.kuryeId]) {
        apps[thread.kuryeId].status    = action.appStatus;
        apps[thread.kuryeId].updatedAt = new Date().toISOString();
        localStorage.setItem(appKey, JSON.stringify(apps));
      }
    } catch (e) {}

    /* notify kurye */
    notify(thread.kuryeId, action.notifType, {
      isletme:   thread.isletme.ad,
      job:       thread.jobTitle,
      actionKey: actionKey
    });

    return true;
  }

  /* ─── Archive ───────────────────────────────────────────────── */
  function archiveThread(uid, threadId) {
    updateThread(uid, threadId, { archived: true });
    appendLog(threadId, 'archived', '');
  }
  function unarchiveThread(uid, threadId) {
    updateThread(uid, threadId, { archived: false });
    appendLog(threadId, 'unarchived', '');
  }

  /* ─── Notifications ─────────────────────────────────────────── */
  function notify(toUid, type, data) {
    try {
      var key   = 'kb_notifications_' + toUid;
      var notifs = JSON.parse(localStorage.getItem(key) || '[]');
      var msgMap = {
        interview_request: (data.isletme || 'Esnaf') + ' sizi mülakata davet etti: ' + (data.job || ''),
        hiring_decision:   data.actionKey === 'kabul'
          ? 'Tebrikler! Başvurunuz kabul edildi — ' + (data.job || '')
          : 'Başvuru sonuçlandı: ' + (data.job || ''),
        new_message:       (data.from || 'Esnaf') + ' size mesaj gönderdi: ' + (data.job || '')
      };
      notifs.unshift({
        id:   'notif_' + Date.now(),
        type: type,
        msg:  msgMap[type] || type,
        data: data,
        read: false,
        ts:   new Date().toISOString()
      });
      localStorage.setItem(key, JSON.stringify(notifs.slice(0, 100)));
    } catch (e) {}
  }

  /* ─── Stats ─────────────────────────────────────────────────── */
  function getStats(uid) {
    var all      = getThreads(uid);
    var active   = all.filter(function (t) { return !t.archived && t.chatStatus === 'aktif'; });
    var gorusme  = all.filter(function (t) { return !t.archived && t.chatStatus === 'gorusme'; });
    var unread   = all.reduce(function (acc, t) {
      if (t.archived) return acc;
      return acc + ((t.unread && t.unread.kurye) || 0) + ((t.unread && t.unread.isletme) || 0);
    }, 0);
    return {
      total:       all.filter(function (t) { return !t.archived; }).length,
      active:      active.length,
      gorusme:     gorusme.length,
      totalUnread: unread,
      archived:    all.filter(function (t) { return t.archived; }).length
    };
  }

  function getUnreadCount(uid, role) {
    return getThreads(uid).reduce(function (acc, t) {
      if (t.archived) return acc;
      return acc + ((t.unread && t.unread[role]) || 0);
    }, 0);
  }

  /* ─── Badge render ──────────────────────────────────────────── */
  function renderBadge(status) {
    var def = STATUS_DEFS[status] || STATUS_DEFS.yeni;
    return '<span class="msg-badge ' + def.cls + '">' + def.ico + ' ' + def.lbl + '</span>';
  }

  /* ─── Demo seed ─────────────────────────────────────────────── */
  function simpleHash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
  }

  function seedDemoThreads(uid) {
    if (getThreads(uid).length > 0) return;

    var now = Date.now();
    var demo = [
      {
        id:          'thread_demo_job1_kurye1',
        jobId:       'demo_job1',
        jobTitle:    'Moto Kurye Aranıyor',
        kuryeId:     'demo_kurye1',
        kurye:       { id: 'demo_kurye1', ad: 'Ali Veli', avatar: '' },
        isletmeId:   uid,
        isletme:     { id: uid, ad: 'Terra Pizza', avatar: '' },
        appStatus:   'inceleniyor',
        chatStatus:  'aktif',
        lastMsg:     'Başvurunuzu aldık, profilinizi inceliyoruz.',
        lastMsgTime: new Date(now - 2 * 3600000).toISOString(),
        unread:      { kurye: 0, isletme: 2 },
        archived:    false,
        createdAt:   new Date(now - 2 * 86400000).toISOString()
      },
      {
        id:          'thread_demo_job1_kurye2',
        jobId:       'demo_job1',
        jobTitle:    'Moto Kurye Aranıyor',
        kuryeId:     'demo_kurye2',
        kurye:       { id: 'demo_kurye2', ad: 'Mehmet Kaya', avatar: '' },
        isletmeId:   uid,
        isletme:     { id: uid, ad: 'Terra Pizza', avatar: '' },
        appStatus:   'mulakat',
        chatStatus:  'gorusme',
        lastMsg:     'Mülakata davet edildiniz. Esnaf sizinle görüşmek istiyor.',
        lastMsgTime: new Date(now - 5 * 3600000).toISOString(),
        unread:      { kurye: 1, isletme: 0 },
        archived:    false,
        createdAt:   new Date(now - 3 * 86400000).toISOString()
      },
      {
        id:          'thread_demo_job2_kurye3',
        jobId:       'demo_job2',
        jobTitle:    'Bisiklet Kurye — Hafta Sonu',
        kuryeId:     'demo_kurye3',
        kurye:       { id: 'demo_kurye3', ad: 'Fatma Şen', avatar: '' },
        isletmeId:   uid,
        isletme:     { id: uid, ad: 'Getir Market', avatar: '' },
        appStatus:   'kabul',
        chatStatus:  'sonuclandi',
        lastMsg:     'Tebrikler! Başvurunuz kabul edildi.',
        lastMsgTime: new Date(now - 86400000).toISOString(),
        unread:      { kurye: 0, isletme: 0 },
        archived:    false,
        createdAt:   new Date(now - 5 * 86400000).toISOString()
      },
      {
        id:          'thread_demo_job3_kurye4',
        jobId:       'demo_job3',
        jobTitle:    'Araç Kurye — Tam Zamanlı',
        kuryeId:     'demo_kurye4',
        kurye:       { id: 'demo_kurye4', ad: 'Kerim Aslan', avatar: '' },
        isletmeId:   uid,
        isletme:     { id: uid, ad: 'Hızlı Kargo A.Ş.', avatar: '' },
        appStatus:   'beklemede',
        chatStatus:  'yeni',
        lastMsg:     'Merhaba, ilanınıza başvurmak istiyorum.',
        lastMsgTime: new Date(now - 30 * 60000).toISOString(),
        unread:      { kurye: 0, isletme: 1 },
        archived:    false,
        createdAt:   new Date(now - 30 * 60000).toISOString()
      }
    ];

    saveThreads(uid, demo);

    /* Seed messages for each thread */
    var seed = [
      [
        demo[0].id,
        [
          { from: 'kurye',   content: 'Merhaba, ilanınızı gördüm ve ilgileniyorum.' },
          { from: 'isletme', content: 'Merhaba Ali Bey! Profilinizi inceliyoruz.' },
          { from: 'kurye',   content: 'Teşekkür ederim. Bekliyorum.' },
          { from: 'isletme', content: 'Başvurunuzu aldık, profilinizi inceliyoruz.' }
        ],
        [now - 2 * 86400000, now - 2 * 86400000 + 3600000, now - 3 * 3600000, now - 2 * 3600000]
      ],
      [
        demo[1].id,
        [
          { from: 'kurye',   content: 'Merhaba, moto kurye ilanına başvurmak istiyorum.' },
          { from: 'isletme', content: 'Merhaba Mehmet Bey! Profiliniz çok uygun görünüyor.' },
          { from: 'isletme', content: 'Sizi mülakata davet etmek istiyoruz. Uygun musunuz?' },
          { from: 'system',  content: 'Mülakata davet edildiniz. Esnaf sizinle görüşmek istiyor.', type: 'system' }
        ],
        [now - 3 * 86400000, now - 2 * 86400000, now - 6 * 3600000, now - 5 * 3600000]
      ],
      [
        demo[2].id,
        [
          { from: 'kurye',   content: 'Merhaba, bisiklet kurye pozisyonuna başvurmak istiyorum.' },
          { from: 'isletme', content: 'Merhaba Fatma Hanım! Profiliniz çok güçlü, görüşelim.' },
          { from: 'kurye',   content: 'Teşekkürler! Görüşme için uygunum.' },
          { from: 'system',  content: 'Tebrikler! Başvurunuz kabul edildi.', type: 'system' }
        ],
        [now - 5 * 86400000, now - 3 * 86400000, now - 2 * 86400000, now - 86400000]
      ],
      [
        demo[3].id,
        [
          { from: 'kurye', content: 'Merhaba, ilanınıza başvurmak istiyorum.' }
        ],
        [now - 30 * 60000]
      ]
    ];

    seed.forEach(function (s) {
      var tid  = s[0];
      var rows = s[1];
      var times = s[2];
      var msgs = rows.map(function (r, i) {
        return {
          id:       'msg_seed_' + simpleHash(tid + i),
          threadId: tid,
          from:     r.from,
          type:     r.type || 'text',
          content:  r.content,
          ts:       new Date(times[i]).toISOString(),
          read:     true
        };
      });
      saveMsgs(tid, msgs);
    });
  }

  /* ─── Interview & decision storage ────────────────────────────── */
  function getInterview(tid) {
    try { return JSON.parse(localStorage.getItem('kb_interview_' + tid) || 'null'); } catch (e) { return null; }
  }
  function saveInterview(tid, data) {
    if (data === null) { localStorage.removeItem('kb_interview_' + tid); return; }
    localStorage.setItem('kb_interview_' + tid, JSON.stringify(data));
  }
  function getDecision(tid) {
    try { return JSON.parse(localStorage.getItem('kb_decision_' + tid) || 'null'); } catch (e) { return null; }
  }
  function saveDecision(tid, data) {
    localStorage.setItem('kb_decision_' + tid, JSON.stringify(data));
  }

  /* ─── Public API ────────────────────────────────────────────── */
  window.KBChat = {
    /* data */
    getThreads:       getThreads,
    saveThreads:      saveThreads,
    getMsgs:          getMsgs,
    getLog:           getLog,
    /* threads */
    findThread:       findThread,
    ensureThread:     ensureThread,
    updateThread:     updateThread,
    /* messaging */
    sendMessage:      sendMessage,
    markRead:         markRead,
    /* actions */
    doBusinessAction: doBusinessAction,
    /* archive */
    archiveThread:    archiveThread,
    unarchiveThread:  unarchiveThread,
    /* notify */
    notify:           notify,
    /* stats */
    getStats:         getStats,
    getUnreadCount:   getUnreadCount,
    /* render */
    renderBadge:      renderBadge,
    /* demo */
    seedDemoThreads:  seedDemoThreads,
    /* interview + decision */
    getInterview:     getInterview,
    saveInterview:    saveInterview,
    getDecision:      getDecision,
    saveDecision:     saveDecision,
    /* constants */
    QUICK_REPLIES_KURYE:   QUICK_REPLIES_KURYE,
    QUICK_REPLIES_ISLETME: QUICK_REPLIES_ISLETME,
    BIZ_ACTIONS:           BIZ_ACTIONS,
    APP_STATUS:            APP_STATUS
  };

})();
