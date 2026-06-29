import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { fetchCategories } from "@/lib/products";
import { categoryLabel } from "@/lib/category-i18n";
import {
  mergeCategoryOrder,
  parseCatalogOrder,
  serializeCatalogOrder,
} from "@/lib/category-order";
import { useI18n, type Lang } from "@/lib/i18n";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

export function CatalogCategoryOrderEditor({
  value,
  onChange,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
}) {
  const { lang, t } = useI18n();
  const cats = useQuery({ queryKey: ["admin-catalog-categories"], queryFn: fetchCategories });
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!cats.data) return;
    setSlugs(mergeCategoryOrder(parseCatalogOrder(value), cats.data));
  }, [cats.data, value]);

  const bySlug = new Map((cats.data ?? []).map((c) => [c.slug, c]));

  const persist = (next: string[]) => {
    setSlugs(next);
    const serialized = serializeCatalogOrder(next);
    const patch = { ru: serialized, en: serialized, hy: serialized };
    onChange({ ...value, "config.catalogOrder": patch });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = [...slugs];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    persist(next);
  };

  return (
    <div className="rounded-sm border border-dashed border-border bg-secondary/20 p-4">
      <h3 className="text-sm font-medium">{t("admin.content.categories.orderTitle")}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.categories.orderDesc")}</p>

      {cats.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("admin.loading")}</p>
      ) : (
        <ul className="mt-4 space-y-1">
          {slugs.map((slug, i) => {
            const cat = bySlug.get(slug);
            const label = cat
              ? categoryLabel(cat.category, lang, {
                  hy: cat.category_hy,
                  en: cat.category_en,
                  ru: cat.category_ru,
                })
              : slug;
            return (
              <li
                key={slug}
                className="flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="w-6 text-center text-xs text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{slug}</span>
                {cat && <span className="text-xs text-muted-foreground">({cat.count})</span>}
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label={t("admin.content.categories.moveUp")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={i === slugs.length - 1}
                    onClick={() => move(i, 1)}
                    className="rounded-sm p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label={t("admin.content.categories.moveDown")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
