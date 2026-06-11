import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const KEEP = [
  "Smeg","SMEG","Dolce & Gabbana","Dolce&Gabbana","D&G",
  "Blu Mediterraneo","Sicily Is My Love","Divina Cucina",
  "Coca-Cola","Coca Cola","Smeg500",
  "FAB28","FAB30","FAB32","FAB38","FAB50",
  "Porsche","Porsche Shade Green","Porsche Shade White","Porsche 917",
];
const SYS = `You are a professional translator for a Smeg appliance catalog in Armenia.
Translate the provided JSON values from English to the target language.
Rules:
- Keep these brand and collection names EXACTLY as-is (do not translate or transliterate): ${KEEP.join(", ")}.
- Keep model codes, SKUs, units (W, kW, L, kg, mm, °C), and numbers untouched.
- Preserve HTML tags if present.
- Translation must sound natural and premium, matching a luxury appliance brand voice.
- Return ONLY a JSON object with the same keys as the input, no commentary.`;

function deriveSecret(apiKey: string) {
  return createHash("sha256").update(`translate-tick:${apiKey}`).digest("base64url");
}
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a); const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function callAI(apiKey: string, lang: "ru" | "hy", payload: Record<string, string>) {
  const langName = lang === "ru" ? "Russian (Русский)" : "Armenian (Հայերեն)";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYS },
        { role: "user", content: `Target language: ${langName}\nInput JSON:\n${JSON.stringify(payload)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
  const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = j.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(text) as Record<string, string>; }
  catch { const m = text.match(/\{[\s\S]*\}/); return m ? (JSON.parse(m[0]) as Record<string, string>) : {}; }
}

type Row = {
  sku: string;
  name: string | null; description: string | null; category: string | null; colour: string | null;
  specs: Record<string, string> | null;
  name_en: string | null; description_en: string | null; category_en: string | null; colour_en: string | null;
  specs_en: Record<string, string> | null;
  name_hy: string | null; description_hy: string | null; category_hy: string | null; colour_hy: string | null;
  specs_hy: Record<string, string> | null;
};

async function translateOne(apiKey: string, p: Row) {
  const src = {
    name: p.name_en ?? p.name ?? "",
    description: p.description_en ?? p.description ?? "",
    category: p.category_en ?? p.category ?? "",
    colour: p.colour_en ?? p.colour ?? "",
    specs: (p.specs_en ?? p.specs ?? {}) as Record<string, string>,
  };
  const patch: Record<string, unknown> = { translated_at: new Date().toISOString() };
  if (!p.name_en && src.name) patch.name_en = src.name;
  if (!p.description_en && src.description) patch.description_en = src.description;
  if (!p.category_en && src.category) patch.category_en = src.category;
  if (!p.colour_en && src.colour) patch.colour_en = src.colour;
  if (!p.specs_en && Object.keys(src.specs).length) patch.specs_en = src.specs;

  const langs: Array<{ lang: "ru"|"hy"; n: string; d: string; c: string; co: string; s: string; ex: Partial<Row>; force: boolean }> = [
    { lang: "ru", n: "name", d: "description", c: "category", co: "colour", s: "specs",
      ex: { name: p.name, description: p.description, category: p.category, colour: p.colour, specs: p.specs }, force: true },
    { lang: "hy", n: "name_hy", d: "description_hy", c: "category_hy", co: "colour_hy", s: "specs_hy",
      ex: { name: p.name_hy, description: p.description_hy, category: p.category_hy, colour: p.colour_hy, specs: p.specs_hy }, force: false },
  ];
  for (const t of langs) {
    const need: Record<string, string> = {};
    if (src.name && (!t.ex.name || t.force)) need.name = src.name;
    if (src.description && (!t.ex.description || t.force)) need.description = src.description;
    if (src.category && (!t.ex.category || t.force)) need.category = src.category;
    if (src.colour && (!t.ex.colour || t.force)) need.colour = src.colour;
    const sk = Object.keys(src.specs);
    const needSpecs = sk.length > 0 && (!t.ex.specs || t.force);
    if (needSpecs) for (const k of sk) need[`__spec__${k}`] = String(src.specs[k]);
    if (Object.keys(need).length === 0) continue;
    const out = await callAI(apiKey, t.lang, need);
    if (out.name) patch[t.n] = out.name;
    if (out.description) patch[t.d] = out.description;
    if (out.category) patch[t.c] = out.category;
    if (out.colour) patch[t.co] = out.colour;
    if (needSpecs) {
      const tr: Record<string, string> = {};
      for (const k of sk) tr[k] = out[`__spec__${k}`] ?? src.specs[k];
      patch[t.s] = tr;
    }
  }
  return patch;
}

const SELECT_FIELDS = "sku,name,description,category,colour,specs,name_en,description_en,category_en,colour_en,specs_en,name_hy,description_hy,category_hy,colour_hy,specs_hy";

export const Route = createFileRoute("/api/public/translate/tick")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("no key", { status: 500 });
        const url = new URL(request.url);
        const secret = url.searchParams.get("s") ?? "";
        if (!safeEqual(secret, deriveSecret(apiKey))) return new Response("forbidden", { status: 403 });
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "3", 10) || 3, 1), 10);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rows, error } = await supabaseAdmin
          .from("products").select(SELECT_FIELDS)
          .or("name_en.is.null,name_hy.is.null,translated_at.is.null")
          .limit(limit);
        if (error) return new Response(error.message, { status: 500 });

        const results: Array<{ sku: string; ok: boolean; error?: string }> = [];
        for (const p of (rows ?? []) as unknown as Row[]) {
          try {
            const patch = await translateOne(apiKey, p);
            const { error: uErr } = await supabaseAdmin.from("products").update(patch as never).eq("sku", p.sku);
            if (uErr) throw uErr;
            results.push({ sku: p.sku, ok: true });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            results.push({ sku: p.sku, ok: false, error: msg });
            // mark to skip on persistent failures
            await supabaseAdmin.from("products").update({ translated_at: new Date().toISOString() } as never).eq("sku", p.sku);
          }
        }

        const { count } = await supabaseAdmin.from("products").select("sku", { count: "exact", head: true })
          .or("name_en.is.null,name_hy.is.null,translated_at.is.null");
        return Response.json({ processed: results.length, remaining: count ?? 0, results });
      },
    },
  },
});