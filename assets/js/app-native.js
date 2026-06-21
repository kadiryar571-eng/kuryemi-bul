/* ============================================================
   KuryemiBul — app-native.js
   Native Capacitor APK plugin yöneticisi.
   Yalnızca body.kb-native aktifken components.js tarafından yüklenir.

   Plugin'ler: @capacitor/push-notifications, @capacitor/camera,
               @capacitor/geolocation, @capacitor/app
   ============================================================ */
window.KBNative = (function () {
  'use strict';

  var _ready    = false;
  var _platform = 'web';
  var _plugins  = {};   // { App, PushNotifications, Camera, Geolocation }

  /* ══════════════════════════════════════════════════════════
     1. PLATFORM & PLUGİN ERİŞİMİ
  ══════════════════════════════════════════════════════════ */
  function getPlatform() {
    if (window.Capacitor && window.Capacitor.getPlatform) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }

  function plug(name) {
    return _plugins[name] ||
      (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) ||
      null;
  }

  /* ══════════════════════════════════════════════════════════
     2. ANDROID GERİ TUŞU
     Geçmiş varsa geri git; yoksa uygulamayı minimize et.
  ══════════════════════════════════════════════════════════ */
  function initBackButton() {
    if (_platform !== 'android') return;
    var App = plug('App');
    if (!App) return;
    App.addListener('backButton', function () {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     3. APP STATE LİSTENER
     Arka plandan öne gelince oturum ve bildirim sayısını yenile.
  ══════════════════════════════════════════════════════════ */
  function initAppState() {
    var App = plug('App');
    if (!App) return;
    App.addListener('appStateChange', function (state) {
      if (!state.isActive) return;
      if (window.KB && KB.ready) {
        KB.ready().then(function () {
          if (window.KB && KB.updateAuthArea) KB.updateAuthArea();
        });
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     4. PUSH BİLDİRİMLER
     NOT: Push.register() için google-services.json + Firebase Console
     kurulumu gerekir. Yapılandırılmadan çağrılırsa native crash olur.
     Kurulum: Firebase Console → Android app ekle → google-services.json
     dosyasını android/app/ klasörüne koy → APK'yı yeniden derle.
  ══════════════════════════════════════════════════════════ */
  function initPush() {
    var Push = plug('PushNotifications');
    if (!Push) { console.warn('[KBNative] PushNotifications plugin bulunamadı'); return; }

    // google-services.json olmadan Push.register() native crash yaratır.
    // Firebase kurulumu tamamlanana kadar yalnız listener'ları kur, register etme.
    var _fcmReady = (function () {
      try {
        // Capacitor native bridge üzerinden basit kontrol: plugin var mı?
        // google-services.json + Firebase kurulumu kullanıcı tarafından
        // yapıldıktan sonra bu flag'ı true yapıp APK'yı yeniden derle.
        return false; // Firebase henüz yapılandırılmadı
      } catch (e) { return false; }
    })();

    if (_fcmReady) {
      Push.checkPermissions().then(function (result) {
        if (result.receive === 'granted') {
          Push.register();
        } else if (result.receive !== 'denied') {
          Push.requestPermissions().then(function (res) {
            if (res.receive === 'granted') Push.register();
          });
        }
      }).catch(function (e) {
        console.warn('[KBNative] Push izin hatası:', e);
      });
    }

    /* Token alındığında Supabase'e kaydet */
    Push.addListener('registration', function (token) {
      console.log('[KBNative] Push token:', token.value);
      if (window.SB && SB.savePushToken) {
        SB.savePushToken(token.value).catch(function () {});
      }
    });

    /* Push hata */
    Push.addListener('registrationError', function (err) {
      console.warn('[KBNative] Push kayıt hatası:', err);
    });

    /* Bildirime tıklandı — deep link */
    Push.addListener('pushNotificationActionPerformed', function (action) {
      var data = action.notification && action.notification.data;
      if (data && data.url) {
        window.location.href = data.url;
      } else if (data && data.page) {
        window.location.href = '/' + data.page;
      }
    });

    /* Uygulama açıkken gelen bildirim — in-app toast göster */
    Push.addListener('pushNotificationReceived', function (notif) {
      if (window.KBMotion && KBMotion.showInAppNotif) {
        KBMotion.showInAppNotif(
          notif.title || 'Bildirim',
          notif.body  || '',
          function () {
            var data = notif.data;
            if (data && data.url) window.location.href = data.url;
          }
        );
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     5. KAMERA — Profil Fotoğrafı
     KBNative.pickPhoto(callback) → callback(dataUrl)
  ══════════════════════════════════════════════════════════ */
  function pickPhoto(onSuccess, onError) {
    var Camera = plug('Camera');
    if (!Camera) {
      if (onError) onError('camera_unavailable');
      return;
    }

    // CameraResultType = 'dataUrl', CameraSource = 'PROMPT' (galeri veya kamera)
    Camera.getPhoto({
      quality:      85,
      allowEditing: true,
      resultType:   'dataUrl',
      source:       'PROMPT'
    }).then(function (photo) {
      if (onSuccess) onSuccess('data:image/jpeg;base64,' + photo.base64String || photo.dataUrl);
    }).catch(function (err) {
      if (String(err).indexOf('cancelled') === -1 && String(err).indexOf('cancel') === -1) {
        console.warn('[KBNative] Kamera hatası:', err);
        if (onError) onError(err);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     6. GEOLOCATİON — Konum
     KBNative.getLocation(onSuccess, onError)
     onSuccess({ latitude, longitude, accuracy })
  ══════════════════════════════════════════════════════════ */
  function getLocation(onSuccess, onError) {
    var Geo = plug('Geolocation');
    if (!Geo) {
      // Fallback: tarayıcı Geolocation API
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (pos) { if (onSuccess) onSuccess(pos.coords); },
          function (err) { if (onError)   onError(err); },
          { timeout: 10000, enableHighAccuracy: true }
        );
      } else {
        if (onError) onError('geolocation_unavailable');
      }
      return;
    }

    Geo.getCurrentPosition({ timeout: 10000, enableHighAccuracy: true })
      .then(function (pos) { if (onSuccess) onSuccess(pos.coords); })
      .catch(function (err) { if (onError)   onError(err); });
  }

  /* ══════════════════════════════════════════════════════════
     7. SAYFA GEÇİŞ ANİMASYONU
     Link tıklanınca body'ye kb-page-exit ekle, animasyon
     bittikten sonra navigate et.
  ══════════════════════════════════════════════════════════ */
  function initPageTransitions() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href) return;
      if (
        href.charAt(0) === '#' ||
        href.indexOf('http') === 0 ||
        href.indexOf('tel:') === 0 ||
        href.indexOf('mailto:') === 0 ||
        href.indexOf('javascript:') === 0 ||
        a.target === '_blank'
      ) return;

      var curFile = location.pathname.split('/').pop() || 'index.html';
      var destFile = href.split('?')[0].split('/').pop() || 'index.html';
      if (curFile === destFile) return;

      e.preventDefault();
      document.body.classList.add('kb-page-exit');
      setTimeout(function () { location.href = href; }, 200);
    }, true);
  }

  /* ══════════════════════════════════════════════════════════
     8. İNİT
  ══════════════════════════════════════════════════════════ */
  function init() {
    _platform = getPlatform();
    initBackButton();
    initAppState();
    initPush();
    initPageTransitions();
    _ready = true;
    console.log('[KBNative] hazır — platform:', _platform);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ── Public API ── */
  return {
    getPlatform: getPlatform,
    isReady:     function () { return _ready; },
    pickPhoto:   pickPhoto,
    getLocation: getLocation
  };

})();
