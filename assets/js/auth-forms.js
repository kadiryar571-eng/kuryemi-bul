/* ============================================================
   KuryemiBul — auth-forms.js
   Giriş / kayıt formlarının TEK kaynağı.

   Bu dosya eskiden giris.html'in içine gömülü olan inline script'in
   yerini alır. Mantık birebir taşındı: aynı alanlar, aynı doğrulama
   kuralları, aynı hata metinleri, aynı giriş sonrası yönlendirme.

   KİMLİK DOĞRULAMA MOTORU BURADA DEĞİL. Bu dosya yalnız formu çizer ve
   kullanıcı girdisini toplar; işi supabase.js yapar:
     SB.signIn / SB.signUp / SB.signInWithGoogle / SB.myProfile
   Bu çağrılara, gönderilen alanlara veya API adreslerine DOKUNMAYIN.

   Google OAuth tam sayfa yönlendirmedir (supabase.js içinde
   redirectTo ile ayarlı). Modal içinden çağrılsa bile sayfa Google'a
   gider ve geri döner — bu kaçınılmazdır, "modalda kalsın" diye
   dolanbaçlı bir yol yazılmamalıdır.
   ============================================================ */
(function () {
  'use strict';

  var ICON_GOOGLE =
    '<svg width="18" height="18" viewBox="0 0 48 48" fill="none">' +
    '<path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.4 33.4 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 6 1.1 8.2 2.9l6-6C34.6 5.9 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.2-4z"/>' +
    '<path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.2 13 24 13c3.1 0 6 1.1 8.2 2.9l6-6C34.6 5.9 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>' +
    '<path fill="#FBBC04" d="M24 44c5.6 0 10.5-1.9 14.4-5.1l-6.7-5.5C29.8 35.1 27 36 24 36c-5.7 0-10.6-3.6-12.3-8.7l-7 5.4C8.2 39.5 15.5 44 24 44z"/>' +
    '<path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.7 2.3-2.1 4.2-3.9 5.6l6.7 5.5C42.8 36 44.7 30.5 44.7 24c0-1.3-.1-2.7-.2-4z"/></svg>';

  var ICON_EYE =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';

  /* Markup — giris.html'deki formun birebir aynısı.
     Alan id'leri BİLEREK korundu (login-email, reg-name, …): mevcut
     davranışla farkı kalmasın ve tarayıcı şifre yöneticileri aynı
     alanları tanımaya devam etsin. */
  function formsHTML() {
    return '' +
      '<div class="auth-tabs">' +
        '<button class="auth-tab active" id="tab-login" type="button">Giriş Yap</button>' +
        '<button class="auth-tab" id="tab-register" type="button">Kayıt Ol</button>' +
      '</div>' +

      '<div id="auth-alert" style="display:none" class="alert alert--error mb-16" role="alert"></div>' +

      '<button class="btn btn--social" id="google-btn" type="button">' +
        ICON_GOOGLE + ' Google ile devam et' +
      '</button>' +

      '<div class="auth-divider">veya</div>' +

      /* GİRİŞ FORMU */
      '<form id="login-form" class="form-group" novalidate>' +
        '<div class="field">' +
          '<label for="login-email">E-posta adresi</label>' +
          '<input type="email" id="login-email" name="email" placeholder="ornek@mail.com" autocomplete="email" required>' +
        '</div>' +
        '<div class="field">' +
          '<label for="login-password">Şifre</label>' +
          '<div class="input-group">' +
            '<input type="password" id="login-password" name="password" placeholder="••••••••" autocomplete="current-password" required>' +
            '<button type="button" class="toggle-pw" data-target="login-password" aria-label="Şifreyi göster">' + ICON_EYE + '</button>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<a href="sifre-sifirla.html" class="text-sm" style="color:var(--text-2)">Şifremi unuttum</a>' +
        '</div>' +
        '<button type="submit" class="btn btn--primary btn--block btn--lg" id="login-btn">Giriş Yap</button>' +
      '</form>' +

      /* KAYIT FORMU */
      '<form id="register-form" class="form-group" novalidate style="display:none">' +
        '<div class="field">' +
          '<label for="reg-name">Ad Soyad</label>' +
          '<input type="text" id="reg-name" name="ad" placeholder="Ali Yılmaz" autocomplete="name" required>' +
        '</div>' +
        '<div class="field">' +
          '<label for="reg-email">E-posta adresi</label>' +
          '<input type="email" id="reg-email" name="email" placeholder="ornek@mail.com" autocomplete="email" required>' +
        '</div>' +
        '<div class="field">' +
          '<label for="reg-phone">Telefon <span class="text-faint text-sm">(opsiyonel)</span></label>' +
          '<input type="tel" id="reg-phone" name="telefon" placeholder="05xx xxx xx xx" autocomplete="tel">' +
        '</div>' +
        '<div class="field">' +
          '<label for="reg-password">Şifre</label>' +
          '<div class="input-group">' +
            '<input type="password" id="reg-password" name="password" placeholder="En az 6 karakter" autocomplete="new-password" required minlength="6">' +
            '<button type="button" class="toggle-pw" data-target="reg-password" aria-label="Şifreyi göster">' + ICON_EYE + '</button>' +
          '</div>' +
        '</div>' +
        '<label class="check-label text-sm">' +
          '<input type="checkbox" id="reg-agree" required>' +
          '<span><a href="kvkk.html" target="_blank" rel="noopener">Gizlilik Politikası</a> ve <a href="sartlar.html" target="_blank" rel="noopener">Kullanım Şartlarını</a> kabul ediyorum</span>' +
        '</label>' +
        '<button type="submit" class="btn btn--primary btn--block btn--lg" id="register-btn">Hesap Oluştur</button>' +
      '</form>' +

      '<p class="auth-footer" id="auth-footer-text">' +
        'Henüz hesabın yok mu? <a href="#" id="footer-switch">Kayıt ol →</a>' +
      '</p>';
  }

  /* ─── Giriş sonrası yönlendirme ───────────────────────────────
     giris.html'deki afterAuth() ile BİREBİR aynı. Sırası önemli:
       rol yoksa      → onboarding
       ?next= varsa   → oraya (açık yönlendirmeye karşı safeNext'ten geçmiş)
       aksi hâlde     → rolün paneli
     Bu sırayı değiştirmeyin; korumalı bir sayfadan gelen kullanıcı
     giriş sonrası geldiği yere dönmeyi bekliyor. */
  function afterAuth(profile) {
    var role = profile && profile.role;
    if (!role) { location.href = 'onboarding.html'; return; }

    var next = (window.KB && KB.nextParam) ? KB.nextParam() : '';
    if (next) { if (KB.clearNext) KB.clearNext(); location.href = next; return; }

    if (window.KB && KB.roleToPanel) { location.href = KB.roleToPanel(role); }
    else { location.href = 'panel-' + role + '.html'; }
  }

  function sbReady() { return !!(window.SB && SB.isOn()); }

  /* ─── Formu bir kaba yerleştir ve bağla ───────────────────────
     container : formların içine çizileceği element
     opts.mode : 'login' | 'register'  (başlangıç sekmesi)
     opts.hintEl : opsiyonel — sekmeye göre metni değişen ipucu elementi
                   (giris.html'in header'ındaki gibi; modalda yok)
     Döndürür: { showLogin, showRegister, focusFirst, reset } */
  function mount(container, opts) {
    if (!container) return null;
    opts = opts || {};
    container.innerHTML = formsHTML();

    var loginForm    = container.querySelector('#login-form');
    var registerForm = container.querySelector('#register-form');
    var tabLogin     = container.querySelector('#tab-login');
    var tabReg       = container.querySelector('#tab-register');
    var footerText   = container.querySelector('#auth-footer-text');
    var alertEl      = container.querySelector('#auth-alert');
    var hintEl       = opts.hintEl || null;

    /* ── Uyarı kutusu ── */
    function showAlert(msg, type) {
      alertEl.textContent = msg;                       // textContent: kaçış gerekmez
      alertEl.className = 'alert alert--' + (type || 'error') + ' mb-16';
      alertEl.style.display = '';
    }
    function clearAlert() { alertEl.style.display = 'none'; alertEl.textContent = ''; }

    /* ── Sekme geçişi ── */
    function bindSwitchLinks() {
      var toReg   = (hintEl && hintEl.querySelector('#switch-to-register')) || null;
      var toLogin = (hintEl && hintEl.querySelector('#switch-to-login')) || null;
      var fSwitch = container.querySelector('#footer-switch');
      if (toReg)   toReg.addEventListener('click',   function (e) { e.preventDefault(); showRegister(); });
      if (toLogin) toLogin.addEventListener('click', function (e) { e.preventDefault(); showLogin(); });
      if (fSwitch) fSwitch.addEventListener('click', function (e) {
        e.preventDefault();
        loginForm.style.display !== 'none' ? showRegister() : showLogin();
      });
    }

    function showLogin() {
      loginForm.style.display    = '';
      registerForm.style.display = 'none';
      tabLogin.classList.add('active');
      tabReg.classList.remove('active');
      if (hintEl) hintEl.innerHTML = 'Hesabın yok mu? <a href="#" id="switch-to-register">Kayıt ol</a>';
      footerText.innerHTML = 'Henüz hesabın yok mu? <a href="#" id="footer-switch">Kayıt ol →</a>';
      bindSwitchLinks();
      clearAlert();
    }
    function showRegister() {
      loginForm.style.display    = 'none';
      registerForm.style.display = '';
      tabLogin.classList.remove('active');
      tabReg.classList.add('active');
      if (hintEl) hintEl.innerHTML = 'Zaten hesabın var mı? <a href="#" id="switch-to-login">Giriş yap</a>';
      footerText.innerHTML = 'Zaten hesabın var mı? <a href="#" id="footer-switch">Giriş yap →</a>';
      bindSwitchLinks();
      clearAlert();
    }

    tabLogin.addEventListener('click', showLogin);
    tabReg.addEventListener('click', showRegister);
    bindSwitchLinks();

    /* ── Şifre göster/gizle ──
       Dinleyici document'a değil KABA bağlanır: mount() birden fazla kez
       çağrılırsa document'ta biriken kopya dinleyici kalmasın. */
    container.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.toggle-pw') : null;
      if (!btn || !container.contains(btn)) return;
      var inp = container.querySelector('#' + btn.getAttribute('data-target'));
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });

    /* ── Google OAuth ──
       Tam sayfa yönlendirme. supabase.js'teki yapılandırma aynen kullanılır. */
    var googleBtn = container.querySelector('#google-btn');
    googleBtn.addEventListener('click', async function () {
      if (!sbReady()) { showAlert('Bağlantı yok — lütfen sayfayı yenile.'); return; }
      var btn = this;
      btn.disabled = true;
      var eski = btn.innerHTML;
      btn.textContent = 'Yükleniyor…';
      try { await SB.signInWithGoogle(); }
      catch (e) {
        showAlert(e.message || 'Bir hata oluştu.');
        btn.disabled = false; btn.innerHTML = eski;
      }
    });

    /* ── Giriş formu ── */
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearAlert();
      var email = container.querySelector('#login-email').value.trim();
      var pw    = container.querySelector('#login-password').value;
      if (!email || !pw) { showAlert('E-posta ve şifre gereklidir.'); return; }

      var btn = container.querySelector('#login-btn');
      btn.classList.add('is-loading'); btn.disabled = true;

      try {
        if (!sbReady()) throw new Error('Sunucuya bağlanılamadı.');
        var res = await SB.signIn(email, pw);
        if (res && res.error) throw res.error;
        var profile = await SB.myProfile();
        afterAuth(profile);
      } catch (err) {
        var msg = err && err.message;
        if (msg && (msg.includes('Invalid') || msg.includes('credentials') || msg.includes('password'))) msg = 'E-posta veya şifre hatalı.';
        else if (msg && msg.includes('Email not confirmed')) msg = 'E-posta adresinizi doğrulamadınız. Gelen kutunuzu kontrol edin.';
        showAlert(msg || 'Giriş yapılamadı.');
        btn.classList.remove('is-loading'); btn.disabled = false;
      }
    });

    /* ── Kayıt formu ── */
    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearAlert();
      var ad     = container.querySelector('#reg-name').value.trim();
      var email  = container.querySelector('#reg-email').value.trim();
      var tel    = container.querySelector('#reg-phone').value.trim();
      var pw     = container.querySelector('#reg-password').value;
      var agreed = container.querySelector('#reg-agree').checked;

      if (!ad)     { showAlert('Ad Soyad gereklidir.'); return; }
      if (!email)  { showAlert('E-posta gereklidir.'); return; }
      if (pw.length < 6) { showAlert('Şifre en az 6 karakter olmalıdır.'); return; }
      if (!agreed) { showAlert('Devam etmek için şartları kabul etmelisiniz.'); return; }

      var btn = container.querySelector('#register-btn');
      btn.classList.add('is-loading'); btn.disabled = true;

      try {
        if (!sbReady()) throw new Error('Sunucuya bağlanılamadı.');
        var res = await SB.signUp(email, pw, ad, tel);
        if (res && res.error) throw res.error;
        location.href = 'verify-email.html?email=' + encodeURIComponent(email);
      } catch (err) {
        var msg = err && err.message;
        if (msg && msg.includes('already registered')) msg = 'Bu e-posta adresi zaten kayıtlı.';
        showAlert(msg || 'Kayıt olunamadı.');
        btn.classList.remove('is-loading'); btn.disabled = false;
      }
    });

    if (opts.mode === 'register') showRegister(); else showLogin();

    var api = {
      showLogin: showLogin,
      showRegister: showRegister,
      clearAlert: clearAlert,
      isRegister: function () { return registerForm.style.display !== 'none'; },
      focusFirst: function () {
        var el = registerForm.style.display !== 'none'
          ? container.querySelector('#reg-name')
          : container.querySelector('#login-email');
        if (el) el.focus();
      }
    };
    return api;
  }

  window.KBAuthForms = {
    mount: mount,
    afterAuth: afterAuth,
    formsHTML: formsHTML
  };
}());
