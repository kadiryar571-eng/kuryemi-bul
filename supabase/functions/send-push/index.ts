import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")  || "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = "mailto:info@kuryemibul.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const { user_id, title, body: msgBody, url, tag } = body;

    if (!user_id || !VAPID_PUBLIC) {
      return new Response(JSON.stringify({ ok: false, reason: "missing config" }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("user_id", user_id);

    if (!subs || !subs.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const payload = JSON.stringify({ title: title || "KuryemiBul", body: msgBody || "", url: url || "/", tag: tag || "kb" });
    let sent = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ ok: false }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
