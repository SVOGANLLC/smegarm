type BlockValue = Record<string, Partial<Record<"ru" | "en" | "hy", string>>>;

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

export type CatalogGroupConfig = {
  /** Group catalog cards by model_group + colour swatches (default: true). */
  enabled: boolean;
  /** Category slugs where grouping is disabled (flat grid). */
  disabledCategorySlugs: string[];
};

export function parseCatalogGroupConfig(block: BlockValue | undefined): CatalogGroupConfig {
  const raw = readConfigString(block, "config.groupByColor");
  const enabled = raw === "" ? true : raw === "true" || raw === "1";
  const offRaw = readConfigString(block, "config.groupByColorOff");
  let disabledCategorySlugs: string[] = [];
  if (offRaw) {
    try {
      const parsed = JSON.parse(offRaw) as unknown;
      if (Array.isArray(parsed)) disabledCategorySlugs = parsed.map(String);
    } catch {
      disabledCategorySlugs = offRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return { enabled, disabledCategorySlugs };
}

export function shouldGroupCatalog(config: CatalogGroupConfig, categorySlug?: string): boolean {
  if (!config.enabled) return false;
  if (categorySlug && config.disabledCategorySlugs.includes(categorySlug)) return false;
  return true;
}

export function serializeGroupByColor(enabled: boolean): string {
  return enabled ? "true" : "false";
}

export function serializeGroupByColorOff(slugs: string[]): string {
  return JSON.stringify(slugs);
}
