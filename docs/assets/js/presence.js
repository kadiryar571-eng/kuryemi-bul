/* ============================================================
   Kuryemi Bul — presence.js
   Gerçek çevrimiçi (presence) sistemi + canlı sayaçlar.

   Çevrimiçi OLMA:   giriş yapıldığında ve uygulama aktifken (heartbeat)
   Çevrimiçi ÇIKMA:  çıkış, sekme kapanışı, oturum bitişi, hareketsizlik

   Sayaç güncellemesi POLLING İLE DEĞİL, Supabase Realtime presence kanalı
   ile anlık gelir. Realtime kurulamazsa RPC ile seyrek yedek yenileme yapılır.

   supabase.js bu dosyadan ÖNCE yüklenmelidir.
   ============================================================ */
(function () {
  'use strict';

  var HEARTBEAT_MS = 45000;   // DB'ye last_seen_at yazma aralığı
  var IDLE_MS      = 300000;  // 5 dk hareketsizlik → offline
  var FALLBACK_MS  = 60000;   // realtime yoksa sayaç yedek yenileme

  var _hbTimer = null, _idleTimer = null, _fbTimer = null;
  var _channel = null, _isOnline = false, _started = false;
  var _count = 0;
  var _listeners = [];

  function on() { return !!(window.SB && SB.isOn && SB.isOn()); }

  function emit() {
    _listeners.forEach(function (cb) { try { cb(_count); } catch (e) {} });
    paint();
  }

  /* ---- DOM'a bas: [data-online-count] taşıyan her element ---- */
  function paint() {
    document.querySelectorAll("[data-online-count]").forEach(function (el) {
      var tpl = el.getAttribute("data-online-tpl");
      el.textContent = tpl ? tpl.replace("{n}", _count) : String(_count);
      el.classList.toggle("is-live", _count > 0);
    });
  }

  /* ---- Heartbeat: kullanıcı gerçekten aktifken DB'ye yaz ---- */
  async function beat() {
    if (!on()) return;
    try {
      var u = await SB.getUser();
      if (!u) { await goOffline(); return; }
      await SB.presencePing();
      _isOnline = true;
    } catch (e) {}
  }

  async function goOffline(useBeacon) {
    if (!_isOnline) return;
    _isOnline = false;
    stopTimers();
    try { if (on()) await SB.presenceOffline(useBeacon); } catch (e) {}
    try { if (_channel) { _channel.untrack(); } } catch (e) {}
  }

  function stopTimers() {
    if (_hbTimer) { clearInterval(_hbTimer); _hbTimer = null; }
    if (_idleTimer) { clearTimeout(_idleTimer); _idleTimer = null; }
  }

  /* ---- Hareketsizlik sayacı ---- */
  function armIdle() {
    if (_idleTimer) clearTimeout(_idleTimer);
    _idleTimer = setTimeout(function () { goOffline(); }, IDLE_MS);
  }
  function wake() {
    armIdle();
    if (!_isOnline && _started) startHeartbeat();
  }

  function startHeartbeat() {
    stopTimers();
    beat();
    _hbTimer = setInterval(beat, HEARTBEAT_MS);
    armIdle();
  }

  /* ---- Anlık sayı: Realtime presence kanalı (polling yok) ---- */
  async function joinChannel() {
    if (!on() || _channel) return false;
    try {
      var raw = (SB.raw && SB.raw()) || null;
      // supabase.js client'ı dışarı vermiyorsa realtime presence kullanılamaz
      if (!raw || !raw.channel) return false;
      var u = await SB.getUser();
      _channel = raw.channel("kb-online", { config: { presence: { key: (u && u.id) || ("guest-" + Math.random().toString(36).slice(2)) } } });
      _channel.on("presence", { event: "sync" }, function () {
        var state = _channel.presenceState() || {};
        _count = Object.keys(state).length;
        emit();
      });
      _channel.subscribe(function (status) {
        if (status === "SUBSCRIBED" && u) { _channel.track({ at: Date.now() }); }
      });
      return true;
    } catch (e) { _channel = null; return false; }
  }

  /* ---- Yedek: RPC ile sayıyı tazele (realtime yoksa) ---- */
  async function refreshCount() {
    if (!on()) return;
    try {
      var n = await SB.onlineCount();
      if (typeof n === "number") { _count = n; emit(); }
    } catch (e) {}
  }

  /* ---- Başlat ---- */
  async function start() {
    if (_started || !on()) return;
    _started = true;

    // Sayaç: önce gerçek DB değeri, sonra realtime kanalı devralır
    await refreshCount();
    var live = await joinChannel();
    if (!live) {
      // Realtime yoksa seyrek yedek yenileme (agresif polling değil)
      _fbTimer = setInterval(refreshCount, FALLBACK_MS);
    }

    var u = null;
    try { u = await SB.getUser(); } catch (e) {}
    if (u) startHeartbeat();

    // Oturum değişimi → presence takip et
    if (SB.onAuthChange) {
      SB.onAuthChange(function (event, user) {
        if (user) { _isOnline = false; startHeartbeat(); }
        else { goOffline(); }
      });
    }

    // Sekme arka plana geçince heartbeat'i durdur (pil/veri tasarrufu),
    // öne gelince tekrar başlat.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { stopTimers(); }
      else { wake(); refreshCount(); }
    });

    // Gerçek kullanıcı etkileşimi = hâlâ aktif
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (ev) {
      window.addEventListener(ev, wake, { passive: true });
    });

    // Sekme/uygulama kapanışı → hemen offline (keepalive ile)
    window.addEventListener("pagehide", function () { goOffline(true); });
    window.addEventListener("beforeunload", function () { goOffline(true); });
  }

  window.KBPresence = {
    start: start,
    /* Çevrimiçi sayısı değişince haber ver; anında mevcut değeri de yollar. */
    onCount: function (cb) {
      _listeners.push(cb);
      try { cb(_count); } catch (e) {}
      return function () { _listeners = _listeners.filter(function (x) { return x !== cb; }); };
    },
    count: function () { return _count; },
    refresh: refreshCount,
    /* Çıkışta çağrılır (app.js çıkış akışı) */
    signOut: function () { return goOffline(); }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
