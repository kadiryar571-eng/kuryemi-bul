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
      id: p.id, user_id: p.user_id, role: p.role,
      ad: p.ad, sehir: p.sehir, telefon: p.telefon || "", email: p.email || "", aciklama: p.aciklama,
      lat: p.lat, lng: p.lng,
      arac: p.arac, bolgeler: p.bolgeler || [], deneyim: p.deneyim || 0,
      seviye: p.seviye || "standart", puan: Number(p.puan) || 0, tamamlanan: p.tamamlanan || 0,
      sertifikalar: p.sertifikalar || [], calistigi: p.calistigi || [], referanslar: [],
      bolge: (p.bolgeler && p.bolgeler[0]) || "", tur: p.tur, acikIlan: p.acik_ilan || 0, ihtiyac: p.ihtiyac,
      kapasite: p.kapasite || 0, hizmetler: p.hizmetler || []
    };
  }

  /* ---------- AUTH ---------- */
  async function signUp(email, password, role, ad) {
    return client.auth.signUp({
      email: email, password: password,
      options: { data: { role: role, ad: ad }, emailRedirectTo: location.origin + "/profil-duzenle.html" }
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
  // Bir profilin iletişim bilgisi (RLS: yalnız sahip veya KABUL edilmiş teklifin karşı tarafı görür)
  async function contactOf(profileId) {
    if (!profileId) return null;
    var r = await client.from("profile_contacts").select("telefon,email").eq("profile_id", profileId).maybeSingle();
    return (r && r.data) || null;
  }

  /* ---------- HAVUZ / PROFİL ---------- */
  async function pool(role) {
    var r = await client.from("profiles").select("*").eq("role", role).order("puan", { ascending: false });
    if (r.error) throw r.error;
    return (r.data || []).map(fromDb);
  }
  async function profileById(id) {
    var r = await client.from("profiles").select("*").eq("id", id).maybeSingle();
    if (r.error) throw r.error;
    return r.data ? fromDb(r.data) : null;
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

  window.SB = {
    isOn: isOn,
    signUp: signUp, signIn: signIn, signOut: signOut, getUser: getUser, onAuthChange: onAuthChange,
    resetPassword: resetPassword, updatePassword: updatePassword,
    myProfile: myProfile, updateMyProfile: updateMyProfile, contactOf: contactOf,
    pool: pool, profileById: profileById,
    sendOffer: sendOffer, myOffers: myOffers, updateOffer: updateOffer
  };
})();
