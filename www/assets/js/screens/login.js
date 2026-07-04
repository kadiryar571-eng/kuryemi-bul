/* ============================================================
   KuryemiBul — screens/login.js
   Entry, Login, Register screens
   ============================================================ */
window.LoginScreens = (function () {
  'use strict';

  var _pendingRole = null;

  /* ── Entry screen ───────────────────────────────────────── */
  function entry() {
    hideAppBar();
    hideBottomNav();
    renderScreen(
      '<div class="login-wrap">' +
        '<div class="login-logo">' +
          '<img src="assets/logo.png" alt="KuryemiBul" onerror="this.style.display=\'none\'">' +
          '<span class="login-logo__brand">KuryemiBul</span>' +
        '</div>' +
        '<p class="login-slogan">Doğru kurye, doğru firma, doğru eşleşme.</p>' +

        '<div class="login-title">Merhaba!</div>' +
        '<p class="login-sub">Hesabın var mı? <b>Giriş Yap</b> seç. Yoksa rolünü seçerek başla.</p>' +

        '<button class="role-btn role-btn--kurye" onclick="LoginScreens.startRole(\'kurye\')">' +
          '<div class="role-btn__icon">🛵</div>' +
          '<div class="role-btn__text">' +
            '<div class="role-btn__title">Kurye Ol</div>' +
            '<div class="role-btn__sub">İş fırsatlarını keşfet, başvur</div>' +
          '</div>' +
          ICON.chevron +
        '</button>' +

        '<button class="role-btn role-btn--firma" onclick="LoginScreens.startRole(\'firma\')">' +
          '<div class="role-btn__icon">🏢</div>' +
          '<div class="role-btn__text">' +
            '<div class="role-btn__title">Firma Ol</div>' +
            '<div class="role-btn__sub">Kuryeleri işe al, adayları değerlendir</div>' +
          '</div>' +
          ICON.chevron +
        '</button>' +

        '<button class="role-btn role-btn--isletme" onclick="LoginScreens.startRole(\'isletme\')">' +
          '<div class="role-btn__icon">🏪</div>' +
          '<div class="role-btn__text">' +
            '<div class="role-btn__title">Esnaf / İşletme Ol</div>' +
            '<div class="role-btn__sub">İhtiyacın olan kuryeyi bul</div>' +
          '</div>' +
          ICON.chevron +
        '</button>' +

        '<div class="kb-divider" style="margin: 20px 0"></div>' +

        '<button class="btn btn--outline" onclick="LoginScreens.showLogin()" style="--c-accent: #2563EB">' +
          'Giriş Yap' +
        '</button>' +

        /* Demo bypass — geliştirme ve test için */
        '<div style="margin-top:14px;background:rgba(108,77,255,.08);border:1px solid rgba(108,77,255,.2);border-radius:14px;padding:14px">' +
          '<div style="font-size:.72rem;font-weight:700;color:#8B6DFF;letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px">Demo Mod — Hesap Gerekmez</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' +
            '<button onclick="LoginScreens.demoLogin(\'kurye\')"   style="background:rgba(108,77,255,.15);border:1px solid rgba(108,77,255,.3);border-radius:10px;padding:10px 4px;font-size:.75rem;font-weight:700;color:#BBA0FF;cursor:pointer">🛵 Kurye</button>'  +
            '<button onclick="LoginScreens.demoLogin(\'firma\')"   style="background:rgba(34,197,94,.1); border:1px solid rgba(34,197,94,.3); border-radius:10px;padding:10px 4px;font-size:.75rem;font-weight:700;color:#4ADE80;cursor:pointer">🏢 Firma</button>'   +
            '<button onclick="LoginScreens.demoLogin(\'isletme\')" style="background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.3);border-radius:10px;padding:10px 4px;font-size:.75rem;font-weight:700;color:#FB923C;cursor:pointer">🏪 Esnaf</button>'   +
          '</div>' +
        '</div>' +

        '<p class="text-center fs-sm text-muted mt-12">' +
          'Giriş yaparak ' +
          '<a href="#" style="color:var(--c-kurye)">Kullanım Koşullarını</a>' +
          ' kabul etmiş olursun.' +
        '</p>' +
      '</div>'
    );
  }

  /* ── Login form ─────────────────────────────────────────── */
  function showLogin() {
    renderScreen(
      '<div class="login-wrap">' +
        '<button class="kb-appbar__back" onclick="Router.go(\'/login\')" style="margin-bottom:16px">' +
          ICON.back + '<span style="margin-left:4px;font-weight:600">Geri</span>' +
        '</button>' +

        '<div class="login-logo">' +
          '<img src="assets/logo.png" alt="" onerror="this.style.display=\'none\'">' +
          '<span class="login-logo__brand">KuryemiBul</span>' +
        '</div>' +
        '<p class="login-slogan">Hesabına giriş yap</p>' +

        '<div class="auth-tabs">' +
          '<button class="auth-tab active" id="tab-giris" onclick="LoginScreens._tab(\'giris\')">Giriş Yap</button>' +
          '<button class="auth-tab" id="tab-kayit"  onclick="LoginScreens._tab(\'kayit\')">Kayıt Ol</button>' +
        '</div>' +

        '<div id="giris-form">' +
          '<div class="kb-form-group">' +
            '<label class="kb-label">E-posta</label>' +
            '<input class="kb-input" type="email" id="login-email" placeholder="ornek@email.com" autocomplete="email">' +
          '</div>' +
          '<div class="kb-form-group">' +
            '<label class="kb-label">Şifre</label>' +
            '<div class="kb-input-wrap">' +
              '<input class="kb-input" type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password">' +
              '<button class="kb-input-wrap__icon" onclick="LoginScreens._togglePass(\'login-pass\')">' +
                ICON.eye +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div id="login-err" class="kb-error-msg" style="display:none;margin-bottom:10px"></div>' +
          '<button class="btn btn--primary" onclick="LoginScreens._doLogin()" id="btn-login">Giriş Yap</button>' +
          '<div class="auth-divider">veya</div>' +
          '<button class="btn btn--google" onclick="LoginScreens._googleLogin()">' +
            '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.3 0 24 0 14.8 0 6.9 5.4 3 13.3l7.9 6.1C12.7 13.2 17.9 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.7 6c4.5-4.2 7-10.4 7-17.2z"/><path fill="#FBBC05" d="M10.9 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.8 23.8 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.4-6.2z"/><path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.7-6c-2 1.4-4.7 2.2-7.6 2.2-6 0-11.2-4.1-13-9.6l-7.9 6.1C6.9 42.6 14.8 48 24 48z"/></svg>' +
            'Google ile Devam Et' +
          '</button>' +
        '</div>' +

        '<div id="kayit-form" style="display:none">' +
          _buildRegisterForm() +
        '</div>' +
      '</div>'
    );
  }

  function _buildRegisterForm() {
    return '' +
      '<div class="kb-form-group">' +
        '<label class="kb-label">Ad Soyad</label>' +
        '<input class="kb-input" type="text" id="reg-name" placeholder="Ahmet Yılmaz" autocomplete="name">' +
      '</div>' +
      '<div class="kb-form-group">' +
        '<label class="kb-label">E-posta</label>' +
        '<input class="kb-input" type="email" id="reg-email" placeholder="ornek@email.com" autocomplete="email">' +
      '</div>' +
      '<div class="kb-form-group">' +
        '<label class="kb-label">Şifre</label>' +
        '<div class="kb-input-wrap">' +
          '<input class="kb-input" type="password" id="reg-pass" placeholder="En az 6 karakter" autocomplete="new-password">' +
          '<button class="kb-input-wrap__icon" onclick="LoginScreens._togglePass(\'reg-pass\')">' + ICON.eye + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="kb-form-group">' +
        '<label class="kb-label">Rol</label>' +
        '<select class="kb-select" id="reg-role">' +
          '<option value="kurye">Kurye</option>' +
          '<option value="firma">Firma</option>' +
          '<option value="isletme">Esnaf / İşletme</option>' +
        '</select>' +
      '</div>' +
      '<div id="reg-err" class="kb-error-msg" style="display:none;margin-bottom:10px"></div>' +
      '<button class="btn btn--primary" onclick="LoginScreens._doRegister()" id="btn-reg">Kayıt Ol</button>' +
      '<div class="auth-divider">veya</div>' +
      '<button class="btn btn--google" onclick="LoginScreens._googleLogin()">' +
        '<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.3 0 24 0 14.8 0 6.9 5.4 3 13.3l7.9 6.1C12.7 13.2 17.9 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.7 6c4.5-4.2 7-10.4 7-17.2z"/><path fill="#FBBC05" d="M10.9 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6L2.4 13.3A23.8 23.8 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.4-6.2z"/><path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.7-6c-2 1.4-4.7 2.2-7.6 2.2-6 0-11.2-4.1-13-9.6l-7.9 6.1C6.9 42.6 14.8 48 24 48z"/></svg>' +
        'Google ile Devam Et' +
      '</button>';
  }

  /* Register shortcut from entry screen */
  function register(ctx) {
    showLogin();
    setTimeout(function () { _tab('kayit'); }, 150);
    if (ctx && ctx.query && ctx.query.role) {
      setTimeout(function () {
        var sel = document.getElementById('reg-role');
        if (sel) sel.value = ctx.query.role;
      }, 200);
    }
  }

  /* Tab switch */
  function _tab(which) {
    var gf = document.getElementById('giris-form');
    var kf = document.getElementById('kayit-form');
    var tg = document.getElementById('tab-giris');
    var tk = document.getElementById('tab-kayit');
    if (!gf) return;
    if (which === 'giris') {
      gf.style.display = '';
      kf.style.display = 'none';
      tg.classList.add('active');
      tk.classList.remove('active');
    } else {
      gf.style.display = 'none';
      kf.style.display = '';
      tg.classList.remove('active');
      tk.classList.add('active');
    }
  }

  function startRole(role) {
    _pendingRole = role;
    showLogin();
    setTimeout(function () {
      _tab('kayit');
      var sel = document.getElementById('reg-role');
      if (sel) sel.value = role;
    }, 150);
  }

  /* Toggle password visibility */
  function _togglePass(inputId) {
    var el = document.getElementById(inputId);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
  }

  /* Login submit */
  async function _doLogin() {
    var email = (document.getElementById('login-email') || {}).value || '';
    var pass  = (document.getElementById('login-pass')  || {}).value || '';
    var errEl = document.getElementById('login-err');
    var btn   = document.getElementById('btn-login');

    if (!email || !pass) {
      _showErr(errEl, 'E-posta ve şifre zorunlu.');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Giriş yapılıyor…';

    try {
      var result = await SB.signIn(email, pass);
      if (result && result.error) throw result.error;
      await _afterLogin();
    } catch (e) {
      _showErr(errEl, 'Giriş başarısız. Bilgileri kontrol et.');
      btn.disabled = false;
      btn.textContent = 'Giriş Yap';
    }
  }

  /* Register submit */
  async function _doRegister() {
    var name  = (document.getElementById('reg-name')  || {}).value || '';
    var email = (document.getElementById('reg-email') || {}).value || '';
    var pass  = (document.getElementById('reg-pass')  || {}).value || '';
    var role  = (document.getElementById('reg-role')  || {}).value || 'kurye';
    var errEl = document.getElementById('reg-err');
    var btn   = document.getElementById('btn-reg');

    if (!name || !email || !pass) {
      _showErr(errEl, 'Tüm alanlar zorunlu.');
      return;
    }
    if (pass.length < 6) {
      _showErr(errEl, 'Şifre en az 6 karakter olmalı.');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Kayıt olunuyor…';

    try {
      var result = await SB.signUp(email, pass, { full_name: name, role: role });
      if (result && result.error) throw result.error;
      toast('Hoş geldin! E-postanı doğrula.');
      await _afterLogin();
    } catch (e) {
      _showErr(errEl, 'Kayıt başarısız. Bu e-posta kullanılıyor olabilir.');
      btn.disabled = false;
      btn.textContent = 'Kayıt Ol';
    }
  }

  /* Google OAuth */
  async function _googleLogin() {
    try {
      await SB.signInWithGoogle();
    } catch (e) {
      toast('Google girişi başarısız.');
    }
  }

  /* After successful login: load profile, dispatch */
  async function _afterLogin() {
    var user    = await SB.getUser();
    APP.user    = user;
    var profile = await SB.myProfile();
    APP.profile = profile;
    APP.role    = (profile && profile.role) || 'kurye';

    document.body.setAttribute('data-role', APP.role);

    var $bn = document.getElementById('kb-bottomnav');
    if ($bn) {
      /* Rebuild nav for new role — reuse buildNav via app.js closure isn't accessible,
         so we redirect and let boot handle it */
    }
    Router.go('/' + APP.role + '/panel');
    /* Reload to re-run boot and rebuild nav */
    location.reload();
  }

  function _showErr(el, msg) {
    if (!el) { toast(msg); return; }
    el.textContent = msg;
    el.style.display = '';
  }

  /* Demo / geliştirme bypass — Supabase gerekmez */
  function demoLogin(role) {
    role = role || 'kurye';
    var names = { kurye: 'Kadir Yar', firma: 'ABC Lojistik', isletme: 'Lezzet Dükkânı' };
    APP.role    = role;
    APP.profile = { full_name: names[role] || 'Demo Kullanıcı', role: role, score: 4.8, yayinda: true };
    document.body.setAttribute('data-role', role);
    showLayout();
    if (window.renderNav) window.renderNav(role);
    Router.go('/' + role + '/panel');
  }

  return {
    entry       : entry,
    register    : register,
    showLogin   : showLogin,
    startRole   : startRole,
    demoLogin   : demoLogin,
    _tab        : _tab,
    _togglePass : _togglePass,
    _doLogin    : _doLogin,
    _doRegister : _doRegister,
    _googleLogin: _googleLogin
  };

})();
