/* ============================================================
   KuryemiBul — native.js
   Capacitor native plugin bridge (back button, camera, location)
   Yalnızca Capacitor native ortamında etkilidir.
   ============================================================ */
(function () {
  'use strict';

  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function plug(name) {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name];
  }

  /* ── Android geri tuşu ──────────────────────────────────── */
  function initBackButton() {
    if (!isNative()) return;
    var App = plug('App');
    if (!App) return;

    App.addListener('backButton', function () {
      var hash = location.hash || '#/';
      var isRoot = hash === '#/login' || hash === '#/' || !hash;

      if (isRoot) {
        App.minimizeApp();
      } else {
        Router.back();
      }
    });
  }

  /* ── Uygulama ön plana gelince session yenile ─────────── */
  function initAppState() {
    if (!isNative()) return;
    var App = plug('App');
    if (!App) return;

    App.addListener('appStateChange', function (state) {
      if (!state.isActive) return;
      // Harita ekranı açıkken (konum izni dialogu) navigate etme
      if (document.getElementById('spm-map')) return;
      if (window.SB && SB.getUser) {
        SB.getUser().then(function (user) {
          if (!user && location.hash !== '#/login') {
            Router.go('/login');
          }
        }).catch(function () {});
      }
    });
  }

  /* ── Kamera — Profil fotoğrafı ─────────────────────────── */
  window.KBPickPhoto = function (onSuccess, onError) {
    var Camera = plug('Camera');
    if (!Camera) {
      /* Web fallback: file input */
      var inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.onchange = function () {
        if (!inp.files || !inp.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) { if (onSuccess) onSuccess(e.target.result); };
        reader.readAsDataURL(inp.files[0]);
      };
      inp.click();
      return;
    }

    Camera.getPhoto({
      quality      : 85,
      allowEditing : true,
      resultType   : 'dataUrl',
      source       : 'PROMPT'
    }).then(function (photo) {
      if (onSuccess) onSuccess(photo.dataUrl || ('data:image/jpeg;base64,' + photo.base64String));
    }).catch(function (err) {
      if (String(err).indexOf('cancel') === -1 && onError) onError(err);
    });
  };

  /* ── Geolocation ────────────────────────────────────────── */
  window.KBGetLocation = function (onSuccess, onError) {
    var Geo = plug('Geolocation');
    if (!Geo) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (pos) { if (onSuccess) onSuccess(pos.coords); },
          function (err) { if (onError)   onError(err); },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        if (onError) onError('unavailable');
      }
      return;
    }

    Geo.getCurrentPosition({ timeout: 10000, enableHighAccuracy: true })
      .then(function (pos) { if (onSuccess) onSuccess(pos.coords); })
      .catch(function (err) { if (onError)   onError(err); });
  };

  /* ── Google OAuth deep-link (native) ───────────────────── */
  function initDeepLink() {
    if (!isNative()) return;
    var App = plug('App');
    if (!App) return;

    App.addListener('appUrlOpen', function (data) {
      var url = data.url || '';
      if (url.indexOf('callback') !== -1) {
        /* Supabase OAuth callback — session otomatik işlenir */
        var Browser = plug('Browser');
        if (Browser) Browser.close();
      }
    });
  }

  /* ── Push Notifications ────────────────────────────────── */
  /* Firebase (google-services.json) kurulmadan çağrılırsa native crash atar.
     FCM entegrasyonu tamamlanınca bu bloğu tekrar aktif et. */
  function initPush() {
    if (!isNative()) return;
    var Push = plug('PushNotifications');
    if (!Push) return;

    // Push.requestPermissions() çağrısı FCM olmadan crash yaratıyor — devre dışı.
    return;

    Push.addListener('registration', function (token) {
      if (window.SB && SB.savePushToken) {
        SB.savePushToken(token.value).catch(function () {});
      }
    });

    Push.addListener('pushNotificationReceived', function (notif) {
      if (typeof toast === 'function') {
        toast((notif.title || '') + (notif.body ? ' — ' + notif.body : ''));
      }
    });

    Push.addListener('pushNotificationActionPerformed', function (action) {
      var link = action.notification && action.notification.data && action.notification.data.link;
      if (link && window.Router) Router.go(link);
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    if (!isNative()) return;
    initBackButton();
    initAppState();
    initDeepLink();
    initPush();
    console.log('[KBNative] platform:', window.Capacitor.getPlatform());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
