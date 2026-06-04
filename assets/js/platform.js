/* ============================================================
   Kuryemi Bul — platform.js
   Internal platform shell (sidebar + topbar) + shared viz helpers.
   Pages: <div id="app"></div> + call Platform.init({active,title,subtitle}).
   Reuses the landing visual language (glass, glow, network anim).
   ============================================================ */
window.Platform = (function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[c]; }); }

  var NAV = [
    { group: 'Operasyon', items: [
      { id: 'ops',      ic: '🛰️', t: 'Komuta Merkezi', href: 'ops-merkez.html', tag: 'CANLI' },
      { id: 'net',      ic: '🌐', t: 'Canlı Kurye Ağı', href: 'ag.html' },
      { id: 'match',    ic: '🧠', t: 'Akıllı Eşleşme',  href: 'eslesme.html' },
      { id: 'delivery', ic: '📦', t: 'Teslimat İstihbaratı', href: 'teslimat.html' }
    ]},
    { group: 'Roller', items: [
      { id: 'biz',     ic: '🏪', t: 'İşletme Paneli',  href: 'isletme-panel.html' },
      { id: 'fleet',   ic: '🚚', t: 'Firma Merkezi',   href: 'firma-merkez.html' },
      { id: 'courier', ic: '🛵', t: 'Kurye Profili',   href: 'kurye-kimlik.html' }
    ]},
    { group: 'Analiz', items: [
      { id: 'analytics', ic: '📊', t: 'Analitik & İçgörü', href: 'analitik.html' },
      { id: 'finance',   ic: '💳', t: 'Finans Merkezi',    href: 'finans.html' }
    ]},
    { group: 'Sistem', items: [
      { id: 'notif', ic: '🔔', t: 'Bildirim Merkezi',  href: 'bildirimler.html' },
      { id: 'trust', ic: '🛡️', t: 'Güven & Güvenlik',  href: 'guvenlik.html' }
    ]}
  ];

  function sidebar(active) {
    var groups = NAV.map(function (g) {
      var links = g.items.map(function (it) {
        return '<a href="' + it.href + '" class="side__link' + (it.id === active ? ' is-active' : '') + '">'
          + '<span class="ic">' + it.ic + '</span>' + esc(it.t)
          + (it.tag ? '<span class="tag">' + it.tag + '</span>' : '') + '</a>';
      }).join('');
      return '<div class="side__group"><h5>' + esc(g.group) + '</h5>' + links + '</div>';
    }).join('');
    return '<aside class="side" id="side">'
      + '<a href="index.html" class="side__brand"><span class="brand__mark"><img src="assets/logo.png" alt="" onerror="this.parentNode.textContent=\'🛵\'"></span>Kuryemi&nbsp;Bul</a>'
      + groups
      + '<div class="side__foot"><div class="side__user" id="sideUser"><span class="av">👤</span><span><b>Misafir</b><span>Oturum yok</span></span></div></div>'
      + '</aside>';
  }

  function topbar(title, subtitle) {
    return '<header class="top">'
      + '<button class="top__burger" id="topBurger" aria-label="Menü">☰</button>'
      + '<div class="top__title"><h1>' + esc(title) + '</h1>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div>'
      + '<label class="top__search">🔎<input type="text" placeholder="Kurye, işletme, teslimat ara…" aria-label="Ara"></label>'
      + '<span class="top__live"><span class="dot"></span> Ağ Aktif</span>'
      + '<a href="bildirimler.html" class="top__ic" title="Bildirimler">🔔<span class="badge-dot"></span></a>'
      + '<a href="profil-duzenle.html" class="top__ic" id="topUser" title="Hesabım">👤</a>'
      + '</header>';
  }

  function init(opts) {
    opts = opts || {};
    var app = $('#app'); if (!app) return;
    app.className = 'app';
    app.innerHTML = sidebar(opts.active)
      + '<div class="app__main">' + topbar(opts.title || 'Kuryemi Bul', opts.subtitle || '')
      + '<div class="' + (opts.wide ? 'wrap wrap--wide' : 'wrap') + '" id="wrap"></div></div>'
      + '<div class="side__backdrop" id="sideBd"></div>';
    // mobile sidebar
    var side = $('#side'), bd = $('#sideBd'), burger = $('#topBurger');
    function toggle(open) { side.classList.toggle('is-open', open); bd.classList.toggle('is-open', open); }
    if (burger) burger.addEventListener('click', function () { toggle(!side.classList.contains('is-open')); });
    if (bd) bd.addEventListener('click', function () { toggle(false); });
    // auth-aware user
    fillUser();
    return $('#wrap');
  }

  function fillUser() {
    if (!(window.SB && SB.isOn && SB.isOn())) return;
    if (!SB.getUser) return;
    SB.getUser().then(function (u) {
      if (!u) return;
      var nm = u.email || 'Hesabım';
      if (SB.myProfile) {
        SB.myProfile().then(function (p) {
          var name = (p && p.ad) || nm;
          var role = p && p.role;
          var rl = role === 'kurye' ? 'Kurye' : role === 'isletme' ? 'İşletme' : role === 'firma' ? 'Kurye Firması' : 'Üye';
          var su = $('#sideUser');
          if (su) su.innerHTML = '<span class="av">' + (role === 'isletme' ? '🏪' : role === 'firma' ? '🏢' : '🛵') + '</span><span><b>' + esc(name) + '</b><span>' + rl + '</span></span>';
        }).catch(function () {});
      }
    }).catch(function () {});
  }

  /* ---------------- shared viz helpers ---------------- */
  function reveal(scope) {
    var items = $$('.reveal:not(.in)', scope || document);
    if (!('IntersectionObserver' in window) || reduced) { items.forEach(function (el) { el.classList.add('in'); }); return; }
    var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); } }); }, { threshold: 0.12 });
    items.forEach(function (el) { ro.observe(el); });
  }

  function countUp(el) {
    if (el.dataset.done === '1') return;
    var target = parseFloat(el.dataset.count || '0');
    var suffix = el.dataset.suffix || '', prefix = el.dataset.prefix || '', dec = parseInt(el.dataset.dec || '0', 10);
    if (reduced) { el.textContent = prefix + target.toFixed(dec) + suffix; el.dataset.done = '1'; return; }
    el.dataset.done = '1';
    var dur = 1300, t0 = null;
    function step(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / dur, 1); var e = 1 - Math.pow(1 - p, 3); el.textContent = prefix + (target * e).toFixed(dec) + suffix; if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function counters(scope) {
    var els = $$('[data-count]', scope || document);
    if (!('IntersectionObserver' in window) || reduced) { els.forEach(countUp); return; }
    var co = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); co.unobserve(e.target); } }); }, { threshold: 0.4 });
    els.forEach(function (el) { co.observe(el); });
  }

  function fills(scope) { // .metric__track i[data-fill] / .zonebar i[data-fill] / .bars i[data-h]
    $$('[data-fill]', scope || document).forEach(function (el) { setTimeout(function () { el.style.width = el.dataset.fill + '%'; }, 120); });
    $$('.bars i[data-h]', scope || document).forEach(function (el) { setTimeout(function () { el.style.height = el.dataset.h + '%'; }, 120); });
  }

  // SVG live map (nodes + routes + SMIL courier dots). hubs/pairs optional.
  function buildMap(svg, hubs, pairs) {
    if (!svg) return;
    var id = svg.id || ('m' + Math.random().toString(36).slice(2)); svg.id = id;
    hubs = hubs || [[80,70],[300,48],[520,86],[150,200],[430,210],[300,140]];
    pairs = pairs || [[0,5],[5,2],[3,5],[5,4],[0,3],[1,2]];
    if (!$('#routeg', svg)) {
      svg.insertAdjacentHTML('beforeend', '<defs><linearGradient id="routeg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a855f7"/></linearGradient></defs>');
    }
    var out = '';
    pairs.forEach(function (p, i) {
      var a = hubs[p[0]], b = hubs[p[1]];
      var mx = (a[0]+b[0])/2 + (i%2?-46:46), my = (a[1]+b[1])/2 + (i%2?34:-34);
      out += '<path id="' + id + '-r' + i + '" class="route" d="M' + a[0] + ' ' + a[1] + ' Q ' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1] + '"/>';
    });
    hubs.forEach(function (h, i) {
      var biz = i % 2 === 0;
      out += '<circle class="node' + (biz ? ' node--biz' : '') + '" cx="' + h[0] + '" cy="' + h[1] + '" r="4.5"/>';
      if (!reduced) out += '<circle class="pulse-ring" cx="' + h[0] + '" cy="' + h[1] + '" r="5"><animate attributeName="r" values="5;22" dur="2.6s" begin="' + (i*0.4) + 's" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="2.6s" begin="' + (i*0.4) + 's" repeatCount="indefinite"/></circle>';
    });
    if (!reduced) pairs.forEach(function (p, i) {
      out += '<circle class="courier-dot" r="3.2"><animateMotion dur="' + (3 + i*0.5) + 's" begin="' + (i*0.5) + 's" repeatCount="indefinite" rotate="auto"><mpath xlink:href="#' + id + '-r' + i + '" href="#' + id + '-r' + i + '"/></animateMotion></circle>';
    });
    svg.insertAdjacentHTML('beforeend', out);
  }

  // ambient full-bleed network canvas (same as landing)
  function netCanvas(cv) {
    if (!cv || reduced) return;
    var ctx = cv.getContext('2d'), W, H, DPR = Math.min(window.devicePixelRatio || 1, 2), nodes = [], cps = [];
    function host() { return cv.parentNode || cv; }
    function resize() {
      var r = host().getBoundingClientRect();
      W = cv.width = r.width * DPR; H = cv.height = r.height * DPR;
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      var count = Math.min(54, Math.round(r.width * r.height / 22000)); nodes = [];
      for (var i = 0; i < count; i++) nodes.push({ x: Math.random()*W, y: Math.random()*H, vx: (Math.random()-0.5)*0.16*DPR, vy: (Math.random()-0.5)*0.16*DPR });
      cps = []; for (var j = 0; j < Math.max(3, (count/8)|0); j++) cps.push({ a:(Math.random()*count)|0, b:(Math.random()*count)|0, t:Math.random(), sp:0.0016+Math.random()*0.002 });
    }
    var MAXD;
    function tick() {
      MAXD = 140 * DPR; ctx.clearRect(0,0,W,H);
      for (var i=0;i<nodes.length;i++){ var n=nodes[i]; n.x+=n.vx; n.y+=n.vy; if(n.x<0||n.x>W)n.vx*=-1; if(n.y<0||n.y>H)n.vy*=-1; }
      for (var a=0;a<nodes.length;a++) for (var b=a+1;b<nodes.length;b++){ var dx=nodes[a].x-nodes[b].x, dy=nodes[a].y-nodes[b].y, d=Math.sqrt(dx*dx+dy*dy); if(d<MAXD){ ctx.strokeStyle='rgba(110,150,230,'+((1-d/MAXD)*0.14)+')'; ctx.lineWidth=DPR*0.55; ctx.beginPath(); ctx.moveTo(nodes[a].x,nodes[a].y); ctx.lineTo(nodes[b].x,nodes[b].y); ctx.stroke(); } }
      for (var k=0;k<nodes.length;k++){ ctx.fillStyle='rgba(150,180,240,0.4)'; ctx.beginPath(); ctx.arc(nodes[k].x,nodes[k].y,DPR*1.2,0,6.2832); ctx.fill(); }
      for (var c=0;c<cps.length;c++){ var cu=cps[c], na=nodes[cu.a], nb=nodes[cu.b]; if(!na||!nb)continue; cu.t+=cu.sp; if(cu.t>1){cu.t=0; cu.a=cu.b; cu.b=(Math.random()*nodes.length)|0;} var x=na.x+(nb.x-na.x)*cu.t, y=na.y+(nb.y-na.y)*cu.t; var g=ctx.createRadialGradient(x,y,0,x,y,DPR*8); g.addColorStop(0,'rgba(34,211,238,0.85)'); g.addColorStop(1,'rgba(34,211,238,0)'); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,DPR*8,0,6.2832); ctx.fill(); ctx.fillStyle='#dffaff'; ctx.beginPath(); ctx.arc(x,y,DPR*1.6,0,6.2832); ctx.fill(); }
      requestAnimationFrame(tick);
    }
    resize(); tick();
    var rt; window.addEventListener('resize', function(){ clearTimeout(rt); rt=setTimeout(resize,200); });
  }

  // SVG area+line chart from a list of values (0..max). Animated stroke.
  function lineChart(svg, vals, opts) {
    if (!svg || !vals || !vals.length) return;
    opts = opts || {};
    var W = opts.w || 600, H = opts.h || 200, pad = 8;
    var max = opts.max || Math.max.apply(null, vals) * 1.15 || 1;
    var n = vals.length, dx = (W - pad * 2) / (n - 1);
    var pts = vals.map(function (v, i) { return [pad + i * dx, H - pad - (v / max) * (H - pad * 2)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = 'M' + pts[0][0] + ' ' + (H - pad) + ' ' + pts.map(function (p) { return 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') + ' L' + pts[n - 1][0] + ' ' + (H - pad) + ' Z';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var defs = '<defs>'
      + '<linearGradient id="routeg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a855f7"/></linearGradient>'
      + '<linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(34,211,238,0.35)"/><stop offset="1" stop-color="rgba(34,211,238,0)"/></linearGradient></defs>';
    var dots = pts.map(function (p) { return '<circle class="pt" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.6"/>'; }).join('');
    svg.innerHTML = defs + '<path class="area" d="' + area + '"/><path class="line" d="' + d + '"/>' + dots;
    if (!reduced) {
      var path = svg.querySelector('.line'), len = path.getTotalLength();
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 1.6s var(--ease)'; path.style.strokeDashoffset = 0;
    }
  }

  // run all standard page animations
  function animate(scope) { reveal(scope); counters(scope); fills(scope); }

  return { init: init, reveal: reveal, counters: counters, fills: fills, buildMap: buildMap, netCanvas: netCanvas, lineChart: lineChart, animate: animate, esc: esc, NAV: NAV };
})();
