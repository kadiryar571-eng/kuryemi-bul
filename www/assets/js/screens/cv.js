/* ============================================================
   KuryemiBul — screens/cv.js
   Kurye özgeçmişi (CV): altı adımlı sihirbaz + işveren görünümü.

   Web'deki karşılığı docs/assets/js/cv.js'tir. Veri şeması ve doğrulama
   kuralları BİREBİR aynıdır — iki yüzey aynı courier_cv satırını ve aynı
   work_experience kayıtlarını paylaşır, kopya tutulmaz.

   NEDEN AYRI DOSYA: sihirbaz tek bir sorumluluk taşır (özgeçmiş yazma ve
   gösterme). kurye.js zaten 86 KB; firma.js ve isletme.js buradan yalnız
   CvScreens.loadCv(profileId, hedefId) çağırır — SharedScreens.loadIsDeneyimi
   ile birebir aynı imza. Böylece işveren ekranları kurye modülüne bağımlı
   olmaz.

   GERİ TUŞU: sihirbaz tek route'tur (/kurye/cv), adım içeride tutulur.
   Android donanım geri tuşu app.js'teki closeTopLayer() zincirinden geçer;
   oraya üçüncü halka olarak CvScreens.geriAdim() takılıdır. Böylece geri
   tuşu sihirbazdan ATMAK yerine bir adım geri gider — Android'de beklenen
   davranış budur.
   ============================================================ */
window.CvScreens = (function () {
  'use strict';

  var EHLIYET   = ['A1', 'A2', 'A', 'B'];
  var MUSAITLIK = ['Tam zamanlı', 'Yarı zamanlı', 'Hafta sonu', 'Vardiyalı', 'Esnek'];
  var ADIMLAR   = ['Özet', 'Ehliyet', 'Eğitim', 'Deneyim', 'Tercihler', 'Önizleme'];
  var TASLAK_KEY = 'kb_cv_taslak';

  /* BOŞ NESNEYLE başlar, null ile DEĞİL. renderScreen alt düğmeleri hemen
     basar ama load() 120 ms + whenEl beklemesi sonra biter; arada "İleri"ye
     dokunulursa collectStep() null üzerinde yazmaya çalışıp çökerdi. */
  var _taslak      = bosTaslak();
  var _adim        = 1;
  var _yuklendi    = false;
  var _deneyimler  = [];
  var _kaydediyor  = false;

  function on() { return !!(window.SB && SB.isOn()); }

  function bosTaslak() {
    return {
      ozet: '', ehliyetSinifi: [], ehliyetTarihi: null,
      srcBelge: false, srcGecerlilik: null,
      egitim: [], tercihBolgeler: [], musaitlik: '',
      yayinlandi: false
    };
  }

  /* ── Taslak yükleme ───────────────────────────────────────
     Melez doldurma: özet boşsa profildeki açıklamadan başlar, bölgeler
     boşsa profildeki bölgelerden. Kullanıcı bir kez düzenlediyse artık
     dokunulmaz. Yarım kalmış oturum taslağı her şeyin üstünde tutulur. */
  async function load() {
    if (_yuklendi) return _taslak;
    _taslak = bosTaslak();

    if (on()) {
      var profil = null, cv = null;
      try { profil = await SB.myProfile(); } catch (e) { profil = null; }
      try { cv = await SB.myCv(); } catch (e) { cv = null; }

      if (cv) _taslak = JSON.parse(JSON.stringify(cv));
      if (!_taslak.ozet && profil && profil.aciklama) _taslak.ozet = profil.aciklama;
      if (!_taslak.tercihBolgeler.length && profil && profil.bolgeler) {
        _taslak.tercihBolgeler = profil.bolgeler.slice();
      }
    }

    try {
      var ham = sessionStorage.getItem(TASLAK_KEY);
      if (ham) _taslak = Object.assign(_taslak, JSON.parse(ham));
    } catch (e) {}

    _yuklendi = true;
    return _taslak;
  }

  function taslagiYaz() {
    try { sessionStorage.setItem(TASLAK_KEY, JSON.stringify(_taslak)); } catch (e) {}
  }
  function taslagiSil() {
    try { sessionStorage.removeItem(TASLAK_KEY); } catch (e) {}
  }

  function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  /* Ekrandaki alanları taslağa al. Çip/satır seçimleri zaten anında
     taslağa yazıldığı için burada yalnız serbest metin alanları var.

     HER ALAN VARLIK KONTROLÜNDEN GEÇER. Adım henüz render edilmemişken
     (renderScreen alt düğmeleri load()'dan önce basar) val() boş string
     döner ve kontrolsüz atama DOLU TASLAĞI SİLERDİ — kurye özetini
     kaybederdi. Alan yoksa o alana dokunulmaz. */
  function collectStep(n) {
    if (n === 1) {
      var oz = document.getElementById('cv-ozet');
      if (oz) _taslak.ozet = oz.value.trim();
    }
    if (n === 2) {
      var et = document.getElementById('cv-ehliyet-tarih');
      if (et) _taslak.ehliyetTarihi = et.value || null;
      var src = document.getElementById('cv-src');
      if (src) {
        _taslak.srcBelge = !!src.checked;
        _taslak.srcGecerlilik = src.checked ? (val('cv-src-gecerlilik') || null) : null;
      }
    }
    if (n === 5) {
      var bl = document.getElementById('cv-bolgeler');
      if (bl) {
        _taslak.tercihBolgeler = bl.value.split(',')
          .map(function (s) { return s.trim(); })
          .filter(function (s) { return s.length > 0; });
      }
    }
    taslagiYaz();
  }

  /* Doğrulama gerçekten engelleyici olmalı; "tüm alanları doldurun" deyip
     tek alanla geçiren sahte kontrol YAZILMAZ. docs/ ile aynı kurallar. */
  function gecerliMi(n) {
    if (n === 1 && _taslak.ozet.trim().length < 20) {
      return { ok: false, mesaj: 'Özet en az 20 karakter olmalı.' };
    }
    if (n === 2 && !_taslak.ehliyetSinifi.length) {
      return { ok: false, mesaj: 'En az bir ehliyet sınıfı seç.' };
    }
    if (n === 2 && _taslak.srcBelge && !_taslak.srcGecerlilik) {
      return { ok: false, mesaj: 'SRC belgesi işaretliyse geçerlilik tarihi gerekir.' };
    }
    return { ok: true, mesaj: '' };
  }

  /* Doluluk oranı — adım sayacı DEĞİL. Altı alandan kaçı dolu. */
  function tamamlanma() {
    var puan = 0;
    if (_taslak.ozet.trim().length >= 20) puan++;
    if (_taslak.ehliyetSinifi.length)     puan++;
    if (_taslak.srcBelge)                 puan++;
    if (_taslak.egitim.length)            puan++;
    if (_taslak.tercihBolgeler.length)    puan++;
    if (_taslak.musaitlik)                puan++;
    return Math.round(puan / 6 * 100);
  }

  /* ── Adım gövdeleri ─────────────────────────────────────── */

  function stepOzet() {
    return '<div class="kb-form-group">' +
      '<label class="kb-label" for="cv-ozet">Kendini kısaca anlat</label>' +
      '<textarea id="cv-ozet" class="kb-input" rows="6" maxlength="600" ' +
        'placeholder="Kaç yıldır kuryelik yapıyorsun, hangi bölgeleri biliyorsun, ' +
        'nasıl bir işveren arıyorsun?">' + esc(_taslak.ozet) + '</textarea>' +
      '<p class="cv-hint">En az 20 karakter. İşveren profilinde ilk bunu görecek.</p>' +
    '</div>';
  }

  function stepEhliyet() {
    var h = '<div class="kb-form-group"><span class="kb-label">Ehliyet sınıfın</span>' +
      '<div class="cv-chips">';
    EHLIYET.forEach(function (s) {
      var sec = _taslak.ehliyetSinifi.indexOf(s) > -1;
      h += '<button type="button" class="cv-chip' + (sec ? ' is-on' : '') +
           '" onclick="CvScreens._ehliyet(\'' + escJs(s) + '\')">' + esc(s) + '</button>';
    });
    h += '</div><p class="cv-hint">Ticari motokuryelik için A1, A2 veya A gerekir; ' +
         'B sınıfı otomobil ehliyeti tek başına yeterli değildir.</p></div>';

    h += '<div class="kb-form-group"><label class="kb-label" for="cv-ehliyet-tarih">' +
      'Ehliyet alış tarihi</label>' +
      '<input type="date" id="cv-ehliyet-tarih" class="kb-input" value="' +
      escAttr(_taslak.ehliyetTarihi || '') + '"></div>';

    h += '<div class="kb-form-group"><label class="cv-check">' +
      '<input type="checkbox" id="cv-src"' + (_taslak.srcBelge ? ' checked' : '') +
      ' onchange="CvScreens._srcDegisti()"> <span>SRC Kurye Belgem var</span></label>' +
      '<p class="cv-hint">15 Mayıs 2026\'dan bu yana motokuryeler için zorunludur.</p></div>';

    h += '<div class="kb-form-group" id="cv-src-wrap"' +
      (_taslak.srcBelge ? '' : ' style="display:none"') + '>' +
      '<label class="kb-label" for="cv-src-gecerlilik">SRC geçerlilik tarihi</label>' +
      '<input type="date" id="cv-src-gecerlilik" class="kb-input" value="' +
      escAttr(_taslak.srcGecerlilik || '') + '"></div>';

    h += '<p class="cv-note">Adli sicil, sağlık raporu ve psikoteknik burada ' +
         'saklanmaz — işveren görüşmede talep edebilir.</p>';
    return h;
  }

  function stepEgitim() {
    var h = '';
    if (!_taslak.egitim.length) {
      h += '<p class="cv-empty">Henüz eğitim bilgisi eklenmedi.</p>';
    } else {
      _taslak.egitim.forEach(function (e, i) {
        h += '<div class="cv-row"><div class="cv-row__main">' +
             '<b>' + esc(e.okul || '—') + '</b>' +
             '<span>' + esc(e.derece || '') + (e.yil ? ' · ' + esc(e.yil) : '') + '</span>' +
             '</div><button type="button" class="cv-del" ' +
             'onclick="CvScreens._egitimSil(' + i + ')">Sil</button></div>';
      });
    }
    h += '<div class="cv-subform">' +
      '<input type="text"   id="cv-okul"   class="kb-input" placeholder="Okul adı" maxlength="90">' +
      '<input type="text"   id="cv-derece" class="kb-input" placeholder="Derece (Lise, Ön lisans…)" maxlength="60">' +
      '<input type="number" id="cv-yil"    class="kb-input" placeholder="Yıl" min="1950" max="2100">' +
      '<button type="button" class="btn btn--primary" onclick="CvScreens._egitimEkle()">Ekle</button>' +
      '</div>';
    return h;
  }

  /* 4. adım — kayıtlar work_experience tablosundadır, taslakta DEĞİL.
     Web'deki profil düzenleme sayfası ve bu ekran aynı satırları görür. */
  function stepDeneyim() {
    var h = '';
    if (!_deneyimler.length) {
      h += '<p class="cv-empty">Henüz iş deneyimi eklenmedi.</p>';
    } else {
      _deneyimler.forEach(function (d) {
        var bit = d.aktif ? 'Devam ediyor' : weTarih(d.bitis);
        var aralik = [weTarih(d.baslangic), bit].filter(Boolean).join(' – ');
        h += '<div class="cv-row"><div class="cv-row__main">' +
             '<b>' + esc(d.pozisyon || '—') + '</b>' +
             '<span>' + esc(d.sirket || '') + (aralik ? ' · ' + esc(aralik) : '') + '</span>' +
             '</div><button type="button" class="cv-del" ' +
             'onclick="CvScreens._deneyimSil(\'' + escJs(d.id) + '\')">Sil</button></div>';
      });
    }
    h += '<div class="cv-subform">' +
      '<input type="text"  id="cv-exp-sirket"   class="kb-input" placeholder="Şirket adı" maxlength="90">' +
      '<input type="text"  id="cv-exp-pozisyon" class="kb-input" placeholder="Pozisyon (Moto Kurye…)" maxlength="60">' +
      '<input type="text"  id="cv-exp-sehir"    class="kb-input" placeholder="Şehir" maxlength="60">' +
      '<div class="cv-inline">' +
        '<input type="month" id="cv-exp-bas" class="kb-input" aria-label="Başlangıç">' +
        '<input type="month" id="cv-exp-bit" class="kb-input" aria-label="Bitiş">' +
      '</div>' +
      '<label class="cv-check"><input type="checkbox" id="cv-exp-aktif"> ' +
        '<span>Hâlâ burada çalışıyorum</span></label>' +
      '<textarea id="cv-exp-aciklama" class="kb-input" rows="2" maxlength="400" ' +
        'placeholder="Ne yaptın? (isteğe bağlı)"></textarea>' +
      '<button type="button" class="btn btn--primary" onclick="CvScreens._deneyimEkle()">Deneyim Ekle</button>' +
      '</div>';
    return h;
  }

  function stepTercih() {
    var h = '<div class="kb-form-group">' +
      '<label class="kb-label" for="cv-bolgeler">Çalışmak istediğin bölgeler</label>' +
      '<input type="text" id="cv-bolgeler" class="kb-input" ' +
      'placeholder="Kadıköy, Ataşehir, Ümraniye" value="' +
      escAttr(_taslak.tercihBolgeler.join(', ')) + '">' +
      '<p class="cv-hint">Virgülle ayır.</p></div>';

    h += '<div class="kb-form-group"><span class="kb-label">Müsaitlik</span><div class="cv-chips">';
    MUSAITLIK.forEach(function (m) {
      h += '<button type="button" class="cv-chip' +
           (_taslak.musaitlik === m ? ' is-on' : '') +
           '" onclick="CvScreens._musaitlik(\'' + escJs(m) + '\')">' + esc(m) + '</button>';
    });
    return h + '</div></div>';
  }

  function stepOnizleme() {
    var h = '<p class="cv-hint">İşveren profilinde bunu görecek.</p>';
    h += renderCvBolum(_taslak, true);
    if (!_taslak.ozet && !_taslak.ehliyetSinifi.length) {
      h += '<p class="cv-empty">Henüz doldurulmuş bir alan yok.</p>';
    }
    return h;
  }

  function stepGovde(n) {
    if (n === 1) return stepOzet();
    if (n === 2) return stepEhliyet();
    if (n === 3) return stepEgitim();
    if (n === 4) return stepDeneyim();
    if (n === 5) return stepTercih();
    return stepOnizleme();
  }

  /* ── Ekran ────────────────────────────────────────────────
     renderScreen 120 ms sonra basar ve her çağrıda solma animasyonu
     çalıştırır. Kabuk BİR KEZ basılır; adım değişimlerinde yalnız
     #cv-body güncellenir — hem anında, hem 120 ms yarışı yaşanmaz. */
  function sihirbaz() {
    var rol = (window.APP && APP.role) || '';
    if (rol !== 'kurye') {
      Router.go(rol ? '/' + rol + '/panel' : '/login');
      return;
    }

    showAppBar('Özgeçmişim', true);
    showBottomNav();

    renderScreen(
      '<div class="kb-screen-inner cv-wrap">' +
        '<div class="cv-progress"><div class="cv-progress__fill" id="cv-progress"></div></div>' +
        '<div class="cv-steps" id="cv-steps"></div>' +
        '<div id="cv-body"></div>' +
        '<div class="cv-foot">' +
          '<button type="button" class="btn btn--ghost" id="cv-geri" ' +
            'onclick="CvScreens._geri()">Geri</button>' +
          '<button type="button" class="btn btn--primary" id="cv-ileri" ' +
            'onclick="CvScreens._ileri()">İleri</button>' +
        '</div>' +
      '</div>'
    );

    whenEl('cv-body', function () {
      load().then(function () {
        if (_adim === 4) { deneyimYukle().then(ciz); } else { ciz(); }
      });
    });
  }

  function ciz() {
    var body = document.getElementById('cv-body');
    if (!body) return;                       /* ekran değişmiş olabilir */
    body.innerHTML = stepGovde(_adim);

    var ileri = document.getElementById('cv-ileri');
    var geri  = document.getElementById('cv-geri');
    if (ileri) ileri.textContent = (_adim === 6) ? 'Yayınla' : 'İleri';
    if (geri)  geri.style.visibility = (_adim === 1) ? 'hidden' : 'visible';

    var steps = document.getElementById('cv-steps');
    if (steps) {
      steps.innerHTML = ADIMLAR.map(function (ad, i) {
        var n = i + 1;
        return '<button type="button" class="cv-step' +
          (n === _adim ? ' is-on' : '') + (n < _adim ? ' is-done' : '') +
          '" onclick="CvScreens._adimaGit(' + n + ')">' + n + '. ' + esc(ad) + '</button>';
      }).join('');
    }
    var pr = document.getElementById('cv-progress');
    if (pr) pr.style.width = tamamlanma() + '%';
  }

  async function git(hedef) {
    collectStep(_adim);
    if (hedef > _adim) {
      var g = gecerliMi(_adim);
      if (!g.ok) { toast(g.mesaj); return; }
    }
    _adim = hedef;
    if (_adim === 4) await deneyimYukle();
    ciz();
    var sc = document.getElementById('kb-screen');
    if (sc) sc.scrollTop = 0;
  }

  /* ── İş deneyimi (4. adım) ───────────────────────────────── */
  function weTarih(iso) {
    if (!iso) return '';
    var p = String(iso).slice(0, 10).split('-');
    return p.length >= 2 ? p[1] + '.' + p[0] : String(iso);
  }

  async function deneyimYukle() {
    if (!(on() && SB.myWorkExperience)) { _deneyimler = []; return; }
    try { _deneyimler = await SB.myWorkExperience(); }
    catch (e) { console.warn('deneyimYukle:', e); _deneyimler = []; }
  }

  /* ── Kaydetme ─────────────────────────────────────────────
     Bağlantı yoksa HATA döner. Sahte başarı mesajı ve yönlendirme YOK. */
  async function kaydet(yayinla) {
    if (!on()) return { error: 'Sunucuya bağlanılamadı — kaydedilmedi.' };
    _taslak.yayinlandi = !!yayinla;
    try {
      var kayit = await SB.saveCv(_taslak);
      taslagiSil();
      return { ok: true, cv: kayit };
    } catch (e) {
      return { error: (e && e.message) || 'Kaydedilemedi.' };
    }
  }

  /* ── İşveren tarafı ───────────────────────────────────────
     SharedScreens.loadIsDeneyimi ile birebir aynı imza ve aynı sözleşme:
     kayıt yoksa HİÇBİR ŞEY basılmaz — "CV yok" gibi uydurma metin yazılmaz.
     onizleme=true iken sihirbazın 6. adımında da kullanılır. */
  function renderCvBolum(cv, onizleme) {
    if (!cv) return '';
    var h = '';

    if (cv.ozet) {
      h += '<div class="cv-view__ozet">' + escLines(cv.ozet) + '</div>';
    }

    var rozet = [];
    (cv.ehliyetSinifi || []).forEach(function (s) {
      rozet.push('<span class="kb-chip">' + esc(s) + ' ehliyet</span>');
    });
    if (cv.srcBelge) rozet.push('<span class="kb-chip kb-chip--success">SRC Kurye Belgesi</span>');
    if (rozet.length) h += '<div class="cv-chips cv-chips--view">' + rozet.join('') + '</div>';

    if (cv.egitim && cv.egitim.length) {
      h += '<div class="cv-view__blok"><div class="cv-view__t">Eğitim</div>';
      cv.egitim.forEach(function (e) {
        h += '<div class="cv-view__satir"><b>' + esc(e.okul || '—') + '</b>' +
             '<span>' + esc(e.derece || '') + (e.yil ? ' · ' + esc(e.yil) : '') + '</span></div>';
      });
      h += '</div>';
    }

    if (cv.tercihBolgeler && cv.tercihBolgeler.length) {
      h += '<div class="cv-view__blok"><div class="cv-view__t">Çalışmak istediği bölgeler</div>' +
        '<div class="cv-chips cv-chips--view">' + cv.tercihBolgeler.map(function (b) {
          return '<span class="kb-chip">' + esc(b) + '</span>';
        }).join('') + '</div></div>';
    }

    if (cv.musaitlik) {
      h += '<div class="cv-view__blok"><div class="cv-view__t">Müsaitlik</div>' +
           '<p class="cv-view__p">' + esc(cv.musaitlik) + '</p></div>';
    }

    h += '<p class="cv-note">Adli sicil, sağlık raporu ve psikoteknik ' +
         'platformda tutulmaz — görüşmede talep edebilirsiniz.</p>';

    if (onizleme) return h;
    return '<div class="detail-section"><div class="detail-section__title">Özgeçmiş</div>' +
           h + '</div>';
  }

  /* Aday detay ekranlarının çağırdığı yükleyici (firma.js / isletme.js).
     hedefId: yazılacak elemanın id'si — renderScreen gecikmesi için whenEl. */
  function loadCv(profileId, hedefId) {
    if (!profileId || !(on() && SB.cvFor)) return;
    SB.cvFor(profileId).then(function (cv) {
      if (!cv) return;                       /* yayında değil veya yok */
      var html = renderCvBolum(cv);
      if (!html) return;
      whenEl(hedefId, function (el) { el.innerHTML += html; });
    }).catch(function (e) { console.warn('cv yukleme:', e); });
  }

  /* ── Geri tuşu kancası (app.js → closeTopLayer) ───────────
     Yalnız sihirbaz ekrandayken ve ilk adımda değilken devreye girer;
     aksi halde false döner ve geri tuşu normal akışına devam eder. */
  function geriAdim() {
    if (Router.current() !== '/kurye/cv') return false;
    if (_adim <= 1) return false;
    git(_adim - 1);
    return true;
  }

  /* ── onclick köprüleri ───────────────────────────────────── */

  function _ehliyet(s) {
    var i = _taslak.ehliyetSinifi.indexOf(s);
    if (i > -1) _taslak.ehliyetSinifi.splice(i, 1);
    else _taslak.ehliyetSinifi.push(s);
    collectStep(2);
    ciz();
  }

  function _musaitlik(m) {
    _taslak.musaitlik = (_taslak.musaitlik === m) ? '' : m;
    collectStep(5);
    ciz();
  }

  function _srcDegisti() {
    var src = document.getElementById('cv-src');
    var wrap = document.getElementById('cv-src-wrap');
    if (wrap) wrap.style.display = (src && src.checked) ? '' : 'none';
  }

  function _egitimEkle() {
    var okul = (val('cv-okul') || '').trim();
    if (!okul) { toast('Okul adı gerekli.'); return; }
    _taslak.egitim.push({
      okul: okul,
      derece: (val('cv-derece') || '').trim(),
      yil: (val('cv-yil') || '').trim()
    });
    taslagiYaz();
    ciz();
  }

  function _egitimSil(i) {
    _taslak.egitim.splice(i, 1);
    taslagiYaz();
    ciz();
  }

  async function _deneyimEkle() {
    var sirket   = (val('cv-exp-sirket') || '').trim();
    var pozisyon = (val('cv-exp-pozisyon') || '').trim();
    if (!sirket)   { toast('Şirket adı gerekli.'); return; }
    if (!pozisyon) { toast('Pozisyon gerekli.'); return; }
    if (!(on() && SB.addWorkExperience)) { toast('Sunucuya bağlanılamadı — kaydedilmedi.'); return; }

    var aktifEl = document.getElementById('cv-exp-aktif');
    var aktif   = !!(aktifEl && aktifEl.checked);
    var bas     = val('cv-exp-bas');
    var bit     = val('cv-exp-bit');
    if (!bas) { toast('Başlangıç tarihi gerekli.'); return; }
    if (!aktif && !bit) { toast('Bitiş tarihini gir veya "Hâlâ burada çalışıyorum"u işaretle.'); return; }

    try {
      /* type="month" "2020-01" verir; kolon date tipinde, gün ZORUNLU.
         Eksik gün PostgREST'te 22007 ile reddedilir. */
      await SB.addWorkExperience({
        sirket: sirket, pozisyon: pozisyon,
        sehir: (val('cv-exp-sehir') || '').trim(),
        baslangic: bas + '-01',
        bitis: (!aktif && bit) ? bit + '-01' : null,
        aktif: aktif,
        aciklama: (val('cv-exp-aciklama') || '').trim()
      });
    } catch (e) {
      toast((e && e.message) || 'Deneyim kaydedilemedi.');
      return;
    }
    await deneyimYukle();
    ciz();
    toast('Deneyim eklendi.');
  }

  async function _deneyimSil(id) {
    if (!(on() && SB.deleteWorkExperience)) { toast('Sunucuya bağlanılamadı — silinemedi.'); return; }
    if (!confirm('Bu deneyim kaydı silinsin mi?')) return;
    try { await SB.deleteWorkExperience(id); }
    catch (e) { toast((e && e.message) || 'Silinemedi.'); return; }
    await deneyimYukle();
    ciz();
    toast('Deneyim silindi.');
  }

  function _geri() { if (_adim > 1) git(_adim - 1); }
  function _adimaGit(n) { if (n >= 1 && n <= 6 && n !== _adim) git(n); }

  async function _ileri() {
    if (_kaydediyor) return;
    collectStep(_adim);
    var g = gecerliMi(_adim);
    if (!g.ok) { toast(g.mesaj); return; }
    if (_adim < 6) { git(_adim + 1); return; }

    _kaydediyor = true;
    var btn = document.getElementById('cv-ileri');
    if (btn) { btn.disabled = true; btn.textContent = 'Yayınlanıyor…'; }

    var r = await kaydet(true);

    _kaydediyor = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Yayınla'; }

    if (r.error) { toast(r.error); return; }
    toast('Özgeçmişin yayınlandı — işverenler artık görebilir.');
    /* Sihirbaz tek route olduğu için modül durumu ekrandan sağ kalır.
       İkisi de sıfırlanmazsa kurye sihirbaza yeniden girdiğinde 6. adımda
       (Önizleme) açılır ve eski taslağı görür. */
    _adim = 1;
    _yuklendi = false;
    setTimeout(function () { Router.go('/kurye/profil'); }, 900);
  }

  return {
    sihirbaz     : sihirbaz,
    geriAdim     : geriAdim,
    loadCv       : loadCv,
    renderCvBolum: renderCvBolum,
    _ehliyet     : _ehliyet,
    _musaitlik   : _musaitlik,
    _srcDegisti  : _srcDegisti,
    _egitimEkle  : _egitimEkle,
    _egitimSil   : _egitimSil,
    _deneyimEkle : _deneyimEkle,
    _deneyimSil  : _deneyimSil,
    _geri        : _geri,
    _ileri       : _ileri,
    _adimaGit    : _adimaGit
  };

})();
