/* ============================================================
   Kuryemi Bul — supabase.js
   Supabase istemcisi + auth + veri katmani.
   TEK veri kaynagi budur. Demo/mock fallback YOKTUR — baglanti kurulamazsa
   sayfalar bos durum (empty state) gosterir, uydurma veri gostermez.
   CDN (@supabase/supabase-js@2) bu dosyadan ONCE yuklenmelidir.
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = "https://fdszypytpodndtlbuzuz.supabase.co";
  var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkc3p5cHl0cG9kbmR0bGJ1enV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NTUxMjMsImV4cCI6MjA5NjAzMTEyM30.D3Nmk1k2P00_Y8L5flBYR85iuoy7r-3mKeck3QoRVcc";

  var client = null;
  try {
    if (SUPABASE_URL && SUPABASE_ANON && window.supabase && window.supabase.createClient) {
      var isNativeEnv = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: !isNativeEnv  // native'de URL'den oturum algılama kapatılır
        }
      });
    }
  } catch (e) { console.warn("Supabase init hatası:", e); }

  function isOn() { return !!client; }

  /* ---------- Veri haritalama (DB satırı -> uygulama nesnesi) ---------- */
  function fromDb(p) {
    return {
      id: p.id, user_id: p.user_id, role: p.role, avatar_url: p.avatar_url || "",
      ad: p.ad, sehir: p.sehir, telefon: p.telefon || "", email: p.email || "", aciklama: p.aciklama,
      lat: p.lat, lng: p.lng,
      arac: p.arac, bolgeler: p.bolgeler || [], deneyim: p.deneyim || 0,
      seviye: p.seviye || "standart", puan: Number(p.puan) || 0, degerlendirme: p.degerlendirme || 0, dogrulama: p.dogrulama || "none", tamamlanan: p.tamamlanan || 0,
      sertifikalar: p.sertifikalar || [], calistigi: p.calistigi || [], referanslar: [],
      bolge: (p.bolgeler && p.bolgeler[0]) || "", tur: p.tur, acikIlan: p.acik_ilan || 0, ihtiyac: p.ihtiyac,
      kapasite: p.kapasite || 0, hizmetler: p.hizmetler || []
    };
  }

  /* ---------- AUTH ---------- */
  // Rol artık kayıtta seçilmez; handle_new_user trigger'ı varsayılan 'kurye' atar,
  // kullanıcı profil-duzenle.html'de rolünü seçer.
  async function signUp(email, password, ad, telefon) {
    return client.auth.signUp({
      email: email, password: password,
      options: { data: { ad: ad, telefon: telefon || "" }, emailRedirectTo: location.origin + "/verify-email.html" }
    });
  }
  // Capacitor native ortam mı?
  function isNative() { return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); }
  var NATIVE_REDIRECT = "com.kuryemibul.app://callback";

  // Google ile giriş/kayıt (OAuth).
  // Web: aynı sekmede redirect → giris.html oturum tespiti.
  // Native (Capacitor app): Google WebView'i engellediği için sistem tarayıcısında aç,
  //   dönüşü deep-link (com.kuryemibul.app://callback) ile yakala (initNativeAuth).
  async function signInWithGoogle() {
    if (isNative()) {
      var r = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true }
      });
      if (r && r.error) return r;
      try {
        var B = window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
        if (r.data && r.data.url && B) await B.open({ url: r.data.url });
      } catch (e) { return { error: e }; }
      return r;
    }
    return client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + "/giris.html" }
    });
  }
  // Native deep-link dönüşü: Google'dan gelen code'u oturuma çevir + yönlendir
  function initNativeAuth() {
    if (!isNative()) return;
    var App = window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!App || !App.addListener) return;

    App.addListener("appUrlOpen", async function (ev) {
      var url = ev && ev.url;
      if (!url || url.indexOf("com.kuryemibul.app://") !== 0) return;

      // Browser plugin'i kapat
      try { var B = window.Capacitor.Plugins.Browser; if (B && B.close) await B.close(); } catch (e) {}

      // URL'den token parametrelerini al
      // PKCE flow:     ?code=...
      // Implicit flow: #access_token=...&refresh_token=...
      var qs   = url.indexOf("?") !== -1 ? url.split("?")[1].split("#")[0] : "";
      var hash = url.indexOf("#") !== -1 ? url.split("#")[1] : "";
      var code         = new URLSearchParams(qs).get("code");
      var accessToken  = new URLSearchParams(hash).get("access_token");
      var refreshToken = new URLSearchParams(hash).get("refresh_token") || "";

      try {
        var result;
        if (accessToken) {
          // Implicit flow — access_token doğrudan hash'te
          result = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        } else if (code) {
          // PKCE flow — code ile exchange
          result = await client.auth.exchangeCodeForSession(code);
        } else {
          throw new Error("OAuth parametresi bulunamadı. URL: " + url);
        }
        if (result.error) throw result.error;
        var prof = null;
        try { prof = await myProfile(); } catch (e) {}
        location.href = (!prof || !prof.ad) ? "onboarding.html"
          : (window.KB && KB.roleToPanel ? KB.roleToPanel(prof.role) : "index.html");
      } catch (e) {
        console.error("native oauth hatası:", e);
        var errMsg = (e && e.message) || "Bilinmeyen hata";
        if (window.KB && KB.toast) KB.toast("Google girişi başarısız: " + errMsg, "error");
        else alert("Google girişi başarısız: " + errMsg);
      }
    });
  }
  try { initNativeAuth(); } catch (e) {}
  // E-posta doğrulama (verify-email.html'den çağrılır): token_hash'i doğrula, oturum aç
  async function verifyEmail(tokenHash, type) {
    return client.auth.verifyOtp({ token_hash: tokenHash, type: type || "signup" });
  }
  // Süresi dolmuş/kullanılmış doğrulama için yeni bağlantı gönder
  async function resendVerification(email) {
    return client.auth.resend({
      type: "signup", email: email,
      options: { emailRedirectTo: location.origin + "/verify-email.html" }
    });
  }
  async function signIn(email, password) {
    return client.auth.signInWithPassword({ email: email, password: password });
  }
  async function signOut() { return client.auth.signOut(); }
  // Şifre sıfırlama: e-postaya bağlantı gönderir (kullanıcı sifre-sifirla.html'e döner)
  async function resetPassword(email) {
    return client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/sifre-sifirla.html" });
  }
  // Sıfırlama oturumundayken (veya girişliyken) yeni şifre belirle
  async function updatePassword(newPass) {
    return client.auth.updateUser({ password: newPass });
  }

  async function getUser() {
    if (!client) return null;
    // Oturumu LOCAL'den oku (ağ yok) — sayfa geçişlerinde hızlı + stabil.
    // Token süresi dolduysa autoRefreshToken arka planda yeniler; refresh başarısızsa null.
    try {
      var s = await client.auth.getSession();
      return (s && s.data && s.data.session && s.data.session.user) || null;
    } catch (e) {
      // Yalnız getSession beklenmedik hata verirse sunucuya sor
      try { var r = await client.auth.getUser(); return (r && r.data && r.data.user) || null; }
      catch (e2) { return null; }
    }
  }
  function onAuthChange(cb) {
    if (client) client.auth.onAuthStateChange(function (event, session) { cb(event, session && session.user); });
  }

  /* ---------- PROFİL ---------- */
  async function myProfile() {
    var u = await getUser();
    if (!u) return null;
    var r = await client.from("profiles").select("*").eq("user_id", u.id).maybeSingle();
    var base = r.data ? fromDb(r.data)
      : { id: null, user_id: u.id, role: (u.user_metadata && u.user_metadata.role) || "kurye", ad: (u.user_metadata && u.user_metadata.ad) || "", telefon: "", email: "" };
    // İletişim bilgisi korumalı tablodan (sahip kendi satırını okur)
    try {
      var c = await client.from("profile_contacts").select("telefon,email").eq("user_id", u.id).maybeSingle();
      base.telefon = (c.data && c.data.telefon) || "";
      base.email = (c.data && c.data.email) || u.email || "";
    } catch (e) { base.email = base.email || u.email || ""; }
    return base;
  }
  async function updateMyProfile(fields) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    // İletişim alanlarını ayır → profiles'a yazılmaz, profile_contacts'a gider
    var telefon = fields.telefon;
    delete fields.telefon;
    delete fields.email;
    /* Sistem tarafından üretilen itibar alanları kullanıcıdan gelmez.
       Sunucuda guard_profile_metrics trigger'ı da engelliyor (migration-20);
       burada temizleyerek gereksiz/yanıltıcı istek atmıyoruz. */
    delete fields.puan;
    delete fields.degerlendirme;
    delete fields.tamamlanan;
    delete fields.seviye;
    delete fields.dogrulama;
    fields.yayinda = true; // profil kaydedildi -> havuzda görünür
    var r = await client.from("profiles").update(fields).eq("user_id", u.id).select().maybeSingle();
    if (r.error) throw r.error;
    if (telefon !== undefined) {
      var up = await client.from("profile_contacts").upsert(
        { profile_id: r.data.id, user_id: u.id, telefon: telefon, email: u.email, updated_at: new Date().toISOString() },
        { onConflict: "profile_id" }
      );
      if (up.error) throw up.error;
    }
    var out = fromDb(r.data);
    out.telefon = telefon || "";
    out.email = u.email || "";
    return out;
  }
  /* ---------- DOSYA YÜKLEME (Storage) ---------- */
  // Avatar yükle → herkese açık URL döner (profiles.avatar_url'e yazılır)
  async function uploadAvatar(file) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var ext = ((file.name || "img").split(".").pop() || "jpg").toLowerCase();
    var path = u.id + "/avatar." + ext;
    var up = await client.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (up.error) throw up.error;
    var pub = client.storage.from("avatars").getPublicUrl(path);
    var url = (pub && pub.data && pub.data.publicUrl) || "";
    return url ? url + "?v=" + Date.now() : ""; // önbellek kırıcı
  }
  // KYC belgesi yükle (özel bucket) → yalnız dosya yolu döner; admin imzalı URL ile açar
  async function uploadKycDoc(file) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var ext = ((file.name || "belge").split(".").pop() || "jpg").toLowerCase();
    var path = u.id + "/belge_" + Date.now() + "." + ext;
    var up = await client.storage.from("kyc_documents").upload(path, file, { upsert: true });
    if (up.error) throw up.error;
    return path;
  }

  // Bir profilin iletişim bilgisi (RLS: yalnız sahip veya KABUL edilmiş teklifin karşı tarafı görür)
  async function contactOf(profileId) {
    if (!profileId) return null;
    var r = await client.from("profile_contacts").select("telefon,email").eq("profile_id", profileId).maybeSingle();
    return (r && r.data) || null;
  }

  /* ---------- HAVUZ / PROFİL ---------- */
  // Havuz: yalnız GERÇEK, kayıtlı ve profili doldurulmuş kullanıcılar.
  // İsimsiz (profilini hiç doldurmamış) kayıtlar havuzda gösterilmez.
  /* Misafir kullanıcı profiles TABLOSUNU okuyamaz (migration-20).
     Adres, konum ve belge yolları yalnız giriş yapmışlara açıktır;
     misafire güvenli kolonları veren profiles_public view'ı sunulur.

     migration-20 uygulanmadan önce view mevcut olmayabilir; o durumda
     tabloya düşülür (kod ile şema aynı anda yayına girmeyebilir). */
  var _viewYok = false;
  async function _profileSource() {
    var u = await getUser();
    if (u) return "profiles";
    return _viewYok ? "profiles" : "profiles_public";
  }
  /* View bulunamadıysa bir kereliğine işaretle ve tabloya dön */
  function _viewEksikMi(err) {
    if (!err) return false;
    var m = (err.message || '') + ' ' + (err.code || '');
    if (/Could not find the table|does not exist|42P01|PGRST205/i.test(m)) {
      if (!_viewYok) {
        _viewYok = true;
        console.warn('profiles_public bulunamadı — migration-20 henüz uygulanmamış. ' +
                     'Geçici olarak profiles tablosuna düşülüyor.');
      }
      return true;
    }
    return false;
  }
  async function pool(role) {
    async function sorgula(src) {
      var q = client.from(src).select("*").eq("role", role).eq("yayinda", true);
      // view zaten filtreliyor; tabloda elle süz
      if (src === "profiles") q = q.not("user_id", "is", null).neq("ad", "");
      return q.order("puan", { ascending: false });
    }
    var src = await _profileSource();
    var r = await sorgula(src);
    if (r.error && src === "profiles_public" && _viewEksikMi(r.error)) r = await sorgula("profiles");
    if (r.error) throw r.error;
    return (r.data || []).map(fromDb);
  }
  async function poolCounts() {
    var src = await _profileSource();
    async function cnt(role) {
      async function say(s) {
        var q = client.from(s).select("id", { count: "exact", head: true })
          .eq("role", role).eq("yayinda", true);
        if (s === "profiles") q = q.not("user_id", "is", null).neq("ad", "");
        return q;
      }
      var r = await say(src);
      if (r.error && src === "profiles_public" && _viewEksikMi(r.error)) r = await say("profiles");
      return r.count || 0;
    }
    var rev = await client.from("reviews").select("id", { count: "exact", head: true });
    return { kurye: await cnt("kurye"), isletme: await cnt("isletme"), firma: await cnt("firma"), degerlendirme: (rev && rev.count) || 0 };
  }
  async function recentReviews(limit) {
    var r = await client.from("reviews")
      .select("puan,yorum,created_at, reviewer:reviewer_profile(ad,role), target:target_id(ad,role)")
      .neq("yorum", "").order("created_at", { ascending: false }).limit(limit || 12);
    if (r.error) { console.warn("recentReviews:", r.error); return []; }
    return (r.data || []).map(function (x) {
      return { puan: x.puan, yorum: x.yorum, ad: (x.reviewer && x.reviewer.ad) || "Kullanıcı", rol: x.reviewer && x.reviewer.role, hedef: (x.target && x.target.ad) || "" };
    });
  }
  async function profileById(id) {
    var src = await _profileSource();
    var r = await client.from(src).select("*").eq("id", id).maybeSingle();
    if (r.error && src === "profiles_public" && _viewEksikMi(r.error)) {
      r = await client.from("profiles").select("*").eq("id", id).maybeSingle();
    }
    if (r.error) throw r.error;
    return r.data ? fromDb(r.data) : null;
  }

  /* ---------- HAVUZUM (kayıtlı profiller) ---------- */
  async function poolIds() {
    var u = await getUser();
    if (!u) return [];
    var r = await client.from("pool_members").select("member_id").eq("owner_user", u.id);
    return (r.data || []).map(function (x) { return x.member_id; });
  }
  async function addToPool(memberId) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var r = await client.from("pool_members").insert({ owner_user: u.id, member_id: memberId });
    if (r.error && r.error.code !== "23505") throw r.error; // 23505 = zaten ekli
    return true;
  }
  async function removeFromPool(memberId) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var r = await client.from("pool_members").delete().eq("owner_user", u.id).eq("member_id", memberId);
    if (r.error) throw r.error;
    return true;
  }
  async function myPool() {
    var u = await getUser();
    if (!u) return [];
    var r = await client.from("pool_members")
      .select("created_at, profiles:member_id(*)")
      .eq("owner_user", u.id)
      .order("created_at", { ascending: false });
    if (r.error) { console.warn("myPool:", r.error); return []; }
    return (r.data || []).filter(function (row) { return row.profiles; }).map(function (row) {
      var p = fromDb(row.profiles); p._addedAt = (row.created_at || "").slice(0, 10); return p;
    });
  }

  /* ---------- TEKLİFLER ---------- */
  async function sendOffer(toUserId, toRole, fromRole, mesaj) {
    var me = await myProfile();
    if (!me || !me.id) throw new Error("Önce profilini oluştur (Profilim).");
    var r = await client.from("offers").insert({
      from_user: me.id, from_role: fromRole || me.role,
      to_user: toUserId, to_role: toRole, mesaj: mesaj
    }).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  async function myOffers() {
    // RLS sayesinde yalnız tarafı olduğumuz teklifler döner
    var me = await myProfile();
    var meId = me && me.id;
    var r = await client.from("offers")
      .select("*, from:from_user(ad,role), to:to_user(ad,role)")
      .order("created_at", { ascending: false });
    if (r.error) { console.warn(r.error); return []; }
    return (r.data || []).map(function (o) {
      return {
        id: o.id, durum: o.durum, mesaj: o.mesaj, tarih: (o.created_at || "").slice(0, 10),
        kimdenRol: o.from_role, kimeTip: o.to_role,
        kimden: (o.from && o.from.ad) || "", kime: (o.to && o.to.ad) || "",
        gelen: !!meId && o.to_user === meId,  // bana gelen teklif mi? (alıcıysam kabul/ret edebilirim)
        karsiId: (!!meId && o.to_user === meId) ? o.from_user : o.to_user  // karşı tarafın profil id'si
      };
    });
  }
  async function updateOffer(id, durum) {
    return client.from("offers").update({ durum: durum }).eq("id", id);
  }
  // Bana gelen, bekleyen teklif sayısı (bildirim rozeti için)
  async function pendingOffersCount() {
    var u = await getUser();
    if (!u) return 0;
    var me = await client.from("profiles").select("id").eq("user_id", u.id).maybeSingle();
    if (!me.data) return 0;
    var r = await client.from("offers").select("id", { count: "exact", head: true })
      .eq("to_user", me.data.id).eq("durum", "pending");
    return r.count || 0;
  }

  /* ---------- BİLDİRİMLER ---------- */
  async function myNotifications(limit) {
    var u = await getUser();
    if (!u) return [];
    var r = await client.from("notifications").select("*")
      .order("created_at", { ascending: false }).limit(limit || 50);
    if (r.error) { console.warn("myNotifications:", r.error); return []; }
    return r.data || [];
  }
  async function unreadCount() {
    var u = await getUser();
    if (!u) return 0;
    var r = await client.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    return r.count || 0;
  }
  async function markNotificationRead(id) {
    return client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }
  async function markAllNotificationsRead() {
    var u = await getUser();
    if (!u) return;
    return client.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  }
  // Anlık bildirim: yeni satır eklenince cb(notification) çağrılır. (RLS yalnız kendi satırlarını verir.)
  function subscribeNotifications(cb) {
    var ch = client.channel("kb-notif-" + Date.now())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" },
        function (payload) { try { cb(payload.new); } catch (e) {} })
      .subscribe();
    return ch;
  }

  /* ---------- HESAP ---------- */
  async function changePassword(newPass) {
    return client.auth.updateUser({ password: newPass });
  }
  // Hesabı tamamen sil (auth.users + cascade ile tüm profil/ilan/mesaj/token verisi). Sonra çıkış.
  async function deleteMyData() {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var r = await client.rpc("delete_own_account");
    if (r.error) throw r.error;
    await client.auth.signOut();
    return true;
  }

  /* ---------- DEĞERLENDİRME ---------- */
  // Bu hedefi değerlendirebilir miyim? (kabul edilmiş ortak teklif var mı, ben değilim)
  async function canReview(targetId) {
    var me = await myProfile();
    if (!me || !me.id || me.id === targetId) return false;
    var r = await client.from("offers").select("id").eq("durum", "accepted")
      .or("from_user.eq." + targetId + ",to_user.eq." + targetId).limit(1);
    return !!(r.data && r.data.length);
  }
  async function myReviewFor(targetId) {
    var u = await getUser();
    if (!u) return null;
    var r = await client.from("reviews").select("puan,yorum").eq("reviewer_user", u.id).eq("target_id", targetId).maybeSingle();
    return r.data || null;
  }
  async function addReview(targetId, puan, yorum) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var me = await myProfile();
    if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var r = await client.from("reviews").upsert(
      { reviewer_user: u.id, reviewer_profile: me.id, target_id: targetId, puan: puan, yorum: yorum || "" },
      { onConflict: "reviewer_user,target_id" }
    ).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  async function reviewsFor(targetId) {
    var r = await client.from("reviews")
      .select("puan,yorum,created_at, reviewer:reviewer_profile(ad,role)")
      .eq("target_id", targetId).order("created_at", { ascending: false });
    if (r.error) { console.warn("reviewsFor:", r.error); return []; }
    return (r.data || []).map(function (x) {
      return { puan: x.puan, yorum: x.yorum, tarih: (x.created_at || "").slice(0, 10), ad: (x.reviewer && x.reviewer.ad) || "Kullanıcı", rol: x.reviewer && x.reviewer.role };
    });
  }

  /* ---------- İLAN & BAŞVURU ---------- */
  function listingFromDb(l) {
    return {
      id: l.id, owner_id: l.owner_id, role: l.role, durum: l.durum,
      tarih: (l.created_at || "").slice(0, 10),
      /* Temel */
      baslik:           l.baslik           || "",
      aciklama:         l.aciklama         || "",
      sehir:            l.sehir            || "",
      bolge:            l.bolge            || "",
      mahalle:          l.mahalle          || "",
      teslimat_bolge:   l.teslimat_bolge   || "",
      arac:             l.arac             || "",
      kategori:         l.kategori         || "",
      /* Maaş */
      maas_min:         l.maas_min         || null,
      maas_max:         l.maas_max         || null,
      maas_aralik:      l.maas_aralik      || "",
      maas_modeli:      l.maas_modeli      || "",
      /* Çalışma koşulları */
      calisma_sekli:    l.calisma_sekli    || "",
      vardiya_tipi:     l.vardiya_tipi     || "",
      calisma_saatleri: l.calisma_saatleri || "",
      deneyim:          l.deneyim          || "",
      sigorta:          l.sigorta          || "",
      bonus:            l.bonus            || "",
      /* Listeler */
      faydalar:         Array.isArray(l.faydalar)      ? l.faydalar      : [],
      gereksinimler:    Array.isArray(l.gereksinimler) ? l.gereksinimler : [],
      /* Detay metinler */
      gorev_tanimi:     l.gorev_tanimi     || "",
      gunluk_akis:      l.gunluk_akis      || "",
      beklentiler:      l.beklentiler      || "",
      /* Meta */
      oncelik:          l.oncelik          || "normal",
      kontenjan:        l.kontenjan        || 1,
      son_basvuru:      l.son_basvuru      || null,
      tip:              l.tip              || "kurye-ilani",
      /* Sahip bilgisi — join yoksa (misafir) denormalize sahip_ad kullanılır */
      sahip:            (l.owner && l.owner.ad) || l.sahip_ad || "",
      sahipRol:         l.sahip_rol || (l.owner && l.owner.role) || "isletme",
      lat:              (l.owner && l.owner.lat != null) ? l.owner.lat : null,
      lng:              (l.owner && l.owner.lng != null) ? l.owner.lng : null,
      sahipAvatar:      (l.owner && l.owner.avatar_url) || "",
      sahipDogrulama:   (l.owner && l.owner.dogrulama)  || "none",
      sahipAciklama:    (l.owner && l.owner.aciklama)   || "",
    };
  }
  /* İlan sorgularında ortak select. owner join'i misafirde RLS ile boşalır;
     sahip adı o durumda listings.sahip_ad kolonundan okunur. */
  var LISTING_SELECT = "*, owner:owner_id(id,ad,avatar_url,dogrulama,role,sehir,lat,lng,aciklama)";

  async function listingById(id) {
    if (!id) return null;
    var r = await client.from("listings").select(LISTING_SELECT)
      .eq("id", id).maybeSingle();
    if (r.error) { console.warn("listingById:", r.error); return null; }
    return r.data ? listingFromDb(r.data) : null;
  }
  function _listingRow(fields, ownerMeta) {
    return {
      owner_id:         ownerMeta.id,
      owner_user:       ownerMeta.userId,
      role:             ownerMeta.role,
      sahip_rol:        ownerMeta.role,
      /* Temel */
      baslik:           fields.baslik           || "",
      aciklama:         fields.aciklama          || "",
      sehir:            fields.sehir             || "",
      bolge:            fields.bolge             || "",
      mahalle:          fields.mahalle           || "",
      teslimat_bolge:   fields.teslimat_bolge    || "",
      arac:             fields.arac              || "",
      kategori:         fields.kategori          || "",
      /* Maaş */
      maas_min:         fields.maas_min          || null,
      maas_max:         fields.maas_max          || null,
      maas_aralik:      fields.maas_aralik       || "",
      maas_modeli:      fields.maas_modeli       || "",
      /* Çalışma */
      calisma_sekli:    fields.calisma_sekli     || "",
      vardiya_tipi:     fields.vardiya_tipi      || "",
      calisma_saatleri: fields.calisma_saatleri  || "",
      deneyim:          fields.deneyim           || "",
      sigorta:          fields.sigorta           || "",
      bonus:            fields.bonus             || "",
      /* Listeler */
      faydalar:         Array.isArray(fields.faydalar)      ? fields.faydalar      : [],
      gereksinimler:    Array.isArray(fields.gereksinimler) ? fields.gereksinimler : [],
      /* Detay */
      gorev_tanimi:     fields.gorev_tanimi      || "",
      gunluk_akis:      fields.gunluk_akis       || "",
      beklentiler:      fields.beklentiler       || "",
      /* Meta */
      oncelik:          fields.oncelik           || "normal",
      kontenjan:        fields.kontenjan          || 1,
      son_basvuru:      fields.son_basvuru        || null,
      tip:              fields.tip               || "kurye-ilani",
      durum:            fields.durum             || "acik",
    };
  }

  async function createListing(fields) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var me = await myProfile();
    if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var row = _listingRow(fields, { id: me.id, userId: u.id, role: me.role });
    var r = await client.from("listings").insert(row).select().maybeSingle();
    if (r.error) throw r.error;
    return listingFromDb(r.data);
  }

  async function updateListing(id, fields) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var me = await myProfile();
    if (!me || !me.id) throw new Error("oturum yok");
    var row = _listingRow(fields, { id: me.id, userId: u.id, role: me.role });
    delete row.owner_id; delete row.owner_user; delete row.role;
    var r = await client.from("listings").update(row).eq("id", id).eq("owner_user", u.id).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data ? listingFromDb(r.data) : null;
  }
  async function myListings() {
    var u = await getUser();
    if (!u) return [];
    var r = await client.from("listings").select("*").eq("owner_user", u.id).order("created_at", { ascending: false });
    if (r.error) { console.warn("myListings:", r.error); return []; }
    return (r.data || []).map(listingFromDb);
  }
  // Yayında olan ilanlar: yalnız açık VE son başvuru tarihi geçmemiş olanlar.
  // Süresi dolmuş ilan iş akışında görünmez.
  async function openListings() {
    var today = new Date().toISOString().slice(0, 10);
    /* Join her zaman istenir. Girişli kullanıcıda profil bilgisi buradan gelir;
       misafirde RLS satırları eler ve owner null döner (hata değil) — o durumda
       listingFromDb denormalize sahip_ad kolonuna düşer (migration-20). */
    var r = await client.from("listings").select(LISTING_SELECT)
      .eq("durum", "acik")
      .or("son_basvuru.is.null,son_basvuru.gte." + today)
      .order("created_at", { ascending: false });
    if (r.error) { console.warn("openListings:", r.error); return []; }
    return (r.data || []).map(listingFromDb);
  }
  async function updateListingStatus(id, durum) {
    return client.from("listings").update({ durum: durum }).eq("id", id);
  }
  async function deleteListing(id) {
    return client.from("listings").delete().eq("id", id);
  }
  async function applyToListing(listingId, mesaj) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var me = await myProfile();
    if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var r = await client.from("applications").insert({
      listing_id: listingId, applicant_id: me.id, applicant_user: u.id, applicant_role: me.role, mesaj: mesaj || ""
    }).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  async function myApplications() {
    var u = await getUser();
    if (!u) return [];
    var r = await client.from("applications")
      .select("*, listing:listing_id(baslik,sehir,bolge,durum, owner:owner_id(ad))")
      .eq("applicant_user", u.id).order("created_at", { ascending: false });
    if (r.error) { console.warn("myApplications:", r.error); return []; }
    return (r.data || []).map(function (a) {
      var L = a.listing;
      return { id: a.id, listingId: a.listing_id, durum: a.durum, mesaj: a.mesaj, tarih: (a.created_at || "").slice(0, 10),
        guncelleme: (a.updated_at || a.created_at || "").slice(0, 10),
        baslik: (L && L.baslik) || "", ilanSehir: [(L && L.sehir), (L && L.bolge)].filter(Boolean).join(" · "), ilanDurum: L && L.durum,
        firma: (L && L.owner && L.owner.ad) || "" };
    });
  }
  async function appliedListingIds() {
    var u = await getUser();
    if (!u) return [];
    var r = await client.from("applications").select("listing_id").eq("applicant_user", u.id);
    return (r.data || []).map(function (x) { return x.listing_id; });
  }
  // Bir ilana gelen başvurular — aday profilinin tamamı ile birlikte.
  // Başvuru ekranındaki her alan (araç, deneyim, bölge, belge, puan) buradan gelir.
  async function listingApplications(listingId) {
    var r = await client.from("applications")
      .select("*, applicant:applicant_id(id,ad,role,puan,degerlendirme,sehir,arac,bolgeler,deneyim,seviye,sertifikalar,tamamlanan,aciklama,avatar_url,dogrulama,calistigi,lat,lng)")
      .eq("listing_id", listingId).order("created_at", { ascending: false });
    if (r.error) { console.warn("listingApplications:", r.error); return []; }
    return (r.data || []).map(function (a) {
      var p = a.applicant || {};
      return {
        id: a.id, durum: a.durum, mesaj: a.mesaj,
        tarih: (a.created_at || "").slice(0, 10), created_at: a.created_at,
        applicantId: p.id, ad: p.ad || "Kullanıcı", rol: p.role,
        puan: Number(p.puan) || 0, degerlendirme: p.degerlendirme || 0,
        sehir: p.sehir || "", arac: p.arac || "", bolgeler: p.bolgeler || [],
        deneyim: p.deneyim || 0, seviye: p.seviye || "standart",
        sertifikalar: p.sertifikalar || [], tamamlanan: p.tamamlanan || 0,
        aciklama: p.aciklama || "", avatar_url: p.avatar_url || "",
        dogrulama: p.dogrulama || "none", calistigi: p.calistigi || [],
        lat: p.lat, lng: p.lng
      };
    });
  }
  async function updateApplication(id, durum) {
    return client.from("applications").update({ durum: durum }).eq("id", id);
  }


  /* ---------- KYC / KİMLİK DOĞRULAMA ---------- */
  async function submitKyc(fields) {
    var u = await getUser(); if (!u) throw new Error("oturum yok");
    var me = await myProfile(); if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var r = await client.from("kyc_submissions").upsert({
      profile_id: me.id, user_id: u.id, ad_soyad: fields.ad_soyad, tc_no: fields.tc_no,
      belge_turu: fields.belge_turu || "", belge_url: fields.belge_url || "", not_text: fields.not_text || "", durum: "pending"
    }, { onConflict: "user_id" }).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  async function myKycSubmission() {
    var u = await getUser(); if (!u) return null;
    var r = await client.from("kyc_submissions").select("ad_soyad,belge_turu,durum").eq("user_id", u.id).maybeSingle();
    return r.data || null;
  }

  /* ---------- ADMIN ---------- */
  async function amIAdmin() {
    var u = await getUser(); if (!u) return false;
    var r = await client.from("admins").select("user_id").eq("user_id", u.id).maybeSingle();
    return !!(r && r.data);
  }
  async function listPendingKyc() {
    var r = await client.rpc("list_pending_kyc");
    if (r.error) throw r.error;
    return r.data || [];
  }
  async function reviewKyc(profileId, decision) {
    var r = await client.rpc("review_kyc", { p_profile_id: profileId, p_decision: decision });
    if (r.error) throw r.error;
    return true;
  }

  /* ---------- MESAJLAŞMA (yalnız eşleşenler) ---------- */
  async function myPid() {
    var u = await getUser(); if (!u) return null;
    var r = await client.from("profiles").select("id").eq("user_id", u.id).maybeSingle();
    return (r.data && r.data.id) || null;
  }
  // İki profil yazışabilir mi (kabul edilmiş teklif/başvuru) — RLS'teki are_matched() RPC'si
  async function canMessage(targetId) {
    var me = await myPid();
    if (!me || !targetId || me === targetId) return false;
    var r = await client.rpc("are_matched", { a: me, b: targetId });
    if (r.error) { console.warn("canMessage:", r.error); return false; }
    return !!r.data;
  }
  async function sendMessage(toProfileId, body) {
    var me = await myPid(); if (!me) throw new Error("oturum yok");
    var r = await client.from("messages").insert({ from_user: me, to_user: toProfileId, body: body }).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  // Konuşma listesi: karşı profile göre gruplanmış son mesaj + okunmamış sayısı
  async function myConversations() {
    var me = await myPid(); if (!me) return [];
    var r = await client.from("messages").select("*").order("created_at", { ascending: false });
    if (r.error) { console.warn("myConversations:", r.error); return []; }
    var threads = {}, order = [];
    (r.data || []).forEach(function (m) {
      var other = m.from_user === me ? m.to_user : m.from_user;
      if (!threads[other]) { threads[other] = { profileId: other, lastBody: m.body, lastAt: m.created_at, lastMine: m.from_user === me, unread: 0 }; order.push(other); }
      if (m.to_user === me && !m.read_at) threads[other].unread++;
    });
    if (!order.length) return [];
    var pr = await client.from("profiles").select("id,ad,role,avatar_url").in("id", order);
    var pmap = {}; (pr.data || []).forEach(function (p) { pmap[p.id] = p; });
    return order.map(function (id) {
      var t = threads[id], p = pmap[id] || {};
      t.ad = p.ad || "Kullanıcı"; t.role = p.role || ""; t.avatar = p.avatar_url || "";
      return t;
    });
  }
  // Bir kişiyle olan tüm mesajlar (artan sırada) + karşı profil
  async function threadWith(profileId) {
    var me = await myPid(); if (!me) return { me: null, messages: [], other: null };
    var r = await client.from("messages").select("*")
      .or("and(from_user.eq." + me + ",to_user.eq." + profileId + "),and(from_user.eq." + profileId + ",to_user.eq." + me + ")")
      .order("created_at", { ascending: true });
    if (r.error) { console.warn("threadWith:", r.error); return { me: me, messages: [], other: null }; }
    var op = await client.from("profiles").select("id,ad,role,avatar_url").eq("id", profileId).maybeSingle();
    return { me: me, messages: r.data || [], other: op.data || { id: profileId, ad: "Kullanıcı" } };
  }
  async function markThreadRead(fromProfileId) {
    var me = await myPid(); if (!me) return;
    return client.from("messages").update({ read_at: new Date().toISOString() })
      .eq("to_user", me).eq("from_user", fromProfileId).is("read_at", null);
  }
  async function unreadMessageCount() {
    var me = await myPid(); if (!me) return 0;
    var r = await client.from("messages").select("id", { count: "exact", head: true }).eq("to_user", me).is("read_at", null);
    return r.count || 0;
  }
  function subscribeMessages(cb) {
    var ch = client.channel("kb-msg-" + Date.now())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        function (payload) { try { cb(payload.new); } catch (e) {} })
      .subscribe();
    return ch;
  }

  /* ============================================================
     İŞE ALIM OMURGASI (migration-16 + 19)
     Görüşmeler, işe alım kararları ve onboarding — TAMAMI veritabanında.
     Eskiden localStorage'daydı; karşı taraf kaydı hiç göremiyordu.
     ============================================================ */
  async function myPid2() {
    var u = await getUser(); if (!u) return null;
    var r = await client.from('profiles').select('id').eq('user_id', u.id).maybeSingle();
    return r.data ? r.data.id : null;
  }

  // Görüşme satırı → ekranların (KBInterview.renderCard) beklediği nesne
  function interviewFromDb(r) {
    var er = r.interviewer || {}, ee = r.interviewee || {}, l = r.listing || {};
    return {
      id: r.id,
      listingId: r.listing_id, applicationId: r.application_id,
      interviewerId: r.interviewer_id, intervieweeId: r.interviewee_id,
      // renderCard iç içe kurye/isletme nesnesi bekliyor
      kuryeId:  r.interviewee_id,
      kurye:    { id: ee.id || r.interviewee_id, ad: ee.ad || 'Kurye',  avatar: ee.avatar_url || '' },
      isletmeId: r.interviewer_id,
      isletme:  { id: er.id || r.interviewer_id, ad: er.ad || 'İşveren', avatar: er.avatar_url || '' },
      jobId: r.listing_id, jobTitle: l.baslik || '',
      date: r.date || '', time: r.time || '',
      type: r.type || 'yüz yüze', location: r.location || '',
      meetingLink: r.meeting_link || '',
      note: r.note || '',
      status: r.status || 'bekliyor',
      // reschedule_req jsonb → { date, time, type, location, reason, status }
      rescheduleRequest: r.reschedule_req || null,
      postNote: r.post_note || '', decision: r.decision || null,
      reminderSent: !!r.reminder_sent,
      createdAt: r.created_at, updatedAt: r.updated_at
    };
  }
  var IV_SELECT = '*, interviewer:interviewer_id(id,ad,role,avatar_url),' +
                  ' interviewee:interviewee_id(id,ad,role,avatar_url),' +
                  ' listing:listing_id(id,baslik,sehir)';

  async function createInterview(data) {
    var pid = await myPid2(); if (!pid) return { error: 'Önce profilini oluştur.' };
    var row = {
      interviewer_id: pid,
      interviewee_id: data.interviewee_id || data.kuryeId,
      listing_id:     data.listing_id || data.jobId || null,
      application_id: data.application_id || null,
      date:           data.date || null,
      time:           data.time || '',
      type:           data.type || 'yüz yüze',
      location:       data.location || '',
      meeting_link:   data.meetingLink || data.meeting_link || '',
      note:           data.note || '',
      status:         data.status || 'bekliyor'
    };
    if (!row.interviewee_id) return { error: 'Görüşülecek kişi belirtilmedi.' };
    var r = await client.from('interviews').insert(row).select(IV_SELECT).maybeSingle();
    return r.error ? { error: r.error.message } : interviewFromDb(r.data);
  }
  async function myInterviews(opts) {
    var pid = await myPid2(); if (!pid) return [];
    opts = opts || {};
    var q = client.from('interviews').select(IV_SELECT)
      .or('interviewer_id.eq.' + pid + ',interviewee_id.eq.' + pid)
      .order('date', { ascending: true });
    if (opts.status) q = q.eq('status', opts.status);
    var r = await q;
    if (r.error) { console.warn('myInterviews:', r.error); return []; }
    return (r.data || []).map(interviewFromDb);
  }
  async function interviewById(id) {
    if (!id) return null;
    var r = await client.from('interviews').select(IV_SELECT).eq('id', id).maybeSingle();
    if (r.error) { console.warn('interviewById:', r.error); return null; }
    return r.data ? interviewFromDb(r.data) : null;
  }
  async function updateInterview(id, patch) {
    var r = await client.from('interviews').update(patch).eq('id', id).select(IV_SELECT).maybeSingle();
    return r.error ? { error: r.error.message } : interviewFromDb(r.data);
  }
  function subscribeInterviews(cb) { return _sub('iv', 'interviews', ['INSERT', 'UPDATE'], cb); }

  /* ---- İŞE ALIM KARARLARI ---- */
  function decisionFromDb(r) {
    var emp = r.employer || {}, app = r.applicant || {}, l = r.listing || {};
    return {
      id: r.id,
      jobId: r.listing_id, listingId: r.listing_id,
      applicationId: r.application_id, interviewId: r.interview_id,
      isletmeId: r.employer_id, employerId: r.employer_id,
      kuryeId: r.applicant_id, applicantId: r.applicant_id,
      isletmeAd: emp.ad || '', kuryeAd: app.ad || '',
      kuryeAvatar: app.avatar_url || '',
      jobTitle: l.baslik || '',
      status: r.status || 'beklemede',
      note: r.note || '', reason: r.reason || '',
      createdAt: r.created_at, updatedAt: r.updated_at
    };
  }
  var HD_SELECT = '*, employer:employer_id(id,ad,role),' +
                  ' applicant:applicant_id(id,ad,role,avatar_url),' +
                  ' listing:listing_id(id,baslik)';

  async function createHiringDecision(data) {
    var pid = await myPid2(); if (!pid) return { error: 'Önce profilini oluştur.' };
    var row = {
      employer_id:    pid,
      applicant_id:   data.applicant_id || data.kuryeId,
      listing_id:     data.listing_id || data.jobId || null,
      application_id: data.application_id || null,
      interview_id:   data.interview_id || null,
      status:         data.status || 'beklemede',
      note:           data.note || null,
      reason:         data.reason || null
    };
    if (!row.applicant_id) return { error: 'Aday belirtilmedi.' };
    // Aynı ilan+aday için tek kayıt (migration-16'daki unique index)
    var r = await client.from('hiring_decisions')
      .upsert(row, { onConflict: 'listing_id,applicant_id' })
      .select(HD_SELECT).maybeSingle();
    if (r.error) return { error: r.error.message };
    return decisionFromDb(r.data);
  }
  async function myHiringDecisions(opts) {
    var pid = await myPid2(); if (!pid) return [];
    opts = opts || {};
    var q = client.from('hiring_decisions').select(HD_SELECT)
      .or('employer_id.eq.' + pid + ',applicant_id.eq.' + pid)
      .order('updated_at', { ascending: false });
    if (opts.status) q = q.eq('status', opts.status);
    var r = await q;
    if (r.error) { console.warn('myHiringDecisions:', r.error); return []; }
    return (r.data || []).map(decisionFromDb);
  }
  // Belirli ilan + aday için karar kaydı
  async function hiringDecisionFor(listingId, applicantId) {
    if (!applicantId) return null;
    var q = client.from('hiring_decisions').select(HD_SELECT).eq('applicant_id', applicantId);
    q = listingId ? q.eq('listing_id', listingId) : q.is('listing_id', null);
    var r = await q.maybeSingle();
    if (r.error) { console.warn('hiringDecisionFor:', r.error); return null; }
    return r.data ? decisionFromDb(r.data) : null;
  }
  async function updateHiringDecision(id, patch) {
    var r = await client.from('hiring_decisions').update(patch).eq('id', id).select(HD_SELECT).maybeSingle();
    return r.error ? { error: r.error.message } : decisionFromDb(r.data);
  }
  function subscribeHiringDecisions(cb) { return _sub('hd', 'hiring_decisions', ['INSERT', 'UPDATE'], cb); }

  /* ---- ONBOARDING (işe başlangıç) ---- */
  function onboardingFromDb(r) {
    if (!r) return null;
    return {
      id: r.id, decisionId: r.decision_id,
      employerId: r.employer_id, applicantId: r.applicant_id,
      startDate: r.start_date || '', startPoint: r.start_point || '',
      contactPerson: r.contact_person || '', contactPhone: r.contact_phone || '',
      workDetails: r.work_details || '', firstDayNotes: r.first_day_notes || '',
      completed: !!r.completed, completedAt: r.completed_at,
      sentAt: r.created_at, updatedAt: r.updated_at
    };
  }
  async function saveOnboarding(decisionId, applicantId, data) {
    var pid = await myPid2(); if (!pid) return { error: 'Önce profilini oluştur.' };
    if (!decisionId) return { error: 'Karar kaydı yok.' };
    var row = {
      decision_id:     decisionId,
      employer_id:     pid,
      applicant_id:    applicantId,
      start_date:      data.startDate || data.start_date || null,
      start_point:     data.startPoint || data.start_point || '',
      contact_person:  data.contactPerson || data.contact_person || '',
      contact_phone:   data.contactPhone || data.contact_phone || '',
      work_details:    data.workDetails || data.work_details || '',
      first_day_notes: data.firstDayNotes || data.first_day_notes || ''
    };
    var r = await client.from('onboarding')
      .upsert(row, { onConflict: 'decision_id' }).select().maybeSingle();
    return r.error ? { error: r.error.message } : onboardingFromDb(r.data);
  }
  async function getOnboarding(decisionId) {
    if (!decisionId) return null;
    var r = await client.from('onboarding').select('*').eq('decision_id', decisionId).maybeSingle();
    if (r.error) { console.warn('getOnboarding:', r.error); return null; }
    return onboardingFromDb(r.data);
  }
  // Aday "işe başlangıcı tamamladım" der
  async function completeOnboarding(decisionId) {
    if (!decisionId) return { error: 'Karar kaydı yok.' };
    var r = await client.from('onboarding')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('decision_id', decisionId).select().maybeSingle();
    return r.error ? { error: r.error.message } : onboardingFromDb(r.data);
  }

  /* ---- Push Subscription ---- */
  async function savePushSubscription(sub) {
    var u = await getUser();
    if (!u) return;
    var k = sub.toJSON ? sub.toJSON() : sub;
    return client.from("push_subscriptions").upsert({
      user_id: u.id,
      endpoint: k.endpoint,
      p256dh: k.keys.p256dh,
      auth_key: k.keys.auth
    }, { onConflict: "user_id,endpoint" });
  }
  async function deletePushSubscription(endpoint) {
    return client.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }

  /* ---- Native Device Token ---- */
  async function savePushToken(token) {
    var u = await getUser();
    if (!u || !token) return;
    var platform = (window.Capacitor && window.Capacitor.getPlatform) ? window.Capacitor.getPlatform() : 'android';
    return client.from("device_tokens").upsert({
      user_id: u.id,
      token: token,
      platform: platform,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,token" });
  }

  /* ---- FİLO: gerçekten işe alınan kuryeler ----
     "Filo" = kendi ilanlarıma KABUL EDİLMİŞ başvuru sahipleri.
     Uydurma bir kadro listesi tutulmaz. */
  async function myFleet() {
    var u = await getUser();
    if (!u) return [];
    var lr = await client.from("listings").select("id").eq("owner_user", u.id);
    var ids = (lr.data || []).map(function (x) { return x.id; });
    if (!ids.length) return [];
    var ar = await client.from("applications")
      .select("created_at, applicant:applicant_id(id,ad,sehir,seviye,puan,arac,avatar_url,dogrulama,tamamlanan)")
      .in("listing_id", ids).eq("durum", "accepted")
      .order("created_at", { ascending: false });
    if (ar.error) { console.warn("myFleet:", ar.error); return []; }
    var seen = {}, out = [];
    (ar.data || []).forEach(function (a) {
      var p = a.applicant;
      if (!p || seen[p.id]) return;
      seen[p.id] = 1;
      out.push({
        id: p.id, ad: p.ad || "Kurye", sehir: p.sehir || "",
        seviye: p.seviye || "standart", puan: Number(p.puan) || 0,
        arac: p.arac || "", avatar_url: p.avatar_url || "",
        dogrulama: p.dogrulama || "none", tamamlanan: p.tamamlanan || 0,
        baslangic: (a.created_at || "").slice(0, 10)
      });
    });
    return out;
  }

  /* ---- Esnaf Analitik ---- */
  async function myListingStats() {
    var u = await getUser();
    if (!u) return { openCount: 0, closedCount: 0, totalApps: 0, pendingApps: 0, acceptedApps: 0 };
    var lr = await client.from("listings").select("id,durum").eq("owner_user", u.id);
    var listings = lr.data || [];
    var openCount = listings.filter(function (l) { return l.durum === "acik"; }).length;
    var closedCount = listings.length - openCount;
    if (!listings.length) return { openCount: 0, closedCount: 0, totalApps: 0, pendingApps: 0, acceptedApps: 0 };
    var ids = listings.map(function (l) { return l.id; });
    var ar = await client.from("applications").select("id,durum").in("listing_id", ids);
    var apps = ar.data || [];
    return {
      openCount: openCount,
      closedCount: closedCount,
      totalApps: apps.length,
      pendingApps: apps.filter(function (a) { return a.durum === "pending"; }).length,
      acceptedApps: apps.filter(function (a) { return a.durum === "accepted"; }).length
    };
  }

  /* ============================================================
     CANLI SİSTEM — presence, istatistik, realtime abonelikler
     (migration-18-production.sql)
     ============================================================ */

  /* ---- PRESENCE (gerçek çevrimiçi durumu) ---- */
  async function presencePing() {
    if (!client) return;
    try { await client.rpc("presence_ping"); } catch (e) {}
  }
  async function presenceOffline(useBeacon) {
    if (!client) return;
    // Sekme kapanırken normal fetch iptal edilir; keepalive ile son isteği garantile.
    if (useBeacon) {
      try {
        var s = await client.auth.getSession();
        var tok = s && s.data && s.data.session && s.data.session.access_token;
        if (!tok) return;
        return fetch(SUPABASE_URL + "/rest/v1/rpc/presence_offline", {
          method: "POST", keepalive: true,
          headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON, Authorization: "Bearer " + tok },
          body: "{}"
        });
      } catch (e) { return; }
    }
    try { await client.rpc("presence_offline"); } catch (e) {}
  }
  // Aynı eksik RPC için tekrar tekrar uyarı basma (konsol gürültüsü)
  var _warned = {};
  function warnOnce(key, err) {
    if (_warned[key]) return;
    _warned[key] = 1;
    console.warn(key + ":", (err && err.message) || err);
  }

  // Anlık çevrimiçi kullanıcı sayısı (misafirler de görebilir)
  async function onlineCount() {
    if (!client) return 0;
    var r = await client.rpc("online_users_count");
    if (r.error) { warnOnce("onlineCount", r.error); return 0; }
    return Number(r.data) || 0;
  }
  async function onlineByRole() {
    if (!client) return {};
    var r = await client.rpc("online_counts_by_role");
    if (r.error) return {};
    var out = {};
    (r.data || []).forEach(function (x) { out[x.role] = x.adet; });
    return out;
  }
  // Profil kartlarındaki çevrimiçi rozeti — { profileId: true/false }
  async function presenceOf(ids) {
    if (!client || !ids || !ids.length) return {};
    var r = await client.from("profile_presence").select("profile_id,online").in("profile_id", ids);
    if (r.error) return {};
    var out = {};
    (r.data || []).forEach(function (x) { out[x.profile_id] = !!x.online; });
    return out;
  }

  /* ---- CANLI İSTATİSTİKLER ---- */
  // Ana sayfa / havuz sayaçları — hepsi veritabanından, hiçbiri sabit değil.
  async function platformStats() {
    if (!client) return null;
    var r = await client.rpc("platform_stats");
    if (r.error) { warnOnce("platformStats", r.error); return null; }
    return r.data || null;
  }
  // Kullanıcıya özel dashboard sayaçları (tek çağrı)
  async function myDashboardStats() {
    if (!client) return null;
    var u = await getUser();
    if (!u) return null;
    var r = await client.rpc("my_dashboard_stats");
    if (r.error) { warnOnce("myDashboardStats", r.error); return null; }
    return r.data || null;
  }
  // İlan kartlarındaki gerçek başvuru adedi — { listingId: n }
  async function listingAppCounts(ids) {
    if (!client || !ids || !ids.length) return {};
    var r = await client.rpc("listing_application_counts", { p_ids: ids });
    if (r.error) { warnOnce("listingAppCounts", r.error); return {}; }
    var out = {};
    (r.data || []).forEach(function (x) { out[x.listing_id] = x.adet; });
    return out;
  }
  // Profil görüntülendi — gerçek olay kaydı (24 saatte bir kez sayılır)
  async function recordProfileView(profileId) {
    if (!client || !profileId) return;
    try { await client.rpc("record_profile_view", { p_profile_id: profileId }); } catch (e) {}
  }
  // İlan görüntülendi — gerçek olay kaydı (6 saatte bir kez sayılır)
  async function recordListingView(listingId) {
    if (!client || !listingId) return;
    try { await client.rpc("record_listing_view", { p_listing_id: listingId }); } catch (e) {}
  }
  // Bir ilanın gerçek istatistikleri: görüntülenme / başvuru / kabul
  async function listingStats(listingId) {
    if (!client || !listingId) return { views: 0, apps: 0, pending: 0, accepted: 0, rejected: 0 };
    var r = await client.rpc("listing_stats", { p_listing_id: listingId });
    if (r.error) { warnOnce("listingStats", r.error); return { views: 0, apps: 0, pending: 0, accepted: 0, rejected: 0 }; }
    return r.data || { views: 0, apps: 0, pending: 0, accepted: 0, rejected: 0 };
  }

  /* ---- REALTIME ABONELİKLER ---- */
  // Ortak yardımcı: bir tabloyu dinle, unsubscribe fonksiyonu döndür.
  function _sub(name, table, events, cb) {
    if (!client) return function () {};
    var ch = client.channel("kb-" + name + "-" + Math.random().toString(36).slice(2));
    (events || ["INSERT", "UPDATE", "DELETE"]).forEach(function (ev) {
      ch.on("postgres_changes", { event: ev, schema: "public", table: table },
        function (payload) { try { cb(payload); } catch (e) {} });
    });
    ch.subscribe();
    return function () { try { client.removeChannel(ch); } catch (e) {} };
  }
  // Yeni ilan yayınlanınca / kapanınca — ilan listesi ve sayaçlar anında güncellenir
  function subscribeListings(cb) { return _sub("listings", "listings", ["INSERT", "UPDATE", "DELETE"], cb); }
  // Yeni başvuru — işveren dashboard'u anında güncellenir
  function subscribeApplications(cb) { return _sub("apps", "applications", ["INSERT", "UPDATE"], cb); }
  // Yeni kayıt / profil yayına alınma — havuz sayaçları anında güncellenir
  function subscribeProfiles(cb) { return _sub("profiles", "profiles", ["INSERT", "UPDATE"], cb); }
  function subscribeOffers(cb) { return _sub("offers", "offers", ["INSERT", "UPDATE"], cb); }
  function subscribeConversations(cb) { return _sub("convs", "conversations", ["INSERT", "UPDATE"], cb); }

  window.SB = {
    isOn: isOn,
    raw: function () { return client; },   // realtime presence kanalı için ham istemci
    presencePing: presencePing, presenceOffline: presenceOffline,
    onlineCount: onlineCount, onlineByRole: onlineByRole, presenceOf: presenceOf,
    platformStats: platformStats, myDashboardStats: myDashboardStats,
    listingAppCounts: listingAppCounts, recordProfileView: recordProfileView,
    recordListingView: recordListingView, listingStats: listingStats,
    subscribeListings: subscribeListings, subscribeApplications: subscribeApplications,
    subscribeProfiles: subscribeProfiles, subscribeOffers: subscribeOffers,
    subscribeConversations: subscribeConversations,
    canMessage: canMessage, sendMessage: sendMessage, myConversations: myConversations,
    threadWith: threadWith, markThreadRead: markThreadRead, unreadMessageCount: unreadMessageCount, subscribeMessages: subscribeMessages,
    signUp: signUp, signIn: signIn, signInWithGoogle: signInWithGoogle, signOut: signOut, getUser: getUser, onAuthChange: onAuthChange,
    resetPassword: resetPassword, updatePassword: updatePassword,
    verifyEmail: verifyEmail, resendVerification: resendVerification,
    myProfile: myProfile, updateMyProfile: updateMyProfile, contactOf: contactOf,
    uploadAvatar: uploadAvatar, uploadKycDoc: uploadKycDoc,
    poolIds: poolIds, addToPool: addToPool, removeFromPool: removeFromPool, myPool: myPool,
    pool: pool, profileById: profileById, poolCounts: poolCounts, recentReviews: recentReviews,
    sendOffer: sendOffer, myOffers: myOffers, updateOffer: updateOffer, pendingOffersCount: pendingOffersCount,
    myNotifications: myNotifications, unreadCount: unreadCount, markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead, subscribeNotifications: subscribeNotifications,
    changePassword: changePassword, deleteMyData: deleteMyData,
    canReview: canReview, myReviewFor: myReviewFor, addReview: addReview, reviewsFor: reviewsFor,
    createListing: createListing, updateListing: updateListing, myListings: myListings, openListings: openListings, listingById: listingById,
    updateListingStatus: updateListingStatus, deleteListing: deleteListing,
    applyToListing: applyToListing, myApplications: myApplications, appliedListingIds: appliedListingIds,
    listingApplications: listingApplications, updateApplication: updateApplication,
    submitKyc: submitKyc, myKycSubmission: myKycSubmission,
    amIAdmin: amIAdmin, listPendingKyc: listPendingKyc, reviewKyc: reviewKyc,
    savePushSubscription: savePushSubscription, deletePushSubscription: deletePushSubscription,
    savePushToken: savePushToken,
    myListingStats: myListingStats, myFleet: myFleet,
    createInterview: createInterview, myInterviews: myInterviews, updateInterview: updateInterview,
    interviewById: interviewById, subscribeInterviews: subscribeInterviews,
    createHiringDecision: createHiringDecision, myHiringDecisions: myHiringDecisions,
    updateHiringDecision: updateHiringDecision, hiringDecisionFor: hiringDecisionFor,
    subscribeHiringDecisions: subscribeHiringDecisions,
    saveOnboarding: saveOnboarding, getOnboarding: getOnboarding, completeOnboarding: completeOnboarding
  };
})();
