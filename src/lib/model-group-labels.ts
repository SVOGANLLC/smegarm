import type { Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { assertRowUpdated } from "@/lib/supabase-assert";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

export type ModelGroupLabel = {
  key: string;
  name_ru?: string;
  name_en?: string;
  name_hy?: string;
  /** Uploaded or external URL — highest priority */
  image?: string;
  /** Representative SKU; its main_image is used when image is empty */
  image_sku?: string;
};

type ImageSource = { sku: string; main_image?: string | null };

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

export function parseModelGroupLabels(block: BlockValue | undefined): ModelGroupLabel[] {
  const raw = readConfigString(block, "config.modelGroupLabels");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const rows: ModelGroupLabel[] = [];
    for (const row of parsed) {
      const r = row as Record<string, unknown>;
      const key = String(r.key ?? r.model_group ?? "")
        .trim()
        .toUpperCase();
      if (!key) continue;
      rows.push({
        key,
        name_ru: r.name_ru != null ? String(r.name_ru) : undefined,
        name_en: r.name_en != null ? String(r.name_en) : undefined,
        name_hy: r.name_hy != null ? String(r.name_hy) : undefined,
        image: r.image != null ? String(r.image) : undefined,
        image_sku: r.image_sku != null ? String(r.image_sku).trim().toUpperCase() || undefined : undefined,
      });
    }
    return mergeModelGroupLabels(rows);
  } catch {
    return [];
  }
}

/** Merge case/duplicate keys so one group has one label row (all languages). */
export function mergeModelGroupLabels(labels: ModelGroupLabel[]): ModelGroupLabel[] {
  const map = new Map<string, ModelGroupLabel>();
  for (const l of labels) {
    const key = l.key.trim().toUpperCase();
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...l, key });
      continue;
    }
    map.set(key, {
      key,
      name_ru: prev.name_ru || l.name_ru,
      name_en: prev.name_en || l.name_en,
      name_hy: prev.name_hy || l.name_hy,
      image: prev.image || l.image,
      image_sku: prev.image_sku || l.image_sku,
    });
  }
  return Array.from(map.values());
}

export function serializeModelGroupLabels(rows: ModelGroupLabel[]): string {
  return JSON.stringify(rows);
}

/** SKU body prefix e.g. WKF01 from WKF01BL */
export function skuModelPrefix(sku: string): string | null {
  const m = sku.trim().match(/^([A-Z]{2,}[0-9]+)/);
  return m?.[1] ?? null;
}

export function resolveModelGroupImage(
  row: ModelGroupLabel,
  opts?: { variants?: ImageSource[]; imageBySku?: Record<string, string | null | undefined> },
): string | undefined {
  const uploaded = row.image?.trim();
  if (uploaded) return uploaded;

  const heroSku = row.image_sku?.trim().toUpperCase();
  if (!heroSku) return undefined;

  const fromVariant = opts?.variants?.find((v) => v.sku === heroSku)?.main_image;
  if (fromVariant) return fromVariant;

  const fromMap = opts?.imageBySku?.[heroSku];
  if (fromMap) return fromMap;

  return undefined;
}

export function resolveModelGroupLabel(
  labels: ModelGroupLabel[],
  lang: Lang,
  modelGroup?: string | null,
  sku?: string,
  opts?: { variants?: ImageSource[]; imageBySku?: Record<string, string | null | undefined> },
): { name?: string; image?: string } {
  const keys = [modelGroup?.trim().toUpperCase(), sku ? skuModelPrefix(sku) : null].filter(Boolean) as string[];
  for (const key of keys) {
    const row = labels.find((l) => l.key.trim().toUpperCase() === key);
    if (!row) continue;
    const name =
      (lang === "ru" && row.name_ru) ||
      (lang === "hy" && row.name_hy) ||
      (lang === "en" && row.name_en) ||
      row.name_ru ||
      row.name_en ||
      row.name_hy;
    const image = resolveModelGroupImage(row, opts);
    if (name || image) return { name: name || undefined, image };
  }
  return {};
}

export function labelForModelGroup(labels: ModelGroupLabel[], modelGroup: string): ModelGroupLabel | undefined {
  const key = modelGroup.trim().toUpperCase();
  return labels.find((l) => l.key.trim().toUpperCase() === key);
}

export function upsertModelGroupLabel(
  labels: ModelGroupLabel[],
  key: string,
  patch: Partial<Omit<ModelGroupLabel, "key">>,
): ModelGroupLabel[] {
  const trimmed = key.trim().toUpperCase();
  if (!trimmed) return labels;
  const merged = mergeModelGroupLabels(labels);
  const idx = merged.findIndex((l) => l.key === trimmed);
  if (idx >= 0) {
    const next = [...merged];
    next[idx] = { ...next[idx], ...patch, key: trimmed };
    return next;
  }
  return [...merged, { key: trimmed, ...patch }];
}

export function removeModelGroupLabel(labels: ModelGroupLabel[], key: string): ModelGroupLabel[] {
  const trimmed = key.trim().toUpperCase();
  if (!trimmed) return labels;
  return labels.filter((l) => l.key.trim().toUpperCase() !== trimmed);
}

export async function persistModelGroupLabels(labels: ModelGroupLabel[]): Promise<void> {
  const json = serializeModelGroupLabels(mergeModelGroupLabels(labels));
  const { data: existing, error: readErr } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "categories")
    .maybeSingle();
  if (readErr) throw readErr;
  const value = {
    ...((existing?.value as Record<string, unknown>) ?? {}),
    "config.modelGroupLabels": { ru: json, en: json, hy: json },
  };
  const { data, error } = await supabase
    .from("site_content")
    .upsert({ key: "categories", value }, { onConflict: "key" })
    .select("key")
    .maybeSingle();
  if (error) throw error;
  assertRowUpdated(data, "Failed to save");
}

export function labelsWithContent(labels: ModelGroupLabel[]): ModelGroupLabel[] {
  return labels.filter(
    (l) =>
      l.key.trim() &&
      (l.name_ru?.trim() || l.name_en?.trim() || l.name_hy?.trim() || l.image?.trim() || l.image_sku?.trim()),
  );
}
