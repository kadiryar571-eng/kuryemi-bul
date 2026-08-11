/* ================================================================
   KuryemiBul — notifications.js
   VERİTABANI TABANLI bildirim katmanı. API: window.KBNotif

   Bildirimler YALNIZ gerçek olaylardan doğar ve sunucuda üretilir
   (Supabase trigger'ları: yeni başvuru, başvuru kabul/red, yeni mesaj,
    yeni teklif, teklif kabul/red, mülakat daveti, değerlendirme,
    profil görüntülenme, eşleşen yeni ilan, KYC sonucu).

   Bu dosya bildirim ÜRETMEZ — yalnız okur, okundu işaretler, siler ve
   realtime aboneliğiyle rozeti canlı tutar. Demo/örnek bildirim yoktur.
   ================================================================ */
(function (global) {
  'use strict';

  /* ── Tipler — sunucudaki type değerleriyle eşleşir ─────────── */
  var TYPES = {
    basvuru:          { ico: '📋', label: 'Başvuru' },
    application_new:  { ico: '📋', label: 'Başvuru' },
    new_application:  { ico: '📋', label: 'Başvuru' },
    application_accepted: { ico: '✅', label: 'Karar' },
    application_rejected: { ico: '⚖️', label: 'Karar' },
    gorusme:          { ico: '📅', label: 'Görüşme' },
    karar:            { ico: '⚖️', label: 'Karar' },
    teklif:           { ico: '✉️', label: 'Teklif' },
    offer:            { ico: '✉️', label: 'Teklif' },
    offer_new:        { ico: '✉️', label: 'Teklif' },
    offer_accepted:   { ico: '✅', label: 'Teklif' },
    offer_rejected:   { ico: '⚖️', label: 'Teklif' },
    mesaj:            { ico: '💬', label: 'Mesaj' },
    new_message:      { ico: '💬', label: 'Mesaj' },
    geri:             { ico: '⭐', label: 'Geri Bildirim' },
    review_new:       { ico: '⭐', label: 'Değerlendirme' },
    profile_view:     { ico: '👁', label: 'Görüntülenme' },
    listing_match:    { ico: '🎯', label: 'Yeni İlan' },
    ilan:             { ico: '📢', label: 'İlan' },
    kyc_verified:     { ico: '🛡', label: 'Doğrulama' },
    kyc_rejected:     { ico: '🛡', label: 'Doğrulama' },
    sistem:           { ico: '⚙️', label: 'Sistem' },
    system:           { ico: '⚙️', label: 'Sistem' },
    info:             { ico: '⚙️', label: 'Bilgi' }
  };
  function typeOf(t) { return TYPES[t] || TYPES.sistem; }

  function on() { return !!(global.SB && SB.isOn && SB.isOn()); }

  /* Normalize: DB satırı → UI nesnesi */
  function fromDb(n) {
    return {
      id: n.id, type: n.type, title: n.title, body: n.body,
      link: n.link || null, read: !!n.read_at, created_at: n.created_at
    };
  }

  /* ── Okuma ─────────────────────────────────────────────────── */
  async function getAll(opts) {
    opts = opts || {};
    if (!on()) return [];
    var list = [];
    try { list = await SB.myNotifications(200); } catch (e) { console.warn('notifications:', e); return []; }
    list = list.map(fromDb);
    if (opts.type)   list = list.filter(function (n) { return n.type === opts.type; });
    if (opts.unread) list = list.filter(function (n) { return !n.read; });
    return list;
  }

  async function unreadCount() {
    if (!on()) return 0;
    try { return await SB.unreadCount(); } catch (e) { return 0; }
  }

  /* ── Yazma (yalnız okundu/sil — bildirim üretilmez) ────────── */
  async function markRead(id) {
    if (!on() || !id) return;
    try { await SB.markNotificationRead(id); } catch (e) {}
    updateBadge();
  }
  async function markAllRead() {
    if (!on()) return;
    try { await SB.markAllNotificationsRead(); } catch (e) {}
    updateBadge();
  }
  async function remove(id) {
    if (!on() || !id) return;
    var c = SB.raw && SB.raw();
    if (!c) return;
    try { await c.from('notifications').delete().eq('id', id); } catch (e) {}
    updateBadge();
  }
  async function clear() {
    if (!on()) return;
    var c = SB.raw && SB.raw();
    if (!c) return;
    try {
      var u = await SB.getUser();
      if (u) await c.from('notifications').delete().eq('user_id', u.id);
    } catch (e) {}
    updateBadge();
  }

  /* ── Topbar rozeti — gerçek okunmamış sayısı ───────────────── */
  async function updateBadge() {
    var badge = document.getElementById('kbNotifBadge');
    if (!badge) return;
    var cnt = await unreadCount();
    badge.textContent = cnt > 99 ? '99+' : cnt;
    badge.style.display = cnt > 0 ? 'inline-flex' : 'none';
  }

  /* ── CANLI: yeni bildirim gelince rozet ve liste anında güncellenir ── */
  var _sub = null, _onNew = [];
  function subscribe() {
    if (_sub || !on() || !SB.subscribeNotifications) return;
    _sub = SB.subscribeNotifications(function (row) {
      updateBadge();
      var n = fromDb(row);
      _onNew.forEach(function (cb) { try { cb(n); } catch (e) {} });
      // Uygulama içi anlık bildirim balonu
      if (global.KBMotion && KBMotion.showInAppNotif) {
        try {
          KBMotion.showInAppNotif(n.title || 'Bildirim', n.body || '', function () {
            if (n.link) location.href = n.link;
          });
        } catch (e) {}
      }
    });
  }
  function onNew(cb) {
    _onNew.push(cb);
    return function () { _onNew = _onNew.filter(function (x) { return x !== cb; }); };
  }

  /* ── Render ────────────────────────────────────────────────── */
  function renderItem(n) {
    var t = typeOf(n.type);
    var esc = global.KB ? KB.esc : function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
      });
    };
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

  global.KBNotif = {
    getAll:      getAll,
    getAllAsync: getAll,     // geriye dönük ad
    unreadCount: unreadCount,
    markRead:    markRead,
    markAllRead: markAllRead,
    remove:      remove,
    clear:       clear,
    renderItem:  renderItem,
    updateBadge: updateBadge,
    subscribe:   subscribe,
    onNew:       onNew,
    TYPES:       TYPES
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { updateBadge(); subscribe(); });
  } else { updateBadge(); subscribe(); }

})(window);
