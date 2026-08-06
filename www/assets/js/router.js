/* ============================================================
   KuryemiBul — router.js
   Lightweight hash-based SPA router
   ============================================================ */
window.Router = (function () {
  'use strict';

  var _routes    = [];
  var _current   = null;
  var _prevHash  = null;
  var _fallback  = null;

  /* Register a route: path supports :param segments */
  function define(pattern, handler) {
    _routes.push({ pattern: pattern, handler: handler });
  }

  /* Bilinmeyen adres geldiğinde nereye gidileceğini belirleyen fonksiyon.
     app.js kaydeder; kullanıcının rolüne göre panel döndürür. */
  function setFallback(fn) { _fallback = fn; }

  /* Verilen yol için tanımlı bir route var mı? */
  function isDefined(path) {
    for (var i = 0; i < _routes.length; i++) {
      if (match(_routes[i].pattern, path) !== null) return true;
    }
    return false;
  }

  /* Parse :param segments from a pattern+hash pair */
  function match(pattern, hash) {
    var pParts = pattern.split('/');
    var hParts = hash.split('/');
    if (pParts.length !== hParts.length) return null;
    var params = {};
    for (var i = 0; i < pParts.length; i++) {
      if (pParts[i].charAt(0) === ':') {
        params[pParts[i].slice(1)] = decodeURIComponent(hParts[i]);
      } else if (pParts[i] !== hParts[i]) {
        return null;
      }
    }
    return params;
  }

  /* Resolve current hash → find handler → call it */
  function resolve() {
    var raw   = location.hash.replace(/^#/, '') || '/login';
    var path  = raw.split('?')[0];
    var query = {};
    var qs    = raw.split('?')[1] || '';
    if (qs) {
      qs.split('&').forEach(function (pair) {
        var kv = pair.split('=');
        if (kv[0]) query[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      });
    }

    for (var i = 0; i < _routes.length; i++) {
      var r      = _routes[i];
      var params = match(r.pattern, path);
      if (params !== null) {
        _prevHash = _current;
        _current  = path;
        r.handler({ params: params, query: query, prev: _prevHash });
        return;
      }
    }

    /* Bilinmeyen adres (kaldırılmış route, eski kısayol, bozuk derin bağlantı).
       Uygulama bir yedek kaydettiyse oraya, yoksa girişe. Hedefin gerçekten
       tanımlı olduğunu doğruluyoruz — aksi halde go() → resolve() sonsuz
       döngüye girerdi. */
    if (path === '/login') return;   /* /login bile eşleşmediyse döngüyü kes */

    var hedef = null;
    try { hedef = _fallback ? _fallback(path) : null; } catch (e) { hedef = null; }
    if (!hedef || hedef === path || !isDefined(hedef)) hedef = '/login';
    go(hedef);
  }

  /* Navigate programmatically */
  function go(path) {
    var newHash = '#' + path;
    if (location.hash === newHash) {
      resolve(); /* hash değişmezse tarayıcı hashchange fırlatmaz — elle çöz */
    } else {
      location.hash = newHash;
    }
  }

  /* Back — tries history, falls back to /login */
  function back() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      go('/login');
    }
  }

  window.addEventListener('hashchange', resolve);

  return {
    define      : define,
    setFallback : setFallback,
    isDefined   : isDefined,
    go          : go,
    back        : back,
    resolve     : resolve,
    current     : function () { return _current; }
  };

})();
