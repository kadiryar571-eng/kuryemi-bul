/* ============================================================================
   push.js — Web Push aboneliği (kök site)
   ----------------------------------------------------------------------------
   Bu katman eskiden YOKTU. sw.js dosyası hazırdı, supabase.js içinde
   savePushSubscription() tanımlıydı, Edge Function push_subscriptions
   tablosundan okuyordu — ama tabloya yazan hiçbir şey olmadığı için tablo
   hep boştu ve tarayıcıya asla bildirim gitmiyordu. Zincirin eksik halkası
   burasıydı.

   Politika:
     • İzin zaten verilmişse   → sessizce yeniden abone ol (endpoint tazelenir)
     • İzin henüz sorulmamışsa → KENDİLİĞİNDEN SORMA. Tarayıcılar davetsiz
       izin istemlerini cezalandırıyor (Chrome kalıcı olarak bloklayabiliyor).
       İstem yalnız Ayarlar'daki anahtardan, kullanıcı hareketiyle çıkar.
     • İzin reddedilmişse      → hiçbir şey yapma, Ayarlar durumu gösterir

   Bağımlılık: supabase.js (SB.vapidPublicKey / savePushSubscription)
   Global: window.KBPush
   ========================================================================== */
(function (global) {
  'use strict';

  var SW_PATH = '/sw.js';
  var SW_SCOPE = '/';

  /* ── Ortam kontrolü ─────────────────────────────────────────────────── */

  function supported() {
    return !!(global.navigator && 'serviceWorker' in navigator &&
              'PushManager' in global && 'Notification' in global);
  }

  function online() {
    return !!(global.SB && SB.isOn && SB.isOn());
  }

  /**
   * 'unsupported' | 'default' | 'granted' | 'denied'
   * Capacitor WebView'de web push yoktur — orada FCM kullanılır (app.js).
   */
  function status() {
    if (global.Capacitor && global.Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
      return 'unsupported';
    }
    if (!supported()) return 'unsupported';
    return Notification.permission;
  }

  /* ── VAPID anahtarı: base64url → Uint8Array ────────────────────────────
     PushManager.subscribe applicationServerKey'i ham bayt olarak ister;
     base64url string kabul etmez. */

  function urlBase64ToUint8Array(base64) {
    var padding = '='.repeat((4 - (base64.length % 4)) % 4);
    var normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = global.atob(normalized);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  /* ── Service worker ────────────────────────────────────────────────────
     Kaydı tekilleştiriyoruz: aynı sayfada birden çok çağrı gelirse tek
     register() promise'i paylaşılır. */

  var _swPromise = null;

  function getRegistration() {
    if (!supported()) return Promise.resolve(null);
    if (!_swPromise) {
      _swPromise = navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE })
        .then(function () { return navigator.serviceWorker.ready; })
        .catch(function (e) {
          console.warn('[KBPush] service worker kaydedilemedi:', e);
          _swPromise = null;
          return null;
        });
    }
    return _swPromise;
  }

  /* ── Abonelik ──────────────────────────────────────────────────────────── */

  /**
   * Mevcut aboneliği alır, yoksa oluşturur ve veritabanına yazar.
   * İzin verilmemişse null döner — izin İSTEMEZ.
   */
  async function ensureSubscription() {
    if (status() !== 'granted' || !online()) return null;

    var reg = await getRegistration();
    if (!reg) return null;

    var sub = await reg.pushManager.getSubscription();

    if (!sub) {
      var key = await SB.vapidPublicKey();
      if (!key) {
        console.warn('[KBPush] VAPID public key alınamadı — abonelik kurulamadı.');
        return null;
      }
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key)
        });
      } catch (e) {
        console.warn('[KBPush] subscribe başarısız:', e);
        return null;
      }
    }

    // Her seferinde upsert ediyoruz. Endpoint sessizce değişebiliyor
    // (tarayıcı güncellemesi, push servisi taşıması) ve eski satır ölü
    // kalıyor; upsert bunu kendiliğinden tazeliyor.
    try {
      await SB.savePushSubscription(sub);
    } catch (e) {
      console.warn('[KBPush] abonelik kaydedilemedi:', e);
      return null;
    }

    return sub;
  }

  /**
   * Kullanıcı hareketiyle çağrılır (Ayarlar anahtarı).
   * Dönüş: 'granted' | 'denied' | 'default' | 'unsupported' | 'error'
   */
  async function enable() {
    if (status() === 'unsupported') return 'unsupported';
    if (!online()) return 'error';

    var perm = Notification.permission;
    if (perm === 'default') {
      try { perm = await Notification.requestPermission(); }
      catch (e) { return 'error'; }
    }
    if (perm !== 'granted') return perm;

    var sub = await ensureSubscription();
    return sub ? 'granted' : 'error';
  }

  /** Aboneliği hem tarayıcıdan hem veritabanından kaldırır. */
  async function disable() {
    if (!supported()) return false;
    var reg = await getRegistration();
    if (!reg) return false;

    var sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    var endpoint = sub.endpoint;
    try { await sub.unsubscribe(); } catch (e) {}
    if (online()) {
      try { await SB.deletePushSubscription(endpoint); } catch (e) {}
    }
    return true;
  }

  /** Bu tarayıcı için veritabanında kayıtlı abonelik var mı? */
  async function isSubscribed() {
    if (status() !== 'granted') return false;
    var reg = await getRegistration();
    if (!reg) return false;
    return !!(await reg.pushManager.getSubscription());
  }

  /* ── Otomatik senkron ──────────────────────────────────────────────────
     Oturum hazır olduğunda çalışır. İzin verilmişse aboneliği tazeler;
     verilmemişse hiçbir şey yapmaz (istem çıkarmaz). */

  function sync() {
    if (status() !== 'granted') return Promise.resolve(null);
    return ensureSubscription().catch(function () { return null; });
  }

  function boot() {
    if (status() !== 'granted') return;
    // KB.ready() oturum yüklenince resolve olur; abonelik kaydı user_id
    // gerektirdiği için önce onu bekliyoruz.
    if (global.KB && typeof KB.ready === 'function') {
      KB.ready().then(sync).catch(function () {});
    } else {
      sync();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.KBPush = {
    supported: supported,
    status: status,
    enable: enable,
    disable: disable,
    isSubscribed: isSubscribed,
    sync: sync
  };

})(window);
