/* ================================================================
   KuryemiBul — notifications.js
   localStorage tabanlı bildirim sistemi.
   API: window.KBNotif
   ================================================================ */
(function (global) {
  'use strict';

  var PREFIX = 'kb_notifs_';

  /* ── Tipler ─────────────────────────────────────────────── */
  var TYPES = {
    basvuru:   { ico: '📋', label: 'Başvuru' },
    gorusme:   { ico: '📅', label: 'Görüşme' },
    karar:     { ico: '⚖️', label: 'Karar' },
    teklif:    { ico: '✉️', label: 'Teklif' },
    mesaj:     { ico: '💬', label: 'Mesaj' },
    geri:      { ico: '⭐', label: 'Geri Bildirim' },
    ilan:      { ico: '📢', label: 'İlan' },
    sistem:    { ico: '⚙️', label: 'Sistem' },
  };

  /* ── Storage helpers ────────────────────────────────────── */
  function load(uid) {
    try { return JSON.parse(localStorage.getItem(PREFIX + uid) || '[]'); } catch (e) { return []; }
  }

  function save(uid, list) {
    try { localStorage.setItem(PREFIX + uid, JSON.stringify(list)); } catch (e) {}
  }

  /* ── Push ───────────────────────────────────────────────── */
  function push(uid, type, title, body, opts) {
    opts = opts || {};
    var list = load(uid);
    var notif = {
      id:         'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type:       type,
      title:      title,
      body:       body,
      link:       opts.link  || null,
      meta:       opts.meta  || null,
      read:       false,
      created_at: new Date().toISOString(),
    };
    list.unshift(notif);
    /* max 200 */
    if (list.length > 200) list = list.slice(0, 200);
    save(uid, list);
    /* Update topbar badge */
    _updateBadge(uid);
    return notif;
  }

  /* ── Read ───────────────────────────────────────────────── */
  function getAll(uid, opts) {
    opts = opts || {};
    var list = load(uid);
    if (opts.type)   list = list.filter(function (n) { return n.type === opts.type; });
    if (opts.unread) list = list.filter(function (n) { return !n.read; });
    return list;
  }

  function unreadCount(uid) {
    return load(uid).filter(function (n) { return !n.read; }).length;
  }

  function markRead(uid, id) {
    var list = load(uid);
    list.forEach(function (n) { if (!id || n.id === id) n.read = true; });
    save(uid, list);
    _updateBadge(uid);
  }

  function markAllRead(uid) { markRead(uid, null); }

  function remove(uid, id) {
    var list = load(uid).filter(function (n) { return n.id !== id; });
    save(uid, list);
  }

  function clear(uid) { save(uid, []); _updateBadge(uid); }

  /* ── Topbar badge update ────────────────────────────────── */
  function _updateBadge(uid) {
    var cnt = unreadCount(uid);
    var badge = document.getElementById('kbNotifBadge');
    if (!badge) return;
    badge.textContent  = cnt > 99 ? '99+' : cnt;
    badge.style.display = cnt > 0 ? 'inline-flex' : 'none';
  }

  /* ── Render helpers ─────────────────────────────────────── */
  function renderItem(n, opts) {
    opts = opts || {};
    var t   = TYPES[n.type] || TYPES.sistem;
    var esc = window.KB ? KB.esc : function (s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
    var date = '';
    try {
      var d = new Date(n.created_at);
      var diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60)         date = 'Az önce';
      else if (diff < 3600)  date = Math.floor(diff / 60) + ' dk önce';
      else if (diff < 86400) date = Math.floor(diff / 3600) + ' saat önce';
      else                   date = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch (e) {}

    var cls = 'notif-item' + (n.read ? '' : ' notif-item--unread') + (n.link ? ' notif-item--link' : '');
    var onclick = n.link ? ' data-href="' + esc(n.link) + '"' : '';

    return '<div class="' + cls + '" data-nid="' + esc(n.id) + '"' + onclick + '>' +
      '<div class="notif-ico">' + t.ico + '</div>' +
      '<div class="notif-body">' +
        '<div class="notif-title">' +
          '<span class="notif-type-badge">' + t.label + '</span> ' +
          (n.title ? '<strong>' + esc(n.title) + '</strong>' + (n.body ? ' — ' : '') : '') +
          esc(n.body || '') +
        '</div>' +
        '<div class="notif-time">' + date + '</div>' +
      '</div>' +
      '<div class="notif-actions">' +
        '<button class="notif-read-btn" data-read="' + esc(n.id) + '" title="Okundu işaretle">✓</button>' +
        '<button class="notif-del-btn"  data-del="' + esc(n.id) + '"  title="Sil">✕</button>' +
      '</div>' +
    '</div>';
  }

  /* ── Demo seed ──────────────────────────────────────────── */
  var DEMO_KEY = 'kb_notifs_seeded_v2';

  function seedDemoData(uid) {
    if (localStorage.getItem(DEMO_KEY)) return;
    localStorage.setItem(DEMO_KEY, '1');

    var now = Date.now();
    var demos = [
      { type: 'basvuru', title: 'Yeni Başvuru',    body: 'Ahmet Demir "Dağıtım Kuryesi" ilanına başvurdu.',      link: 'basvurular.html',    ago: 5   * 60 * 1000 },
      { type: 'gorusme', title: 'Görüşme Daveti',  body: 'KuryemiBul A.Ş. sizi bir görüşmeye davet etti.',       link: 'gorusmeler.html',    ago: 35  * 60 * 1000 },
      { type: 'mesaj',   title: 'Yeni Mesaj',       body: 'Selin Yıldız size mesaj gönderdi.',                     link: 'mesajlar.html',      ago: 2   * 3600 * 1000 },
      { type: 'karar',   title: 'Karar Bekleniyor', body: 'Murat Kaya için görüşme tamamlandı. Karar verin.',     link: 'karar.html',         ago: 5   * 3600 * 1000 },
      { type: 'teklif',  title: 'Yeni Teklif',      body: 'Lojistik Pro size iş teklifi gönderdi.',               link: 'mesajlar.html',      ago: 1   * 86400 * 1000 },
      { type: 'geri',    title: 'Değerlendirme',    body: 'Elif Şahin sizi 5 üzerinden 4.8 ile değerlendirdi.', link: 'geri-bildirim.html', ago: 2   * 86400 * 1000 },
      { type: 'ilan',    title: 'İlan Süresi Doldu', body: '"Hafta Sonu Kuryesi" ilanı süresi doldu.',            link: 'ilan-durum.html',    ago: 3   * 86400 * 1000 },
      { type: 'sistem',  title: 'Hoş Geldiniz',     body: 'KuryemiBul\'a hoş geldiniz! Profilinizi tamamlayın.', link: 'profil-duzenle.html', ago: 7  * 86400 * 1000 },
    ];

    var list = demos.map(function (d, i) {
      return {
        id:         'demo_' + i,
        type:       d.type,
        title:      d.title,
        body:       d.body,
        link:       d.link,
        meta:       null,
        read:       i >= 4,
        created_at: new Date(now - d.ago).toISOString(),
      };
    });

    save(uid, list);
  }

  /* ── Supabase bridge ───────────────────────────────────── */
  /* When SB is available, getAll and push use the real DB.   */
  async function getAllAsync(uid, opts) {
    if (window.SB && SB.isOn && SB.isOn() && SB.myNotifications) {
      try {
        var list = await SB.myNotifications(200);
        if (opts && opts.type) list = list.filter(function (n) { return n.type === opts.type; });
        if (opts && opts.unread) list = list.filter(function (n) { return !n.read_at; });
        return list.map(function (n) {
          return { id: n.id, type: n.type, title: n.title, body: n.body, link: n.link || null, read: !!n.read_at, created_at: n.created_at };
        });
      } catch (e) {}
    }
    return getAll(uid, opts);
  }

  async function pushAsync(uid, type, title, body, opts) {
    /* Always push to localStorage for immediate UI update */
    push(uid, type, title, body, opts);
    /* If SB available, also insert into DB (handled server-side by triggers in most cases) */
  }

  /* ── Public API ─────────────────────────────────────────── */
  global.KBNotif = {
    push:        push,
    pushAsync:   pushAsync,
    getAll:      getAll,
    getAllAsync:  getAllAsync,
    unreadCount: unreadCount,
    markRead:    markRead,
    markAllRead: markAllRead,
    remove:      remove,
    clear:       clear,
    renderItem:  renderItem,
    seedDemoData: seedDemoData,
    updateBadge: _updateBadge,
    TYPES:       TYPES,
  };

})(window);
