import type { Lang } from "@/lib/i18n";
import {
  DEFAULT_MAIN_CARDS,
  DEFAULT_SMALL_CATEGORIES,
  labelKeyForCategory,
  type MainCategoryCard,
  parseMainCards,
  parseSmallCategories,
  serializeMainCards,
  serializeSmallCategories,
} from "@/lib/categories-config";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

/** Homepage category section texts + main cards only (menu groups → /admini/menu). */
export function CategoriesContentEditor({
  value,
  onChange,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
  onPersist?: (next: BlockValue) => Promise<void>;
}) {
  const { t } = useI18n();
  const cards = parseMainCards(value);
  const small = parseSmallCategories(value);

  const setConfig = (key: string, text: string) => {
    const patch = { ru: text, en: text, hy: text };
    onChange({ ...value, [key]: patch });
  };

  const updateCard = (index: number, patch: Partial<MainCategoryCard>) => {
    const next = [...cards];
    while (next.length < 3) next.push({ ...DEFAULT_MAIN_CARDS[next.length] });
    const merged = { ...next[index], ...patch };
    const syncedLabelKey = labelKeyForCategory(merged.categoryKey);
    if (syncedLabelKey) merged.labelKey = syncedLabelKey;
    next[index] = merged;
    setConfig("config.mainCards", serializeMainCards(next.slice(0, 3)));
  };

  const updateCardLabel = (index: number, lang: Lang, label: string) => {
    const next = [...cards];
    while (next.length < 3) next.push({ ...DEFAULT_MAIN_CARDS[next.length] });
    const labels = { ...(next[index].labels ?? {}), [lang]: label };
    next[index] = { ...next[index], labels };
    setConfig("config.mainCards", serializeMainCards(next.slice(0, 3)));
  };

  return (
    <div className="mt-6 space-y-6 rounded-xl border border-dashed border-border bg-secondary/20 p-4">
      <p className="text-xs text-muted-foreground">
        {t("admin.content.categories.menuHint")}{" "}
        <Link to="/admini/menu" className="underline hover:text-foreground">
          {t("admin.nav.menuGroups")}
        </Link>
        .{" "}
        <Link to="/admini/categories" className="underline hover:text-foreground">
          {t("admin.categories.editNamesLink")}
        </Link>
      </p>

      <div>
        <h3 className="text-sm font-medium">{t("admin.content.categories.mainTitle")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.categories.mainDesc")}</p>
      </div>
      {[0, 1, 2].map((i) => {
        const card = cards[i] ?? DEFAULT_MAIN_CARDS[i];
        return (
          <div key={i} className="rounded-sm border border-border bg-background p-4">
            <p className="eyebrow text-muted-foreground">{t("admin.content.categories.cardN", { n: i + 1 })}</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">{t("admin.products.skuLabel")}</span>
                <input
                  value={card.sku}
                  onChange={(e) => updateCard(i, { sku: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
                />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">{t("admin.content.categories.categoryKey")}</span>
                <input
                  value={card.categoryKey}
                  onChange={(e) => updateCard(i, { categoryKey: e.target.value })}
                  placeholder="Refrigerators"
                  className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {(["ru", "en", "hy"] as Lang[]).map((lang) => (
                <label key={lang} className="block">
                  <span className="text-xs text-muted-foreground">
                    {t("admin.content.categories.cardTitle")} ({lang.toUpperCase()})
                  </span>
                  <input
                    value={card.labels?.[lang] ?? ""}
                    placeholder={t(card.labelKey)}
                    onChange={(e) => updateCardLabel(i, lang, e.target.value)}
                    className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}

      <label className="block">
        <span className="text-sm font-medium">{t("admin.content.categories.smallTitle")}</span>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.categories.smallDesc")}</p>
        <textarea
          rows={6}
          value={small.join("\n")}
          onChange={(e) =>
            setConfig(
              "config.smallCategories",
              serializeSmallCategories(
                e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              ),
            )
          }
          placeholder={DEFAULT_SMALL_CATEGORIES.join("\n")}
          className="mt-3 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
        />
      </label>
    </div>
  );
}
