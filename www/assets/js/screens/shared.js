/* ============================================================
   KuryemiBul — screens/shared.js
   Paylaşılan ekranlar: Bildirimler, Favoriler, Ayarlar, Yardım
   ============================================================ */
window.SharedScreens = (function () {
  'use strict';

  /* ── Bildirimler ────────────────────────────────────────── */
  function bildirimler() {
    showAppBar('Bildirimler', true);
    showBottomNav();

    var items = [
      { read: false, title: 'Yeni başvuru geldi!',           sub: 'ABC Lojistik ilanınıza başvurdu.',         time: '5 dk önce'   },
      { read: false, title: 'Başvurunuz onaylandı!',          sub: 'XYZ Kargo başvurunuzu kabul etti.',         time: '1 saat önce' },
      { read: true,  title: 'Yeni mesajınız var.',            sub: 'Hub Dağıtım size mesaj gönderdi.',          time: '3 saat önce' },
      { read: true,  title: 'Profil güncelleme hatırlatması', sub: 'Profilinizi tamamlayarak daha fazla eşleşme alın.', time: 'Dün' },
      { read: true,  title: 'Görüşme randevusu',              sub: 'Yarın saat 14:00\'te görüşmeniz var.',      time: 'Dün'         }
    ];

    renderScreen(
      '<div class="kb-screen-inner">' +
        '<div class="kb-card" style="padding:0 16px">' +
          items.map(function (n) {
            return '<div class="notif-item">' +
              '<div class="notif-item__dot' + (n.read ? ' notif-item__dot--read' : '') + '"></div>' +
              '<div class="notif-item__text">' +
                '<div class="notif-item__title">' + n.title + '</div>' +
                '<div class="notif-item__sub">' + n.sub + '</div>' +
              '</div>' +
              '<div class="notif-item__time">' + n.time + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
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
          _settingItem('Profil Düzenle',     'user',     function(){}) +
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

        '<p class="text-center fs-sm text-muted mt-12">KuryemiBul v2.0</p>' +
      '</div>'
    );
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

  return {
    bildirimler : bildirimler,
    favoriler   : favoriler,
    ayarlar     : ayarlar,
    yardim      : yardim,
    _setLang    : _setLang,
    _setTheme   : _setTheme,
    _faqToggle  : _faqToggle
  };

})();
