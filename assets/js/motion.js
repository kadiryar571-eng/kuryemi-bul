/* motion.js — KuryemiBul Micro Interaction & Motion Controller v1.0 */
(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var page = location.pathname.replace(/^.*\//, '').replace('.html', '');

  /* ── HELPERS ────────────────────────────────────────────────── */
  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  function once(el, event, fn) {
    el.addEventListener(event, fn, { once: true });
  }

  function removeEl(el, delay) {
    setTimeout(function () { if (el && el.parentNode) el.parentNode.removeChild(el); }, delay || 0);
  }

  /* ── 1. PAGE TRANSITIONS ────────────────────────────────────── */
  function initPageTransitions() {
    if (prefersReduced) return;
    qsa('a[href]:not([target="_blank"]):not([data-no-trans])').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('javascript') === 0 || href.indexOf('//') !== -1) return;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        document.body.classList.add('kb-page-leaving');
        setTimeout(function () { location.href = href; }, 140);
      });
    });
  }

  /* ── 2. PULL TO REFRESH ─────────────────────────────────────── */
  function initPTR(container, refreshFn) {
    if (prefersReduced || !container) return;

    var threshold = 68;
    var maxPull   = 90;
    var startY    = 0;
    var pulling   = false;
    var refreshing = false;

    /* Build indicator if not present */
    var indicator = container.querySelector('.kb-ptr__indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'kb-ptr__indicator';
      indicator.innerHTML =
        '<span class="kb-ptr__arrow">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>' +
          '</svg>' +
        '</span>' +
        '<span class="kb-ptr__refresh-spin"></span>';
      container.insertBefore(indicator, container.firstChild);
    }

    container.classList.add('kb-ptr');
    var content = container;

    function onTouchStart(e) {
      if (container.scrollTop > 2) return;
      startY  = e.touches[0].clientY;
      pulling = true;
    }

    function onTouchMove(e) {
      if (!pulling || refreshing) return;
      var dy = e.touches[0].clientY - startY;
      if (dy > 0 && container.scrollTop <= 0) {
        e.preventDefault();
        var pull = Math.min(dy * 0.5, maxPull);
        content.style.paddingTop = pull + 'px';
        container.classList.toggle('is-pulling', pull > 8);
        container.classList.toggle('is-ready',   pull >= threshold * 0.65);
      }
    }

    function onTouchEnd() {
      if (!pulling) return;
      pulling = false;
      var ready = container.classList.contains('is-ready');
      content.style.paddingTop = '';
      container.classList.remove('is-pulling', 'is-ready');

      if (ready && !refreshing) {
        refreshing = true;
        container.classList.add('is-refreshing');

        var done = function () {
          refreshing = false;
          container.classList.remove('is-refreshing');
        };

        if (typeof refreshFn === 'function') {
          var result;
          try { result = refreshFn(); } catch (err) { done(); return; }
          if (result && typeof result.then === 'function') {
            result.then(done).catch(done);
          } else {
            setTimeout(done, 800);
          }
        } else {
          setTimeout(done, 800);
        }
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove',  onTouchMove,  { passive: false });
    container.addEventListener('touchend',   onTouchEnd,   { passive: true });
  }

  /* ── 3. AUTO-INIT PTR ON CURRENT PAGE ───────────────────────── */
  function initPagePTR() {
    var mainEl = qs('main') || qs('.prf-main');
    if (!mainEl) return;

    var refreshFn = null;
    if (typeof KBApp !== 'undefined') {
      var map = {
        'ilanlar':       function () { KBApp.renderListings && KBApp.renderListings(); },
        'bildirimler':   function () { KBApp.renderNotifications && KBApp.renderNotifications(); },
        'mesajlar':      function () { KBApp.renderMessages && KBApp.renderMessages(); },
        'havuzum':       function () { KBApp.renderMyPool && KBApp.renderMyPool(); },
        'harita':        function () { KBApp.renderNearby && KBApp.renderNearby(); },
        'panel-kurye':   function () { KBApp.initPanel && KBApp.initPanel('kurye'); },
        'panel-firma':   function () { KBApp.initPanel && KBApp.initPanel('firma'); },
        'panel-isletme': function () { KBApp.initPanel && KBApp.initPanel('isletme'); },
      };
      refreshFn = map[page] || null;
    }

    initPTR(mainEl, refreshFn);
  }

  /* ── 4. SUCCESS OVERLAY ─────────────────────────────────────── */
  function showSuccess(title, sub, duration) {
    if (!title) title = 'Başarılı!';
    duration = duration || 2200;

    var overlay = document.createElement('div');
    overlay.className = 'kb-success-overlay';
    overlay.innerHTML =
      '<div class="kb-success-card">' +
        '<div class="kb-success-card__icon">' +
          '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"' +
            ' stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="20 6 9 17 4 12"' +
              ' style="stroke-dasharray:50;stroke-dashoffset:50;' +
              'animation:kb-draw 0.4s cubic-bezier(0,0,0.2,1) 0.28s forwards"/>' +
          '</svg>' +
        '</div>' +
        '<p class="kb-success-card__title">' + title + '</p>' +
        (sub ? '<p class="kb-success-card__sub">' + sub + '</p>' : '') +
      '</div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function () { dismissOverlay(overlay); });
    setTimeout(function () { dismissOverlay(overlay); }, duration);
  }

  function dismissOverlay(overlay) {
    overlay.style.transition = 'opacity 150ms ease';
    overlay.style.opacity = '0';
    removeEl(overlay, 160);
  }

  /* ── 5. ERROR HELPERS ───────────────────────────────────────── */
  function showError(el, message) {
    if (!el) return;
    el.classList.add('kb-input-error', 'kb-shake');
    once(el, 'animationend', function () { el.classList.remove('kb-shake'); });

    if (message && el.parentNode) {
      var prev = el.parentNode.querySelector('.kb-field-error');
      if (prev) prev.parentNode.removeChild(prev);
      var err = document.createElement('span');
      err.className = 'kb-field-error';
      err.textContent = message;
      el.parentNode.insertBefore(err, el.nextSibling);
    }
  }

  function clearError(el) {
    if (!el) return;
    el.classList.remove('kb-input-error', 'kb-shake', 'is-error');
    if (el.parentNode) {
      var err = el.parentNode.querySelector('.kb-field-error');
      if (err) err.parentNode.removeChild(err);
    }
  }

  function showErrorToast(message, duration) {
    duration = duration || 3200;
    var prev = qs('.kb-error-toast');
    if (prev) removeEl(prev);

    var toast = document.createElement('div');
    toast.className = 'kb-error-toast';
    toast.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"' +
      ' stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/>' +
      '<line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>' +
      '<span>' + message + '</span>';
    document.body.appendChild(toast);

    setTimeout(function () {
      toast.style.transition = 'opacity 200ms ease, transform 200ms ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      removeEl(toast, 210);
    }, duration);
  }

  /* ── 6. IN-APP NOTIFICATION ─────────────────────────────────── */
  function showInAppNotif(title, sub, onTap) {
    var prev = qs('.kb-inapp-notif');
    if (prev) removeEl(prev);

    var el = document.createElement('div');
    el.className = 'kb-inapp-notif';
    el.innerHTML =
      '<div class="kb-inapp-notif__icon">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"' +
        ' stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>' +
        '<path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div class="kb-inapp-notif__title">' + title + '</div>' +
        (sub ? '<div class="kb-inapp-notif__sub">' + sub + '</div>' : '') +
      '</div>';

    document.body.appendChild(el);

    function dismiss() {
      el.classList.add('is-leaving');
      removeEl(el, 160);
    }

    el.addEventListener('click', function () { dismiss(); if (typeof onTap === 'function') onTap(); });
    setTimeout(dismiss, 4200);
  }

  /* ── 7. STATUS UPDATE ───────────────────────────────────────── */
  function updateStatus(el, newStatus) {
    if (!el) return;
    if (newStatus) el.setAttribute('data-status', newStatus);
    el.classList.add('is-updated');
    once(el, 'animationend', function () { el.classList.remove('is-updated'); });
  }

  /* ── 8. BADGE REVEAL ────────────────────────────────────────── */
  function revealBadge(el) {
    if (!el || prefersReduced) return;
    el.classList.add('kb-badge-new');
    once(el, 'animationend', function () { el.classList.remove('kb-badge-new'); });
  }

  /* ── 9. PROGRESS BAR ANIMATION ──────────────────────────────── */
  function animateProgress(el, targetPct) {
    if (!el) return;
    if (prefersReduced) { el.style.width = targetPct + '%'; return; }
    el.style.width = '0%';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var ms = Math.max(300, targetPct * 6);
        el.style.transition = 'width ' + ms + 'ms cubic-bezier(0,0,0.2,1)';
        el.style.width = targetPct + '%';
      });
    });
  }

  /* ── 10. STAGGER CHILDREN ───────────────────────────────────── */
  function staggerIn(parent, childSel, stepMs) {
    if (!parent || prefersReduced) return;
    stepMs = stepMs || 45;
    qsa.call(parent, childSel || ':scope > *').forEach(function (child, i) {
      child.style.animationDelay = (i * stepMs) + 'ms';
      child.classList.add('kb-anim-page-in');
    });
  }

  /* ── 11. CARD TAP FEEDBACK ──────────────────────────────────── */
  function initCardTap() {
    if (prefersReduced) return;
    var sel = '.talent-card,.mob-opp-row,.pool-card,.mob-section__card';
    qsa(sel).forEach(function (card) {
      card.addEventListener('touchstart', function () {
        card.classList.add('kb-tap-flash');
        once(card, 'animationend', function () { card.classList.remove('kb-tap-flash'); });
      }, { passive: true });
    });
  }

  /* ── 12. INTERSECTION OBSERVER — SCROLL REVEAL ──────────────── */
  function initScrollReveal() {
    if (prefersReduced || typeof IntersectionObserver === 'undefined') return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('kb-content-loaded');
          obs.unobserve(entry.target);
          setTimeout(function () { entry.target.classList.add('kb-anim-done'); }, 800);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

    qsa('.mob-section, .prf-stat-card, .plan-card, .dash-perf-card').forEach(function (el) {
      obs.observe(el);
    });
  }

  /* ── 13. BACK NAVIGATION — SHEET COORDINATION ───────────────── */
  function initBackNav() {
    var openStack = [];

    document.addEventListener('kb:sheet:open', function (e) {
      if (e.detail && e.detail.id) {
        history.pushState({ kbSheet: e.detail.id }, '');
        openStack.push(e.detail.id);
      }
    });

    document.addEventListener('kb:sheet:close', function (e) {
      if (e.detail && e.detail.id) {
        openStack = openStack.filter(function (id) { return id !== e.detail.id; });
      }
    });

    window.addEventListener('popstate', function (e) {
      if (openStack.length > 0) {
        var lastId = openStack[openStack.length - 1];
        var sheet  = document.getElementById(lastId);
        if (sheet) {
          sheet.classList.remove('is-open');
          var overlay = qs('.kb-bottom-sheet-overlay');
          if (overlay) overlay.classList.remove('is-open');
          openStack.pop();
        }
      }
    });
  }

  /* ── 14. BOTTOM SHEET DRAG ──────────────────────────────────── */
  function initSheetDrag() {
    if (prefersReduced) return;
    qsa('.kb-bottom-sheet').forEach(function (sheet) {
      var handle = sheet.querySelector('.kb-bottom-sheet__handle');
      if (!handle) return;

      var startY   = 0;
      var startPos = 0;
      var dragging = false;

      handle.addEventListener('touchstart', function (e) {
        startY   = e.touches[0].clientY;
        startPos = 0;
        dragging = true;
        sheet.classList.add('is-dragging');
        sheet.style.transition = 'none';
      }, { passive: true });

      document.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        var dy = Math.max(0, e.touches[0].clientY - startY);
        startPos = dy;
        sheet.style.transform = 'translateY(' + dy + 'px)';
      }, { passive: true });

      document.addEventListener('touchend', function () {
        if (!dragging) return;
        dragging = false;
        sheet.classList.remove('is-dragging');
        sheet.style.transition = '';

        if (startPos > 80) {
          sheet.style.transform = '';
          sheet.classList.remove('is-open');
          var overlay = qs('.kb-bottom-sheet-overlay');
          if (overlay) overlay.classList.remove('is-open');
          document.dispatchEvent(new CustomEvent('kb:sheet:close', { detail: { id: sheet.id } }));
        } else {
          sheet.style.transform = '';
        }
      }, { passive: true });
    });
  }

  /* ── 15. WILL-CHANGE CLEANUP ─────────────────────────────────── */
  function cleanupWillChange() {
    qsa('.kb-bottom-sheet, .kb-ptr__content, .bottom-nav').forEach(function (el) {
      once(el, 'transitionend', function () {
        setTimeout(function () { el.classList.add('kb-anim-done'); }, 100);
      });
    });
  }

  /* ── INIT ───────────────────────────────────────────────────── */
  function init() {
    initPageTransitions();
    initCardTap();
    initScrollReveal();
    initBackNav();
    initSheetDrag();
    cleanupWillChange();
    initPagePTR();
  }

  /* ── PUBLIC API ─────────────────────────────────────────────── */
  window.KBMotion = {
    init:            init,
    showSuccess:     showSuccess,
    showError:       showError,
    clearError:      clearError,
    showErrorToast:  showErrorToast,
    showInAppNotif:  showInAppNotif,
    updateStatus:    updateStatus,
    revealBadge:     revealBadge,
    animateProgress: animateProgress,
    staggerIn:       staggerIn,
    initPTR:         initPTR,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
