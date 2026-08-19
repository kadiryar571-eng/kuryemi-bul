/* ============================================================
   cv.js — kurye özgeçmişi sihirbazı

   Tasarım: specs/2026-08-19-kurye-cv-design.md

   Veri tek kaynaktan gelir:
     • CV alanları        → public.courier_cv   (SB.myCv / SB.saveCv)
     • İş deneyimi        → public.work_experience (SB.*WorkExperience)
     • Ad/şehir/açıklama  → public.profiles     (SB.myProfile)

   Sihirbaz iş deneyimini KOPYALAMAZ; aynı tabloya yazar. Bu yüzden
   profil-duzenle.html ile bu sayfa arasında veri ayrışması olamaz.
   ============================================================ */
(function () {
  'use strict';

  var EHLIYET = ['A1', 'A2', 'A', 'B'];
  var MUSAITLIK = ['Tam zamanlı', 'Yarı zamanlı', 'Hafta sonu', 'Vardiyalı', 'Esnek'];

  var _cv = null;        // DB'den gelen CV
  var _profil = null;    // DB'den gelen profil
  var _taslak = null;    // sihirbazın üzerinde çalıştığı nesne
  var _yuklendi = false;

  var TASLAK_KEY = 'kb_draft:cv';

  function esc(s) {
    return (window.KB && KB.esc) ? KB.esc(s) : String(s == null ? '' : s);
  }
  function on() { return !!(window.SB && SB.isOn && SB.isOn()); }

  function bosTaslak() {
    return {
      ozet: '', ehliyetSinifi: [], ehliyetTarihi: null,
      srcBelge: false, srcGecerlilik: null,
      egitim: [], tercihBolgeler: [], musaitlik: '',
      yayinlandi: false
    };
  }

  async function load() {
    if (_yuklendi) return _taslak;
    if (!on()) { _taslak = bosTaslak(); _yuklendi = true; return _taslak; }

    try { _profil = await SB.myProfile(); } catch (e) { _profil = null; }
    try { _cv = await SB.myCv(); } catch (e) { _cv = null; }

    _taslak = _cv ? JSON.parse(JSON.stringify(_cv)) : bosTaslak();

    /* Melez doldurma: özet boşsa profildeki açıklamadan gelir.
       Kullanıcı bir kez düzenlerse artık ona dokunulmaz. */
    if (!_taslak.ozet && _profil && _profil.aciklama) _taslak.ozet = _profil.aciklama;
    if (!_taslak.tercihBolgeler.length && _profil && _profil.bolgeler) {
      _taslak.tercihBolgeler = _profil.bolgeler.slice();
    }

    /* Yarım kalmış oturum taslağı varsa onu tercih et. */
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

  function stepOzet() {
    return '<label class="cv-label" for="cvOzet">Kendini kısaca anlat</label>' +
      '<textarea id="cvOzet" class="cv-input" rows="5" maxlength="600" ' +
        'placeholder="Örn. 5 yıldır İstanbul Avrupa yakasında motokuryelik yapıyorum…">' +
        esc(_taslak.ozet) + '</textarea>' +
      '<p class="cv-hint">İşverenin ilk okuduğu yer burasıdır. 2-3 cümle yeterli.</p>';
  }

  function stepEhliyet() {
    var h = '<div class="cv-field"><span class="cv-label">Ehliyet sınıfın</span><div class="cv-chips">';
    EHLIYET.forEach(function (s) {
      var sec = _taslak.ehliyetSinifi.indexOf(s) > -1;
      h += '<button type="button" class="cv-chip' + (sec ? ' is-on' : '') +
           '" data-ehliyet="' + esc(s) + '">' + esc(s) + '</button>';
    });
    h += '</div><p class="cv-hint">Ticari motokuryelik için A1, A2 veya A gerekir; ' +
         'B sınıfı otomobil ehliyeti tek başına yeterli değildir.</p></div>';

    h += '<div class="cv-field"><label class="cv-label" for="cvEhliyetTarih">Ehliyet alış tarihi</label>' +
         '<input type="date" id="cvEhliyetTarih" class="cv-input" value="' +
         esc(_taslak.ehliyetTarihi || '') + '"></div>';

    h += '<div class="cv-field"><label class="cv-check">' +
         '<input type="checkbox" id="cvSrc"' + (_taslak.srcBelge ? ' checked' : '') + '> ' +
         '<span>SRC Kurye Belgem var</span></label>' +
         '<p class="cv-hint">15 Mayıs 2026\'dan bu yana motokuryeler için zorunludur.</p></div>';

    h += '<div class="cv-field" id="cvSrcTarihWrap"' +
         (_taslak.srcBelge ? '' : ' style="display:none"') + '>' +
         '<label class="cv-label" for="cvSrcGecerlilik">SRC geçerlilik tarihi</label>' +
         '<input type="date" id="cvSrcGecerlilik" class="cv-input" value="' +
         esc(_taslak.srcGecerlilik || '') + '"></div>';

    h += '<p class="cv-note">Adli sicil, sağlık raporu ve psikoteknik burada ' +
         'saklanmaz — işveren görüşmede talep edebilir.</p>';
    return h;
  }

  function stepEgitim() {
    var h = '<div id="cvEgitimListe">';
    if (!_taslak.egitim.length) {
      h += '<p class="cv-empty">Henüz eğitim bilgisi eklenmedi.</p>';
    } else {
      _taslak.egitim.forEach(function (e, i) {
        h += '<div class="cv-row"><div class="cv-row__main">' +
             '<b>' + esc(e.okul || '—') + '</b>' +
             '<span>' + esc(e.derece || '') + (e.yil ? ' · ' + esc(e.yil) : '') + '</span>' +
             '</div><button type="button" class="btn btn--ghost btn--sm" ' +
             'data-egitim-sil="' + i + '">Sil</button></div>';
      });
    }
    h += '</div><div class="cv-inline">' +
      '<input type="text" id="cvOkul"   class="cv-input" placeholder="Okul adı" maxlength="90">' +
      '<input type="text" id="cvDerece" class="cv-input" placeholder="Derece (Lise, Ön lisans…)" maxlength="60">' +
      '<input type="number" id="cvYil"  class="cv-input" placeholder="Yıl" min="1950" max="2100">' +
      '<button type="button" class="btn btn--primary btn--sm" id="cvEgitimEkle">Ekle</button>' +
      '</div>';
    return h;
  }

  function stepTercih() {
    var h = '<div class="cv-field"><label class="cv-label" for="cvBolgeler">' +
      'Çalışmak istediğin bölgeler</label>' +
      '<input type="text" id="cvBolgeler" class="cv-input" ' +
      'placeholder="Kadıköy, Ataşehir, Ümraniye" value="' +
      esc(_taslak.tercihBolgeler.join(', ')) + '">' +
      '<p class="cv-hint">Virgülle ayır.</p></div>';

    h += '<div class="cv-field"><span class="cv-label">Müsaitlik</span><div class="cv-chips">';
    MUSAITLIK.forEach(function (m) {
      h += '<button type="button" class="cv-chip' +
           (_taslak.musaitlik === m ? ' is-on' : '') +
           '" data-musaitlik="' + esc(m) + '">' + esc(m) + '</button>';
    });
    return h + '</div></div>';
  }

  var _deneyim = [];

  async function deneyimYukle() {
    if (!on() || !SB.myWorkExperience) { _deneyim = []; return _deneyim; }
    try { _deneyim = (await SB.myWorkExperience()) || []; }
    catch (e) { console.warn('deneyimYukle:', e); _deneyim = []; }
    return _deneyim;
  }

  function weTarih(d) {
    if (!d) return '';
    var p = String(d).split('-');
    return p.length >= 2 ? p[1] + '.' + p[0] : String(d);
  }

  function stepDeneyim() {
    var h = '<div id="cvDeneyimListe">';
    if (!_deneyim.length) {
      h += '<p class="cv-empty">Henüz iş deneyimi eklenmedi.</p>';
    } else {
      _deneyim.forEach(function (d) {
        var bit = d.aktif ? 'Devam ediyor' : weTarih(d.bitis);
        h += '<div class="cv-row"><div class="cv-row__main">' +
             '<b>' + esc(d.pozisyon || '—') + '</b>' +
             '<span>' + esc(d.sirket || '') + ' · ' +
             esc(weTarih(d.baslangic)) + ' – ' + esc(bit) + '</span>' +
             '</div><button type="button" class="btn btn--ghost btn--sm" ' +
             'data-deneyim-sil="' + esc(d.id) + '">Sil</button></div>';
      });
    }
    h += '</div><div class="cv-subform">' +
      '<input type="text" id="cvExpSirket"   class="cv-input" placeholder="Şirket adı *" maxlength="80">' +
      '<input type="text" id="cvExpPozisyon" class="cv-input" placeholder="Pozisyon *" maxlength="80">' +
      '<input type="text" id="cvExpSehir"    class="cv-input" placeholder="Şehir" maxlength="60">' +
      '<div class="cv-inline">' +
        '<input type="month" id="cvExpBas" class="cv-input">' +
        '<input type="month" id="cvExpBit" class="cv-input">' +
        '<label class="cv-check"><input type="checkbox" id="cvExpAktif"> <span>Devam ediyor</span></label>' +
      '</div>' +
      '<textarea id="cvExpAciklama" class="cv-input" rows="2" maxlength="400" ' +
        'placeholder="Ne yaptın? (isteğe bağlı)"></textarea>' +
      '<button type="button" class="btn btn--primary btn--sm" id="cvDeneyimEkle">Deneyim Ekle</button>' +
      '</div>';
    return h;
  }

  /* AYNI TABLOYA yazar: public.work_experience. Kopya tutulmaz, bu
     yüzden profil-duzenle.html ile ayrışma imkânsızdır. */
  async function deneyimKaydet() {
    var sirket   = (val('cvExpSirket')   || '').trim();
    var pozisyon = (val('cvExpPozisyon') || '').trim();
    if (!sirket || !pozisyon) return { error: 'Şirket ve pozisyon zorunlu.' };

    var aktifEl = document.getElementById('cvExpAktif');
    var aktif   = !!(aktifEl && aktifEl.checked);
    var bas     = val('cvExpBas');
    var bit     = val('cvExpBit');

    try {
      await SB.addWorkExperience({
        sirket: sirket, pozisyon: pozisyon,
        sehir: (val('cvExpSehir') || '').trim(),
        baslangic: bas ? bas + '-01' : null,
        bitis: (!aktif && bit) ? bit + '-01' : null,
        aktif: aktif,
        aciklama: (val('cvExpAciklama') || '').trim()
      });
      await deneyimYukle();
      return { ok: true };
    } catch (e) {
      return { error: (e && e.message) || 'Deneyim eklenemedi.' };
    }
  }

  async function deneyimSil(id) {
    try {
      await SB.deleteWorkExperience(id);
      await deneyimYukle();
      return { ok: true };
    } catch (e) {
      return { error: (e && e.message) || 'Deneyim silinemedi.' };
    }
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function collectStep(n) {
    if (n === 1) _taslak.ozet = val('cvOzet').trim();
    if (n === 2) {
      _taslak.ehliyetTarihi = val('cvEhliyetTarih') || null;
      var src = document.getElementById('cvSrc');
      _taslak.srcBelge = !!(src && src.checked);
      _taslak.srcGecerlilik = _taslak.srcBelge ? (val('cvSrcGecerlilik') || null) : null;
    }
    if (n === 5) {
      _taslak.tercihBolgeler = val('cvBolgeler').split(',')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 0; });
    }
    taslagiYaz();
  }

  /* Doğrulama gerçekten engelleyici olmalı; "tüm alanları doldurun" deyip
     tek alanla geçiren sahte kontrol YAZILMAZ. */
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

  function tamamlanma() {
    var puan = 0, toplam = 6;
    if (_taslak.ozet.trim().length >= 20) puan++;
    if (_taslak.ehliyetSinifi.length)     puan++;
    if (_taslak.srcBelge)                 puan++;
    if (_taslak.egitim.length)            puan++;
    if (_taslak.tercihBolgeler.length)    puan++;
    if (_taslak.musaitlik)                puan++;
    return Math.round(puan / toplam * 100);
  }

  async function kaydet(yayinla) {
    if (!on()) return { error: 'Sunucuya bağlanılamadı — kaydedilmedi.' };
    _taslak.yayinlandi = !!yayinla;
    try {
      var kayit = await SB.saveCv(_taslak);
      _cv = kayit;
      taslagiSil();
      return { ok: true, cv: kayit };
    } catch (e) {
      return { error: (e && e.message) || 'Özgeçmiş kaydedilemedi.' };
    }
  }

  window.KBCV = {
    EHLIYET: EHLIYET,
    MUSAITLIK: MUSAITLIK,
    load: load,
    state: function () { return _taslak; },
    profil: function () { return _profil; },
    renderStep: function (n) {
      if (n === 1) return stepOzet();
      if (n === 2) return stepEhliyet();
      if (n === 3) return stepEgitim();
      if (n === 4) return stepDeneyim();
      if (n === 5) return stepTercih();
      return '';
    },
    collectStep: collectStep,
    gecerliMi: gecerliMi,
    tamamlanma: tamamlanma,
    kaydet: kaydet,
    deneyimYukle: deneyimYukle,
    deneyimKaydet: deneyimKaydet,
    deneyimSil: deneyimSil
  };
})();
