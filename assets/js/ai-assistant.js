/* ============================================================
   KuryemiBul AI — ai-assistant.js
   Floating chat widget (Claude Haiku via Supabase Edge Function).
   components.js bu dosyayı dinamik olarak yükler.
   ============================================================ */
(function () {
  'use strict';

  var EDGE_URL = 'https://fdszypytpodndtlbuzuz.supabase.co/functions/v1/ai-chat';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkc3p5cHl0cG9kbmR0bGJ1enV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTUxMjMsImV4cCI6MjA5NjAzMTEyM30.D3Nmk1k2P00_Y8L5flBYR85iuoy7r-3mKeck3QoRVcc';
  var HISTORY_KEY = 'kb_ai_history';
  var MAX_HISTORY = 20;

  var QUICK_ACTIONS = [
    { icon: '📄', label: 'CV Analizi', prompt: 'CV\'mi analiz etmek istiyorum. CV içeriğimi buraya yapıştıracağım, güçlü ve zayıf yönlerimi değerlendirir misin?' },
    { icon: '📋', label: 'İlan Analizi', prompt: 'Bir iş ilanını analiz etmek istiyorum. İlan metnini paylaşacağım, bu ilana uygunluğumu ve dikkat etmem gerekenleri söyler misin?' },
    { icon: '🤝', label: 'Eşleşme', prompt: 'Profilime göre hangi tür işletmeler veya firmalarla çalışmak daha uygun olur? Eşleşme önerileri verir misin?' },
    { icon: '✉️', label: 'Mesaj Taslağı', prompt: 'Bir işletmeye veya kurye firmasına göndermek için profesyonel bir mesaj taslağı hazırlamama yardım eder misin?' },
    { icon: '👤', label: 'Profil Geliştir', prompt: 'KuryemiBul profilimi daha çekici hale getirmek için somut öneriler verir misin?' },
    { icon: '🚀', label: 'Başvuru Optimize', prompt: 'İş başvurularımı nasıl daha etkili hale getirebilirim? Başvuru stratejisi önerir misin?' }
  ];

  var state = {
    open: false,
    loading: false,
    messages: [],
    userContext: null
  };

  /* ---- Kullanıcı context'i KB oturumundan topla ---- */
  function buildContext() {
    var roleMap = { kurye: 'Kurye', isletme: 'İşletme Sahibi', firma: 'Kurye Firması', guest: 'Misafir' };
    var session = window.KB && KB.session ? KB.session() : null;
    var profile = session && session.profile;
    if (!profile) {
      return { name: 'Misafir', role: 'guest', roleLabel: 'Misafir', city: null };
    }
    return {
      name: profile.ad || 'Kullanıcı',
      role: profile.role || 'guest',
      roleLabel: roleMap[profile.role] || profile.role,
      city: profile.sehir || null,
      level: profile.seviye || null,
      vehicles: profile.arac || null,
      regions: (profile.bolgeler || []).join(', ') || null,
      experience: profile.deneyim ? String(profile.deneyim) : null
    };
  }

  /* ---- localStorage geçmiş ---- */
  function loadHistory() {
    try {
      var raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function saveHistory(msgs) {
    try {
      var trimmed = msgs.slice(-MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {}
  }
  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) {}
    state.messages = [];
  }

  /* ---- Mesaj render ---- */
  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function markdownToHtml(text) {
    return escHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function renderMessages() {
    var list = document.getElementById('ai-msg-list');
    if (!list) return;

    if (!state.messages.length) {
      list.innerHTML =
        '<div class="ai-welcome">' +
          '<div class="ai-welcome__icon">✨</div>' +
          '<p class="ai-welcome__text">Merhaba! Ben KuryemiBul AI\'yım.<br>Sana nasıl yardımcı olabilirim?</p>' +
        '</div>' +
        '<div class="ai-chips" id="ai-chips">' +
          QUICK_ACTIONS.map(function (a) {
            return '<button class="ai-chip" type="button" data-prompt="' + escHtml(a.prompt) + '">' +
              a.icon + ' ' + a.label + '</button>';
          }).join('') +
        '</div>';
      return;
    }

    list.innerHTML = state.messages.map(function (m) {
      if (m.role === 'user') {
        return '<div class="ai-msg ai-msg--user"><div class="ai-bubble">' + escHtml(m.content) + '</div></div>';
      }
      return '<div class="ai-msg ai-msg--ai"><div class="ai-avatar">✨</div><div class="ai-bubble"><p>' + markdownToHtml(m.content) + '</p></div></div>';
    }).join('');

    list.scrollTop = list.scrollHeight;
  }

  function showTyping() {
    var list = document.getElementById('ai-msg-list');
    if (!list) return;
    var el = document.createElement('div');
    el.id = 'ai-typing';
    el.className = 'ai-msg ai-msg--ai';
    el.innerHTML = '<div class="ai-avatar">✨</div><div class="ai-bubble ai-typing"><span></span><span></span><span></span></div>';
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
  }

  function hideTyping() {
    var el = document.getElementById('ai-typing');
    if (el) el.parentNode.removeChild(el);
  }

  /* ---- API çağrısı ---- */
  async function sendMessage(text) {
    text = (text || '').trim();
    if (!text || state.loading) return;

    // Kullanıcı mesajı ekle
    state.messages.push({ role: 'user', content: text });
    renderMessages();
    saveHistory(state.messages);

    // Input temizle
    var inp = document.getElementById('ai-input');
    if (inp) { inp.value = ''; inp.style.height = 'auto'; }

    state.loading = true;
    var sendBtn = document.getElementById('ai-send');
    if (sendBtn) sendBtn.disabled = true;
    showTyping();

    // Context'i taze al
    if (!state.userContext) state.userContext = buildContext();

    try {
      var resp = await fetch(EDGE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + ANON_KEY,
          'apikey': ANON_KEY
        },
        body: JSON.stringify({
          messages: state.messages.slice(-12), // son 12 mesajı gönder (context penceresi)
          userContext: state.userContext
        })
      });

      var data = await resp.json();
      hideTyping();

      if (data.reply) {
        state.messages.push({ role: 'assistant', content: data.reply });
      } else {
        state.messages.push({ role: 'assistant', content: data.error || 'Bir hata oluştu, lütfen tekrar deneyin.' });
      }
    } catch (e) {
      hideTyping();
      state.messages.push({ role: 'assistant', content: 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.' });
    }

    state.loading = false;
    if (sendBtn) sendBtn.disabled = false;
    renderMessages();
    saveHistory(state.messages);

    // Input'a fokus
    if (inp) inp.focus();
  }

  /* ---- Panel aç/kapat ---- */
  function togglePanel(force) {
    var panel = document.getElementById('ai-panel');
    var btn = document.getElementById('ai-float');
    if (!panel) return;

    state.open = force !== undefined ? !!force : !state.open;
    panel.classList.toggle('ai-panel--open', state.open);
    if (btn) btn.setAttribute('aria-expanded', state.open ? 'true' : 'false');

    if (state.open) {
      renderMessages();
      setTimeout(function () {
        var inp = document.getElementById('ai-input');
        if (inp) inp.focus();
      }, 200);
    }
  }

  /* ---- HTML enjeksiyon ---- */
  function inject() {
    if (document.getElementById('ai-float')) return;

    // Floating buton
    var btn = document.createElement('button');
    btn.id = 'ai-float';
    btn.className = 'ai-float';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'KuryemiBul AI Asistanı Aç');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'ai-panel');
    btn.innerHTML =
      '<svg class="ai-float__ic" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="currentColor"/>' +
      '</svg>' +
      '<span class="ai-float__txt">KuryemiBul AI</span>';
    document.body.appendChild(btn);

    // Chat paneli
    var panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.className = 'ai-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'KuryemiBul AI Asistanı');
    panel.innerHTML =
      '<div class="ai-panel__head">' +
        '<div class="ai-panel__title">' +
          '<svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">' +
            '<path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" fill="currentColor"/>' +
          '</svg>' +
          'KuryemiBul AI' +
        '</div>' +
        '<div class="ai-panel__acts">' +
          '<button class="ai-icon-btn" id="ai-clear" type="button" title="Konuşmayı Sıfırla" aria-label="Konuşmayı sıfırla">🗑</button>' +
          '<button class="ai-icon-btn" id="ai-close" type="button" title="Kapat" aria-label="Paneli kapat">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="ai-msg-list" id="ai-msg-list" role="log" aria-live="polite" aria-label="Konuşma"></div>' +
      '<div class="ai-panel__foot">' +
        '<textarea class="ai-input" id="ai-input" placeholder="Bir şeyler yazın..." rows="1" aria-label="Mesaj yaz"></textarea>' +
        '<button class="ai-send" id="ai-send" type="button" aria-label="Gönder">' +
          '<svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">' +
            '<path d="M22 2L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
            '<path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
        '</button>' +
      '</div>';
    document.body.appendChild(panel);
  }

  /* ---- Event listener'lar ---- */
  function bindEvents() {
    var btn = document.getElementById('ai-float');
    var panel = document.getElementById('ai-panel');
    var closeBtn = document.getElementById('ai-close');
    var clearBtn = document.getElementById('ai-clear');
    var sendBtn = document.getElementById('ai-send');
    var inp = document.getElementById('ai-input');
    var msgList = document.getElementById('ai-msg-list');

    if (btn) btn.addEventListener('click', function () { togglePanel(); });
    if (closeBtn) closeBtn.addEventListener('click', function () { togglePanel(false); });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearHistory();
        renderMessages();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var inp2 = document.getElementById('ai-input');
        sendMessage(inp2 && inp2.value);
      });
    }

    if (inp) {
      // Auto-resize textarea
      inp.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      });
      // Enter = gönder, Shift+Enter = yeni satır
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage(this.value);
        }
      });
    }

    // Quick action chip'leri (event delegation)
    if (msgList) {
      msgList.addEventListener('click', function (e) {
        var chip = e.target.closest('.ai-chip');
        if (chip) {
          var prompt = chip.getAttribute('data-prompt');
          if (prompt) {
            var inp3 = document.getElementById('ai-input');
            if (inp3) inp3.value = prompt;
            sendMessage(prompt);
          }
        }
      });
    }

    // ESC tuşuyla kapat
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) togglePanel(false);
    });

    // Dışarı tıklayınca kapat (sadece mobil değilse)
    document.addEventListener('click', function (e) {
      if (!state.open) return;
      if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
        togglePanel(false);
      }
    });
  }

  /* ---- Başlat ---- */
  function init() {
    inject();
    bindEvents();

    // Geçmiş mesajları yükle
    state.messages = loadHistory();

    // Context'i topla (KB.ready() ile oturum yüklendikten sonra)
    var ready = window.KB && KB.ready ? KB.ready() : Promise.resolve();
    ready.then(function () {
      state.userContext = buildContext();
    });

    // Butonu hafif gecikmeyle göster (sayfa yüklenince)
    setTimeout(function () {
      var b = document.getElementById('ai-float');
      if (b) b.classList.add('ai-float--visible');
    }, 800);
  }

  // DOM hazır olunca başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
