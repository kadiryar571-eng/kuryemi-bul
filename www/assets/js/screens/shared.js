/* ============================================================
   KuryemiBul — screens/shared.js
   Paylaşılan ekranlar: Bildirimler, Favoriler, Ayarlar, Yardım
   ============================================================ */
window.SharedScreens = (function () {
  'use strict';

  /* ── Bildirimler ────────────────────────────────────────── */
  function bildirimler() {
    showAppBar('Bildirimler', true,
      '<button class="kb-appbar__action" style="font-size:.72rem;white-space:nowrap" onclick="SharedScreens._notifReadAll()">Tümü Okundu</button>'
    );
    showBottomNav();

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div id="notif-list"><div style="padding:32px 0;text-align:center"><div class="kb-spinner"></div></div></div>' +
      '</div>'
    );

    setTimeout(function () { _loadNotifs(); }, 130);
  }

  function _notifRelTime(iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)   return 'Az önce';
    if (diff < 3600) return Math.floor(diff / 60) + ' dk önce';
    if (diff < 86400) return Math.floor(diff / 3600) + ' saat önce';
    return Math.floor(diff / 86400) + ' gün önce';
  }

  function _notifHtml(list) {
    if (!list.length) {
      return '<div class="kb-empty"><div class="kb-empty__icon">🔔</div><div class="kb-empty__title">Bildirim yok</div><div class="kb-empty__sub">Yeni bildirimler burada görünür.</div></div>';
    }
    var typeIcon = { new_application:'📋', new_message:'💬', offer:'🤝', success:'✅', warning:'⚠️', error:'❌', system:'⚙️', info:'ℹ️' };
    return '<div class="kb-card" style="padding:0 16px">' +
      list.map(function (n) {
        var isRead = !!n.read_at;
        var icon = typeIcon[n.type] || '🔔';
        return '<div class="notif-item" style="cursor:pointer" onclick="SharedScreens._notifTap(\'' + n.id + '\',\'' + (n.link || '').replace(/'/g,"\\'") + '\')">' +
          '<div class="notif-item__dot' + (isRead ? ' notif-item__dot--read' : '') + '"></div>' +
          '<div style="font-size:1.1rem;margin-right:10px;flex:none">' + icon + '</div>' +
          '<div class="notif-item__text">' +
            '<div class="notif-item__title">' + n.title + '</div>' +
            (n.body ? '<div class="notif-item__sub">' + n.body + '</div>' : '') +
          '</div>' +
          '<div class="notif-item__time">' + _notifRelTime(n.created_at) + '</div>' +
        '</div>';
      }).join('') +
    '</div>';
  }

  async function _loadNotifs() {
    var list_el = document.getElementById('notif-list');
    if (!list_el) return;
    try {
      var items = (window.SB && SB.isOn()) ? await SB.myNotifications(40) : [];
      if (list_el) list_el.innerHTML = _notifHtml(items);
    } catch(e) {
      if (list_el) list_el.innerHTML = '<div class="kb-empty"><div class="kb-empty__icon">⚠️</div><div class="kb-empty__title">Yüklenemedi</div><div class="kb-empty__sub">Tekrar deneyin.</div></div>';
    }
  }

  function _notifTap(id, link) {
    if (window.SB && SB.isOn()) SB.markNotificationRead(id).catch(function(){});
    var dot = document.querySelector('[onclick*="' + id + '"] .notif-item__dot');
    if (dot) dot.classList.add('notif-item__dot--read');
    if (link) setTimeout(function(){ Router.go(link); }, 120);
  }

  async function _notifReadAll() {
    if (window.SB && SB.isOn()) {
      try { await SB.markAllNotificationsRead(); } catch(e) {}
    }
    document.querySelectorAll('.notif-item__dot').forEach(function(el){ el.classList.add('notif-item__dot--read'); });
    toast('Tümü okundu işaretlendi');
  }

  /* ── Şifre Sıfırlama (/sifre-sifirla) ─────────────────── */
  function sifreSifirla(ctx) {
    /* URL hash'teki token Supabase tarafından otomatik işlenir.
       Bu ekran yeni şifre girme formu gösterir (oturum zaten açık). */
    var $appbar = document.getElementById('kb-appbar');
    if ($appbar) $appbar.style.display = 'none';
    hideBottomNav();

    renderScreen(
      '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px">' +
        '<div style="width:100%;max-width:360px">' +
          '<div style="text-align:center;margin-bottom:32px">' +
            '<div style="font-size:2.4rem;margin-bottom:8px">🔐</div>' +
            '<div style="font-size:1.3rem;font-weight:700;margin-bottom:6px">Yeni Şifre Belirle</div>' +
            '<div style="font-size:.84rem;color:var(--muted)">Güçlü bir şifre seçin.</div>' +
          '</div>' +

          '<div class="kb-card" style="margin-bottom:12px">' +
            '<div style="margin-bottom:12px">' +
              '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Yeni Şifre</label>' +
              '<input id="sp-pass1" class="kb-input" type="password" placeholder="En az 6 karakter">' +
            '</div>' +
            '<div>' +
              '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Şifre Tekrar</label>' +
              '<input id="sp-pass2" class="kb-input" type="password" placeholder="Aynı şifreyi girin">' +
            '</div>' +
          '</div>' +

          '<button id="sp-btn" class="btn btn--primary" onclick="SharedScreens._doSifreSifirla()">Şifremi Güncelle</button>' +
          '<div id="sp-error" style="display:none;margin-top:12px;padding:12px;background:rgba(239,68,68,.12);border-radius:10px;color:#EF4444;font-size:.84rem;text-align:center"></div>' +
        '</div>' +
      '</div>'
    );
  }

  async function _doSifreSifirla() {
    var btn   = document.getElementById('sp-btn');
    var errEl = document.getElementById('sp-error');
    var p1    = (document.getElementById('sp-pass1') || {}).value || '';
    var p2    = (document.getElementById('sp-pass2') || {}).value || '';

    if (errEl) errEl.style.display = 'none';

    if (p1.length < 6) {
      if (errEl) { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; errEl.style.display = 'block'; }
      return;
    }
    if (p1 !== p2) {
      if (errEl) { errEl.textContent = 'Şifreler eşleşmiyor.'; errEl.style.display = 'block'; }
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = 'Güncelleniyor…'; }

    try {
      var r = await SB.updatePassword(p1);
      if (r && r.error) throw r.error;
      toast('Şifren güncellendi! Giriş yapabilirsin.');
      setTimeout(function(){ Router.go('/login'); }, 1200);
    } catch(e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Şifremi Güncelle'; }
      if (errEl) { errEl.textContent = (e && e.message) || 'Bir hata oluştu. Bağlantı linki geçersiz olabilir.'; errEl.style.display = 'block'; }
    }
  }

  /* ── Email Doğrulama (/verify-email) ──────────────────── */
  function verifyEmail(ctx) {
    var $appbar = document.getElementById('kb-appbar');
    if ($appbar) $appbar.style.display = 'none';
    hideBottomNav();

    renderScreen(
      '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px">' +
        '<div style="width:100%;max-width:360px;text-align:center">' +
          '<div style="font-size:2.8rem;margin-bottom:16px">📬</div>' +
          '<div id="ve-title" style="font-size:1.3rem;font-weight:700;margin-bottom:8px">Email Doğrulanıyor…</div>' +
          '<div id="ve-sub" style="font-size:.84rem;color:var(--muted);line-height:1.6">Lütfen bekleyin.</div>' +
          '<div id="ve-spinner" style="margin-top:24px"><div class="kb-spinner"></div></div>' +
          '<button id="ve-btn" class="btn btn--primary" style="display:none;margin-top:24px" onclick="Router.go(\'/login\')">Giriş Yap</button>' +
        '</div>' +
      '</div>'
    );

    /* Supabase onAuthStateChange SIGNED_IN olarak tetikler — sadece UI güncelle */
    if (window.SB && SB.onAuthChange) {
      SB.onAuthChange(function(event) {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          _veSuccess();
        }
      });
    }

    /* Kısa süre bekleyip kullanıcı oturumunu kontrol et */
    setTimeout(async function() {
      try {
        var user = await SB.getUser();
        if (user) { _veSuccess(); return; }
      } catch(e) {}
      _veFail();
    }, 3000);
  }

  function _veSuccess() {
    var title = document.getElementById('ve-title');
    var sub   = document.getElementById('ve-sub');
    var spin  = document.getElementById('ve-spinner');
    var btn   = document.getElementById('ve-btn');
    if (title) { title.textContent = 'Email Doğrulandı! ✓'; title.style.color = '#22C55E'; }
    if (sub)   sub.textContent = 'Hesabın aktif. Şimdi giriş yapabilirsin.';
    if (spin)  spin.style.display = 'none';
    if (btn)   btn.style.display = 'block';
    setTimeout(function(){ Router.go('/login'); }, 2500);
  }

  function _veFail() {
    var title = document.getElementById('ve-title');
    var sub   = document.getElementById('ve-sub');
    var spin  = document.getElementById('ve-spinner');
    var btn   = document.getElementById('ve-btn');
    if (title) { title.textContent = 'Doğrulama Başarısız'; title.style.color = '#EF4444'; }
    if (sub)   sub.innerHTML = 'Bağlantı geçersiz veya süresi dolmuş.<br>Yeni doğrulama linki ister misin?';
    if (spin)  spin.style.display = 'none';
    if (btn)   { btn.style.display = 'block'; btn.textContent = 'Giriş Sayfasına Dön'; }
  }

  /* ── Favoriler ──────────────────────────────────────────── */
  function favoriler() {
    showAppBar('Favorilerim', true);
    showBottomNav();

    var role = APP.role || 'kurye';

    var ilanFavs = [
      { id: '1', title: 'Motorlu Kurye', company: 'ABC Lojistik', salary: '28.000 - 33.000 ₺' },
      { id: '2', title: 'Yaya Kurye',    company: 'XYZ Kargo',    salary: '15.000 - 22.000 ₺' }
    ];

    var adayFavs = [
      { id: '1', name: 'Mehmet Kaya', exp: '3 yıl motorlu kurye', score: '4.8' },
      { id: '2', name: 'Ayşe Demir', exp: '2 yıl yaya kurye',    score: '4.7' }
    ];

    var isKurye = role === 'kurye';
    var items   = isKurye ? ilanFavs : adayFavs;

    renderScreen(
      '<div class="kb-screen-inner">' +
        (items.length === 0 ?
          '<div class="kb-empty"><div class="kb-empty__icon">❤️</div><div class="kb-empty__title">Favori yok</div><div class="kb-empty__sub">Beğendiğin ilanları favorilere ekle.</div></div>' :
          items.map(function (item) {
            if (isKurye) {
              return '<div class="job-card kb-card--pressable" onclick="Router.go(\'/kurye/ilan/' + item.id + '\')">' +
                '<div class="job-card__top">' +
                  '<div class="job-card__avatar">🏢</div>' +
                  '<div class="job-card__info">' +
                    '<div class="job-card__title">' + item.title + '</div>' +
                    '<div class="job-card__company">' + item.company + '</div>' +
                  '</div>' +
                  '<div class="job-card__salary">' + item.salary + '</div>' +
                '</div>' +
              '</div>';
            } else {
              return '<div class="person-card kb-card--pressable">' +
                '<div class="kb-avatar">' + initials(item.name) + '</div>' +
                '<div class="person-card__info">' +
                  '<div class="person-card__name">' + item.name + '</div>' +
                  '<div class="person-card__sub">' + item.exp + '</div>' +
                  '<div class="person-card__meta"><span class="kb-stars">' + ICON.star + item.score + '</span></div>' +
                '</div>' +
                ICON.chevron +
              '</div>';
            }
          }).join('')
        ) +
      '</div>'
    );
  }

  /* ── Ayarlar ────────────────────────────────────────────── */
  function ayarlar() {
    showAppBar('Ayarlar', true);
    showBottomNav();

    renderScreen(
      '<div class="kb-screen-inner">' +

        '<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px">Hesap</div>' +
        '<div class="kb-card" style="padding:0 16px;margin-bottom:16px">' +
          _settingItem('Profil Düzenle',     'user',     function(){ Router.go('/profil-duzenle'); }) +
          _settingItem('Şifre Değiştir',     'shield',   function(){}) +
          _settingItem('Bildirim Ayarları',  'bell',     function(){}) +
        '</div>' +

        '<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px">Uygulama</div>' +
        '<div class="kb-card" style="padding:0 16px;margin-bottom:16px">' +
          '<div class="profile-menu-item" style="padding:14px 0">' +
            '<div class="profile-menu-item__icon">' + ICON.settings + '</div>' +
            '<div class="profile-menu-item__label">Dil</div>' +
            '<div style="display:flex;gap:6px">' +
              '<button class="kb-chip kb-chip--accent" id="lang-tr" onclick="SharedScreens._setLang(\'tr\')">TR</button>' +
              '<button class="kb-chip" id="lang-en" onclick="SharedScreens._setLang(\'en\')">EN</button>' +
            '</div>' +
          '</div>' +
          '<div class="profile-menu-item" style="padding:14px 0;border-top:1px solid var(--border)">' +
            '<div class="profile-menu-item__icon">' + ICON.settings + '</div>' +
            '<div class="profile-menu-item__label">Tema</div>' +
            '<div style="display:flex;gap:6px">' +
              '<button class="kb-chip kb-chip--accent" onclick="SharedScreens._setTheme(\'light\')">Açık</button>' +
              '<button class="kb-chip" onclick="SharedScreens._setTheme(\'dark\')">Koyu</button>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px">Yasal</div>' +
        '<div class="kb-card" style="padding:0 16px;margin-bottom:16px">' +
          _settingItem('Gizlilik Politikası', 'doc', function(){}) +
          _settingItem('Kullanım Koşulları',  'doc', function(){}) +
          _settingItem('KVKK',               'doc', function(){}) +
        '</div>' +

        '<button class="btn btn--danger mt-12" onclick="signOut()">Çıkış Yap</button>' +

        '<div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--c-danger);margin:20px 0 8px">Tehlikeli Bölge</div>' +
        '<div class="kb-card" style="padding:16px">' +
          '<div style="font-size:.82rem;color:var(--muted);margin-bottom:12px">Hesabını silersen profilin, ilanların, mesajların ve tüm verilerin kalıcı olarak silinir. Bu işlem geri alınamaz.</div>' +
          '<button class="btn btn--danger" onclick="SharedScreens._deleteAccount()">Hesabımı Kalıcı Olarak Sil</button>' +
        '</div>' +

        '<p class="text-center fs-sm text-muted mt-12">KuryemiBul v2.0</p>' +
      '</div>'
    );
  }

  function _deleteAccount() {
    if (!confirm('Hesabını kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.')) return;
    if (!confirm('Son onay: profilin, ilanların, mesajların ve tüm verilerin silinecek. Devam edilsin mi?')) return;
    (async function () {
      try {
        if (!window.SB || !SB.isOn()) { toast('Bu işlem çevrimiçi mod gerektirir'); return; }
        await SB.deleteMyData();
        toast('Hesabın silindi');
        APP.user = APP.profile = APP.role = null;
        document.body.removeAttribute('data-role');
        Router.go('/login');
      } catch (e) {
        toast('Hesap silinemedi, tekrar dene');
      }
    })();
  }

  function _settingItem(label, icon, fn) {
    return '<div class="profile-menu-item" style="padding:14px 0" onclick="(' + fn + ')()">' +
      '<div class="profile-menu-item__icon">' + ICON[icon] + '</div>' +
      '<div class="profile-menu-item__label">' + label + '</div>' +
      '<div class="profile-menu-item__chevron">' + ICON.chevron + '</div>' +
    '</div>';
  }

  function _setLang(lang) {
    localStorage.setItem('kb_lang', lang);
    toast(lang === 'tr' ? 'Dil: Türkçe' : 'Language: English');
  }

  function _setTheme(theme) {
    localStorage.setItem('kb_theme', theme);
    toast(theme === 'dark' ? 'Koyu tema seçildi' : 'Açık tema seçildi');
  }

  /* ── Yardım & Destek ────────────────────────────────────── */
  function yardim() {
    showAppBar('Yardım & Destek', true);
    showBottomNav();

    var faqs = [
      { q: 'Nasıl iş ilanına başvurabilirim?',       a: 'İlanlar sekmesinden ilgilendiğiniz ilanı açıp "Başvur" butonuna basın.' },
      { q: 'Profilimi nasıl doğrulatırım?',          a: 'Kimlik & Belgeler menüsünden belgelerinizi yükleyin. 24 saat içinde doğrulanır.' },
      { q: 'Bir firmayı nasıl şikayet edebilirim?',  a: 'İlan veya profil sayfasında "Şikayet Et" seçeneğini kullanın.' },
      { q: 'Mesajlaşma ücretsiz mi?',                a: 'Evet, tüm mesajlaşma özellikleri ücretsizdir.' },
      { q: 'Bildirimler neden gelmiyor?',            a: 'Ayarlar > Bildirim Ayarları bölümünden kontrol edin.' }
    ];

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-card" style="text-align:center;margin-bottom:20px;padding:24px">' +
          '<div style="font-size:2rem;margin-bottom:8px">🤝</div>' +
          '<div style="font-weight:700;margin-bottom:4px">Size nasıl yardımcı olabiliriz?</div>' +
          '<div style="font-size:.82rem;color:var(--muted)">Sık sorulan sorular aşağıda.</div>' +
        '</div>' +

        '<div style="font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px">SSS</div>' +
        '<div id="faq-list">' +
          faqs.map(function (f, i) {
            return '<div class="kb-card" style="margin-bottom:8px;cursor:pointer" onclick="SharedScreens._faqToggle(' + i + ')">' +
              '<div class="flex items-center justify-between">' +
                '<div style="font-weight:600;font-size:.88rem;flex:1;padding-right:8px">' + f.q + '</div>' +
                ICON.chevron +
              '</div>' +
              '<div id="faq-ans-' + i + '" style="display:none;margin-top:10px;font-size:.82rem;color:var(--muted);line-height:1.6">' + f.a + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +

        '<div class="kb-card" style="margin-top:16px;text-align:center">' +
          '<div style="font-weight:700;margin-bottom:8px">Hâlâ yardıma mı ihtiyacınız var?</div>' +
          '<a href="mailto:destek@kuryemibul.com" class="btn btn--outline" style="--c-accent:var(--c-kurye)">E-posta Gönder</a>' +
        '</div>' +
      '</div>'
    );
  }

  function _faqToggle(i) {
    var el = document.getElementById('faq-ans-' + i);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
  }

  /* ── SHARED PREMIUM PANEL ───────────────────────────────── */

  function premDashPanel(cfg) {
    var stats = (cfg.stats || []).map(function (s) {
      var numHtml = s.id ? '<span id="' + s.id + '">' + s.num + '</span>' : s.num;
      return '<div class="prem-stat prem-stat--' + s.color + '" onclick="Router.go(\'' + s.route + '\')">' +
        '<div class="prem-stat__top">' +
          '<div class="prem-stat__num prem-stat__num--' + s.color + '">' + numHtml + '</div>' +
          '<div class="prem-stat__icon prem-stat__icon--' + s.color + '">' + ICON[s.icon] + '</div>' +
        '</div>' +
        '<div class="prem-stat__label">' + s.label + '</div>' +
        '<div class="prem-stat__action">' + s.action + ICON.chevron + '</div>' +
      '</div>';
    }).join('');

    return '<div class="prem-dash">' +
      '<div class="prem-hero" onclick="Router.go(\'' + (cfg.heroRoute || '/') + '\')">' +
        '<div class="prem-hero__deco1"></div>' +
        '<div class="prem-hero__deco2"></div>' +
        '<div class="prem-hero__shine"></div>' +
        '<div class="prem-hero__badge">' + (cfg.heroBadge || '') + '</div>' +
        '<div class="prem-hero__body">' +
          '<div class="prem-hero__label">' + (cfg.heroTitle || '') + '</div>' +
          '<div class="prem-hero__score-row">' +
            '<span class="prem-hero__score-big">' + (cfg.heroScoreBig || '—') + '</span>' +
            '<span class="prem-hero__score-denom">' + (cfg.heroDenom || '') + '</span>' +
          '</div>' +
          '<p class="prem-hero__desc">' + (cfg.heroDesc || '') + '</p>' +
          '<button class="prem-hero__cta" onclick="event.stopPropagation();Router.go(\'' + (cfg.heroCtaRoute || '/') + '\')">' +
            (cfg.heroCtaLabel || 'Görüntüle') + ' ' + ICON.chevron +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="prem-stats">' + stats + '</div>' +
      (cfg.upgradeBanner ?
        '<div class="prem-upgrade">' +
          '<div class="prem-upgrade__content">' +
            '<div class="prem-upgrade__pill">' + ICON.star + ' Premium</div>' +
            '<div class="prem-upgrade__title">Premium\'a Geç, Öne Çık</div>' +
            '<div class="prem-upgrade__sub">İlanlarınızı öne çıkarın, daha fazla adaya ulaşın.</div>' +
          '</div>' +
          '<button class="prem-upgrade__btn">Detayları Gör</button>' +
        '</div>' : '') +
      (cfg.contentHtml || '') +
    '</div>';
  }

  /* ── SHARED MESSAGING ENGINE ─────────────────────────────── */

  var _activeChatState = { _convId: null, _myUserId: null, _realtimeCh: null };

  function _sharedConvCard(c, rolePrefix) {
    var roleEmoji = c.otherRole === 'isletme' ? '🏢' : c.otherRole === 'firma' ? '🏭' : '🛵';
    var roleBg    = c.otherRole === 'isletme' ? '#F97316' : c.otherRole === 'firma' ? '#22C55E' : '#6C4DFF';
    var time = '';
    if (c.lastMessageAt) {
      var d = new Date(c.lastMessageAt);
      time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    var searchText = ((c.otherName || '') + ' ' + (c.listingTitle || '') + ' ' + (c.lastMessage || '')).toLowerCase();
    return '<div class="msg-conv" onclick="Router.go(\'/' + rolePrefix + '/mesaj/' + c.id + '\')" data-search="' + searchText + '">' +
      '<div class="msg-conv__bar" style="background:' + roleBg + '"></div>' +
      '<div class="msg-conv__ava" style="background:' + roleBg + '">' +
        roleEmoji +
        '<div class="msg-conv__online" style="display:none"></div>' +
      '</div>' +
      '<div class="msg-conv__body">' +
        '<div class="msg-conv__top">' +
          '<div class="msg-conv__name">' + c.otherName + '</div>' +
          '<div class="msg-conv__time">' + time + '</div>' +
        '</div>' +
        '<div class="msg-conv__job">' +
          '<span class="msg-conv__badge--standart">Başvuru</span>' +
          ' ' + (c.listingTitle || 'İlan') +
        '</div>' +
        '<div class="msg-conv__preview">' + (c.lastMessage || 'Yeni konuşma') + '</div>' +
        (c.listingSehir ? '<div class="msg-conv__meta">📍 ' + c.listingSehir + '</div>' : '') +
      '</div>' +
      (c.unread > 0 ? '<div class="msg-conv__unread">' + c.unread + '</div>' : '') +
    '</div>';
  }

  function _msgSearchToggle() {
    var bar = document.getElementById('msg-search-bar');
    if (!bar) return;
    var inp = document.getElementById('msg-search-inp');
    if (bar.style.display === 'none' || !bar.style.display) {
      bar.style.display = 'flex';
      if (inp) inp.focus();
    } else {
      bar.style.display = 'none';
      if (inp) inp.value = '';
      _msgSearchFilter('');
    }
  }

  function _msgSearchFilter(q) {
    var list = document.getElementById('msg-list');
    if (!list) return;
    var cards = list.querySelectorAll('.msg-conv');
    var lower = (q || '').toLowerCase().trim();
    var found = 0;
    cards.forEach(function (el) {
      var hay = el.getAttribute('data-search') || '';
      var show = !lower || hay.indexOf(lower) !== -1;
      el.style.display = show ? '' : 'none';
      if (show) found++;
    });
    var empty = document.getElementById('msg-search-empty');
    if (empty) empty.style.display = lower && found === 0 ? 'flex' : 'none';
  }

  function _sharedLoadConvsAsync(rolePrefix) {
    if (!window.SB || !SB.isOn()) return;
    SB.myConvs().then(function (convs) {
      if (!convs || !convs.length) return;
      var el = document.getElementById('msg-list');
      if (el) el.innerHTML = convs.map(function (c) { return _sharedConvCard(c, rolePrefix); }).join('');
      var total = convs.reduce(function (s, c) { return s + (c.unread || 0); }, 0);
      var tab = document.querySelector('#msg-tabs .msg-tab[data-tab="tumu"]');
      if (tab && total) tab.innerHTML = 'Tümü <span class="msg-tab__badge">' + total + '</span>';
    }).catch(function (e) { console.warn('sharedConvsAsync:', e); });
  }

  function _sharedChatFooterHTML() {
    return '<div class="chat-footer">' +
      '<div class="chat-quick">' +
        '<button class="chat-quick__btn" onclick="SharedScreens.chatQuick(\'konum\')">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Konum Paylaş' +
        '</button>' +
        '<button class="chat-quick__btn" onclick="SharedScreens.chatQuick(\'uygun\')">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Uygunluk Bildir' +
        '</button>' +
        '<button class="chat-quick__btn" onclick="SharedScreens.chatQuick(\'belge\')">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Belge Gönder' +
        '</button>' +
      '</div>' +
      '<div class="chat-input-wrap">' +
        '<div class="chat-input-row">' +
          '<button class="chat-input__icon" onclick="SharedScreens.chatQuick(\'ekle\')">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>' +
          '</button>' +
          '<input type="text" class="chat-input__field" id="chat-input-field" placeholder="Mesajınızı yazın..." autocomplete="off" onkeydown="if(event.key===\'Enter\'){SharedScreens.chatSend();}">' +
          '<button class="chat-input__icon" onclick="SharedScreens.chatQuick(\'emoji\')">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' +
          '</button>' +
          '<button class="chat-send" onclick="SharedScreens.chatSend()">' + ICON.send + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-smart">' +
        '<button class="chat-smart__btn" onclick="SharedScreens.chatQuick(\'belge\')">' +
          '<div class="chat-smart__icon">📄</div><div class="chat-smart__label">Belge Gönder</div>' +
        '</button>' +
        '<button class="chat-smart__btn chat-smart__btn--primary" onclick="SharedScreens.chatQuick(\'konum\')">' +
          '<div class="chat-smart__icon">📍</div><div class="chat-smart__label">Konum Paylaş</div>' +
        '</button>' +
        '<button class="chat-smart__btn" onclick="SharedScreens.chatQuick(\'plan\')">' +
          '<div class="chat-smart__icon">📅</div><div class="chat-smart__label">Görüşme Planla</div>' +
        '</button>' +
        '<button class="chat-smart__btn" onclick="SharedScreens.chatQuick(\'gorusme\')">' +
          '<div class="chat-smart__icon">🎯</div><div class="chat-smart__label">Görüşmeye Davet</div>' +
        '</button>' +
        '<button class="chat-smart__btn chat-smart__btn--offer" onclick="SharedScreens.chatQuick(\'teklif\')">' +
          '<div class="chat-smart__icon">⭐</div><div class="chat-smart__label">Teklifler</div>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function _sharedChatMsgBubble(m, myUserId) {
    if (m.message_type === 'system') {
      return '<div class="chat-date-sep chat-system-msg"><span>' + (m.content || '') + '</span></div>';
    }
    if (m.message_type === 'webrtc_call') {
      var meta = m.metadata || {};
      var isOut = m.sender_user === myUserId;
      var icon = meta.callType === 'video' ? '📹' : '📞';
      var label = isOut ? (meta.callType === 'video' ? 'Görüntülü arama başlatıldı' : 'Sesli arama başlatıldı') : (meta.callType === 'video' ? 'Gelen görüntülü arama' : 'Gelen sesli arama');
      return '<div class="chat-date-sep"><span>' + icon + ' ' + label + '</span></div>';
    }
    if (m.message_type === 'profile_card') {
      var meta = m.metadata || {};
      var sevBadge = meta.seviye === 'premium' ? '⭐ Premium' : meta.seviye === 'profesyonel' ? '🔵 Profesyonel' : 'Standart';
      return '<div class="chat-bubble chat-bubble--in">' +
        '<div class="chat-pcard">' +
          '<div class="chat-pcard__head">' +
            '<div class="chat-pcard__ava">🛵</div>' +
            '<div class="chat-pcard__info">' +
              '<div class="chat-pcard__name">' + (meta.ad || 'Aday') + '</div>' +
              '<div class="chat-pcard__lvl">' + sevBadge + '</div>' +
              '<div class="chat-pcard__sub">⭐ ' + (meta.puan || '0') + ' · ' + (meta.sehir || '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="chat-pcard__stats">' +
            '<div class="chat-pcard__stat"><span class="chat-pcard__sval">' + (meta.deneyim || 0) + 'y</span><span class="chat-pcard__slbl">Deneyim</span></div>' +
            '<div class="chat-pcard__stat"><span class="chat-pcard__sval">' + (meta.puan || '0') + '</span><span class="chat-pcard__slbl">Puan</span></div>' +
            '<div class="chat-pcard__stat"><span class="chat-pcard__sval">' + (meta.arac || '—') + '</span><span class="chat-pcard__slbl">Araç</span></div>' +
          '</div>' +
          '<div class="chat-pcard__actions">' +
            '<button class="chat-pcard__btn chat-pcard__btn--sec" onclick="SharedScreens.chatQuick(\'gorusme\')">Görüşmeye Davet</button>' +
            '<button class="chat-pcard__btn" onclick="Router.go(\'/profil-kurye?id=' + (meta.profile_id || '') + '\')">Profili İncele →</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
    var isOut = m.sender_user === myUserId;
    var time  = m.created_at ? new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
    return '<div class="chat-bubble chat-bubble--' + (isOut ? 'out' : 'in') + '">' +
      '<div class="chat-bubble__text">' + (m.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>') + '</div>' +
      '<div class="chat-bubble__meta">' + time + (isOut ? ' <span class="chat-tick">✓✓</span>' : '') + '</div>' +
    '</div>';
  }

  function _sharedLoadRealChat(convId, rolePrefix) {
    if (!window.SB || !SB.isOn()) return;
    SB.getConvDetail(convId).then(function (detail) {
      if (!detail || !detail.conv) return;
      var c = detail.conv;
      var u = window.APP && APP.user;
      var iAmKurye   = !!(u && c.kurye_user === u.id);
      var otherName  = iAmKurye ? ((c.employer && c.employer.ad) || 'Esnaf') : ((c.kurye && c.kurye.ad) || 'Kurye');
      var otherEmoji = iAmKurye ? '🏢' : '🛵';
      var otherBg    = iAmKurye ? '#F97316' : '#6C4DFF';
      var listingTitle = (c.listing && c.listing.baslik) || 'İlan';
      var listingSehir = [(c.listing && c.listing.sehir), (c.listing && c.listing.bolge)].filter(Boolean).join(' · ');
      var myUid     = u && u.id;
      var backRoute = '/' + rolePrefix + '/mesajlar';

      var otherProfileId = iAmKurye ? c.employer_id : c.kurye_id;

      var hdrEl = document.getElementById('chat-hdr-el');
      if (hdrEl) {
        hdrEl.innerHTML =
          '<button class="chat-hdr__back" onclick="Router.back?Router.back():Router.go(\'' + backRoute + '\')">' + ICON.back + '</button>' +
          '<div class="chat-hdr__ava" style="background:' + otherBg + '">' + otherEmoji + '</div>' +
          '<div class="chat-hdr__info">' +
            '<div class="chat-hdr__name">' + otherName + '</div>' +
            '<div class="chat-hdr__status"><span class="chat-hdr__dot"></span>Aktif Başvuru</div>' +
          '</div>' +
          '<div class="chat-hdr__acts">' +
            '<button class="chat-hdr__act" id="chat-call-btn" title="Sesli Ara">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.93-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>' +
            '</button>' +
            '<button class="chat-hdr__act" id="chat-video-btn" title="Görüntülü Ara">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
            '</button>' +
          '</div>';
      }

      /* Arama butonlarını WebRTC ile bağla */
      var _cid   = convId;
      var _oName = otherName;
      setTimeout(function () {
        var audioBtn = document.getElementById('chat-call-btn');
        var videoBtn = document.getElementById('chat-video-btn');
        if (audioBtn) audioBtn.onclick = function () {
          if (window.KBCall) KBCall.startCall(_cid, _oName, 'audio');
        };
        if (videoBtn) videoBtn.onclick = function () {
          if (window.KBCall) KBCall.startCall(_cid, _oName, 'video');
        };
      }, 150);

      var ctxEl = document.getElementById('chat-context-el');
      if (ctxEl) {
        ctxEl.style.cssText = 'border-color:' + otherBg + '33';
        ctxEl.innerHTML =
          '<div class="chat-context__dot" style="background:' + otherBg + '"></div>' +
          '<div class="chat-context__text">' +
            '<span class="chat-context__role">' + listingTitle + '</span>' +
            (listingSehir ? '<span class="chat-context__loc">' + listingSehir + '</span>' : '') +
          '</div>' +
          '<span class="chat-context__tag" style="color:' + otherBg + '">Başvuru</span>';
      }

      var msgsEl = document.getElementById('chat-msgs');
      if (msgsEl) {
        msgsEl.innerHTML = '<div class="chat-date-sep"><span>Bugün</span></div>';
        detail.messages.forEach(function (m) { msgsEl.innerHTML += _sharedChatMsgBubble(m, myUid); });
        setTimeout(function () { msgsEl.scrollTop = msgsEl.scrollHeight; }, 30);
      }

      _activeChatState._convId   = convId;
      _activeChatState._myUserId = myUid;
      if (_activeChatState._realtimeCh) {
        try { _activeChatState._realtimeCh.unsubscribe(); } catch (e) {}
        _activeChatState._realtimeCh = null;
      }
      _activeChatState._realtimeCh = SB.subscribeConv(convId, function (newMsg) {
        if (newMsg.sender_user === _activeChatState._myUserId) return;
        var el = document.getElementById('chat-msgs');
        if (el) {
          var div = document.createElement('div');
          div.innerHTML = _sharedChatMsgBubble(newMsg, _activeChatState._myUserId);
          el.appendChild(div.firstChild);
          el.scrollTop = el.scrollHeight;
        }
      });
      SB.markConvRead(convId).catch(function () {});

      /* Başka rotaya gidilince kanalı kapat */
      function _chatNavCleanup() {
        window.removeEventListener('hashchange', _chatNavCleanup);
        if (_activeChatState._realtimeCh && _activeChatState._convId === convId) {
          try { _activeChatState._realtimeCh.unsubscribe(); } catch (e) {}
          _activeChatState._realtimeCh = null;
          _activeChatState._convId     = null;
        }
      }
      window.addEventListener('hashchange', _chatNavCleanup, { once: true });
    }).catch(function (e) { console.warn('sharedLoadRealChat:', e); });
  }

  function sharedMesajlar(rolePrefix, mockConvs) {
    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    showBottomNav();
    setActiveNav('mesajlar');

    var mockHtml = (mockConvs || []).map(function (m) {
      return '<div class="msg-conv" onclick="Router.go(\'/' + rolePrefix + '/mesaj/' + m.id + '\')">' +
        '<div class="msg-conv__bar" style="background:var(--c-kurye)"></div>' +
        '<div class="msg-conv__ava" style="background:var(--c-kurye)">🛵</div>' +
        '<div class="msg-conv__body">' +
          '<div class="msg-conv__top"><div class="msg-conv__name">' + m.name + '</div><div class="msg-conv__time">' + m.time + '</div></div>' +
          '<div class="msg-conv__preview">' + m.preview + '</div>' +
        '</div>' +
        (m.unread ? '<div class="msg-conv__unread">' + m.unread + '</div>' : '') +
      '</div>';
    }).join('') || '<div class="kb-empty"><div class="kb-empty__icon">💬</div><div class="kb-empty__title">Henüz mesajınız yok</div></div>';

    renderScreen(
      '<div class="msg-screen">' +
        '<div class="msg-header">' +
          '<div class="msg-header__text">' +
            '<div class="msg-header__title">Mesajlar</div>' +
            '<div class="msg-header__sub">Tüm görüşmelerin burada ✨</div>' +
          '</div>' +
          '<div class="msg-header__actions">' +
            '<button class="msg-header__btn" onclick="SharedScreens._msgSearchToggle()" title="Ara">' + ICON.search + '</button>' +
          '</div>' +
        '</div>' +
        '<div id="msg-search-bar" style="display:none;align-items:center;gap:8px;padding:0 16px 10px">' +
          '<div style="flex:1;display:flex;align-items:center;gap:8px;background:var(--surface2);border-radius:12px;padding:8px 12px;border:1px solid var(--border)">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--muted)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
            '<input id="msg-search-inp" type="search" placeholder="İsim veya mesaj ara..." autocomplete="off" ' +
              'style="flex:1;background:none;border:none;outline:none;color:var(--text);font-size:.88rem" ' +
              'oninput="SharedScreens._msgSearchFilter(this.value)">' +
          '</div>' +
          '<button onclick="SharedScreens._msgSearchToggle()" style="color:var(--muted);font-size:.8rem;padding:4px 8px;border-radius:8px;background:var(--surface2);border:1px solid var(--border)">İptal</button>' +
        '</div>' +
        '<div class="msg-tabs" id="msg-tabs">' +
          '<button class="msg-tab msg-tab--active" data-tab="tumu">Tümü</button>' +
          '<button class="msg-tab" data-tab="aktif">🟢 Aktif</button>' +
          '<button class="msg-tab" data-tab="arsiv">🗂 Arşiv</button>' +
        '</div>' +
        '<div class="msg-list" id="msg-list">' + mockHtml + '</div>' +
        '<div id="msg-search-empty" style="display:none;flex-direction:column;align-items:center;padding:40px 20px;gap:8px">' +
          '<div style="font-size:2rem">🔍</div>' +
          '<div style="color:var(--text);font-weight:700">Sonuç bulunamadı</div>' +
          '<div style="color:var(--muted);font-size:.8rem">Farklı bir kelime deneyin</div>' +
        '</div>' +
      '</div>'
    );
    _sharedLoadConvsAsync(rolePrefix);
  }

  function sharedMesajChat(ctx, rolePrefix) {
    var id = ctx.params.id;
    if (_activeChatState._realtimeCh) {
      try { _activeChatState._realtimeCh.unsubscribe(); } catch (e) {}
      _activeChatState._realtimeCh = null;
    }
    _activeChatState._convId   = null;
    _activeChatState._myUserId = null;

    var isReal    = !!(id && id.length > 20 && id.indexOf('-') !== -1);
    var backRoute = '/' + rolePrefix + '/mesajlar';

    if (typeof showAppBar === 'function') {
      showAppBar('', false, '');
      var bar = document.getElementById('kb-appbar');
      if (bar) bar.style.display = 'none';
    }
    hideBottomNav();

    /* kb-screen must not scroll itself — chat-msgs handles internal scroll */
    function _enableChatLayout() {
      var ks = document.getElementById('kb-screen');
      if (ks) ks.classList.add('kb-screen--chat');
    }
    function _disableChatLayout() {
      var ks = document.getElementById('kb-screen');
      if (ks) ks.classList.remove('kb-screen--chat');
    }
    window.addEventListener('hashchange', _disableChatLayout, { once: true });

    if (isReal) {
      renderScreen(
        '<div class="chat-screen">' +
          '<div class="chat-hdr" id="chat-hdr-el">' +
            '<button class="chat-hdr__back" onclick="Router.back?Router.back():Router.go(\'' + backRoute + '\')">' + ICON.back + '</button>' +
            '<div class="chat-hdr__ava" style="background:#2A3550;font-size:1.2rem">⏳</div>' +
            '<div class="chat-hdr__info"><div class="chat-hdr__name">Yükleniyor...</div><div class="chat-hdr__status">Lütfen bekleyin</div></div>' +
            '<div class="chat-hdr__acts"></div>' +
          '</div>' +
          '<div class="chat-context" id="chat-context-el" style="min-height:36px"></div>' +
          '<div class="chat-msgs" id="chat-msgs">' +
            '<div class="chat-loading"><div class="chat-loading__dot"></div><div class="chat-loading__dot"></div><div class="chat-loading__dot"></div></div>' +
          '</div>' +
          _sharedChatFooterHTML() +
        '</div>'
      );
      setTimeout(_enableChatLayout, 130);
      _sharedLoadRealChat(id, rolePrefix);
    } else {
      renderScreen(
        '<div class="chat-screen">' +
          '<div class="chat-hdr">' +
            '<button class="chat-hdr__back" onclick="Router.back?Router.back():Router.go(\'' + backRoute + '\')">' + ICON.back + '</button>' +
            '<div class="chat-hdr__ava" style="background:#6C4DFF">🛵</div>' +
            '<div class="chat-hdr__info"><div class="chat-hdr__name">Demo Konuşma</div><div class="chat-hdr__status">Demo</div></div>' +
            '<div class="chat-hdr__acts"></div>' +
          '</div>' +
          '<div class="chat-context" style="border-color:#6C4DFF33">' +
            '<div class="chat-context__dot" style="background:#6C4DFF"></div>' +
            '<div class="chat-context__text"><span class="chat-context__role">Demo İlan</span></div>' +
            '<span class="chat-context__tag" style="color:#6C4DFF">Başvuru</span>' +
          '</div>' +
          '<div class="chat-msgs" id="chat-msgs">' +
            '<div class="chat-date-sep"><span>Bugün</span></div>' +
            '<div class="chat-bubble chat-bubble--in"><div class="chat-bubble__text">Merhaba, nasıl yardımcı olabilirim?</div><div class="chat-bubble__meta">10:00</div></div>' +
          '</div>' +
          _sharedChatFooterHTML() +
        '</div>'
      );
      setTimeout(function () {
        _enableChatLayout();
        var el = document.getElementById('chat-msgs');
        if (el) el.scrollTop = el.scrollHeight;
      }, 130);
    }
  }

  function chatSend() {
    var input = document.getElementById('chat-input-field');
    if (!input || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = '';
    var msgsEl = document.getElementById('chat-msgs');
    if (!msgsEl) return;
    var now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--out chat-bubble--new';
    bubble.innerHTML = '<div class="chat-bubble__text">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
      '<div class="chat-bubble__meta">' + now + ' <span class="chat-tick">✓✓</span></div>';
    msgsEl.appendChild(bubble);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    if (_activeChatState._convId && window.SB && SB.isOn()) {
      SB.sendConvMessage(_activeChatState._convId, text).catch(function (e) { console.warn('sendConvMessage:', e); });
    }
  }

  function chatQuick(type) {
    var map = {
      konum:   '📍 Konumumu paylaştım',
      uygun:   '📅 Uygunluğumu bildiriyorum',
      belge:   '📄 Belgelerimi gönderiyorum',
      plan:    '📅 Görüşme talep ediyorum',
      teklif:  '⭐ Teklif detayları',
      gorusme: '🎯 Görüşmeye davet ediyorum'
    };
    var text = map[type];
    if (!text) return;
    var msgs = document.getElementById('chat-msgs');
    if (!msgs) return;
    var now = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--out chat-bubble--new';
    bubble.innerHTML = '<div class="chat-bubble__text">' + text + '</div>' +
      '<div class="chat-bubble__meta">' + now + ' <span class="chat-tick">✓✓</span></div>';
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
    if (_activeChatState._convId && window.SB && SB.isOn()) {
      SB.sendConvMessage(_activeChatState._convId, text).catch(function (e) { console.warn('chatQuick send:', e); });
    }
  }

  /* ── Profil Düzenle ─────────────────────────────────────── */
  function _pdEsc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function profilDuzenle() {
    showAppBar('Profili Düzenle', true);
    hideBottomNav();

    var p    = APP.profile || {};
    var role = APP.role || 'kurye';
    var isKurye = role === 'kurye';
    var accent  = isKurye ? '#6C4DFF' : role === 'firma' ? '#22C55E' : '#F97316';
    var aracSec = ['Motosiklet','Bisiklet','Yaya','Araç'];

    var avatarHtml = p.avatar_url
      ? '<img src="' + _pdEsc(p.avatar_url) + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;display:block">'
      : '<div style="width:80px;height:80px;border-radius:50%;background:' + accent + ';display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#fff;font-weight:700">' + initials(p.ad || '?') + '</div>';

    renderScreen(
      '<div class="kb-screen-inner">' +

        /* Avatar */
        '<div style="display:flex;flex-direction:column;align-items:center;padding:24px 16px 16px">' +
          '<div style="position:relative;cursor:pointer" onclick="SharedScreens._pickAvatar()">' +
            '<div id="pd-avatar">' + avatarHtml + '</div>' +
            '<div style="position:absolute;bottom:0;right:0;width:28px;height:28px;border-radius:50%;background:' + accent + ';display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)">' +
              '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
            '</div>' +
          '</div>' +
          '<div id="pd-av-saving" style="display:none;margin-top:8px;font-size:.76rem;color:var(--muted)">Fotoğraf yükleniyor…</div>' +
        '</div>' +

        /* Form */
        '<div class="kb-card" style="margin-bottom:16px">' +

          '<div style="padding-bottom:14px">' +
            '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">' +
              (isKurye ? 'Ad Soyad' : role === 'firma' ? 'Kurye Firması Adı' : 'Esnaf Adı') +
            '</label>' +
            '<input id="pd-ad" class="kb-input" value="' + _pdEsc(p.ad || '') + '" placeholder="' + (isKurye ? 'Adınız Soyadınız' : 'Kuruluş adı') + '">' +
          '</div>' +

          '<div style="padding:14px 0;border-top:1px solid var(--border)">' +
            '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Telefon</label>' +
            '<input id="pd-telefon" class="kb-input" type="tel" value="' + _pdEsc(p.telefon || '') + '" placeholder="05xx xxx xx xx">' +
          '</div>' +

          '<div style="padding:14px 0;border-top:1px solid var(--border)">' +
            '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Şehir</label>' +
            '<input id="pd-sehir" class="kb-input" value="' + _pdEsc(p.sehir || '') + '" placeholder="İstanbul">' +
          '</div>' +

          (isKurye
            ? '<div style="padding:14px 0;border-top:1px solid var(--border)">' +
                '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Araç Tipi</label>' +
                '<select id="pd-arac" class="kb-input" style="appearance:auto">' +
                  '<option value="">Seçin…</option>' +
                  aracSec.map(function(a){ return '<option value="' + a + '"' + (p.arac === a ? ' selected' : '') + '>' + a + '</option>'; }).join('') +
                '</select>' +
              '</div>' +
              '<div style="padding:14px 0;border-top:1px solid var(--border)">' +
                '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Deneyim (yıl)</label>' +
                '<input id="pd-deneyim" class="kb-input" type="number" min="0" max="50" value="' + (p.deneyim || 0) + '">' +
              '</div>'
            : '') +

          '<div style="padding:14px 0;border-top:1px solid var(--border)">' +
            '<label style="font-size:.76rem;font-weight:600;color:var(--muted);display:block;margin-bottom:6px">Hakkımda / Açıklama</label>' +
            '<textarea id="pd-aciklama" class="kb-input" rows="4" style="resize:none;height:auto" placeholder="Kendinizden kısaca bahsedin…">' + _pdEsc(p.aciklama || '') + '</textarea>' +
          '</div>' +

        '</div>' +

        '<button id="pd-save-btn" class="btn btn--primary" style="background:' + accent + ';border-color:' + accent + '" onclick="SharedScreens._saveProfilDuzenle()">Kaydet</button>' +
        '<div id="pd-error" style="display:none;margin-top:12px;padding:12px;background:rgba(239,68,68,.12);border-radius:10px;color:#EF4444;font-size:.84rem;text-align:center"></div>' +

      '</div>'
    );
  }

  function _pickAvatar() {
    if (typeof KBPickPhoto !== 'function') { toast('Kamera erişimi yok'); return; }
    KBPickPhoto(function (dataUrl) {
      var el = document.getElementById('pd-avatar');
      if (el) el.innerHTML = '<img src="' + dataUrl + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;display:block">';
      var saving = document.getElementById('pd-av-saving');
      if (saving) saving.style.display = 'block';

      fetch(dataUrl).then(function(r){ return r.blob(); }).then(function(blob) {
        var file = new File([blob], 'avatar.jpg', { type: blob.type || 'image/jpeg' });
        return SB.uploadAvatar(file);
      }).then(function(url) {
        if (saving) saving.style.display = 'none';
        if (!url) return;
        return SB.updateMyProfile({ avatar_url: url }).then(function(updated) {
          APP.profile = updated;
          toast('Fotoğraf güncellendi ✓');
        });
      }).catch(function() {
        if (saving) saving.style.display = 'none';
        toast('Fotoğraf yüklenemedi');
      });
    }, function(){});
  }

  async function _saveProfilDuzenle() {
    var btn   = document.getElementById('pd-save-btn');
    var errEl = document.getElementById('pd-error');
    if (btn)   { btn.disabled = true; btn.textContent = 'Kaydediliyor…'; }
    if (errEl) errEl.style.display = 'none';

    var role    = APP.role || 'kurye';
    var isKurye = role === 'kurye';

    var adEl   = document.getElementById('pd-ad');
    var telEl  = document.getElementById('pd-telefon');
    var sehirEl = document.getElementById('pd-sehir');
    var acEl   = document.getElementById('pd-aciklama');

    var fields = {
      ad        : adEl    ? adEl.value.trim()   : '',
      telefon   : telEl   ? telEl.value.trim()  : '',
      sehir     : sehirEl ? sehirEl.value.trim(): '',
      aciklama  : acEl    ? acEl.value.trim()   : ''
    };

    if (isKurye) {
      var aracEl    = document.getElementById('pd-arac');
      var deneyimEl = document.getElementById('pd-deneyim');
      if (aracEl)    fields.arac    = aracEl.value;
      if (deneyimEl) fields.deneyim = Number(deneyimEl.value) || 0;
    }

    if (!fields.ad) {
      if (btn)   { btn.disabled = false; btn.textContent = 'Kaydet'; }
      if (errEl) { errEl.textContent = 'İsim / kuruluş adı boş olamaz.'; errEl.style.display = 'block'; }
      return;
    }

    try {
      var updated = await SB.updateMyProfile(fields);
      APP.profile = updated;
      toast('Profil güncellendi ✓');
      setTimeout(function(){ Router.back(); }, 700);
    } catch(e) {
      if (btn)   { btn.disabled = false; btn.textContent = 'Kaydet'; }
      if (errEl) { errEl.textContent = (e && e.message) || 'Bir hata oluştu. Tekrar deneyin.'; errEl.style.display = 'block'; }
    }
  }

  return {
    bildirimler : bildirimler,
    favoriler   : favoriler,
    ayarlar     : ayarlar,
    yardim      : yardim,
    _setLang    : _setLang,
    _setTheme   : _setTheme,
    _faqToggle  : _faqToggle,
    _deleteAccount : _deleteAccount,
    // Shared premium panel
    premDashPanel   : premDashPanel,
    // Shared messaging engine
    sharedMesajlar   : sharedMesajlar,
    sharedMesajChat  : sharedMesajChat,
    chatSend         : chatSend,
    chatQuick        : chatQuick,
    _msgSearchToggle : _msgSearchToggle,
    _msgSearchFilter : _msgSearchFilter,
    // Profil düzenleme
    profilDuzenle      : profilDuzenle,
    _pickAvatar        : _pickAvatar,
    _saveProfilDuzenle : _saveProfilDuzenle,
    // Bildirimler
    _notifTap     : _notifTap,
    _notifReadAll : _notifReadAll,
    // Auth yardımcı ekranlar
    sifreSifirla      : sifreSifirla,
    _doSifreSifirla   : _doSifreSifirla,
    verifyEmail       : verifyEmail
  };

})();

/* ── Premium Map Screen — shared impl ──────────────────────── */

window._spmBcardSkel = function(n) {
  var one = '<div class="spm-bcard spm-bcard--skel">' +
    '<div class="spm-bcard__top">' +
    '<span class="spm-skel" style="width:42px;height:42px;border-radius:14px;flex:none"></span>' +
    '<div class="spm-bcard__info"><span class="spm-skel" style="width:70%;height:13px;display:block;margin-bottom:7px"></span><span class="spm-skel" style="width:50%;height:10px;display:block"></span></div>' +
    '</div>' +
    '<span class="spm-skel" style="width:100%;height:4px;display:block;border-radius:2px;margin:10px 0"></span>' +
    '<div style="display:flex;gap:6px;margin-top:10px"><span class="spm-skel" style="flex:1;height:34px;border-radius:11px"></span><span class="spm-skel" style="flex:1;height:34px;border-radius:11px"></span></div>' +
    '</div>';
  var out = ''; for (var i = 0; i < n; i++) out += one; return out;
};

window._spmShell = function() {
  return '<div class="spm-screen" id="spmRoot">' +
    '<div id="spm-map"></div>' +
    '<div class="spm-topbar">' +
      '<div class="spm-search-row">' +
        '<div class="spm-searchbox">' +
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
          '<input type="search" id="spmSearch" autocomplete="off" placeholder="Bölge, firma veya ilan ara...">' +
        '</div>' +
        '<button type="button" class="spm-filter-btn" id="spmFilterBtn">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="spm-chips-row" id="spmChipsRow">' +
        '<button type="button" class="spm-chip is-on" data-spmlayer="ilan"><span class="spm-chip__dot" style="background:#f59e0b"></span>İş İlanları</button>' +
        '<button type="button" class="spm-chip is-on" data-spmlayer="firma"><span class="spm-chip__dot" style="background:#a855f7"></span>Kurye Firmaları</button>' +
        '<button type="button" class="spm-chip" data-spmlayer="acil"><span class="spm-chip__dot" style="background:#ef4444"></span>Acil Alım</button>' +
        '<button type="button" class="spm-chip" data-spmlayer="premium"><span class="spm-chip__dot" style="background:#f59e0b;box-shadow:0 0 5px #f59e0b"></span>Premium</button>' +
        '<button type="button" class="spm-chip" data-spmlayer="yakin"><span class="spm-chip__dot" style="background:#22d3ee"></span>Yakınımda</button>' +
      '</div>' +
    '</div>' +
    '<div class="spm-fabs" id="spmFabs">' +
      '<button type="button" class="spm-fab" id="spmLocateBtn">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>' +
        '<span>Konum</span>' +
      '</button>' +
      '<button type="button" class="spm-fab" id="spmAIBtn">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
        '<span>AI Öneri</span>' +
      '</button>' +
      '<button type="button" class="spm-fab" id="spmHeatBtn">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>' +
        '<span>Isı Hrts</span>' +
      '</button>' +
      '<button type="button" class="spm-fab" id="spmLayersBtn">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>' +
        '<span>Katman</span>' +
      '</button>' +
    '</div>' +
    '<div class="spm-ai-card" id="spmAiCard">' +
      '<div class="spm-ai-card__head">' +
        '<div class="spm-ai-card__icon">✨</div>' +
        '<div><div class="spm-ai-card__title">AI Fırsat Analizi</div><div class="spm-ai-card__sub">Sana en uygun bölgeler</div></div>' +
        '<button type="button" class="spm-ai-card__close" id="spmAiClose">✕</button>' +
      '</div>' +
      '<div class="spm-ai-card__body">Profiline göre en yoğun iş ilanı bölgeleri.</div>' +
      '<div class="spm-ai-zones">' +
        '<button type="button" class="spm-ai-zone" data-zone="kadikoy">Kadıköy</button>' +
        '<button type="button" class="spm-ai-zone" data-zone="besiktas">Beşiktaş</button>' +
        '<button type="button" class="spm-ai-zone" data-zone="sisli">Şişli</button>' +
        '<button type="button" class="spm-ai-zone" data-zone="atasehir">Ataşehir</button>' +
        '<button type="button" class="spm-ai-zone" data-zone="umraniye">Ümraniye</button>' +
      '</div>' +
    '</div>' +
    '<div class="spm-heat-legend" id="spmHeatLegend">' +
      '<span>Az</span><div class="spm-heat-bar"></div><span>Yoğun</span>' +
    '</div>' +
    '<div class="spm-sheet" id="spmSheet">' +
      '<div class="spm-sheet__handle"></div>' +
      '<div class="spm-sheet__count" id="spmCount"></div>' +
      '<div class="spm-cards-scroll" id="spmCardScroll"></div>' +
    '</div>' +
  '</div>';
};

window.initPremiumMap = async function(role) {
  if (typeof google === 'undefined' || !google.maps) {
    window._spmPendingRole = role;
    return;
  }
  var mapEl = document.getElementById('spm-map');
  if (!mapEl) {
    // renderScreen has 120ms fade delay — retry once
    setTimeout(function() { window.initPremiumMap(role); }, 250);
    return;
  }

  var searchEl = document.getElementById('spmSearch');
  var countEl  = document.getElementById('spmCount');
  var scrollEl = document.getElementById('spmCardScroll');
  var aiCard   = document.getElementById('spmAiCard');
  var aiClose  = document.getElementById('spmAiClose');
  var heatLeg  = document.getElementById('spmHeatLegend');
  var locBtn   = document.getElementById('spmLocateBtn');
  var aiBtn    = document.getElementById('spmAIBtn');
  var heatBtn  = document.getElementById('spmHeatBtn');
  var layBtn   = document.getElementById('spmLayersBtn');

  var ISTANBUL = { lat: 41.015, lng: 28.979 };
  var DARK_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0f0b1e' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8a7aaa' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0b1e' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#1e1640' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c4b5fd' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5a4a7a' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0d0a1e' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1e1540' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2a1f55' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7060a0' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#2a1f55' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a2b80' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#4a3a95' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#9080c5' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#0f0b1e' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#07051a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d2d6a' }] }
  ];

  var map = new google.maps.Map(mapEl, {
    zoom: 12, center: ISTANBUL,
    mapTypeControl: false, fullscreenControl: false, streetViewControl: false,
    zoomControl: false,
    styles: DARK_STYLE, gestureHandling: 'greedy', backgroundColor: '#0f0b1e',
    clickableIcons: false
  });

  var PIN = {
    ilan:    { color: '#f59e0b', emoji: '💼', label: 'İlan' },
    kurye:   { color: '#22d3ee', emoji: '🛵', label: 'Kurye' },
    isletme: { color: '#4f8bff', emoji: '🏪', label: 'Esnaf' },
    firma:   { color: '#a855f7', emoji: '🏢', label: 'Kurye Firması' }
  };

  if (scrollEl) scrollEl.innerHTML = window._spmBcardSkel(3);

  var listings = [], kur = [], isl = [], frm = [];
  try { if (window.SB && SB.isOn()) listings = await SB.openListings(); } catch (e) {}
  try { if (window.SB && SB.isOn()) kur = await SB.pool('kurye'); } catch (e) {}
  try { if (window.SB && SB.isOn()) isl = await SB.pool('isletme'); } catch (e) {}
  try { if (window.SB && SB.isOn()) frm = await SB.pool('firma'); } catch (e) {}

  if (!document.getElementById('spm-map')) return;

  var items = [];
  function pushItem(type, x, lat, lng, ad, sub) {
    if (lat == null || lng == null) return;
    items.push({ key: type + '-' + x.id, type: type, id: x.id, lat: +lat, lng: +lng, ad: ad || '', sub: sub || '', acil: !!(x.acil || x.acil_alinacak), premium: !!x.premium, maas: x.maas || x.ucret_min || x.ucret || null });
  }

  listings.forEach(function(l) { pushItem('ilan', l, l.lat, l.lng, l.baslik, [l.sahip, l.sehir, l.bolge].filter(Boolean).join(' · ')); });
  kur.forEach(function(k) { pushItem('kurye', k, k.lat, k.lng, k.ad, [k.sehir, (k.bolgeler||[])[0]].filter(Boolean).join(' · ')); });
  isl.forEach(function(i) { pushItem('isletme', i, i.lat, i.lng, i.ad, [i.tur, i.sehir].filter(Boolean).join(' · ')); });
  frm.forEach(function(f) { pushItem('firma', f, f.lat, f.lng, f.ad, (f.bolgeler||[]).slice(0,2).join(', ')); });

  var activeLayers = { ilan: true, firma: true, acil: false, premium: false, yakin: false };
  var userLat = null, userLng = null, userMarker = null;
  var markers = {}, selectedKey = null;
  var heatLayer = null, heatmapOn = false;

  function normText(s) {
    var o = ''; s = String(s == null ? '' : s).normalize('NFD');
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c < 0x300 || c > 0x36f) o += s[i].toLowerCase(); }
    return o;
  }

  function matchScore(key) {
    var h = 0;
    for (var i = 0; i < key.length; i++) h = ((h * 31) + key.charCodeAt(i)) >>> 0;
    return 72 + (h % 22);
  }

  function distKm(a, b, c, d) {
    var R = 6371, dLat = (c-a)*Math.PI/180, dLng = (d-b)*Math.PI/180;
    var x = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
  }

  function isVisible(it, q) {
    if (q && normText(it.ad + ' ' + it.sub).indexOf(q) === -1) return false;
    if (activeLayers.yakin && userLat !== null && distKm(userLat, userLng, it.lat, it.lng) > 5) return false;
    if (activeLayers.premium && it.premium) return true;
    if (activeLayers.acil && it.type === 'ilan' && it.acil) return true;
    if (activeLayers.ilan && it.type === 'ilan' && !it.acil) return true;
    if (activeLayers.firma && (it.type === 'firma' || it.type === 'isletme' || it.type === 'kurye')) return true;
    return false;
  }

  function getVisible() {
    var q = normText(searchEl && searchEl.value || '');
    return items.filter(function(it) { return isVisible(it, q); });
  }

  function pinIcon(it, sel) {
    var cfg = PIN[it.type], s = sel ? 56 : 44, r = sel ? 17 : 13, c = s / 2;
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + (r+9) + '" fill="' + cfg.color + '" fill-opacity="0.15"/>' +
      (sel ? '<circle cx="' + c + '" cy="' + c + '" r="' + (r+16) + '" fill="' + cfg.color + '" fill-opacity="0.07"/>' : '') +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="' + cfg.color + '" fill-opacity="' + (sel ? '1' : '0.88') + '"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="white" stroke-opacity="0.85" stroke-width="' + (sel ? '2.5' : '2') + '"/>' +
      '<text x="' + c + '" y="' + c + '" font-size="' + (sel ? 14 : 11) + '" text-anchor="middle" dominant-baseline="central">' + cfg.emoji + '</text>' +
      '</svg>';
    return { url: 'data:image/svg+xml,' + encodeURIComponent(svg), scaledSize: new google.maps.Size(s, s), anchor: new google.maps.Point(c, c) };
  }

  function renderMarkers(list) {
    Object.keys(markers).forEach(function(k) { if (markers[k]) markers[k].setMap(null); });
    markers = {};
    list.forEach(function(it) {
      var m = new google.maps.Marker({ position: { lat: it.lat, lng: it.lng }, map: map, title: it.ad, icon: pinIcon(it, it.key === selectedKey), zIndex: it.key === selectedKey ? 999 : 1 });
      m._it = it;
      m.addListener('click', function() { select(it.key); });
      markers[it.key] = m;
    });
  }

  function select(key) {
    selectedKey = key;
    Object.keys(markers).forEach(function(k) { var m = markers[k]; if (m && m._it) { m.setIcon(pinIcon(m._it, k === key)); m.setZIndex(k === key ? 999 : 1); } });
    if (key && markers[key]) map.panTo(markers[key].getPosition());
    if (scrollEl) {
      var card = scrollEl.querySelector('[data-spmkey="' + key + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      scrollEl.querySelectorAll('.spm-bcard').forEach(function(c) { c.classList.toggle('is-selected', c.getAttribute('data-spmkey') === key); });
    }
  }

  function bcard(it) {
    var cfg = PIN[it.type], score = matchScore(it.key);
    var dist = (userLat !== null) ? distKm(userLat, userLng, it.lat, it.lng).toFixed(1) + ' km' : null;
    var r = window.APP && APP.role || role;
    var actionHtml = '';
    if (it.type === 'ilan' && r === 'kurye') {
      actionHtml = '<button class="spm-bcard__btn spm-bcard__btn--primary" onclick="event.stopPropagation();Router.go(\'/kurye/ilan/' + it.id + '\')">Hızlı Başvur</button>';
    } else if (it.type === 'kurye' && r === 'firma') {
      actionHtml = '<button class="spm-bcard__btn spm-bcard__btn--primary" onclick="event.stopPropagation();Router.go(\'/firma/aday/' + it.id + '\')">Profili Gör</button>';
    } else if (it.type === 'kurye' && r === 'isletme') {
      actionHtml = '<button class="spm-bcard__btn spm-bcard__btn--primary" onclick="event.stopPropagation();Router.go(\'/isletme/aday/' + it.id + '\')">Profili Gör</button>';
    }
    var maasHtml = it.maas ? '<div class="spm-bcard__meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' + it.maas + ' ₺</div>' : '';
    var distHtml = dist ? '<div class="spm-bcard__meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + dist + '</div>' : '';
    return '<div class="spm-bcard" data-spmkey="' + it.key + '" tabindex="0">' +
      '<div class="spm-bcard__top">' +
        '<div class="spm-bcard__logo" style="border-color:' + cfg.color + '33">' + cfg.emoji + '</div>' +
        '<div class="spm-bcard__info"><div class="spm-bcard__title">' + (it.ad || '') + '</div><div class="spm-bcard__sub">' + (it.sub || '') + '</div></div>' +
        '<span class="spm-bcard__badge spm-bcard__badge--' + it.type + '">' + cfg.label + '</span>' +
      '</div>' +
      '<div class="spm-bcard__meta">' + maasHtml + distHtml + '</div>' +
      '<div class="spm-bcard__score"><div class="spm-bcard__score-bar"><div class="spm-bcard__score-fill" style="width:' + score + '%"></div></div><div class="spm-bcard__score-pct">%' + score + ' eşleşme</div></div>' +
      (actionHtml ? '<div class="spm-bcard__action">' + actionHtml + '</div>' : '') +
    '</div>';
  }

  function renderCards(list) {
    if (!scrollEl) return;
    if (countEl) countEl.textContent = list.length ? list.length + ' SONUÇ' : '';
    if (!list.length) { scrollEl.innerHTML = '<div style="padding:20px 16px;color:rgba(255,255,255,.3);font-size:.82rem">Bu katmanda sonuç yok.</div>'; return; }
    scrollEl.innerHTML = list.map(bcard).join('');
    scrollEl.querySelectorAll('.spm-bcard').forEach(function(card) {
      card.addEventListener('click', function(e) { if (e.target.closest('button')) return; select(card.getAttribute('data-spmkey')); });
    });
  }

  function toggleHeatmap(list) {
    if (heatLayer) { heatLayer.setMap(null); heatLayer = null; }
    if (!heatmapOn || !google.maps.visualization) return;
    var pts = list.map(function(it) { return { location: new google.maps.LatLng(it.lat, it.lng), weight: it.premium ? 3 : (it.acil ? 2 : 1) }; });
    heatLayer = new google.maps.visualization.HeatmapLayer({ data: pts, map: map, radius: 40, opacity: 0.65, gradient: ['rgba(108,77,255,0)','rgba(108,77,255,0.6)','rgba(168,85,247,0.8)','rgba(245,158,11,0.9)','rgba(239,68,68,1)'] });
  }

  function refresh() {
    var list = getVisible();
    if (selectedKey && !list.some(function(i) { return i.key === selectedKey; })) selectedKey = null;
    renderMarkers(list); renderCards(list); toggleHeatmap(list);
  }

  document.querySelectorAll('[data-spmlayer]').forEach(function(chip) {
    var t = chip.getAttribute('data-spmlayer');
    chip.classList.toggle('is-on', !!activeLayers[t]);
    chip.addEventListener('click', function() { activeLayers[t] = !activeLayers[t]; chip.classList.toggle('is-on', activeLayers[t]); refresh(); });
  });

  if (searchEl) searchEl.addEventListener('input', function() { refresh(); });

  if (locBtn) locBtn.addEventListener('click', function() {
    if (!navigator.geolocation) return;
    locBtn.classList.add('is-loading');
    navigator.geolocation.getCurrentPosition(function(pos) {
      locBtn.classList.remove('is-loading'); locBtn.classList.add('is-active');
      userLat = pos.coords.latitude; userLng = pos.coords.longitude;
      if (userMarker) userMarker.setMap(null);
      userMarker = new google.maps.Marker({ position: { lat: userLat, lng: userLng }, map: map, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 }, zIndex: 2000, title: 'Konumunuz' });
      map.panTo({ lat: userLat, lng: userLng }); map.setZoom(14);
      if (activeLayers.yakin) refresh();
    }, function() { locBtn.classList.remove('is-loading'); }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  });

  if (aiBtn && aiCard) aiBtn.addEventListener('click', function() { var on = aiCard.classList.toggle('is-visible'); aiBtn.classList.toggle('is-active', on); });
  if (aiClose && aiCard) aiClose.addEventListener('click', function() { aiCard.classList.remove('is-visible'); if (aiBtn) aiBtn.classList.remove('is-active'); });

  var AI_ZONES = { kadikoy:{lat:40.990,lng:29.030}, besiktas:{lat:41.043,lng:29.005}, sisli:{lat:41.061,lng:28.987}, atasehir:{lat:40.996,lng:29.118}, umraniye:{lat:41.016,lng:29.110} };
  document.querySelectorAll('[data-zone]').forEach(function(z) {
    z.addEventListener('click', function() { var p = AI_ZONES[z.getAttribute('data-zone')]; if (p) { map.panTo(p); map.setZoom(13); } });
  });

  if (heatBtn) heatBtn.addEventListener('click', function() { heatmapOn = !heatmapOn; heatBtn.classList.toggle('is-active', heatmapOn); if (heatLeg) heatLeg.classList.toggle('is-visible', heatmapOn); toggleHeatmap(getVisible()); });

  if (layBtn) layBtn.addEventListener('click', function() {
    var cr = document.getElementById('spmChipsRow');
    if (!cr) return;
    var hidden = cr.style.display === 'none';
    cr.style.display = hidden ? '' : 'none';
    layBtn.classList.toggle('is-active', hidden);
  });

  refresh();

  if (items.length) {
    var bounds = new google.maps.LatLngBounds();
    items.forEach(function(i) { bounds.extend({ lat: i.lat, lng: i.lng }); });
    if (items.length < 80) { try { map.fitBounds(bounds); } catch(e) { map.setCenter(ISTANBUL); map.setZoom(12); } }
    else { map.setCenter(ISTANBUL); map.setZoom(12); }
  }
};
