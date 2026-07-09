import type { Lang } from "@/lib/i18n";

export type MainCategoryCard = {
  sku: string;
  categoryKey: string;
  labelKey: string;
  labels?: Partial<Record<Lang, string>>;
};

export const DEFAULT_MAIN_CARDS: MainCategoryCard[] = [
  { sku: "FAB10HLRD6", categoryKey: "Refrigerators", labelKey: "section.categories.refrigerators" },
  { sku: "SF6905P1", categoryKey: "Ovens", labelKey: "section.categories.ovens" }, // cover SKU must exist in products
  { sku: "PV395LN", categoryKey: "Hobs", labelKey: "section.categories.hobs" },
];

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  Refrigerators: "section.categories.refrigerators",
  Ovens: "section.categories.ovens",
  Hobs: "section.categories.hobs",
};

export function labelKeyForCategory(categoryKey: string): string | undefined {
  return CATEGORY_LABEL_KEYS[categoryKey];
}

export const DEFAULT_SMALL_CATEGORIES = [
  "Kettles",
  "Toasters",
  "Espresso coffee machines",
  "Blenders",
  "Stand mixers",
  "Citrus juicers",
  "Hand blenders",
];

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

export function parseMainCards(block: BlockValue | undefined): MainCategoryCard[] {
  const raw = readConfigString(block, "config.mainCards");
  if (!raw) return DEFAULT_MAIN_CARDS;
  try {
    const parsed = JSON.parse(raw) as MainCategoryCard[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_MAIN_CARDS;
    return parsed
      .map((c, i) => ({
        sku: String(c.sku ?? "").trim().toUpperCase(),
        categoryKey: String(c.categoryKey ?? DEFAULT_MAIN_CARDS[i]?.categoryKey ?? "").trim(),
        labelKey: String(c.labelKey ?? DEFAULT_MAIN_CARDS[i]?.labelKey ?? "").trim(),
        labels: c.labels,
      }))
      .filter((c) => c.sku && c.categoryKey)
      .slice(0, 3);
  } catch {
    return DEFAULT_MAIN_CARDS;
  }
}

export function parseSmallCategories(block: BlockValue | undefined): string[] {
  const raw = readConfigString(block, "config.smallCategories");
  if (!raw) return DEFAULT_SMALL_CATEGORIES;
  const list = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : DEFAULT_SMALL_CATEGORIES;
}

export function serializeMainCards(cards: MainCategoryCard[]): string {
  return JSON.stringify(cards, null, 2);
}

export function serializeSmallCategories(keys: string[]): string {
  return keys.join("\n");
}

export function cardLabel(card: MainCategoryCard, lang: Lang, t: (k: string) => string): string {
  const custom = card.labels?.[lang]?.trim();
  if (custom) return custom;
  const labelKey = CATEGORY_LABEL_KEYS[card.categoryKey] ?? card.labelKey;
  if (labelKey) return t(labelKey);
  return card.categoryKey;
}
