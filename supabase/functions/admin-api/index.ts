// ============================================================================
// admin-api — yönetici paneli sunucu tarafı
//
// Panel (kb-yonetim.pages.dev) hiçbir ayrıcalıklı anahtar tutmaz. Tüm yetkili
// işlemler buradan geçer. `service_role` anahtarı YALNIZ bu fonksiyonun
// ortamında bulunur; tarayıcıya asla inmez.
//
// HER İSTEKTE, SIRAYLA:
//   1. Origin kontrolü        → yalnız panelin adresi
//   2. Kimlik  (authentication) → Bearer JWT gerçek mi (userClient.getUser)
//   3. Yetki   (authorization)  → admins tablosunda var mı (svc ile, RLS'siz)
//   4. İşlem
//   5. Denetim kaydı          → admin_audit_log
//
// ─── İKİ İSTEMCİ, NEDEN? ───────────────────────────────────────────────────
// Veritabanındaki koruyucu trigger'lar ve RPC'ler `auth.uid()`'e bakıyor ve
// BİRBİRİNE TERS davranıyorlar:
//
//   • review_kyc() / list_pending_kyc() / list_kyc_history()
//       `if not is_admin(auth.uid()) then raise 'yetki yok'`
//       → service_role ile çağrılırsa auth.uid() NULL olur ve HATA VERİR.
//       → yöneticinin KENDİ JWT'si ile çağrılmalı.  (userClient)
//
//   • guard_dogrulama (migration-21)
//       auth.uid() NULL ise değişikliği sessizce geri alır.
//       → dogrulama alanı da yöneticinin JWT'si ile değişmeli. (userClient)
//
//   • guard_profile_metrics (migration-20)
//       auth.uid() NULL ise SERBEST BIRAKIR.
//       → puan/seviye/tamamlanan yalnız service_role ile değişebilir. (svc)
//
//   • auth.users işlemleri, özel storage kovaları, denetim günlüğü,
//     RLS'in engellediği çapraz sorgular → yalnız service_role. (svc)
//
// Bu asimetri kasıtlıdır: kimlik doğrulama kararı her zaman gerçek bir insan
// oturumuna bağlı kalır, metrik düzeltmesi ise otomasyona açıktır.
//
// GEREKLİ SECRET'LAR (Supabase → Edge Functions → Secrets):
//   ADMIN_PANEL_ORIGIN — panelin tam adresi, örn. https://kb-yonetim.pages.dev
//                        (birden fazlaysa virgülle ayır)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY ortamda hazırdır.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/* ── İzinli origin'ler ──────────────────────────────────────────────────────
   send-push `*` kullanır ama o trigger'dan çağrılır, tarayıcıdan değil.
   Burada `*` KULLANILMAZ: bu uç nokta tarayıcıdan çağrılıyor ve yıkıcı
   işlemler yapıyor. Tanımadığımız bir origin'e CORS başlığı dönmeyiz. */
const ALLOWED_ORIGINS = (Deno.env.get("ADMIN_PANEL_ORIGIN") ?? "https://kb-yonetim.pages.dev")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

/* ── Profilde yöneticinin değiştirebileceği alanlar ─────────────────────────
   Beyaz liste; kara liste değil. Yeni bir kolon eklendiğinde varsayılan
   davranış "değiştirilemez" olsun diye. `id`, `user_id`, `created_at` ve
   `dogrulama` bilerek DIŞARIDA: ilk üçü kimlik, dogrulama ise yalnız KYC
   akışından (kyc.decide) değişmeli ki bildirim trigger'ı da tetiklensin. */
const EDITABLE_PROFILE_FIELDS = [
  "role", "ad", "sehir", "aciklama", "lat", "lng",
  "arac", "bolgeler", "deneyim", "sertifikalar", "calistigi",
  "tur", "acik_ilan", "ihtiyac",
  "kapasite", "hizmetler", "adres", "belgeler", "fotograflar",
  "yayinda",
  // metrikler — guard_profile_metrics'i service_role baypas eder
  "puan", "degerlendirme", "tamamlanan", "seviye",
];

function pickEditable(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of EDITABLE_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k];
  }
  return out;
}

/* ── Denetim günlüğü ────────────────────────────────────────────────────────
   Her DEĞİŞTİREN işlemden sonra çağrılır. Günlüğe yazamamak işlemi geri
   almaz (işlem zaten oldu) ama sessizce de geçilmez — sunucu loguna düşer. */
async function audit(
  svc: SupabaseClient,
  entry: {
    admin_user_id: string;
    admin_email?: string | null;
    action: string;
    target_table?: string | null;
    target_id?: string | null;
    payload?: unknown;
    result?: string;
    error_message?: string | null;
    ip?: string | null;
  },
) {
  try {
    await svc.from("admin_audit_log").insert({
      admin_user_id: entry.admin_user_id,
      admin_email: entry.admin_email ?? null,
      action: entry.action,
      target_table: entry.target_table ?? null,
      target_id: entry.target_id ?? null,
      payload: entry.payload ?? null,
      result: entry.result ?? "ok",
      error_message: entry.error_message ?? null,
      ip: entry.ip ?? null,
    });
  } catch (e) {
    console.error("DENETİM GÜNLÜĞÜ YAZILAMADI", entry.action, e);
  }
}

/* Değiştiren eylemler — bunlar günlüğe yazılır, salt okunanlar yazılmaz.
   (Her okumayı günlüğe yazmak günlüğü kullanılamaz hale getirirdi.) */
const MUTATING = new Set([
  "users.update", "users.setRole", "users.setYayinda",
  "users.suspend", "users.unsuspend", "users.delete", "users.resetPassword",
  "kyc.decide", "kyc.doc",
  "listings.close", "listings.delete",
]);
// kyc.doc okuma ama kimlik belgesi açıyor — KVKK gereği günlüğe yazılır.

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "yalnız POST" }, 405, origin);
  }
  if (!SERVICE_KEY || !SUPABASE_URL || !ANON_KEY) {
    console.error("Ortam değişkenleri eksik");
    return json({ error: "sunucu yapılandırması eksik" }, 500, origin);
  }
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: "origin izinli değil" }, 403, origin);
  }

  /* ── 1. Kimlik ───────────────────────────────────────────────────────── */
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return json({ error: "oturum yok" }, 401, origin);

  // Yöneticinin kendi yetkisiyle çalışan istemci — auth.uid() dolu olur.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json({ error: "geçersiz oturum" }, 401, origin);

  /* ── 2. Yetki ────────────────────────────────────────────────────────── */
  // service_role ile: `admins` tablosunda artık hiç policy yok (migration-28),
  // yani RLS'i baypas edebilen tek yol bu.
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: adminRow, error: adminErr } = await svc
    .from("admins").select("user_id").eq("user_id", user.id).maybeSingle();

  if (adminErr) {
    console.error("admins sorgusu başarısız", adminErr);
    return json({ error: "yetki doğrulanamadı" }, 500, origin);
  }
  if (!adminRow) {
    // Yetkisiz deneme de kayda geçer — panel adresini bilen ama yetkisi
    // olmayan biri denediyse görmek isteriz.
    await audit(svc, {
      admin_user_id: user.id, admin_email: user.email, action: "auth.denied",
      result: "error", error_message: "admins tablosunda yok",
      ip: req.headers.get("cf-connecting-ip"),
    });
    return json({ error: "yetkiniz yok" }, 403, origin);
  }

  /* ── 3. Gövde ────────────────────────────────────────────────────────── */
  let action = "";
  let payload: Record<string, any> = {};
  try {
    const body = await req.json();
    action = String(body?.action ?? "");
    payload = body?.payload ?? {};
  } catch {
    return json({ error: "gövde okunamadı" }, 400, origin);
  }
  if (!action) return json({ error: "action gerekli" }, 400, origin);

  const ip = req.headers.get("cf-connecting-ip");
  const ctx = { svc, userClient, user, payload };

  try {
    const result = await dispatch(action, ctx);

    if (MUTATING.has(action)) {
      await audit(svc, {
        admin_user_id: user.id,
        admin_email: user.email,
        action,
        target_table: result.targetTable ?? null,
        target_id: result.targetId ?? null,
        payload: result.auditPayload ?? payload,
        ip,
      });
    }
    return json({ ok: true, data: result.data }, 200, origin);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (MUTATING.has(action)) {
      await audit(svc, {
        admin_user_id: user.id, admin_email: user.email, action,
        payload, result: "error", error_message: message, ip,
      });
    }
    console.error("admin-api hata", action, message);
    return json({ error: message }, 400, origin);
  }
});

/* ═══════════════════════════════════════════════════════════════════════════
   EYLEMLER
   ═══════════════════════════════════════════════════════════════════════════ */

interface Ctx {
  svc: SupabaseClient;
  userClient: SupabaseClient;
  user: { id: string; email?: string };
  payload: Record<string, any>;
}

interface ActionResult {
  data: unknown;
  targetTable?: string;
  targetId?: string;
  auditPayload?: unknown;
}

function unwrap<T>(res: { data: T; error: any }): T {
  if (res.error) throw new Error(res.error.message ?? String(res.error));
  return res.data;
}

async function dispatch(action: string, ctx: Ctx): Promise<ActionResult> {
  const { svc, userClient, payload } = ctx;

  switch (action) {
    /* ── PANO ─────────────────────────────────────────────────────────── */
    case "stats": {
      // platform_stats() ve online_counts_by_role() zaten var — yeniden yazma.
      const [stats, online, pendingKyc, openListings] = await Promise.all([
        svc.rpc("platform_stats"),
        svc.rpc("online_counts_by_role"),
        svc.from("kyc_submissions").select("profile_id", { count: "exact", head: true }).eq("durum", "pending"),
        svc.from("listings").select("id", { count: "exact", head: true }).eq("durum", "acik"),
      ]);
      return {
        data: {
          platform: stats.error ? null : stats.data,
          online: online.error ? null : online.data,
          bekleyenKyc: pendingKyc.count ?? 0,
          acikIlan: openListings.count ?? 0,
        },
      };
    }

    /* ── KULLANICILAR ─────────────────────────────────────────────────── */
    case "users.list": {
      const { q, role, yayinda, limit = 50, offset = 0 } = payload;
      let query = svc
        .from("profiles")
        .select("id,user_id,role,ad,sehir,dogrulama,yayinda,puan,degerlendirme,tamamlanan,seviye,created_at, profile_contacts(telefon,email)",
                { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (role) query = query.eq("role", role);
      if (yayinda === true || yayinda === false) query = query.eq("yayinda", yayinda);
      if (q) {
        // .or() ham PostgREST filtre sözdizimi alır — virgül, parantez ve yıldız
        // ifadeyi böler. Yetki artışı değil (çağıran zaten yönetici) ama sorguyu
        // bozar ve anlaşılmaz hata verir. Ayırıcı karakterleri at.
        const temiz = String(q).replace(/[,()*\\]/g, "").trim();
        if (temiz) query = query.or(`ad.ilike.%${temiz}%,sehir.ilike.%${temiz}%`);
      }

      const res = await query;
      if (res.error) throw new Error(res.error.message);
      return { data: { rows: res.data, total: res.count ?? 0 } };
    }

    case "users.get": {
      const { profile_id } = payload;
      if (!profile_id) throw new Error("profile_id gerekli");

      const profile = unwrap(
        await svc.from("profiles").select("*").eq("id", profile_id).maybeSingle(),
      ) as any;
      if (!profile) throw new Error("profil bulunamadı");

      const [contacts, kyc, listings, authUser] = await Promise.all([
        svc.from("profile_contacts").select("telefon,email,updated_at").eq("profile_id", profile_id).maybeSingle(),
        svc.from("kyc_submissions").select("*").eq("profile_id", profile_id).maybeSingle(),
        svc.from("listings").select("id,baslik,durum,created_at").eq("owner_id", profile_id).order("created_at", { ascending: false }).limit(20),
        profile.user_id ? svc.auth.admin.getUserById(profile.user_id) : Promise.resolve({ data: { user: null }, error: null }),
      ]);

      const au = (authUser as any)?.data?.user ?? null;
      return {
        data: {
          profile,
          contacts: contacts.data ?? null,
          kyc: kyc.data ?? null,
          listings: listings.data ?? [],
          auth: au
            ? {
                email: au.email,
                email_confirmed_at: au.email_confirmed_at,
                last_sign_in_at: au.last_sign_in_at,
                created_at: au.created_at,
                banned_until: (au as any).banned_until ?? null,
                providers: au.app_metadata?.providers ?? [],
              }
            : null,
        },
      };
    }

    case "users.update": {
      const { profile_id, patch } = payload;
      if (!profile_id) throw new Error("profile_id gerekli");
      const clean = pickEditable(patch ?? {});
      if (Object.keys(clean).length === 0) throw new Error("değiştirilebilir alan yok");

      // service_role ile: guard_profile_metrics auth.uid() NULL olduğunda
      // serbest bırakır, yani puan/seviye/tamamlanan buradan düzeltilebilir.
      const data = unwrap(
        await svc.from("profiles").update(clean).eq("id", profile_id).select().maybeSingle(),
      );
      return { data, targetTable: "profiles", targetId: profile_id, auditPayload: clean };
    }

    case "users.setRole": {
      const { profile_id, role } = payload;
      if (!["kurye", "isletme", "firma"].includes(role)) throw new Error("geçersiz rol");
      const data = unwrap(
        await svc.from("profiles").update({ role }).eq("id", profile_id).select().maybeSingle(),
      );
      return { data, targetTable: "profiles", targetId: profile_id, auditPayload: { role } };
    }

    case "users.setYayinda": {
      const { profile_id, yayinda } = payload;
      const data = unwrap(
        await svc.from("profiles").update({ yayinda: !!yayinda }).eq("id", profile_id).select().maybeSingle(),
      );
      return { data, targetTable: "profiles", targetId: profile_id, auditPayload: { yayinda: !!yayinda } };
    }

    case "users.suspend": {
      const { user_id, sure = "876000h" } = payload;   // varsayılan ~100 yıl
      if (!user_id) throw new Error("user_id gerekli");
      const res = await svc.auth.admin.updateUserById(user_id, { ban_duration: sure });
      if (res.error) throw new Error(res.error.message);
      return { data: { ok: true }, targetTable: "auth.users", targetId: user_id, auditPayload: { sure } };
    }

    case "users.unsuspend": {
      const { user_id } = payload;
      if (!user_id) throw new Error("user_id gerekli");
      const res = await svc.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      if (res.error) throw new Error(res.error.message);
      return { data: { ok: true }, targetTable: "auth.users", targetId: user_id };
    }

    case "users.delete": {
      const { user_id, onay } = payload;
      if (!user_id) throw new Error("user_id gerekli");
      // Çift onay: panelde yanlış satıra tıklamak hesabı silmesin.
      if (onay !== "SIL") throw new Error("onay alanı 'SIL' olmalı");
      // profiles ve bağlı her şey `on delete cascade` ile gider.
      const res = await svc.auth.admin.deleteUser(user_id);
      if (res.error) throw new Error(res.error.message);
      return { data: { ok: true }, targetTable: "auth.users", targetId: user_id };
    }

    case "users.resetPassword": {
      const { email } = payload;
      if (!email) throw new Error("email gerekli");
      const res = await svc.auth.admin.generateLink({ type: "recovery", email });
      if (res.error) throw new Error(res.error.message);
      return {
        data: { link: res.data?.properties?.action_link ?? null },
        targetTable: "auth.users",
        targetId: email,
        auditPayload: { email },   // linkin kendisi günlüğe YAZILMAZ
      };
    }

    /* ── KYC ──────────────────────────────────────────────────────────── */
    // Bu üçü userClient ile çağrılır: RPC'ler is_admin(auth.uid()) bekliyor.
    case "kyc.pending":
      return { data: unwrap(await userClient.rpc("list_pending_kyc")) };

    case "kyc.history":
      return { data: unwrap(await userClient.rpc("list_kyc_history")) };

    case "kyc.decide": {
      const { profile_id, karar } = payload;
      if (!["verified", "rejected"].includes(karar)) throw new Error("karar 'verified' veya 'rejected' olmalı");
      // review_kyc() hem profiles.dogrulama hem kyc_submissions.durum yazar;
      // kb_dogrulama_notify trigger'ı kullanıcıya bildirim + e-posta gönderir.
      // guard_dogrulama auth.uid() istediği için userClient ŞART.
      unwrap(await userClient.rpc("review_kyc", { p_profile_id: profile_id, p_decision: karar }));
      return { data: { ok: true }, targetTable: "profiles", targetId: profile_id, auditPayload: { karar } };
    }

    case "kyc.doc": {
      // Kimlik belgesi görüntüleme. Özel kova → kısa ömürlü imzalı URL.
      // Okuma işlemi ama KVKK gereği denetime yazılır (MUTATING listesinde).
      const { user_id } = payload;
      if (!user_id) throw new Error("user_id gerekli");
      const list = await svc.storage.from("kyc_documents").list(user_id, {
        limit: 20, sortBy: { column: "created_at", order: "desc" },
      });
      if (list.error) throw new Error(list.error.message);
      const files = list.data ?? [];
      const signed = await Promise.all(
        files.map(async (f) => {
          const s = await svc.storage.from("kyc_documents").createSignedUrl(`${user_id}/${f.name}`, 120);
          return { name: f.name, created_at: (f as any).created_at, url: s.data?.signedUrl ?? null };
        }),
      );
      return { data: signed, targetTable: "storage.kyc_documents", targetId: user_id };
    }

    /* ── İLANLAR ──────────────────────────────────────────────────────── */
    case "listings.list": {
      const { q, durum, limit = 50, offset = 0 } = payload;
      let query = svc
        .from("listings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (durum) query = query.eq("durum", durum);
      if (q) query = query.ilike("baslik", `%${q}%`);
      const res = await query;
      if (res.error) throw new Error(res.error.message);
      return { data: { rows: res.data, total: res.count ?? 0 } };
    }

    case "listings.close": {
      const { id } = payload;
      if (!id) throw new Error("id gerekli");
      const data = unwrap(
        await svc.from("listings").update({ durum: "kapali" }).eq("id", id).select().maybeSingle(),
      );
      return { data, targetTable: "listings", targetId: id };
    }

    case "listings.delete": {
      const { id, onay } = payload;
      if (!id) throw new Error("id gerekli");
      if (onay !== "SIL") throw new Error("onay alanı 'SIL' olmalı");
      unwrap(await svc.from("listings").delete().eq("id", id).select());
      return { data: { ok: true }, targetTable: "listings", targetId: id };
    }

    /* ── DENETİM GÜNLÜĞÜ ──────────────────────────────────────────────── */
    case "audit.list": {
      const { limit = 100, offset = 0, action: filterAction } = payload;
      let query = svc
        .from("admin_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);
      if (filterAction) query = query.eq("action", filterAction);
      const res = await query;
      if (res.error) throw new Error(res.error.message);
      return { data: { rows: res.data, total: res.count ?? 0 } };
    }

    default:
      throw new Error(`bilinmeyen eylem: ${action}`);
  }
}
