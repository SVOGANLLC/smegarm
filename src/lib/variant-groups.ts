import { supabase } from "@/integrations/supabase/client";
import { assertRowUpdated } from "@/lib/supabase-assert";
import { removeModelGroupLabel, persistModelGroupLabels, type ModelGroupLabel } from "@/lib/model-group-labels";

export type VariantGroupMember = {
  sku: string;
  name: string;
  colour: string | null;
  main_image: string | null;
  is_published: boolean;
  manual: boolean;
};

export type AdminVariantGroup = {
  key: string;
  manual: boolean;
  product_count: number;
  colour_count: number;
  members: VariantGroupMember[];
};

type ProductRow = {
  sku: string;
  name: string;
  colour: string | null;
  main_image: string | null;
  model_group: string | null;
  variant_group: string | null;
  is_published: boolean;
};

/** Groups with a saved label (or manual flag) but zero products assigned. */
export type VariantGroupProductFilter = "all" | "with" | "without";

export function filterVariantGroupsByProducts(
  groups: AdminVariantGroup[],
  filter: VariantGroupProductFilter,
): AdminVariantGroup[] {
  if (filter === "with") return groups.filter((g) => g.product_count > 0);
  if (filter === "without") return groups.filter((g) => g.product_count === 0);
  return groups;
}

/** @deprecated Use filterVariantGroupsByProducts(groups, "without") */
export function filterEmptyVariantGroups(groups: AdminVariantGroup[]): AdminVariantGroup[] {
  return filterVariantGroupsByProducts(groups, "without");
}

export async function countEmptyVariantGroups(labelKeys: string[] = []): Promise<number> {
  const groups = await fetchAdminVariantGroups(labelKeys);
  return filterVariantGroupsByProducts(groups, "without").length;
}

export function canDeleteVariantGroup(_group: AdminVariantGroup, _hasLabel = false): boolean {
  return true;
}

export async function deleteVariantGroup(groupKey: string, labels: ModelGroupLabel[]): Promise<void> {
  const key = groupKey.trim();
  if (!key) throw new Error("Group key required");

  const { error: unassignErr } = await supabase
    .from("products")
    .update({ variant_group: null, model_group: null })
    .eq("model_group", key);
  if (unassignErr) throw unassignErr;

  const hasLabel = labels.some((l) => l.key === key);
  if (hasLabel) {
    await persistModelGroupLabels(removeModelGroupLabel(labels, key));
  }
}

export async function fetchAdminVariantGroups(labelKeys: string[] = []): Promise<AdminVariantGroup[]> {
  const { data, error } = await supabase
    .from("products")
    .select("sku, name, colour, main_image, model_group, variant_group, is_published")
    .not("model_group", "is", null)
    .order("sku", { ascending: true });
  if (error) throw error;

  const map = new Map<string, { manual: boolean; colours: Set<string>; members: VariantGroupMember[] }>();

  for (const row of (data ?? []) as ProductRow[]) {
    const key = row.model_group?.trim();
    if (!key) continue;
    const entry = map.get(key) ?? { manual: false, colours: new Set<string>(), members: [] };
    if (row.variant_group?.trim()) entry.manual = true;
    const colour = row.colour?.trim();
    if (colour) entry.colours.add(colour);
    entry.members.push({
      sku: row.sku,
      name: row.name,
      colour: row.colour,
      main_image: row.main_image,
      is_published: row.is_published,
      manual: !!row.variant_group?.trim(),
    });
    map.set(key, entry);
  }

  for (const raw of labelKeys) {
    const key = raw.trim();
    if (!key || map.has(key)) continue;
    map.set(key, { manual: true, colours: new Set(), members: [] });
  }

  return Array.from(map.entries())
    .filter(([, v]) => v.manual || v.members.length >= 2)
    .map(([key, v]) => ({
      key,
      manual: v.manual,
      product_count: v.members.length,
      colour_count: v.colours.size,
      members: v.members,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

export async function assignProductToVariantGroup(sku: string, groupKey: string): Promise<void> {
  const key = groupKey.trim().toUpperCase();
  if (!key) throw new Error("Group key required");
  const { data, error } = await supabase
    .from("products")
    .update({ variant_group: key, model_group: key })
    .eq("sku", sku.trim().toUpperCase())
    .select("sku")
    .maybeSingle();
  if (error) throw error;
  assertRowUpdated(data, "Product not found");
}

export async function removeProductFromVariantGroup(sku: string): Promise<void> {
  const normalized = sku.trim().toUpperCase();
  const { data, error } = await supabase
    .from("products")
    .update({ variant_group: null, model_group: null })
    .eq("sku", normalized)
    .select("sku")
    .maybeSingle();
  if (error) throw error;
  assertRowUpdated(data, "Product not found");
}

export async function searchProductsForGroup(q: string, limit = 12): Promise<ProductRow[]> {
  const term = q.trim();
  if (term.length < 2) return [];

  if (/^[A-Z0-9-]+$/i.test(term) && term.length <= 24) {
    const { data, error } = await supabase
      .from("products")
      .select("sku, name, colour, main_image, model_group, variant_group, is_published")
      .ilike("sku", `%${term}%`)
      .order("sku", { ascending: true })
      .limit(limit);
    if (error) throw error;
    if ((data ?? []).length) return data as ProductRow[];
  }

  const { data, error } = await supabase.rpc("search_products", {
    q: term,
    only_published: false,
    max_rows: limit,
  });
  if (error) throw error;
  const skus = ((data ?? []) as Array<{ sku: string }>).map((r) => r.sku);
  if (!skus.length) return [];

  const { data: rows, error: e2 } = await supabase
    .from("products")
    .select("sku, name, colour, main_image, model_group, variant_group, is_published")
    .in("sku", skus);
  if (e2) throw e2;
  const bySku = new Map(((rows ?? []) as ProductRow[]).map((r) => [r.sku, r]));
  return skus.map((s) => bySku.get(s)).filter((r): r is ProductRow => !!r);
}
