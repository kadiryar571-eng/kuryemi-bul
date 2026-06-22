import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Supabase Database Webhook: conv_messages INSERT tetikler bu function'ı.
// Payload: { type: "INSERT", table: "conv_messages", record: { ... } }
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const payload = await req.json();
    const record = payload.record;

    // Yalnız gerçek kullanıcı mesajları için e-posta gönder (sistem mesajları değil)
    if (!record || record.message_type !== "text" || !record.sender_user) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Konuşma detaylarını al
    const { data: conv } = await supabase
      .from("conversations")
      .select("*, kurye:kurye_id(ad), employer:employer_id(ad)")
      .eq("id", record.conversation_id)
      .maybeSingle();

    if (!conv) {
      return new Response(JSON.stringify({ ok: false, reason: "conv not found" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Hangi tarafa bildirim gidecek?
    const isFromKurye = record.sender_user === conv.kurye_user;
    const notifyUserId = isFromKurye ? conv.employer_user : conv.kurye_user;
    const senderName   = isFromKurye
      ? (conv.kurye && conv.kurye.ad) || "Kurye"
      : (conv.employer && conv.employer.ad) || "İşletme";

    // Alıcının e-postasını al (profile_contacts tablosundan)
    const { data: contact } = await supabase
      .from("profile_contacts")
      .select("email")
      .eq("user_id", notifyUserId)
      .maybeSingle();

    const recipientEmail = contact && contact.email;
    if (!recipientEmail || !RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok: true, skipped: "no email or api key" }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Listing başlığı
    const { data: listing } = await supabase
      .from("listings")
      .select("baslik")
      .eq("id", conv.listing_id)
      .maybeSingle();

    const listingTitle = (listing && listing.baslik) || "İlan";
    const msgPreview   = (record.content || "").substring(0, 120);
    const convUrl      = `https://kuryemibul.com/www/index.html#/kurye/mesaj/${record.conversation_id}`;

    // Resend ile e-posta gönder
    const emailResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "KuryemiBul <bildirim@kuryemibul.com>",
        to: [recipientEmail],
        subject: "Yeni bir mesajınız var",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0C1120;color:#F0F4FF;padding:32px;border-radius:16px">
            <div style="font-size:1.3rem;font-weight:800;margin-bottom:8px">💬 Yeni mesaj</div>
            <div style="color:#B8C4D8;margin-bottom:20px;font-size:.9rem">
              <strong style="color:#F0F4FF">${senderName}</strong> sana mesaj gönderdi.
            </div>
            <div style="background:#151E30;border-radius:12px;padding:16px;margin-bottom:20px">
              <div style="font-size:.78rem;color:#5A7090;margin-bottom:6px">${listingTitle}</div>
              <div style="font-size:.9rem;color:#F0F4FF;line-height:1.5">"${msgPreview}${msgPreview.length === 120 ? "…" : ""}"</div>
            </div>
            <a href="${convUrl}"
               style="display:block;text-align:center;background:linear-gradient(135deg,#6C4DFF,#A855F7);color:#fff;text-decoration:none;padding:14px;border-radius:12px;font-weight:700;font-size:.9rem">
              Konuşmayı Aç →
            </a>
            <div style="margin-top:20px;font-size:.74rem;color:#5A7090;text-align:center">
              KuryemiBul · Bildirimleri kapat için uygulama ayarlarını kullan
            </div>
          </div>
        `,
      }),
    });

    const emailData = await emailResp.json();
    return new Response(JSON.stringify({ ok: emailResp.ok, emailId: emailData.id }), {
      status: emailResp.ok ? 200 : 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("notify-reply error:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
