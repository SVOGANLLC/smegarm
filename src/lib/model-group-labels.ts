import type { Lang } from "@/lib/i18n";

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
    return parsed
      .map((row) => {
        const r = row as Record<string, unknown>;
        const key = String(r.key ?? r.model_group ?? "").trim();
        if (!key) return null;
        return {
          key,
          name_ru: r.name_ru != null ? String(r.name_ru) : undefined,
          name_en: r.name_en != null ? String(r.name_en) : undefined,
          name_hy: r.name_hy != null ? String(r.name_hy) : undefined,
          image: r.image != null ? String(r.image) : undefined,
          image_sku: r.image_sku != null ? String(r.image_sku).trim().toUpperCase() || undefined : undefined,
        } satisfies ModelGroupLabel;
      })
      .filter((x): x is ModelGroupLabel => !!x);
  } catch {
    return [];
  }
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
  const keys = [modelGroup?.trim(), sku ? skuModelPrefix(sku) : null].filter(Boolean) as string[];
  for (const key of keys) {
    const row = labels.find((l) => l.key === key);
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
  return labels.find((l) => l.key === modelGroup);
}

export function upsertModelGroupLabel(
  labels: ModelGroupLabel[],
  key: string,
  patch: Partial<Omit<ModelGroupLabel, "key">>,
): ModelGroupLabel[] {
  const trimmed = key.trim();
  if (!trimmed) return labels;
  const idx = labels.findIndex((l) => l.key === trimmed);
  if (idx >= 0) {
    const next = [...labels];
    next[idx] = { ...next[idx], ...patch, key: trimmed };
    return next;
  }
  return [...labels, { key: trimmed, ...patch }];
}

export function labelsWithContent(labels: ModelGroupLabel[]): ModelGroupLabel[] {
  return labels.filter(
    (l) =>
      l.key.trim() &&
      (l.name_ru?.trim() || l.name_en?.trim() || l.name_hy?.trim() || l.image?.trim() || l.image_sku?.trim()),
  );
}
