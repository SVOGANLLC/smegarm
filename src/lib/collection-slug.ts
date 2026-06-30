import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/products";

export function deriveCollectionSlug(nameRu: string, nameEn: string, currentSlug: string): string {
  return slugify(nameRu) || slugify(nameEn) || currentSlug;
}

export async function ensureUniqueCollectionSlug(
  base: string,
  excludeId?: string,
  client: typeof supabase = supabase,
): Promise<string> {
  if (!base) throw new Error("empty slug");
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const { data, error } = await client.from("collections").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw error;
    if (!data || data.id === excludeId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export const COLLECTION_UPDATE_SELECT =
  "id,slug,name,name_en,name_hy,description,description_en,description_hy,cover_image,is_published,sort_weight,section";

export type CollectionPatchInput = {
  id: string;
  slug: string;
  patch: Record<string, unknown>;
  syncSlugFromName?: boolean;
  slugFallback?: string;
};

export async function buildCollectionUpdatePatch(
  input: CollectionPatchInput,
  client: typeof supabase = supabase,
): Promise<Record<string, unknown>> {
  const finalPatch = { ...input.patch };
  if (input.syncSlugFromName && typeof finalPatch.name === "string") {
    const base = deriveCollectionSlug(finalPatch.name, input.slugFallback ?? "", input.slug);
    if (base !== input.slug) {
      finalPatch.slug = await ensureUniqueCollectionSlug(base, input.id, client);
    }
  }
  return finalPatch;
}
