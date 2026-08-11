/* ================================================================
   KuryemiBul — motion.js
   Minimal UI feedback: toast bildirimleri ve form shake.
   ================================================================ */
(function () {
  'use strict';

  function getRoot() {
    var root = document.getElementById('kb-toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'kb-toast-root';
      document.body.appendChild(root);
    }
    return root;
  }

  function showToast(msg, type, duration) {
    var root = getRoot();
    var el = document.createElement('div');
    el.className = 'kb-toast' + (type ? ' ' + type : '');
    el.textContent = msg || '';
    root.appendChild(el);

    var ms = duration || 3000;
    setTimeout(function () {
      el.classList.add('out');
      el.addEventListener('animationend', function () { el.remove(); }, { once: true });
    }, ms);
  }

  function showError(inputEl, msg) {
    if (inputEl) {
      inputEl.classList.add('is-error', 'kb-shake');
      inputEl.addEventListener('animationend', function () {
        inputEl.classList.remove('kb-shake');
      }, { once: true });
      inputEl.focus();
    }
    if (msg) showToast(msg, 'error');
  }

  function showSuccess(title, sub, duration) {
    showToast(title + (sub ? ' — ' + sub : ''), 'success', duration);
  }

  function showErrorToast(msg) { showToast(msg, 'error'); }

  window.KBMotion = {
    showToast:      showToast,
    showError:      showError,
    showSuccess:    showSuccess,
    showErrorToast: showErrorToast,
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.KB) window.KB.toast = showToast;
  });

}());
