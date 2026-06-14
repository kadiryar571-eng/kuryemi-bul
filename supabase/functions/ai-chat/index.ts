import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildSystemPrompt(ctx: Record<string, string | null>): string {
  const roleLabel = ctx.roleLabel || "Misafir";
  const cityLine = ctx.city ? `Şehir: ${ctx.city}` : "";
  const levelLine = ctx.level ? `Seviye: ${ctx.level}` : "";
  const vehicleLine = ctx.vehicles ? `Araç: ${ctx.vehicles}` : "";
  const regionsLine = ctx.regions ? `Bölgeler: ${ctx.regions}` : "";
  const expLine = ctx.experience ? `Deneyim: ${ctx.experience} yıl` : "";

  const extras = [cityLine, levelLine, vehicleLine, regionsLine, expLine]
    .filter(Boolean)
    .join("\n");

  return `Sen KuryemiBul platformunun yapay zeka asistanısın (KuryemiBul AI).

KuryemiBul; kuryeler, işletmeler ve kurye firmalarını birbirine bağlayan profesyonel bir Türk iş eşleştirme platformudur.

KULLANICI BİLGİLERİ:
Ad: ${ctx.name || "Misafir"}
Rol: ${roleLabel}
${extras}

YAPABİLECEKLERİN:
1. CV/profil analizi ve iyileştirme önerileri
2. İş ilanı analizi ve değerlendirmesi
3. Kurye-işletme/firma eşleşme önerileri
4. Teklif ve mesaj taslakları oluşturma
5. Profil geliştirme stratejileri
6. Başvuru optimizasyonu

KURALLAR:
- Her zaman Türkçe yanıt ver
- Kısa, net ve pratik ol (maksimum 4 paragraf veya madde listesi)
- Kullanıcının rolüne göre özelleştir yanıtları
- Platform dışı konularda (siyaset, tıp, hukuk vb.) kibarca KuryemiBul konularına yönlendir
- Markdown kullanabilirsin: **kalın** başlıklar, - madde listeleri`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const messages: Array<{ role: string; content: string }> = body.messages || [];
    const userContext: Record<string, string | null> = body.userContext || {};

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "Mesaj gerekli" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI servisi yapılandırılmamış" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Gemini API: "assistant" yerine "model" kullanır
    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemPrompt(userContext) }] },
          contents: geminiContents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini API hatası:", resp.status, errText);
      return new Response(JSON.stringify({ error: "AI yanıt veremedi, lütfen tekrar deneyin" }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat hatası:", e);
    return new Response(JSON.stringify({ error: "Beklenmedik bir hata oluştu" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
