import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/products";
import { categoryLabel } from "@/lib/category-i18n";
import {
  parseCatalogGroupConfig,
  serializeGroupByColor,
  serializeGroupByColorOff,
  serializeGroupSections,
  type CatalogGroupConfig,
  type GroupSectionToggles,
} from "@/lib/catalog-group-config";
import { useI18n, type Lang } from "@/lib/i18n";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

const SECTION_KEYS: Array<{ key: keyof GroupSectionToggles; labelKey: string }> = [
  { key: "large", labelKey: "admin.content.categories.groupSectionLarge" },
  { key: "small", labelKey: "admin.content.categories.groupSectionSmall" },
  { key: "accessories", labelKey: "admin.content.categories.groupSectionAccessories" },
];

export function CatalogGroupingEditor({
  value,
  onChange,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
}) {
  const { lang, t } = useI18n();
  const config = parseCatalogGroupConfig(value);
  const cats = useQuery({ queryKey: ["admin-catalog-categories"], queryFn: fetchCategories });

  const setConfig = (patch: Partial<CatalogGroupConfig>) => {
    const next: CatalogGroupConfig = { ...config, ...patch };
    onChange({
      ...value,
      "config.groupByColor": {
        ru: serializeGroupByColor(next.enabled),
        en: serializeGroupByColor(next.enabled),
        hy: serializeGroupByColor(next.enabled),
      },
      "config.groupByColorOff": {
        ru: serializeGroupByColorOff(next.disabledCategorySlugs),
        en: serializeGroupByColorOff(next.disabledCategorySlugs),
        hy: serializeGroupByColorOff(next.disabledCategorySlugs),
      },
      "config.groupByColorSections": {
        ru: serializeGroupSections(next.sections),
        en: serializeGroupSections(next.sections),
        hy: serializeGroupSections(next.sections),
      },
    });
  };

  const toggleSection = (key: keyof GroupSectionToggles) => {
    setConfig({ sections: { ...config.sections, [key]: !config.sections[key] } });
  };

  const toggleOffSlug = (slug: string) => {
    const set = new Set(config.disabledCategorySlugs);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    setConfig({ disabledCategorySlugs: Array.from(set) });
  };

  return (
    <div className="rounded-sm border border-dashed border-border bg-secondary/20 p-4">
      <h3 className="text-sm font-medium">{t("admin.content.categories.groupTitle")}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.categories.groupDesc")}</p>

      <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig({ enabled: e.target.checked })}
          className="h-4 w-4 accent-foreground"
        />
        <span>{t("admin.content.categories.groupEnabled")}</span>
      </label>

      {config.enabled && (
        <>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">{t("admin.content.categories.groupSectionsDesc")}</p>
            {SECTION_KEYS.map(({ key, labelKey }) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.sections[key]}
                  onChange={() => toggleSection(key)}
                  className="h-3.5 w-3.5 accent-foreground"
                />
                <span>{t(labelKey)}</span>
              </label>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground">{t("admin.content.categories.groupOffDesc")}</p>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {(cats.data ?? []).map((c) => {
                const off = config.disabledCategorySlugs.includes(c.slug);
                const label = categoryLabel(c.category, lang, {
                  hy: c.category_hy,
                  en: c.category_en,
                  ru: c.category_ru,
                });
                return (
                  <li key={c.slug}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-background">
                      <input
                        type="checkbox"
                        checked={off}
                        onChange={() => toggleOffSlug(c.slug)}
                        className="h-3.5 w-3.5 accent-foreground"
                      />
                      <span className="flex-1 truncate">{label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{c.slug}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
