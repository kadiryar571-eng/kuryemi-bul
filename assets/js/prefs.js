/* ── KBPrefs — İş tercih eşleştirme API ── */
(function () {
  'use strict';

  function uid() {
    try { if (window.KB && KB.session && KB.session().user) return KB.session().user.id; } catch (e) {}
    return 'demo';
  }

  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem('kb_prefs_' + uid())) || {}; } catch (e) { return {}; }
  }

  function calcScore(prefs, job) {
    if (!job) return 50;
    var score = 0, possible = 0;

    /* Çalışma tipi */
    if (prefs.calisma_tipleri && prefs.calisma_tipleri.length) {
      possible += 30;
      var tip = (job.vardiya_tipi || '').toLowerCase();
      if (prefs.calisma_tipleri.some(function (t) { return tip.indexOf(t.toLowerCase()) !== -1; })) score += 30;
    }

    /* Maaş — job.maas_aralik örn: "14.000–18.000 TL/ay" */
    if (prefs.min_maas && job.maas_aralik) {
      possible += 25;
      var m = (job.maas_aralik + '').replace(/\./g, '').match(/(\d+)/);
      if (m && parseInt(m[1], 10) >= prefs.min_maas) score += 25;
    }

    /* Faydalar */
    if (prefs.faydalar && prefs.faydalar.length) {
      possible += 25;
      var jFay = (job.faydalar || []).concat(job.sigorta ? ['Sigorta', 'SGK'] : []);
      if (jFay.length) {
        var matched = prefs.faydalar.filter(function (f) {
          var kw = f.replace(' işler', '').toLowerCase();
          return jFay.some(function (jf) { return (jf + '').toLowerCase().indexOf(kw) !== -1; });
        });
        score += Math.round(25 * matched.length / prefs.faydalar.length);
      }
    }

    /* Vardiya saati */
    if (prefs.vardiyalar && prefs.vardiyalar.length && job.calisma_saatleri) {
      possible += 20;
      var saatler = job.calisma_saatleri + '';
      var pat = { 'Sabah': /0[6-9]:|1[0-1]:/, 'Öğlen': /1[2-5]:/, 'Akşam': /1[6-9]:|2[0-1]:/, 'Gece': /2[2-9]:|0[0-5]:/ };
      if (prefs.vardiyalar.some(function (v) { return pat[v] && pat[v].test(saatler); })) score += 20;
    }

    return possible === 0 ? 50 : Math.min(100, Math.round(score / possible * 100));
  }

  window.KBPrefs = {
    _c: null,
    load:       function () { if (!this._c) this._c = loadPrefs(); return this._c; },
    bust:       function () { this._c = null; },
    matchScore: function (job) { return calcScore(this.load(), job); },
    matchesJob: function (job) { return this.matchScore(job) >= 40; },
    hasPrefs:   function () {
      var p = this.load();
      return !!(p.calisma_tipleri && p.calisma_tipleri.length) ||
             !!(p.sektorler && p.sektorler.length) ||
             !!(p.min_maas) || !!(p.vardiyalar && p.vardiyalar.length);
    }
  };
})();
