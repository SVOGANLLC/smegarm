import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  buildCollectionUpdatePatch,
  COLLECTION_UPDATE_SELECT,
  type CollectionPatchInput,
} from "@/lib/collection-slug";

import type { SupabaseClient } from "@supabase/supabase-js";

async function assertCatalogStaff(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  if (error) throw error;
  if (!data?.length) throw new Error("Forbidden: catalog access required");
}

const updateCollectionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  patch: z.record(z.unknown()),
  syncSlugFromName: z.boolean().optional(),
  slugFallback: z.string().optional(),
});

/** Bypass RLS — reliable writes for admin collections (names, slug, etc.). */
export const updateCollectionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateCollectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCatalogStaff(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const finalPatch = await buildCollectionUpdatePatch(data as CollectionPatchInput, supabaseAdmin);

    const { data: row, error } = await supabaseAdmin
      .from("collections")
      .update(finalPatch as never)
      .eq("id", data.id)
      .select(COLLECTION_UPDATE_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!row) throw new Error("Collection not found or not updated");
    return row;
  });

const createCollectionSchema = z.object({
  name: z.string().min(1).max(120),
});

export const createCollectionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createCollectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCatalogStaff(supabase, userId);

    const { slugify } = await import("@/lib/products");
    const { ensureUniqueCollectionSlug } = await import("@/lib/collection-slug");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const trimmed = data.name.trim();
    const base = slugify(trimmed);
    if (!base) throw new Error("URL slug needs Latin letters in the name");
    const slug = await ensureUniqueCollectionSlug(base, undefined, supabaseAdmin);

    const { data: row, error } = await supabaseAdmin
      .from("collections")
      .insert({
        name: trimmed,
        slug,
        section: "special",
        sort_weight: 0,
      })
      .select(COLLECTION_UPDATE_SELECT)
      .maybeSingle();

    if (error) throw error;
    if (!row) throw new Error("Collection not created");
    return row;
  });

const deleteCollectionSchema = z.object({
  id: z.string().uuid(),
});

export const deleteCollectionAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteCollectionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertCatalogStaff(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("collections")
      .delete()
      .eq("id", data.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!row) throw new Error("Collection not found");
    return { ok: true as const };
  });
