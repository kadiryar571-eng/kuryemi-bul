import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ------------------------------------------------------------------
   GÜVENLİK: Bu fonksiyon daha önce kimlik doğrulaması yapmıyordu ve
   Access-Control-Allow-Origin: * ile herkese açıktı. anon key public
   olduğu için herhangi biri GROQ_API_KEY kotasını sınırsız harcayabilir
   ya da projeyi ücretsiz bir LLM relay'i olarak kullanabilirdi.
   Artık: (1) geçerli JWT zorunlu, (2) kullanıcı başına oran sınırı,
   (3) origin allow-list, (4) girdi boyutu sınırı.
   ------------------------------------------------------------------ */

const ALLOWED_ORIGINS = [
  "https://kuryemibul.com",
  "https://www.kuryemibul.com",
  "capacitor://localhost",   // Capacitor iOS
  "http://localhost",        // Capacitor Android (androidScheme https ise https://localhost)
  "https://localhost",
  "http://localhost:3000",   // yerel geliştirme (npx serve)
];

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/* Basit bellek-içi oran sınırı. Edge instance başına çalışır; kesin
   değildir ama kontrolsüz kötüye kullanımı durdurur. Kalıcı sınır
   gerekiyorsa bir `ai_usage` tablosuna taşınmalıdır. */
const RATE_LIMIT = 20;              // istek
const RATE_WINDOW_MS = 60_000;      // / dakika / kullanıcı
const _hits = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const arr = (_hits.get(userId) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  _hits.set(userId, arr);
  if (_hits.size > 5000) _hits.clear();   // bellek sızıntısı koruması
  return arr.length > RATE_LIMIT;
}

const MAX_MESSAGES = 30;
const MAX_CHARS = 8000;

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
- CV/profil analizi ve iyileştirme önerileri
- İş ilanı analizi ve değerlendirmesi
- Kurye-işletme/firma eşleşme önerileri
- Teklif ve mesaj taslakları
- Profil geliştirme stratejileri
- Başvuru optimizasyonu
- Genel iş hayatı ve kariyer soruları

TON VE TARZI:
- Her zaman Türkçe yanıt ver
- Doğal, sıcak ve samimi bir dille konuş; robotik veya şablonlu cümlelerden kaçın
- Kullanıcı kısa bir şey yazarsa sen de kısa yanıtla; uzun soru sorarsa detaylı cevap ver
- Kullanıcının rolüne göre yanıtı kişiselleştir
- Genel sorulara (selamlama, basit sorular, hafif sohbet) kısaca ve sıcakkanlıca karşılık ver; her şeyi platforma yönlendirme
- Markdown kullanabilirsin: **kalın** başlıklar, - madde listeleri

ÖNEMLI — ZORUNLU FORMAT:
Her cevabının en sonuna, bir satır boşluk bırakarak, aşağıdaki etiketi ve JSON dizisini MUTLAKA ekle:
<<ÖNERILER>>["devam sorusu 1","devam sorusu 2","devam sorusu 3"]

Bu etiket kullanıcıya gösterilmez. Konuşmanın doğal akışına uygun, o ana özgü 2-3 adet kısa Türkçe soru üret. Genel şablonlardan kaçın; kullanıcının az önce konuştuğu konuyla bağlantılı sorular seç.`;
}

function parseReply(raw: string): { reply: string; suggestions: string[] } {
  const marker = "<<ÖNERILER>>";
  const idx = raw.lastIndexOf(marker);
  if (idx === -1) return { reply: raw.trim(), suggestions: [] };

  const replyPart = raw.slice(0, idx).trim();
  const jsonPart = raw.slice(idx + marker.length).trim();

  let suggestions: string[] = [];
  try {
    const parsed = JSON.parse(jsonPart);
    if (Array.isArray(parsed)) suggestions = parsed.filter((s) => typeof s === "string").slice(0, 3);
  } catch (_) {}

  return { reply: replyPart, suggestions };
}

serve(async (req: Request) => {
  const CORS = corsFor(req);

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
    /* --- 1) Kimlik doğrulama: geçerli kullanıcı JWT'si zorunlu --- */
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Giriş yapmalısınız" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: authData, error: authErr } = await supa.auth.getUser(token);
    const user = authData?.user;
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Oturum geçersiz" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    /* --- 2) Kullanıcı başına oran sınırı --- */
    if (rateLimited(user.id)) {
      return new Response(
        JSON.stringify({ error: "Çok fazla istek gönderdiniz. Bir dakika sonra tekrar deneyin." }),
        { status: 429, headers: { ...CORS, "Content-Type": "application/json", "Retry-After": "60" } },
      );
    }

    const body = await req.json();
    const rawMessages: Array<{ role: string; content: string }> = Array.isArray(body.messages) ? body.messages : [];
    const userContext: Record<string, string | null> = body.userContext || {};

    if (!rawMessages.length) {
      return new Response(JSON.stringify({ error: "Mesaj gerekli" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    /* --- 3) Girdi doğrulama: rol allow-list + boyut sınırı ---
       Eskiden body.messages doğrudan Groq'a geçiyordu; istemci
       kendi "system" mesajını enjekte ederek sistem promptunu
       ezebiliyordu. Artık yalnız user/assistant kabul edilir. */
    const messages = rawMessages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "Geçerli mesaj yok" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI servisi yapılandırılmamış" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Groq, OpenAI uyumlu format kullanır
    const groqMessages = [
      { role: "system", content: buildSystemPrompt(userContext) },
      ...messages,
    ];

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      // Upstream hata detayı yalnız sunucu log'una gider.
      // Eskiden Groq'un ham hata metni istemciye dönüyordu; bu,
      // model adı/kota/anahtar durumu gibi altyapı bilgisini sızdırır.
      const errText = await resp.text();
      console.error("Groq API hatası:", resp.status, errText);
      const userMsg = resp.status === 429
        ? "AI servisi şu an yoğun. Birazdan tekrar deneyin."
        : "AI servisine ulaşılamadı. Lütfen tekrar deneyin.";
      return new Response(JSON.stringify({ error: userMsg }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const { reply, suggestions } = parseReply(raw);

    return new Response(JSON.stringify({ reply, suggestions }), {
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
