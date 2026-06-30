import type { Lang } from "@/lib/i18n";
import type { CatalogSection } from "@/lib/catalog-sections";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function readConfigString(block: BlockValue | undefined, key: string): string {
  const field = block?.[key];
  if (!field) return "";
  return (field.ru || field.hy || field.en || "").trim();
}

export type GroupSectionToggles = {
  large: boolean;
  small: boolean;
  accessories: boolean;
};

export type CatalogGroupConfig = {
  /** Group catalog cards by model_group + colour swatches (default: true). */
  enabled: boolean;
  /** Per catalog section (large / small / accessories). */
  sections: GroupSectionToggles;
  /** Category slugs where grouping is disabled (flat grid). */
  disabledCategorySlugs: string[];
};

const DEFAULT_SECTIONS: GroupSectionToggles = {
  large: true,
  small: true,
  accessories: false,
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
  const sectionsRaw = readConfigString(block, "config.groupByColorSections");
  let sections = { ...DEFAULT_SECTIONS };
  if (sectionsRaw) {
    try {
      const parsed = JSON.parse(sectionsRaw) as Partial<GroupSectionToggles>;
      sections = { ...DEFAULT_SECTIONS, ...parsed };
    } catch {
      /* keep defaults */
    }
  }
  return { enabled, sections, disabledCategorySlugs };
}

export function shouldGroupCatalog(
  config: CatalogGroupConfig,
  opts?: { categorySlug?: string; section?: CatalogSection },
): boolean {
  if (!config.enabled) return false;
  const section = opts?.section;
  if (section && !config.sections[section]) return false;
  const categorySlug = opts?.categorySlug;
  if (categorySlug && config.disabledCategorySlugs.includes(categorySlug)) return false;
  return true;
}

export function serializeGroupByColor(enabled: boolean): string {
  return enabled ? "true" : "false";
}

export function serializeGroupByColorOff(slugs: string[]): string {
  return JSON.stringify(slugs);
}

export function serializeGroupSections(sections: GroupSectionToggles): string {
  return JSON.stringify(sections);
}
