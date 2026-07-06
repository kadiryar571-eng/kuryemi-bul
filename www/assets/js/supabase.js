/* ============================================================
   Kuryemi Bul — supabase.js
   Supabase istemcisi + auth + veri katmani.
   Anahtar yoksa veya kutuphane yuklenmezse demo (KB_DATA) moduna duser.
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
      kapasite: p.kapasite || 0, hizmetler: p.hizmetler || [],
      adres: p.adres || "", belgeler: p.belgeler || [], fotograflar: p.fotograflar || []
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
  // Kurye firması belgesi yükle (özel bucket) → yalnız dosya yolu döner
  async function uploadFirmaBelge(file) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var ext = ((file.name || "belge").split(".").pop() || "pdf").toLowerCase();
    var path = u.id + "/" + Date.now() + "." + ext;
    var up = await client.storage.from("firma_belgeler").upload(path, file, { upsert: true });
    if (up.error) throw up.error;
    return path;
  }
  // Kurye firması fotoğrafı yükle (açık bucket) → herkese açık URL döner
  async function uploadFirmaFoto(file) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var ext = ((file.name || "img").split(".").pop() || "jpg").toLowerCase();
    var path = u.id + "/" + Date.now() + "." + ext;
    var up = await client.storage.from("firma_fotograflar").upload(path, file, { upsert: true });
    if (up.error) throw up.error;
    var pub = client.storage.from("firma_fotograflar").getPublicUrl(path);
    return (pub && pub.data && pub.data.publicUrl) || "";
  }

  // Bir profilin iletişim bilgisi (RLS: yalnız sahip veya KABUL edilmiş teklifin karşı tarafı görür)
  async function contactOf(profileId) {
    if (!profileId) return null;
    var r = await client.from("profile_contacts").select("telefon,email").eq("profile_id", profileId).maybeSingle();
    return (r && r.data) || null;
  }

  /* ---------- HAVUZ / PROFİL ---------- */
  async function pool(role) {
    var r = await client.from("profiles").select("*").eq("role", role).eq("yayinda", true).order("puan", { ascending: false });
    if (r.error) throw r.error;
    return (r.data || []).map(fromDb);
  }
  async function poolCounts() {
    async function cnt(role) {
      var r = await client.from("profiles").select("id", { count: "exact", head: true }).eq("role", role).eq("yayinda", true);
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
    var r = await client.from("profiles").select("*").eq("id", id).maybeSingle();
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
  // Şifre değiştirme için e-postaya 6 haneli doğrulama kodu gönder (mevcut kullanıcı, yeni hesap açmaz)
  async function sendPasswordOtp(email) {
    return client.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false } });
  }
  // Kullanıcının e-postaya gelen kodu doğrula (oturumu tazeler)
  async function verifyPasswordOtp(email, code) {
    return client.auth.verifyOtp({ email: email, token: code, type: "email" });
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
      id: l.id, owner_id: l.owner_id, role: l.role, baslik: l.baslik, aciklama: l.aciklama,
      sehir: l.sehir, bolge: l.bolge, arac: l.arac, durum: l.durum,
      tarih: (l.created_at || "").slice(0, 10),
      sahip: (l.owner && l.owner.ad) || "",
      lat: (l.owner && l.owner.lat != null) ? l.owner.lat : null,
      lng: (l.owner && l.owner.lng != null) ? l.owner.lng : null,
      sahipAvatar: (l.owner && l.owner.avatar_url) || "",
      sahipDogrulama: (l.owner && l.owner.dogrulama) || "none",
      sahipRol: (l.owner && l.owner.role) || "isletme",
      kategori: l.kategori || "", mahalle: l.mahalle || "", teslimat_bolge: l.teslimat_bolge || "",
      calisma_sekli: l.calisma_sekli || "", vardiya_tipi: l.vardiya_tipi || "",
      maas_min: l.maas_min || null, maas_max: l.maas_max || null, maas_modeli: l.maas_modeli || "aylık", maas_aralik: l.maas_aralik || "",
      calisma_saatleri: l.calisma_saatleri || "", deneyim: l.deneyim || "",
      sigorta: l.sigorta || "", bonus: l.bonus || "",
      faydalar: l.faydalar || [], gereksinimler: l.gereksinimler || [],
      gorev_tanimi: l.gorev_tanimi || "", gunluk_akis: l.gunluk_akis || "", beklentiler: l.beklentiler || "",
      kontenjan: l.kontenjan || 1, son_basvuru: l.son_basvuru || "", oncelik: l.oncelik || "normal",
      tip: l.tip || ""
    };
  }
  async function listingById(id) {
    if (!id) return null;
    var r = await client.from("listings")
      .select("*, owner:owner_id(id,ad,avatar_url,dogrulama,role,sehir,lat,lng)")
      .eq("id", id).maybeSingle();
    if (r.error) { console.warn("listingById:", r.error); return null; }
    return r.data ? listingFromDb(r.data) : null;
  }
  async function createListing(fields) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var me = await myProfile();
    if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var maasMin = fields.maas_min ? parseInt(fields.maas_min, 10) : null;
    var maasMax = fields.maas_max ? parseInt(fields.maas_max, 10) : null;
    var maasAralik = (maasMin && maasMax) ? (maasMin.toLocaleString('tr') + ' – ' + maasMax.toLocaleString('tr') + ' ₺/' + (fields.maas_modeli || 'ay')) : (maasMin ? maasMin.toLocaleString('tr') + ' ₺+' : '');
    var row = {
      owner_id: me.id, owner_user: u.id, role: me.role, tip: fields.tip || "kurye-ilani",
      baslik: fields.baslik, aciklama: fields.aciklama || "",
      sehir: fields.sehir || "", bolge: fields.bolge || "", mahalle: fields.mahalle || "",
      teslimat_bolge: fields.teslimat_bolge || fields.mahalle || fields.bolge || "",
      arac: fields.arac || "", kategori: fields.kategori || "",
      calisma_sekli: fields.calisma_sekli || "", vardiya_tipi: fields.vardiya_tipi || "",
      maas_min: maasMin, maas_max: maasMax, maas_modeli: fields.maas_modeli || "aylık", maas_aralik: maasAralik,
      calisma_saatleri: fields.calisma_saatleri || "", deneyim: fields.deneyim || "",
      sigorta: fields.sigorta || "", bonus: fields.bonus || "",
      faydalar: fields.faydalar || [], gereksinimler: fields.gereksinimler || [],
      gorev_tanimi: fields.gorev_tanimi || "", gunluk_akis: fields.gunluk_akis || "", beklentiler: fields.beklentiler || "",
      kontenjan: fields.kontenjan || 1, son_basvuru: fields.son_basvuru || null, oncelik: fields.oncelik || "normal"
    };
    var r = await client.from("listings").insert(row).select().maybeSingle();
    if (r.error) throw r.error;
    return listingFromDb(r.data);
  }
  async function updateListing(id, fields) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var maasMin = fields.maas_min ? parseInt(fields.maas_min, 10) : null;
    var maasMax = fields.maas_max ? parseInt(fields.maas_max, 10) : null;
    var maasAralik = (maasMin && maasMax) ? (maasMin.toLocaleString('tr') + ' – ' + maasMax.toLocaleString('tr') + ' ₺/' + (fields.maas_modeli || 'ay')) : (maasMin ? maasMin.toLocaleString('tr') + ' ₺+' : '');
    var row = {
      tip: fields.tip || "kurye-ilani",
      baslik: fields.baslik, aciklama: fields.aciklama || "",
      sehir: fields.sehir || "", bolge: fields.bolge || "", mahalle: fields.mahalle || "",
      teslimat_bolge: fields.teslimat_bolge || fields.mahalle || fields.bolge || "",
      arac: fields.arac || "", kategori: fields.kategori || "",
      calisma_sekli: fields.calisma_sekli || "", vardiya_tipi: fields.vardiya_tipi || "",
      maas_min: maasMin, maas_max: maasMax, maas_modeli: fields.maas_modeli || "aylık", maas_aralik: maasAralik,
      calisma_saatleri: fields.calisma_saatleri || "", deneyim: fields.deneyim || "",
      sigorta: fields.sigorta || "", bonus: fields.bonus || "",
      faydalar: fields.faydalar || [], gereksinimler: fields.gereksinimler || [],
      gorev_tanimi: fields.gorev_tanimi || "", gunluk_akis: fields.gunluk_akis || "", beklentiler: fields.beklentiler || "",
      kontenjan: fields.kontenjan || 1, son_basvuru: fields.son_basvuru || null, oncelik: fields.oncelik || "normal"
    };
    var r = await client.from("listings").update(row).eq("id", id).eq("owner_user", u.id).select().maybeSingle();
    if (r.error) throw r.error;
    return listingFromDb(r.data);
  }
  async function myListings() {
    var u = await getUser();
    if (!u) return [];
    var r = await client.from("listings").select("*").eq("owner_user", u.id).order("created_at", { ascending: false });
    if (r.error) { console.warn("myListings:", r.error); return []; }
    return (r.data || []).map(listingFromDb);
  }
  async function openListings() {
    var r = await client.from("listings").select("*, owner:owner_id(ad,lat,lng,sehir)").eq("durum", "acik").order("created_at", { ascending: false });
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
  async function listingApplications(listingId) {
    var r = await client.from("applications")
      .select("*, applicant:applicant_id(id,ad,role,puan,sehir)")
      .eq("listing_id", listingId).order("created_at", { ascending: false });
    if (r.error) { console.warn("listingApplications:", r.error); return []; }
    return (r.data || []).map(function (a) {
      return { id: a.id, durum: a.durum, mesaj: a.mesaj, tarih: (a.created_at || "").slice(0, 10),
        applicantId: a.applicant && a.applicant.id, ad: (a.applicant && a.applicant.ad) || "Kullanıcı",
        rol: a.applicant && a.applicant.role, puan: (a.applicant && Number(a.applicant.puan)) || 0, sehir: a.applicant && a.applicant.sehir };
    });
  }
  async function updateApplication(id, durum) {
    return client.from("applications").update({ durum: durum }).eq("id", id);
  }
  async function allMyListingApplications() {
    var u = await getUser();
    if (!u) return [];
    var lr = await client.from("listings").select("id,baslik").eq("owner_user", u.id);
    if (lr.error || !lr.data || !lr.data.length) return [];
    var listingMap = {};
    lr.data.forEach(function (l) { listingMap[l.id] = l.baslik; });
    var ids = lr.data.map(function (l) { return l.id; });
    var ar = await client.from("applications")
      .select("*, applicant:applicant_id(id,ad,role,puan,sehir)")
      .in("listing_id", ids).order("created_at", { ascending: false });
    if (ar.error) { console.warn("allMyListingApplications:", ar.error); return []; }
    return (ar.data || []).map(function (a) {
      return { id: a.id, durum: a.durum, mesaj: a.mesaj, tarih: (a.created_at || "").slice(0, 10),
        listingId: a.listing_id, ilanBaslik: listingMap[a.listing_id] || "",
        applicantId: a.applicant && a.applicant.id, ad: (a.applicant && a.applicant.ad) || "Kurye",
        puan: (a.applicant && Number(a.applicant.puan)) || 0, sehir: a.applicant && a.applicant.sehir };
    });
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

  /* ---------- BAŞVURU + KONUŞMA PIPELINE ---------- */

  // Başvuru gönder → DB trigger konuşmayı oluşturur → conv id'sini döndür
  async function applyWithConv(listingId, mesaj) {
    var app = await applyToListing(listingId, mesaj || '');
    var convId = null;
    for (var i = 0; i < 6; i++) {
      await new Promise(function (r) { setTimeout(r, 350); });
      var r = await client.from('conversations').select('id').eq('application_id', app.id).maybeSingle();
      if (r.data && r.data.id) { convId = r.data.id; break; }
    }
    return { application: app, convId: convId };
  }

  // Kullanıcının tüm işe alım konuşmaları
  async function myConvs() {
    var u = await getUser(); if (!u) return [];
    var r = await client.from('conversations')
      .select('id,last_message,last_message_at,kurye_unread,employer_unread,status,created_at,application_id,' +
        'kurye_user,employer_user,' +
        'listing:listing_id(baslik,sehir,bolge),' +
        'kurye:kurye_id(ad,puan,seviye),' +
        'employer:employer_id(ad,tur)')
      .or('kurye_user.eq.' + u.id + ',employer_user.eq.' + u.id)
      .order('last_message_at', { ascending: false });
    if (r.error) { console.warn('myConvs:', r.error); return []; }
    return (r.data || []).map(function (c) {
      var iAmKurye = c.kurye_user === u.id;
      return {
        id: c.id,
        applicationId: c.application_id,
        listingTitle: (c.listing && c.listing.baslik) || '',
        listingSehir: [(c.listing && c.listing.sehir), (c.listing && c.listing.bolge)].filter(Boolean).join(' · '),
        otherName: iAmKurye ? ((c.employer && c.employer.ad) || 'Esnaf') : ((c.kurye && c.kurye.ad) || 'Kurye'),
        otherRole: iAmKurye ? 'isletme' : 'kurye',
        lastMessage: c.last_message || '',
        lastMessageAt: c.last_message_at,
        unread: iAmKurye ? (c.kurye_unread || 0) : (c.employer_unread || 0),
        status: c.status,
        createdAt: c.created_at
      };
    });
  }

  // Bir konuşmanın tam detayı + mesaj geçmişi
  async function getConvDetail(convId) {
    var results = await Promise.all([
      client.from('conversations')
        .select('*,listing:listing_id(baslik,sehir,bolge),kurye:kurye_id(ad,puan,sehir,arac,seviye,deneyim),employer:employer_id(ad,tur,sehir)')
        .eq('id', convId).maybeSingle(),
      client.from('conv_messages')
        .select('*').eq('conversation_id', convId).order('created_at', { ascending: true })
    ]);
    if (results[0].error) { console.warn('getConvDetail:', results[0].error); return null; }
    return { conv: results[0].data, messages: results[1].data || [] };
  }

  // Konuşmaya mesaj gönder
  async function sendConvMessage(convId, content, type, metadata) {
    var u = await getUser(); if (!u) throw new Error('oturum yok');
    var me = await myProfile(); if (!me) throw new Error('profil yok');
    var r = await client.from('conv_messages').insert({
      conversation_id: convId, sender_user: u.id, sender_role: me.role,
      content: content, message_type: type || 'text', metadata: metadata || {}
    }).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }

  // Konuşmanın okunmamışlarını sıfırla
  async function markConvRead(convId) {
    var u = await getUser(); if (!u) return;
    var cR = await client.from('conversations').select('kurye_user,employer_user').eq('id', convId).maybeSingle();
    if (!cR.data) return;
    await client.from('conv_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', convId).neq('sender_user', u.id).is('read_at', null);
    var patch = cR.data.kurye_user === u.id ? { kurye_unread: 0 } : { employer_unread: 0 };
    await client.from('conversations').update(patch).eq('id', convId);
  }

  // Realtime: konuşmaya yeni mesaj gelince cb(message) çağrılır
  function subscribeConv(convId, cb) {
    var ch = client.channel('kb-conv-' + convId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'conv_messages',
        filter: 'conversation_id=eq.' + convId
      }, function (payload) { try { cb(payload.new); } catch (e) {} })
      .subscribe();
    return ch;
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

  window.SB = {
    isOn: isOn,
    canMessage: canMessage, sendMessage: sendMessage, myConversations: myConversations,
    threadWith: threadWith, markThreadRead: markThreadRead, unreadMessageCount: unreadMessageCount, subscribeMessages: subscribeMessages,
    signUp: signUp, signIn: signIn, signInWithGoogle: signInWithGoogle, signOut: signOut, getUser: getUser, onAuthChange: onAuthChange,
    resetPassword: resetPassword, updatePassword: updatePassword,
    verifyEmail: verifyEmail, resendVerification: resendVerification,
    myProfile: myProfile, updateMyProfile: updateMyProfile, contactOf: contactOf,
    uploadAvatar: uploadAvatar, uploadKycDoc: uploadKycDoc,
    uploadFirmaBelge: uploadFirmaBelge, uploadFirmaFoto: uploadFirmaFoto,
    poolIds: poolIds, addToPool: addToPool, removeFromPool: removeFromPool, myPool: myPool,
    pool: pool, profileById: profileById, poolCounts: poolCounts, recentReviews: recentReviews,
    sendOffer: sendOffer, myOffers: myOffers, updateOffer: updateOffer, pendingOffersCount: pendingOffersCount,
    myNotifications: myNotifications, unreadCount: unreadCount, markNotificationRead: markNotificationRead,
    markAllNotificationsRead: markAllNotificationsRead, subscribeNotifications: subscribeNotifications,
    changePassword: changePassword, deleteMyData: deleteMyData,
    sendPasswordOtp: sendPasswordOtp, verifyPasswordOtp: verifyPasswordOtp,
    canReview: canReview, myReviewFor: myReviewFor, addReview: addReview, reviewsFor: reviewsFor,
    createListing: createListing, updateListing: updateListing, myListings: myListings, openListings: openListings, listingById: listingById,
    updateListingStatus: updateListingStatus, deleteListing: deleteListing,
    applyToListing: applyToListing, myApplications: myApplications, appliedListingIds: appliedListingIds,
    listingApplications: listingApplications, updateApplication: updateApplication, allMyListingApplications: allMyListingApplications,
    applyWithConv: applyWithConv, myConvs: myConvs, getConvDetail: getConvDetail,
    sendConvMessage: sendConvMessage, markConvRead: markConvRead, subscribeConv: subscribeConv,
    submitKyc: submitKyc, myKycSubmission: myKycSubmission,
    amIAdmin: amIAdmin, listPendingKyc: listPendingKyc, reviewKyc: reviewKyc,
    savePushSubscription: savePushSubscription, deletePushSubscription: deletePushSubscription,
    savePushToken: savePushToken,
    myListingStats: myListingStats,
    openChannel: function (name) { return client.channel(name); }
  };
})();
