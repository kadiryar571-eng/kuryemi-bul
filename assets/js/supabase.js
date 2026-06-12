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
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: true, autoRefreshToken: true }
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
  // Google ile giriş/kayıt (OAuth). Dönüş giris.html'de oturum tespitiyle yönlendirilir.
  async function signInWithGoogle() {
    return client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + "/giris.html" }
    });
  }
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
    var r = await client.auth.getUser();
    return (r && r.data && r.data.user) || null;
  }
  function onAuthChange(cb) {
    if (client) client.auth.onAuthStateChange(function (_e, session) { cb(session && session.user); });
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
  // Profil verilerini sil (profil + iletişim + teklifler + havuz kayıtları). Sonra çıkış.
  async function deleteMyData() {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    await client.from("pool_members").delete().eq("owner_user", u.id);
    var r = await client.from("profiles").delete().eq("user_id", u.id); // contacts/offers/pool member cascade
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
      sahip: (l.owner && l.owner.ad) || ""
    };
  }
  async function createListing(fields) {
    var u = await getUser();
    if (!u) throw new Error("oturum yok");
    var me = await myProfile();
    if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var row = {
      owner_id: me.id, owner_user: u.id, role: me.role,
      baslik: fields.baslik, aciklama: fields.aciklama || "", sehir: fields.sehir || "",
      bolge: fields.bolge || "", arac: fields.arac || ""
    };
    var r = await client.from("listings").insert(row).select().maybeSingle();
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
    var r = await client.from("listings").select("*, owner:owner_id(ad)").eq("durum", "acik").order("created_at", { ascending: false });
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
      .select("*, listing:listing_id(baslik,sehir,bolge,durum)")
      .eq("applicant_user", u.id).order("created_at", { ascending: false });
    if (r.error) { console.warn("myApplications:", r.error); return []; }
    return (r.data || []).map(function (a) {
      return { id: a.id, durum: a.durum, mesaj: a.mesaj, tarih: (a.created_at || "").slice(0, 10),
        baslik: (a.listing && a.listing.baslik) || "", ilanSehir: (a.listing && a.listing.sehir) || "", ilanDurum: a.listing && a.listing.durum };
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

  /* ---------- İHALE & TEKLİF ---------- */
  function tenderFromDb(t) {
    return {
      id: t.id, owner_id: t.owner_id, role: t.role, baslik: t.baslik, aciklama: t.aciklama,
      sehir: t.sehir, bolge: t.bolge, adet: t.adet || 0, sure: t.sure, butce: t.butce, durum: t.durum,
      tarih: (t.created_at || "").slice(0, 10), sahip: (t.owner && t.owner.ad) || ""
    };
  }
  async function createTender(fields) {
    var u = await getUser(); if (!u) throw new Error("oturum yok");
    var me = await myProfile(); if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var r = await client.from("tenders").insert({
      owner_id: me.id, owner_user: u.id, role: me.role,
      baslik: fields.baslik, aciklama: fields.aciklama || "", sehir: fields.sehir || "", bolge: fields.bolge || "",
      adet: parseInt(fields.adet, 10) || 0, sure: fields.sure || "", butce: fields.butce || ""
    }).select().maybeSingle();
    if (r.error) throw r.error;
    return tenderFromDb(r.data);
  }
  async function myTenders() {
    var u = await getUser(); if (!u) return [];
    var r = await client.from("tenders").select("*").eq("owner_user", u.id).order("created_at", { ascending: false });
    if (r.error) { console.warn("myTenders:", r.error); return []; }
    return (r.data || []).map(tenderFromDb);
  }
  async function openTenders() {
    var r = await client.from("tenders").select("*, owner:owner_id(ad)").eq("durum", "acik").order("created_at", { ascending: false });
    if (r.error) { console.warn("openTenders:", r.error); return []; }
    return (r.data || []).map(tenderFromDb);
  }
  async function updateTenderStatus(id, durum) { return client.from("tenders").update({ durum: durum }).eq("id", id); }
  async function deleteTender(id) { return client.from("tenders").delete().eq("id", id); }
  async function submitBid(tenderId, tutar, mesaj) {
    var u = await getUser(); if (!u) throw new Error("oturum yok");
    var me = await myProfile(); if (!me || !me.id) throw new Error("Önce profilini oluştur.");
    var r = await client.from("bids").insert({
      tender_id: tenderId, bidder_id: me.id, bidder_user: u.id, tutar: tutar || "", mesaj: mesaj || ""
    }).select().maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  }
  async function myBids() {
    var u = await getUser(); if (!u) return [];
    var r = await client.from("bids").select("*, tender:tender_id(baslik,sehir,durum)").eq("bidder_user", u.id).order("created_at", { ascending: false });
    if (r.error) { console.warn("myBids:", r.error); return []; }
    return (r.data || []).map(function (b) {
      return { id: b.id, durum: b.durum, tutar: b.tutar, mesaj: b.mesaj, tarih: (b.created_at || "").slice(0, 10),
        baslik: (b.tender && b.tender.baslik) || "", ihaleSehir: (b.tender && b.tender.sehir) || "" };
    });
  }
  async function bidTenderIds() {
    var u = await getUser(); if (!u) return [];
    var r = await client.from("bids").select("tender_id").eq("bidder_user", u.id);
    return (r.data || []).map(function (x) { return x.tender_id; });
  }
  async function tenderBids(tenderId) {
    var r = await client.from("bids").select("*, bidder:bidder_id(id,ad,puan,sehir)").eq("tender_id", tenderId).order("created_at", { ascending: false });
    if (r.error) { console.warn("tenderBids:", r.error); return []; }
    return (r.data || []).map(function (b) {
      return { id: b.id, durum: b.durum, tutar: b.tutar, mesaj: b.mesaj, tarih: (b.created_at || "").slice(0, 10),
        bidderId: b.bidder && b.bidder.id, ad: (b.bidder && b.bidder.ad) || "Firma", puan: (b.bidder && Number(b.bidder.puan)) || 0, sehir: b.bidder && b.bidder.sehir };
    });
  }
  async function updateBid(id, durum) { return client.from("bids").update({ durum: durum }).eq("id", id); }

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

  window.SB = {
    isOn: isOn,
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
    createListing: createListing, myListings: myListings, openListings: openListings,
    updateListingStatus: updateListingStatus, deleteListing: deleteListing,
    applyToListing: applyToListing, myApplications: myApplications, appliedListingIds: appliedListingIds,
    listingApplications: listingApplications, updateApplication: updateApplication,
    createTender: createTender, myTenders: myTenders, openTenders: openTenders,
    updateTenderStatus: updateTenderStatus, deleteTender: deleteTender,
    submitBid: submitBid, myBids: myBids, bidTenderIds: bidTenderIds,
    tenderBids: tenderBids, updateBid: updateBid,
    submitKyc: submitKyc, myKycSubmission: myKycSubmission,
    amIAdmin: amIAdmin, listPendingKyc: listPendingKyc, reviewKyc: reviewKyc
  };
})();
