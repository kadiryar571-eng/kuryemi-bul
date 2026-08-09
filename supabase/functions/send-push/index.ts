// ============================================================================
// send-push — tek bildirim, iki kanal
//
// `public.notifications` tablosuna satır eklendiğinde trigger bu fonksiyonu
// çağırır (bkz. migration-23-push-fix.sql). Fonksiyon aynı bildirimi
// kullanıcının TÜM cihazlarına dağıtır:
//
//   1. Web Push (VAPID)  → public.push_subscriptions  → tarayıcı / PWA
//   2. FCM HTTP v1       → public.device_tokens       → Android APK
//
// GEÇMİŞ — bu fonksiyon eskiden yalnız 1. kanalı yapıyordu. Android uygulaması
// FCM token'ını device_tokens tablosuna yazıyordu ama o tabloyu okuyan hiçbir
// şey yoktu; uygulama kapalıyken bildirim ASLA gelmiyordu. İki yarım sistem
// birbirine bağlı değildi.
//
// GEREKLİ SECRET'LAR (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY          — web push (zaten var)
//   VAPID_PRIVATE_KEY         — web push (zaten var)
//   FIREBASE_SERVICE_ACCOUNT  — Firebase servis hesabı JSON'u (base64 veya düz)
//
// FIREBASE_SERVICE_ACCOUNT olmadan fonksiyon çökmez; yalnız FCM kanalı devre
// dışı kalır ve yanıtta `fcm.reason` alanı sebebi söyler. Böylece web push
// tarafı tek başına da çalışmaya devam eder.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

/* ── Web Push (VAPID) kurulumu ──────────────────────────────────────────── */

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = "mailto:info@kuryemibul.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

/* ── FCM HTTP v1 ────────────────────────────────────────────────────────────
   Eski FCM "legacy server key" API'si kapatıldı; v1 OAuth2 erişim jetonu
   istiyor. Jeton, servis hesabının özel anahtarıyla imzalanmış bir JWT'nin
   Google'ın token uç noktasıyla takas edilmesiyle alınır. Deno'da harici
   kütüphane gerekmez — Web Crypto RS256 imzalayabiliyor.
   ────────────────────────────────────────────────────────────────────────── */

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

/** FIREBASE_SERVICE_ACCOUNT hem base64 hem düz JSON kabul eder. */
function readServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!raw) return null;

  let text = raw.trim();
  // Düz JSON değilse base64 varsay.
  if (!text.startsWith("{")) {
    try {
      text = new TextDecoder().decode(
        Uint8Array.from(atob(text.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
      );
    } catch {
      console.error("FIREBASE_SERVICE_ACCOUNT base64 çözülemedi");
      return null;
    }
  }

  try {
    const sa = JSON.parse(text) as ServiceAccount;
    if (!sa.client_email || !sa.private_key || !sa.project_id) {
      console.error("FIREBASE_SERVICE_ACCOUNT eksik alan içeriyor");
      return null;
    }
    return sa;
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT geçerli JSON değil");
    return null;
  }
}

const SERVICE_ACCOUNT = readServiceAccount();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** PEM (PKCS#8) → ArrayBuffer */
function pemToBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

// Erişim jetonu 1 saat geçerli. Fonksiyon örneği sıcak kaldığı sürece
// yeniden kullanılır; her bildirimde Google'a gidip jeton istemek hem
// yavaş hem gereksiz.
let _tokenCache: { value: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache && _tokenCache.expiresAt > now + 60) return _tokenCache.value;

  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(enc.encode(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })));
  const unsigned = `${header}.${claim}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned));
  const jwt = `${unsigned}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error("FCM jeton alınamadı: " + JSON.stringify(json));
  }

  _tokenCache = { value: json.access_token, expiresAt: now + (json.expires_in || 3600) };
  return json.access_token;
}

/* ── Ana akış ───────────────────────────────────────────────────────────── */

interface PushBody {
  user_id?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // GET → istemciye VAPID *public* anahtarını verir.
  //
  // Bu anahtar tasarımı gereği geneldir (tarayıcıya zaten gömülür), ama
  // istemci JS'ine elle yapıştırmak yerine buradan okutuyoruz: tek kaynak
  // kalıyor, anahtar yenilendiğinde site kodunu değiştirmek gerekmiyor ve
  // "yanlış yapıştırılmış anahtar" diye bir hata sınıfı hiç doğmuyor.
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ vapidPublicKey: VAPID_PUBLIC, fcm: !!SERVICE_ACCOUNT }),
      { headers: JSON_HEADERS },
    );
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: CORS });
  }

  try {
    const payload = await req.json() as PushBody;
    const userId = payload.user_id;

    if (!userId) {
      return new Response(
        JSON.stringify({ ok: false, reason: "user_id zorunlu" }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const title = payload.title || "KuryemiBul";
    const message = payload.body || "";
    const url = payload.url || "/";
    const tag = payload.tag || "kb";

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // İki kanalı paralel çalıştır — biri yavaşsa diğerini bekletmesin.
    const [web, fcm] = await Promise.all([
      sendWebPush(sb, userId, { title, body: message, url, tag }),
      sendFcm(sb, userId, { title, body: message, url, tag }),
    ]);

    return new Response(
      JSON.stringify({ ok: true, sent: web.sent + fcm.sent, web, fcm }),
      { headers: JSON_HEADERS },
    );
  } catch (e) {
    console.error("send-push hata:", e);
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
});

/* ── Kanal 1: Web Push ──────────────────────────────────────────────────── */

interface Msg { title: string; body: string; url: string; tag: string }
interface Result { sent: number; failed: number; removed: number; reason?: string }

// deno-lint-ignore no-explicit-any
async function sendWebPush(sb: any, userId: string, msg: Msg): Promise<Result> {
  const out: Result = { sent: 0, failed: 0, removed: 0 };

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    out.reason = "VAPID anahtarları tanımlı değil";
    return out;
  }

  const { data: subs, error } = await sb
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  if (error) { out.reason = error.message; return out; }
  if (!subs || !subs.length) { out.reason = "abonelik yok"; return out; }

  const data = JSON.stringify({
    title: msg.title, body: msg.body, url: msg.url, tag: msg.tag,
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        data,
      );
      out.sent++;
    } catch (err: unknown) {
      out.failed++;
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410 = abonelik kalıcı olarak ölü (tarayıcı verisi silinmiş,
      // uygulama kaldırılmış). Temizlenmezse tablo çöp biriktirir.
      if (status === 410 || status === 404) {
        await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        out.removed++;
      } else {
        console.error("web push hatası:", status, String(err));
      }
    }
  }

  return out;
}

/* ── Kanal 2: FCM HTTP v1 (Android) ─────────────────────────────────────── */

// deno-lint-ignore no-explicit-any
async function sendFcm(sb: any, userId: string, msg: Msg): Promise<Result> {
  const out: Result = { sent: 0, failed: 0, removed: 0 };

  if (!SERVICE_ACCOUNT) {
    out.reason = "FIREBASE_SERVICE_ACCOUNT secret'ı yok veya geçersiz";
    return out;
  }

  const { data: rows, error } = await sb
    .from("device_tokens")
    .select("token")
    .eq("user_id", userId);

  if (error) { out.reason = error.message; return out; }
  if (!rows || !rows.length) { out.reason = "kayıtlı cihaz yok"; return out; }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(SERVICE_ACCOUNT);
  } catch (e) {
    out.reason = String(e);
    return out;
  }

  const endpoint =
    `https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/messages:send`;

  for (const row of rows) {
    // `notification` bloğu uygulama arka plandayken sistem tepsisinde
    // bildirimi FCM SDK'sının kendisine çizdirir. `data` bloğu ise
    // ön plandayken pushNotificationReceived'a düşer.
    // Yönlendirme anahtarını iki adla da yolluyoruz: app.js `route`,
    // service worker `url` okuyor.
    const fcmMessage = {
      message: {
        token: row.token,
        notification: { title: msg.title, body: msg.body },
        data: { route: msg.url, url: msg.url, tag: msg.tag },
        android: {
          priority: "HIGH",
          notification: { tag: msg.tag, default_sound: true },
        },
      },
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fcmMessage),
      });

      if (res.ok) { out.sent++; continue; }

      out.failed++;
      const errJson = await res.json().catch(() => ({}));
      const status = errJson?.error?.details?.[0]?.errorCode ||
        errJson?.error?.status || String(res.status);

      // UNREGISTERED = uygulama kaldırılmış / token döndürülmüş.
      // INVALID_ARGUMENT = token bozuk. İkisi de kalıcı, satır silinmeli.
      if (status === "UNREGISTERED" || status === "INVALID_ARGUMENT" || res.status === 404) {
        await sb.from("device_tokens").delete().eq("token", row.token);
        out.removed++;
      } else {
        console.error("FCM hatası:", res.status, JSON.stringify(errJson));
      }
    } catch (e) {
      out.failed++;
      console.error("FCM istek hatası:", String(e));
    }
  }

  return out;
}
