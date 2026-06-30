import { supabase } from "@/integrations/supabase/client";

/** Mirrors DB trigger `sync_product_collections` — for admin UI hints only. */
const COLLECTION_AESTHETIC: Record<string, string> = {
  isola: "Isola",
  musa: "Musa",
  "dolce-stil-novo": "Dolce Stil Novo",
  linea: "Linea",
  classica: "Classica",
  portofino: "Portofino",
  "piano-design": "Piano Design",
  cortina: "Cortina",
  "fab-50s": "50's Style",
  victoria: "Victoria",
  coloniale: "Coloniale",
  universale: "Universale",
};

const COLLECTION_THEME: Record<string, string> = {
  "blu-mediterraneo": "dg_blu_mediterraneo",
  "dolce-gabbana-sicily": "dg_sicily",
  "divina-cucina": "dg_divina_cucina",
  "coca-cola": "coca_cola",
  smeg500: "smeg500",
  porsche: "porsche",
};

export function autoCollectionSlugsForProduct(product: {
  aesthetic?: string | null;
  theme_key?: string | null;
}): string[] {
  const slugs = new Set<string>();
  const a = product.aesthetic;
  const t = product.theme_key;

  for (const [slug, aesthetic] of Object.entries(COLLECTION_AESTHETIC)) {
    if (a === aesthetic) slugs.add(slug);
  }
  for (const [slug, theme] of Object.entries(COLLECTION_THEME)) {
    if (t === theme) slugs.add(slug);
  }
  if (t?.startsWith("dg_")) slugs.add("dolce-gabbana");
  if (t === "porsche_green" || t === "porsche_white" || t === "porsche_917") slugs.add("porsche");

  return [...slugs];
}

export function isAutoCollectionSlug(
  slug: string,
  product: { aesthetic?: string | null; theme_key?: string | null },
): boolean {
  return autoCollectionSlugsForProduct(product).includes(slug);
}

type ProductFields = {
  aesthetic?: string | null;
  theme_key?: string | null;
  name?: string | null;
};

function patchForCollectionAdd(slug: string, product: ProductFields): Partial<ProductFields> {
  const patch: Partial<ProductFields> = {};
  const aesthetic = COLLECTION_AESTHETIC[slug];
  if (aesthetic) patch.aesthetic = aesthetic;

  const theme = COLLECTION_THEME[slug];
  if (theme) patch.theme_key = theme;

  return patch;
}

function patchForCollectionRemove(slug: string, product: ProductFields): Partial<ProductFields> {
  const patch: Partial<ProductFields> = {};
  const aesthetic = COLLECTION_AESTHETIC[slug];
  if (aesthetic && product.aesthetic === aesthetic) patch.aesthetic = null;

  const theme = COLLECTION_THEME[slug];
  if (theme && product.theme_key === theme) patch.theme_key = null;

  if (slug === "dolce-gabbana" && product.theme_key?.startsWith("dg_")) {
    patch.theme_key = null;
  }
  if (
    slug === "porsche" &&
    product.theme_key &&
    /^porsche(_|$)/.test(product.theme_key)
  ) {
    patch.theme_key = null;
  }

  return patch;
}

/** Keep product aesthetic/theme_key in sync when collection membership is edited in admin. */
export async function applyCollectionMembershipToProduct(
  sku: string,
  collectionSlug: string,
  mode: "add" | "remove",
): Promise<boolean> {
  const { data: product, error } = await supabase
    .from("products")
    .select("aesthetic, theme_key, name")
    .eq("sku", sku)
    .maybeSingle();
  if (error) throw error;
  if (!product) return false;

  let patch: Partial<ProductFields> =
    mode === "add" ? patchForCollectionAdd(collectionSlug, product) : patchForCollectionRemove(collectionSlug, product);

  if (mode === "add" && collectionSlug === "dolce-gabbana" && !patch.theme_key) {
    const { data: computed, error: rpcErr } = await supabase.rpc("compute_theme_key", {
      p_name: product.name ?? "",
      p_aesthetic: product.aesthetic ?? "",
    });
    if (rpcErr) throw rpcErr;
    if (computed) patch = { ...patch, theme_key: computed };
  }

  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (!entries.length) return false;

  const update = Object.fromEntries(entries) as { aesthetic?: string | null; theme_key?: string | null };
  const { data: row, error: upErr } = await supabase
    .from("products")
    .update(update)
    .eq("sku", sku)
    .select("sku")
    .maybeSingle();
  if (upErr) throw upErr;
  return !!row;
}
