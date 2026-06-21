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

  /* ── Init ───────────────────────────────────────────────── */
  function init() {
    if (!isNative()) return;
    initBackButton();
    initAppState();
    initDeepLink();
    console.log('[KBNative] platform:', window.Capacitor.getPlatform());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
