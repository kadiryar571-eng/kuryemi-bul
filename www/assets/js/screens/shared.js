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

  /* ── SHARED PREMIUM PANEL ───────────────────────────────── */

  function premDashPanel(cfg) {
    var stats = (cfg.stats || []).map(function (s) {
      return '<div class="prem-stat prem-stat--' + s.color + '" onclick="Router.go(\'' + s.route + '\')">' +
        '<div class="prem-stat__top">' +
          '<div class="prem-stat__num prem-stat__num--' + s.color + '">' + s.num + '</div>' +
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
    return '<div class="msg-conv" onclick="Router.go(\'/' + rolePrefix + '/mesaj/' + c.id + '\')">' +
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
          '<input type="text" class="chat-input__field" id="chat-input-field" placeholder="Mesajınızı yazın..." autocomplete="off">' +
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
      var otherName  = iAmKurye ? ((c.employer && c.employer.ad) || 'İşletme') : ((c.kurye && c.kurye.ad) || 'Kurye');
      var otherEmoji = iAmKurye ? '🏢' : '🛵';
      var otherBg    = iAmKurye ? '#F97316' : '#6C4DFF';
      var listingTitle = (c.listing && c.listing.baslik) || 'İlan';
      var listingSehir = [(c.listing && c.listing.sehir), (c.listing && c.listing.bolge)].filter(Boolean).join(' · ');
      var myUid     = u && u.id;
      var backRoute = '/' + rolePrefix + '/mesajlar';

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
            '<button class="chat-hdr__act" onclick="SharedScreens.chatQuick(\'ara\')">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.93-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.6 16.92z"/></svg>' +
            '</button>' +
            '<button class="chat-hdr__act" onclick="SharedScreens.chatQuick(\'more\')">' +
              '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>' +
            '</button>' +
          '</div>';
      }

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
            '<button class="msg-header__btn">' + ICON.search + '</button>' +
            '<button class="msg-header__btn">' + ICON.filter + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="msg-tabs" id="msg-tabs">' +
          '<button class="msg-tab msg-tab--active" data-tab="tumu">Tümü</button>' +
          '<button class="msg-tab" data-tab="aktif">🟢 Aktif</button>' +
          '<button class="msg-tab" data-tab="arsiv">🗂 Arşiv</button>' +
        '</div>' +
        '<div class="msg-list" id="msg-list">' + mockHtml + '</div>' +
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
      setTimeout(function () { var el = document.getElementById('chat-msgs'); if (el) el.scrollTop = el.scrollHeight; }, 60);
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
      konum:   'Konumunuz paylaşıldı 📍',
      uygun:   'Uygunluk bilgisi gönderildi 📅',
      belge:   'Belgeleriniz gönderildi 📄',
      plan:    'Görüşme talebi gönderildi 📅',
      teklif:  'Teklif detayları açılıyor...',
      gorusme: 'Görüşme daveti gönderildi 🎯'
    };
    var text = map[type];
    if (!text) return;
    var msgs = document.getElementById('chat-msgs');
    if (!msgs) return;
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--out chat-bubble--new';
    bubble.innerHTML = '<div class="chat-bubble__text">' + text + '</div>' +
      '<div class="chat-bubble__meta">Şimdi <span class="chat-tick">✓✓</span></div>';
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;
  }

  return {
    bildirimler : bildirimler,
    favoriler   : favoriler,
    ayarlar     : ayarlar,
    yardim      : yardim,
    _setLang    : _setLang,
    _setTheme   : _setTheme,
    _faqToggle  : _faqToggle,
    // Shared premium panel
    premDashPanel   : premDashPanel,
    // Shared messaging engine
    sharedMesajlar  : sharedMesajlar,
    sharedMesajChat : sharedMesajChat,
    chatSend        : chatSend,
    chatQuick       : chatQuick
  };

})();
