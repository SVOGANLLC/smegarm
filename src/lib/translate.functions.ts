import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Brand / collaboration names that MUST NOT be translated.
const KEEP_TERMS = [
  "Smeg", "SMEG", "Dolce & Gabbana", "Dolce&Gabbana", "D&G",
  "Blu Mediterraneo", "Sicily Is My Love", "Divina Cucina",
  "Coca-Cola", "Coca Cola", "Smeg500",
  "FAB28", "FAB30", "FAB32", "FAB38", "FAB50",
  "Porsche", "Porsche Shade Green", "Porsche Shade White", "Porsche 917",
];

const SYSTEM_PROMPT = `You are a professional translator for a Smeg appliance catalog in Armenia.
Translate the provided JSON values from English to the target language.
Rules:
- Keep these brand and collection names EXACTLY as-is (do not translate or transliterate): ${KEEP_TERMS.join(", ")}.
- Keep model codes, SKUs, units (W, kW, L, kg, mm, °C), and numbers untouched.
- Preserve HTML tags if present.
- Translation must sound natural and premium, matching a luxury appliance brand voice.
- Return ONLY a JSON object with the same keys as the input, no commentary.`;

type TargetLang = "ru" | "hy";

async function callGateway(
  apiKey: string,
  targetLang: TargetLang,
  payload: Record<string, string>,
): Promise<Record<string, string>> {
  const langName = targetLang === "ru" ? "Russian (Русский)" : "Armenian (Հայերեն)";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Target language: ${langName}\nInput JSON:\n${JSON.stringify(payload)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit. Подождите минуту и повторите.");
  if (res.status === 402) throw new Error("Кончились кредиты Lovable AI. Пополните в Settings → Workspace → Usage.");
  if (!res.ok) throw new Error(`AI error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? "{}";
  try { return JSON.parse(text) as Record<string, string>; }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as Record<string, string>) : {};
  }
}

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Доступ только для администраторов");
}

type ProductRow = {
  sku: string;
  name: string | null; description: string | null; category: string | null; colour: string | null;
  specs: Record<string, string> | null;
  name_en: string | null; description_en: string | null; category_en: string | null; colour_en: string | null;
  specs_en: Record<string, string> | null;
  name_hy: string | null; description_hy: string | null; category_hy: string | null; colour_hy: string | null;
  specs_hy: Record<string, string> | null;
};

/**
 * Translates one product. The English copy (`*_en`) is the source of truth; on
 * legacy rows where only the base columns are populated with English text we
 * fall back to those. Russian translation is written to the base columns
 * (`name`, `description`, ...), Armenian to `*_hy`.
 */
async function translateOne(apiKey: string, p: ProductRow, overwrite: boolean) {
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

  const langs: Array<{ lang: TargetLang; nameKey: string; descKey: string; catKey: string; colKey: string; specsKey: string; existing: Partial<ProductRow> }> = [
    { lang: "ru", nameKey: "name", descKey: "description", catKey: "category", colKey: "colour", specsKey: "specs",
      existing: { name: p.name, description: p.description, category: p.category, colour: p.colour, specs: p.specs } },
    { lang: "hy", nameKey: "name_hy", descKey: "description_hy", catKey: "category_hy", colKey: "colour_hy", specsKey: "specs_hy",
      existing: { name: p.name_hy, description: p.description_hy, category: p.category_hy, colour: p.colour_hy, specs: p.specs_hy } },
  ];

  for (const t of langs) {
    const need: Record<string, string> = {};
    // For RU we always rewrite the base columns when overwrite is true, because legacy data is English.
    const ruForce = t.lang === "ru" && overwrite;
    if (src.name && (overwrite || !t.existing.name || ruForce)) need.name = src.name;
    if (src.description && (overwrite || !t.existing.description || ruForce)) need.description = src.description;
    if (src.category && (overwrite || !t.existing.category || ruForce)) need.category = src.category;
    if (src.colour && (overwrite || !t.existing.colour || ruForce)) need.colour = src.colour;
    const specsKeys = Object.keys(src.specs);
    const needSpecs = specsKeys.length > 0 && (overwrite || !t.existing.specs || ruForce);
    if (needSpecs) for (const k of specsKeys) need[`__spec__${k}`] = String(src.specs[k]);
    if (Object.keys(need).length === 0) continue;

    const out = await callGateway(apiKey, t.lang, need);
    if (out.name) patch[t.nameKey] = out.name;
    if (out.description) patch[t.descKey] = out.description;
    if (out.category) patch[t.catKey] = out.category;
    if (out.colour) patch[t.colKey] = out.colour;
    if (needSpecs) {
      const translated: Record<string, string> = {};
      for (const k of specsKeys) translated[k] = out[`__spec__${k}`] ?? src.specs[k];
      patch[t.specsKey] = translated;
    }
  }

  return patch;
}

const SELECT_FIELDS = "sku,name,description,category,colour,specs,name_en,description_en,category_en,colour_en,specs_en,name_hy,description_hy,category_hy,colour_hy,specs_hy";

export const translateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ sku: z.string().min(1).max(128), overwrite: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY не задан");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("products").select(SELECT_FIELDS).eq("sku", data.sku).maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Товар не найден");
    const patch = await translateOne(apiKey, p as unknown as ProductRow, data.overwrite);
    const { error: uErr } = await supabaseAdmin.from("products").update(patch as never).eq("sku", data.sku);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, sku: data.sku };
  });

export const countUntranslated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count: total } = await supabaseAdmin.from("products").select("sku", { count: "exact", head: true });
    const { count: needsEn } = await supabaseAdmin.from("products").select("sku", { count: "exact", head: true }).is("name_en", null);
    const { count: needsHy } = await supabaseAdmin.from("products").select("sku", { count: "exact", head: true }).is("name_hy", null);
    return { total: total ?? 0, needs_en: needsEn ?? 0, needs_hy: needsHy ?? 0 };
  });

export const translateBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(20).default(5) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY не задан");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("products").select(SELECT_FIELDS)
      .or("name_en.is.null,name_hy.is.null,translated_at.is.null")
      .limit(data.limit);
    if (error) throw new Error(error.message);
    const results: Array<{ sku: string; ok: boolean; error?: string }> = [];
    for (const p of rows ?? []) {
      try {
        const patch = await translateOne(apiKey, p as unknown as ProductRow, false);
        const { error: uErr } = await supabaseAdmin.from("products").update(patch as never).eq("sku", (p as { sku: string }).sku);
        if (uErr) throw uErr;
        results.push({ sku: (p as { sku: string }).sku, ok: true });
      } catch (e) {
        results.push({ sku: (p as { sku: string }).sku, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { processed: results.length, results };
  });