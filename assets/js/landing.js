/* ============================================================
   Kuryemi Bul — landing.js
   Premium landing: ag animasyonu, scroll reveal, count-up,
   canli harita (SVG), gercek istatistik (SB), auth-aware nav.
   ============================================================ */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Nav: scroll state + burger ---------- */
  var nav = $('#nav');
  function onScroll() { if (nav) nav.classList.toggle('is-stuck', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var burger = $('#burger'), links = $('.nav__links');
  if (burger && links) {
    burger.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      burger.textContent = open ? '✕' : '☰';
    });
    $$('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('is-open'); burger.textContent = '☰'; });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealItems = $$('.reveal:not(.in)');
  if ('IntersectionObserver' in window && !reduced) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach(function (el) { ro.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Count-up ---------- */
  function countUp(el) {
    if (el.dataset.done === '1') return;
    var target = parseFloat(el.dataset.count || '0');
    var suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = target + suffix; el.dataset.done = '1'; return; }
    el.dataset.done = '1';
    var dur = 1300, t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function watchCounts(scope) {
    var els = $$('[data-count]', scope);
    if (!('IntersectionObserver' in window) || reduced) { els.forEach(countUp); return; }
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.4 });
    els.forEach(function (el) { co.observe(el); });
  }
  watchCounts(document);

  /* ---------- Tier progress bars ---------- */
  if ('IntersectionObserver' in window) {
    var bo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.style.width = (e.target.dataset.fill || 0) + '%'; bo.unobserve(e.target); }
      });
    }, { threshold: 0.6 });
    $$('.tier__bar i').forEach(function (el) { bo.observe(el); });
  } else {
    $$('.tier__bar i').forEach(function (el) { el.style.width = (el.dataset.fill || 0) + '%'; });
  }

  /* ---------- Bento spotlight ---------- */
  $$('.bcard').forEach(function (card) {
    card.addEventListener('mousemove', function (ev) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  });

  /* ---------- SVG live map builder (SMIL) ---------- */
  function buildMap(svg, hubs, pairs) {
    if (!svg) return;
    var id = svg.id || ('m' + Math.random().toString(36).slice(2));
    svg.id = id;
    var out = '';
    // routes
    pairs.forEach(function (p, i) {
      var a = hubs[p[0]], b = hubs[p[1]];
      var mx = (a[0] + b[0]) / 2 + (i % 2 ? -46 : 46);
      var my = (a[1] + b[1]) / 2 + (i % 2 ? 34 : -34);
      out += '<path id="' + id + '-r' + i + '" class="route" d="M' + a[0] + ' ' + a[1] + ' Q ' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1] + '"/>';
    });
    // hub nodes + pulse rings
    hubs.forEach(function (h, i) {
      var biz = i % 2 === 0;
      out += '<circle class="node' + (biz ? ' node--biz' : '') + '" cx="' + h[0] + '" cy="' + h[1] + '" r="4.5"/>';
      if (!reduced) {
        out += '<circle class="pulse-ring" cx="' + h[0] + '" cy="' + h[1] + '" r="5">'
          + '<animate attributeName="r" values="5;22" dur="2.6s" begin="' + (i * 0.4) + 's" repeatCount="indefinite"/>'
          + '<animate attributeName="opacity" values="0.7;0" dur="2.6s" begin="' + (i * 0.4) + 's" repeatCount="indefinite"/>'
          + '</circle>';
      }
    });
    // courier dots travelling along routes
    if (!reduced) {
      pairs.forEach(function (p, i) {
        out += '<circle class="courier-dot" r="3.2">'
          + '<animateMotion dur="' + (3 + i * 0.5) + 's" begin="' + (i * 0.5) + 's" repeatCount="indefinite" rotate="auto">'
          + '<mpath xlink:href="#' + id + '-r' + i + '" href="#' + id + '-r' + i + '"/></animateMotion></circle>';
      });
    }
    svg.insertAdjacentHTML('beforeend', out);
  }

  buildMap($('#mapsvg'),
    [[80, 70], [300, 48], [520, 86], [150, 200], [430, 210], [300, 140]],
    [[0, 5], [5, 2], [3, 5], [5, 4], [0, 3], [1, 2]]);
  buildMap($('#mapsvg2'),
    [[90, 80], [310, 56], [520, 110], [170, 220], [440, 230], [300, 150], [70, 180]],
    [[0, 5], [5, 2], [3, 5], [5, 4], [0, 3], [1, 2], [6, 3], [5, 6]]);

  // bento mini network
  (function () {
    var svg = $('#bento-net'); if (!svg) return;
    var pts = [[60, 60], [200, 40], [340, 80], [120, 170], [280, 180], [200, 280], [70, 300], [330, 260]];
    var edges = [[0, 1], [1, 2], [0, 3], [1, 4], [3, 4], [3, 5], [4, 5], [5, 6], [4, 7], [2, 7]];
    var out = '';
    edges.forEach(function (e) {
      var a = pts[e[0]], b = pts[e[1]];
      out += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(79,139,255,0.25)" stroke-width="1"/>';
    });
    pts.forEach(function (p, i) {
      var c = i % 3 === 0 ? '#22d3ee' : (i % 3 === 1 ? '#4f8bff' : '#a855f7');
      out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i % 2 ? 3 : 4.5) + '" fill="' + c + '">';
      if (!reduced) out += '<animate attributeName="opacity" values="0.4;1;0.4" dur="' + (2.2 + i * 0.3) + 's" repeatCount="indefinite"/>';
      out += '</circle>';
    });
    svg.insertAdjacentHTML('beforeend', out);
  })();

  /* ---------- Full-screen network canvas (devre dışı) ---------- */
  (function () {
    return;
    var ctx = cv.getContext('2d'), W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
    var nodes = [], couriers = [];
    function resize() {
      W = cv.width = innerWidth * DPR; H = cv.height = innerHeight * DPR;
      cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
      var count = Math.min(64, Math.round(innerWidth * innerHeight / 26000));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.18 * DPR, vy: (Math.random() - 0.5) * 0.18 * DPR });
      }
      couriers = [];
      for (var j = 0; j < Math.max(4, (count / 7) | 0); j++) {
        couriers.push({ a: (Math.random() * count) | 0, b: (Math.random() * count) | 0, t: Math.random(), sp: 0.0016 + Math.random() * 0.0022 });
      }
    }
    var MAXD = 150 * DPR;
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      }
      // links
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAXD) {
            var o = (1 - d / MAXD) * 0.16;
            ctx.strokeStyle = 'rgba(110,150,230,' + o + ')';
            ctx.lineWidth = DPR * 0.6;
            ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
          }
        }
      }
      // nodes
      for (var k = 0; k < nodes.length; k++) {
        ctx.fillStyle = 'rgba(150,180,240,0.45)';
        ctx.beginPath(); ctx.arc(nodes[k].x, nodes[k].y, DPR * 1.3, 0, 6.2832); ctx.fill();
      }
      // couriers gliding along node pairs
      for (var c = 0; c < couriers.length; c++) {
        var cu = couriers[c], na = nodes[cu.a], nb = nodes[cu.b];
        if (!na || !nb) continue;
        cu.t += cu.sp; if (cu.t > 1) { cu.t = 0; cu.a = cu.b; cu.b = (Math.random() * nodes.length) | 0; }
        var x = na.x + (nb.x - na.x) * cu.t, y = na.y + (nb.y - na.y) * cu.t;
        var g = ctx.createRadialGradient(x, y, 0, x, y, DPR * 9);
        g.addColorStop(0, 'rgba(34,211,238,0.9)'); g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, DPR * 9, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#dffaff'; ctx.beginPath(); ctx.arc(x, y, DPR * 1.7, 0, 6.2832); ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize(); tick();
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 200); });
  })();

  /* ---------- Real stats from Supabase ---------- */
  function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'K' : String(n); }
  if (window.SB && SB.isOn && SB.isOn() && SB.poolCounts) {
    SB.poolCounts().then(function (c) {
      var map = { 'st-kurye': c.kurye, 'st-isletme': c.isletme, 'st-firma': c.firma };
      Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        el.dataset.count = map[id] || 0;
        el.dataset.suffix = (map[id] >= 1000) ? '' : '';
        el.dataset.done = '';            // allow (re)count
        el.textContent = '0';
        countUp(el);
      });
    }).catch(function () {});
  }

  /* ---------- Home = Dashboard: landing yalnız guest'e ---------- */
  // Girişli kullanıcı landing'e gelirse doğrudan paneline yönlendirilir
  // (auth sonrası pazarlama sayfası gösterilmez — "çıkış yapmış" hissi olmaz).
  function panelFor(role) {
    return role === 'kurye' ? 'panel-kurye.html'
      : role === 'isletme' ? 'panel-isletme.html'
      : role === 'firma' ? 'panel-firma.html' : 'havuzum.html';
  }
  if (window.SB && SB.isOn && SB.isOn() && SB.getUser) {
    SB.getUser().then(function (u) {
      if (!u) return;
      if (SB.myProfile) {
        SB.myProfile().then(function (p) { location.replace(panelFor(p && p.role)); })
          .catch(function () { location.replace('havuzum.html'); });
      } else { location.replace('havuzum.html'); }
    }).catch(function () {});
  }
})();
