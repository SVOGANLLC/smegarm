import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Brand / collaboration names that MUST NOT be translated.
const KEEP_TERMS = [
  "Smeg",
  "SMEG",
  "Dolce & Gabbana",
  "Dolce&Gabbana",
  "D&G",
  "Blu Mediterraneo",
  "Sicily Is My Love",
  "Divina Cucina",
  "Coca-Cola",
  "Coca Cola",
  "Smeg500",
  "FAB28",
  "FAB30",
  "FAB32",
  "FAB38",
  "FAB50",
  "Porsche",
  "Porsche Shade Green",
  "Porsche Shade White",
  "Porsche 917",
];

const SYSTEM_PROMPT = `You are a professional translator for a Smeg appliance catalog in Armenia.
Translate the provided JSON values from Russian to the target language.
Rules:
- Keep these brand and collection names EXACTLY as-is (do not translate or transliterate): ${KEEP_TERMS.join(", ")}.
- Keep model codes, SKUs, units (W, kW, L, kg, mm, °C), and numbers untouched.
- Preserve HTML tags if present.
- Translation must sound natural and premium, matching a luxury appliance brand voice.
- Return ONLY a JSON object with the same keys as the input, no commentary.`;

async function callGateway(
  apiKey: string,
  targetLang: "en" | "hy",
  payload: Record<string, string>,
): Promise<Record<string, string>> {
  const langName = targetLang === "en" ? "English" : "Armenian (Հայերեն)";
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
        {
          role: "user",
          content: `Target language: ${langName}\nInput JSON:\n${JSON.stringify(payload)}`,
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit. Подождите минуту и повторите.");
  if (res.status === 402) throw new Error("Кончились кредиты Lovable AI. Пополните в Settings → Workspace → Usage.");
  if (!res.ok) throw new Error(`AI error: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(text) as Record<string, string>;
  } catch {
    // Some models wrap JSON in code fences
    const m = text.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as Record<string, string>) : {};
  }
}

async function assertAdmin(supabase: ReturnType<typeof import("@/integrations/supabase/auth-middleware")["requireSupabaseAuth"]> extends never ? never : import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Доступ только для администраторов");
}

/** Translate one product (name, description, category, colour, specs) into EN and HY. */
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
      .from("products")
      .select("sku,name,description,category,colour,specs,name_en,name_hy,description_en,description_hy,category_en,category_hy,colour_en,colour_hy,specs_en,specs_hy")
      .eq("sku", data.sku)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) throw new Error("Товар не найден");

    const patch: Record<string, unknown> = { translated_at: new Date().toISOString() };

    for (const lang of ["en", "hy"] as const) {
      const need: Record<string, string> = {};
      if (p.name && (data.overwrite || !p[`name_${lang}` as const])) need.name = p.name;
      if (p.description && (data.overwrite || !p[`description_${lang}` as const])) need.description = p.description;
      if (p.category && (data.overwrite || !p[`category_${lang}` as const])) need.category = p.category;
      if (p.colour && (data.overwrite || !p[`colour_${lang}` as const])) need.colour = p.colour;
      const specs = (p.specs ?? {}) as Record<string, string>;
      const specsKeys = Object.keys(specs);
      const needSpecs = specsKeys.length > 0 && (data.overwrite || !p[`specs_${lang}` as const]);
      // Flatten specs into the same payload to save tokens
      if (needSpecs) {
        for (const k of specsKeys) need[`__spec__${k}`] = String(specs[k]);
      }
      if (Object.keys(need).length === 0) continue;

      const out = await callGateway(apiKey, lang, need);

      if (out.name) patch[`name_${lang}`] = out.name;
      if (out.description) patch[`description_${lang}`] = out.description;
      if (out.category) patch[`category_${lang}`] = out.category;
      if (out.colour) patch[`colour_${lang}`] = out.colour;
      if (needSpecs) {
        const translated: Record<string, string> = {};
        for (const k of specsKeys) {
          translated[k] = out[`__spec__${k}`] ?? specs[k];
        }
        patch[`specs_${lang}`] = translated;
      }
    }

    const { error: uErr } = await supabaseAdmin
      .from("products")
      .update(patch)
      .eq("sku", data.sku);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, sku: data.sku };
  });

/** Count how many products still need translation. */
export const countUntranslated = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count: total } = await supabaseAdmin
      .from("products")
      .select("sku", { count: "exact", head: true });
    const { count: needsEn } = await supabaseAdmin
      .from("products")
      .select("sku", { count: "exact", head: true })
      .is("name_en", null);
    const { count: needsHy } = await supabaseAdmin
      .from("products")
      .select("sku", { count: "exact", head: true })
      .is("name_hy", null);
    return { total: total ?? 0, needs_en: needsEn ?? 0, needs_hy: needsHy ?? 0 };
  });

/** Translate a batch of SKUs that still need translation. */
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
      .from("products")
      .select("sku,name,description,category,colour,specs,name_en,name_hy,description_en,description_hy,category_en,category_hy,colour_en,colour_hy,specs_en,specs_hy")
      .or("name_en.is.null,name_hy.is.null")
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const results: Array<{ sku: string; ok: boolean; error?: string }> = [];
    for (const p of rows ?? []) {
      try {
        const patch: Record<string, unknown> = { translated_at: new Date().toISOString() };
        for (const lang of ["en", "hy"] as const) {
          const need: Record<string, string> = {};
          if (p.name && !p[`name_${lang}` as const]) need.name = p.name as string;
          if (p.description && !p[`description_${lang}` as const]) need.description = p.description as string;
          if (p.category && !p[`category_${lang}` as const]) need.category = p.category as string;
          if (p.colour && !p[`colour_${lang}` as const]) need.colour = p.colour as string;
          const specs = ((p.specs as Record<string, string> | null) ?? {});
          const specsKeys = Object.keys(specs);
          const needSpecs = specsKeys.length > 0 && !p[`specs_${lang}` as const];
          if (needSpecs) for (const k of specsKeys) need[`__spec__${k}`] = String(specs[k]);
          if (Object.keys(need).length === 0) continue;
          const out = await callGateway(apiKey, lang, need);
          if (out.name) patch[`name_${lang}`] = out.name;
          if (out.description) patch[`description_${lang}`] = out.description;
          if (out.category) patch[`category_${lang}`] = out.category;
          if (out.colour) patch[`colour_${lang}`] = out.colour;
          if (needSpecs) {
            const translated: Record<string, string> = {};
            for (const k of specsKeys) translated[k] = out[`__spec__${k}`] ?? specs[k];
            patch[`specs_${lang}`] = translated;
          }
        }
        const { error: uErr } = await supabaseAdmin.from("products").update(patch).eq("sku", p.sku);
        if (uErr) throw uErr;
        results.push({ sku: p.sku as string, ok: true });
      } catch (e) {
        results.push({ sku: p.sku as string, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }
    return { processed: results.length, results };
  });