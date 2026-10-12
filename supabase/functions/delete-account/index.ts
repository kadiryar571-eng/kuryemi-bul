// ============================================================================
// delete-account — kullanıcının KENDİ hesabını tamamen siler
//
// Çağıranlar:
//   • www/ SPA  → Ayarlar → "Hesabımı Kalıcı Olarak Sil"   (origin https://localhost)
//   • docs/     → hesap-sil.html  (Google Play'in istediği uygulama DIŞI
//                 silme yolu; Data Safety formuna bu adres yazılır)
//
// NEDEN RPC DEĞİL:
// Eski delete_own_account() RPC'si yalnız auth.users satırını siliyordu.
// Tablolar cascade ile temizleniyordu ama Storage dosyaları (kimlik
// belgeleri dahil) kalıyordu ve SQL'den silinemiyor. Dosyaları Storage
// API ile silmek service_role ister → sunucu tarafı. Ayrıntı:
// _shared/purge-user-files.ts
//
// SIRA (önemli):
//   1. JWT doğrula → kimin hesabı?
//   2. Dosyaları sil          (başarısızsa DUR; hesap yerinde kalır,
//                              kullanıcı tekrar deneyebilir)
//   3. auth.users satırını sil (tablolar cascade ile gider)
// Ters sıra yarım silme bırakırdı: hesap yok ama dosyalar duruyor ve artık
// kimse "tekrar dene" diyemiyor.
//
// Kullanıcı kimliği YALNIZ JWT'den alınır; gövdede kimlik kabul edilmez.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { purgeUserFiles } from "../_shared/purge-user-files.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/* Capacitor WebView'in origin'i androidScheme "https" ile https://localhost.
   CORS burada güvenlik sınırı DEĞİL (yetki JWT'den gelir); yalnız tanımadığımız
   sitelerin tarayıcıdan bu ucu çağırmasını gereksiz yere kolaylaştırmıyoruz. */
const ALLOWED_ORIGINS = [
  "https://kuryemibul.com",
  "https://www.kuryemibul.com",
  "https://localhost",
];

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

serve(async (req) => {
  const origin = req.headers.get("Origin");

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

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json({ error: "geçersiz oturum" }, 401, origin);

  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /* ── 2. Dosyalar ─────────────────────────────────────────────────────── */
  let files: Record<string, number>;
  try {
    files = await purgeUserFiles(svc, user.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("delete-account: dosyalar silinemedi", user.id, message);
    return json({ error: "dosyalar silinemedi, hesap silinmedi — tekrar deneyin" }, 500, origin);
  }

  /* ── 3. Hesap ────────────────────────────────────────────────────────── */
  const { error: delErr } = await svc.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("delete-account: hesap silinemedi", user.id, delErr.message);
    return json({ error: "hesap silinemedi — tekrar deneyin" }, 500, origin);
  }

  // Kimlik bilgisi loglanmaz; yalnız sayılar (denetim için yeterli).
  console.log("delete-account: silindi", JSON.stringify(files));
  return json({ ok: true, files }, 200, origin);
});
