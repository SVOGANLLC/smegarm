import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canonicalCategoryKey } from "@/lib/category-i18n";
import { remapCategoryReferencesInSiteContent } from "@/lib/category-rename";
import type { Lang } from "@/lib/i18n";

async function assertCatalogStaff(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  if (error) throw error;
  if (!data?.length) throw new Error("Forbidden: catalog access required");
}

const renameSchema = z.object({
  matchCanonical: z.string().min(1),
  matchRaw: z.array(z.string().min(1)).min(1),
  matchEn: z.string().nullable(),
  labels: z.object({
    ru: z.string().min(1).max(120),
    en: z.string().min(1).max(120),
    hy: z.string().min(1).max(120),
  }),
});

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

/**
 * Rename a catalogue category across all matching products (RU / EN / HY),
 * and remap homepage / menu references when the English key changes.
 */
export const renameCategoryLabels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => renameSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCatalogStaff(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ru = data.labels.ru.trim();
    const en = data.labels.en.trim();
    const hy = data.labels.hy.trim();
    if (!ru || !en || !hy) throw new Error("All three language labels are required");

    const { data: rows, error: fetchErr } = await supabaseAdmin
      .from("products")
      .select("sku,category,category_en,category_hy")
      .not("category", "is", null);
    if (fetchErr) throw fetchErr;

    const rawSet = new Set(data.matchRaw.map((s) => s.trim()).filter(Boolean));
    const matchEn = data.matchEn?.trim() || null;
    const matchCanonical = data.matchCanonical.trim();

    const skus: string[] = [];
    for (const row of rows ?? []) {
      const r = row as {
        sku: string;
        category: string | null;
        category_en: string | null;
        category_hy: string | null;
      };
      const raw = r.category?.trim();
      if (!raw) continue;
      const canonical = canonicalCategoryKey(raw, r.category_en, r.category_hy);
      const enVal = r.category_en?.trim() || null;
      if (
        canonical === matchCanonical ||
        rawSet.has(raw) ||
        (matchEn && enVal === matchEn)
      ) {
        skus.push(r.sku);
      }
    }

    if (!skus.length) throw new Error("No products found for this category");

    const patch = { category: ru, category_en: en, category_hy: hy };
    const CHUNK = 80;
    let updated = 0;
    for (let i = 0; i < skus.length; i += CHUNK) {
      const chunk = skus.slice(i, i + CHUNK);
      const { data: updatedRows, error } = await supabaseAdmin
        .from("products")
        .update(patch)
        .in("sku", chunk)
        .select("sku");
      if (error) throw error;
      updated += updatedRows?.length ?? 0;
    }

    const oldEn = matchEn || matchCanonical;
    let contentRemapped = false;
    if (oldEn.trim() !== en) {
      const { data: contentRow, error: contentErr } = await supabaseAdmin
        .from("site_content")
        .select("value")
        .eq("key", "categories")
        .maybeSingle();
      if (contentErr) throw contentErr;
      const current = ((contentRow?.value as BlockValue) ?? {}) as BlockValue;
      const remapped = remapCategoryReferencesInSiteContent(current, oldEn, en);
      if (JSON.stringify(remapped) !== JSON.stringify(current)) {
        const { error: upsertErr } = await supabaseAdmin
          .from("site_content")
          .upsert({ key: "categories", value: remapped }, { onConflict: "key" });
        if (upsertErr) throw upsertErr;
        contentRemapped = true;
      }
    }

    return { updated, contentRemapped, skuCount: skus.length };
  });
