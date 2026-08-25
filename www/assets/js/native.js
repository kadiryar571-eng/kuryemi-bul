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
      /* ÖNCE açık üst katmanı kapat.
         Eskiden doğrudan Router.back() çağrılıyordu. Menü (drawer) veya
         başvuru modalı açıkken geri tuşuna basınca alttaki ekran değişiyor
         ama katman AÇIK KALIYORDU: ikisi de document.body'ye ekleniyor,
         renderScreen ise yalnız #kb-screen'i değiştiriyor. Geriye kalan
         tam ekran kaplayıcı (position:fixed; inset:0) bütün dokunuşları
         yutuyor — uygulama kaydırmayı bırakıyor, donmuş gibi görünüyordu.
         Android'de geri tuşunun beklenen davranışı da zaten budur. */
      if (window.closeTopLayer && window.closeTopLayer()) return;

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
      /* Arka plana gecerken token yenileme sayacini durdur, on plana gelince
         yeniden baslat. Yoksa WebView zamanlayicilari dondurdugu icin token
         suresi dolmus halde kalir ve ilk sorgu 401 doner (isimsiz profil hatasi). */
      if (!state.isActive) {
        if (window.SB && SB.stopAutoRefresh) SB.stopAutoRefresh();
        return;
      }
      if (window.SB && SB.startAutoRefresh) SB.startAutoRefresh();
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

  /* ── Dış bağlantı aç (yasal sayfalar vb.) ──────────────── */
  window.KBOpenUrl = function (url) {
    var Browser = plug('Browser');
    if (Browser && Browser.open) { Browser.open({ url: url }); return; }
    window.open(url, '_blank');
  };

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

  /* ── Push Notifications ──────────────────────────────────
     BURADA DEĞİL — app.js içindeki initNativePush() yönetiyor.

     Bu dosyada da bir initPush() vardı ama ilk satırında `return` ile
     devre dışı bırakılmıştı (Firebase kurulmadan çağrılınca uygulama
     çöküyordu). Firebase artık yapılandırıldı; ölü bloğu canlandırmak
     yerine sildik, çünkü iki dosya da dinleyici eklerse her bildirim
     iki kez işlenir: çift toast ve çift savePushToken çağrısı.
     Tek sahip app.js'tir. */

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
