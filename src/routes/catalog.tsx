import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  fetchCatalog,
  fetchCategories,
  fetchColorSwatches,
  fetchFacets,
  slugify,
} from "@/lib/products";
import { z } from "zod";
import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { categoryLabel as catLabel } from "@/lib/category-i18n";
import { ProductCard } from "@/components/site/ProductCard";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { colourLabel as colourI18n } from "@/lib/colour-i18n";
import { canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  colour: z.string().optional(), // csv
  aesthetic: z.string().optional(),
  theme: z.string().optional(),
  flag: z.enum(["is_featured", "is_new", "is_bestseller", "is_special_offer", "sale"]).optional(),
  inStock: z.boolean().optional(),
  sort: z.enum(["name", "price-asc", "price-desc"]).optional(),
  page: z.number().int().min(1).default(1),
});
type CatalogSearch = z.infer<typeof searchSchema>;

const split = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
const join = (arr: string[]) => (arr.length ? arr.join(",") : undefined);

const hyMeta = getI18nDefaults().hy;

export const Route = createFileRoute("/catalog")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: seoMeta({
      title: hyMeta["catalog.metaTitle"],
      description: hyMeta["catalog.metaDesc"],
      path: "/catalog",
      keywords: "Smeg catalog Armenia, SMEG appliances Yerevan, refrigerators, ovens, coffee machines",
      locale: "hy_AM",
    }),
    links: [...hreflangLinks("/catalog"), ...canonicalLink("/catalog")],
  }),
  errorComponent: ({ error }) => <CatalogErrorView message={error.message} />,
  notFoundComponent: () => <CatalogNotFoundView />,
  component: CatalogPage,
});

function CatalogErrorView({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-serif text-2xl">{t("catalog.unavailable")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function CatalogNotFoundView() {
  const { t } = useI18n();
  return <div className="p-10 text-center">{t("catalog.notFound")}</div>;
}

const PAGE_SIZE = 36;

function CatalogPage() {
  const search = Route.useSearch();
  const { category, q, page, flag, sort, theme, inStock } = search;
  const colours = split(search.colour);
  const aesthetics = split(search.aesthetic);
  const navigate = useNavigate({ from: Route.fullPath });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shuffleKey] = useState(() => Math.random());
  const { lang, t } = useI18n();

  const catsQuery = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
  const facetsQuery = useQuery({ queryKey: ["facets"], queryFn: fetchFacets, staleTime: 10 * 60_000 });
  const swatchesQuery = useQuery({ queryKey: ["color-swatches"], queryFn: fetchColorSwatches, staleTime: 30 * 60_000 });

  const currentCat = category ? catsQuery.data?.find((c) => c.slug === category) : undefined;
  const categoryRawList = currentCat?.raw;
  const categoryLabel = currentCat
    ? catLabel(currentCat.category, lang, {
        hy: currentCat.category_hy,
        en: currentCat.category_en ?? currentCat.category,
        ru: currentCat.category_ru,
      })
    : undefined;

  const sortedCategories = [...(catsQuery.data ?? [])].sort((a, b) =>
    catLabel(a.category, lang, { hy: a.category_hy, en: a.category_en, ru: a.category_ru }).localeCompare(
      catLabel(b.category, lang, { hy: b.category_hy, en: b.category_en, ru: b.category_ru }),
      lang === "hy" ? "hy" : lang === "ru" ? "ru" : "en",
    ),
  );

  // colour value (canonical) → localized label for current lang
  const colourLabel = (value: string) => {
    const f = facetsQuery.data?.colours.find((c) => c.value === value);
    const canonical = f?.value_en ?? value;
    if (lang === "hy") return f?.label_hy || colourI18n(canonical, lang);
    if (lang === "en") return f?.label_en || colourI18n(canonical, lang);
    return colourI18n(canonical, lang);
  };

  const productsQuery = useQuery({
    queryKey: ["catalog", currentCat?.slug ?? null, q ?? "", colours, aesthetics, theme ?? "", flag ?? "", inStock ?? false, sort ?? "", page, shuffleKey],
    queryFn: () =>
      fetchCatalog({
        categoryIn: q ? undefined : categoryRawList,
        search: q || undefined,
        colours: colours.length ? colours : undefined,
        aesthetics: aesthetics.length ? aesthetics : undefined,
        theme: theme || undefined,
        flag,
        inStock,
        sort,
        shuffleSeed: sort ? undefined : shuffleKey,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: !category || !!categoryRawList,
  });

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleIn = (key: "colour" | "aesthetic", value: string) => {
    const current = split(search[key]);
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    navigate({ search: (prev: CatalogSearch) => ({ ...prev, [key]: join(next), page: 1 }) });
  };

  const clearAll = () =>
    navigate({ search: { page: 1 } as CatalogSearch });

  const activeCount =
    colours.length + aesthetics.length + (flag ? 1 : 0) + (inStock ? 1 : 0) + (q ? 1 : 0) + (theme ? 1 : 0);

  const filters = (
    <div className="space-y-7">
      <div>
        <label className="eyebrow mb-2 block text-muted-foreground">{t("catalog.search")}</label>
        <input
          type="search"
          defaultValue={q ?? ""}
          placeholder={t("catalog.searchPlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              navigate({
                search: (prev: CatalogSearch) => ({
                  ...prev,
                  q: v || undefined,
                  category: undefined,
                  page: 1,
                }),
              });
            }
          }}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => ({ ...prev, q: undefined, page: 1 }) })}>
              «{q}»
            </FilterPill>
          )}
          {theme && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => ({ ...prev, theme: undefined, page: 1 }) })}>
              ✦ {THEME_LABELS[theme] ?? theme}
            </FilterPill>
          )}
          {flag && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => ({ ...prev, flag: undefined, page: 1 }) })}>
              {t(`flag.${flag}`)}
            </FilterPill>
          )}
          {inStock && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => ({ ...prev, inStock: undefined, page: 1 }) })}>
              {t("avail.inStock")}
            </FilterPill>
          )}
          {aesthetics.map((v) => (
            <FilterPill key={v} onClear={() => toggleIn("aesthetic", v)}>{v}</FilterPill>
          ))}
          {colours.map((v) => (
            <FilterPill key={v} onClear={() => toggleIn("colour", v)}>{colourLabel(v)}</FilterPill>
          ))}
        </div>
      )}

      <FacetGroup label={t("facet.marketing")}>
        <button
          onClick={() =>
            navigate({
              search: (prev: CatalogSearch) => ({ ...prev, inStock: inStock ? undefined : true, page: 1 }),
            })
          }
          className={`block w-full text-left text-sm transition ${inStock ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
        >
          {t("avail.inStock")}
        </button>
        {(
          [
            ["is_bestseller", "flag.is_bestseller"],
            ["is_new", "flag.is_new"],
            ["is_special_offer", "flag.is_special_offer"],
            ["sale", "flag.sale"],
          ] as const
        ).map(([k, key]) => (
          <button
            key={k}
            onClick={() =>
              navigate({
                search: (prev: CatalogSearch) => ({ ...prev, flag: flag === k ? undefined : k, page: 1 }),
              })
            }
            className={`block w-full text-left text-sm transition ${flag === k ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
          >
            {t(key)}
          </button>
        ))}
      </FacetGroup>

      <FacetGroup label={t("facet.categories")} defaultOpen>
        <button
          onClick={() => navigate({ search: (prev: CatalogSearch) => ({ ...prev, category: undefined, page: 1 }) })}
          className={`block w-full text-left text-sm ${!category ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
        >
          {t("facet.all")}
        </button>
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {sortedCategories.map((c) => (
            <button
              key={c.slug}
              onClick={() =>
                navigate({ search: (prev: CatalogSearch) => ({ ...prev, category: c.slug, page: 1 }) })
              }
              className={`flex w-full items-baseline justify-between text-left text-sm transition ${category === c.slug ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
            >
              <span>{catLabel(c.category, lang, { hy: c.category_hy, en: c.category_en, ru: c.category_ru })}</span>
              <span className="text-[11px] text-muted-foreground">{c.count}</span>
            </button>
          ))}
        </div>
      </FacetGroup>

      <FacetGroup label={t("facet.colour")}>
        <div className="flex flex-wrap gap-2">
          {facetsQuery.data?.colours
            .filter((c) => (c.value_en ?? c.value) !== "Decorated / Special")
            .slice(0, 30)
            .map((c) => {
            const hex = swatchesQuery.data?.find((s) => s.colour === (c.value_en ?? c.value))?.hex ?? "#d4d4d4";
            const active = colours.includes(c.value);
            const label = colourLabel(c.value);
            return (
              <button
                key={c.value}
                title={`${label} (${c.count})`}
                onClick={() => toggleIn("colour", c.value)}
                className={`h-7 w-7 rounded-full border transition ${active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background border-transparent" : "border-border hover:border-foreground"}`}
                style={{ background: hex }}
              />
            );
          })}
        </div>
      </FacetGroup>

      <FacetGroup label={t("facet.aesthetic")}>
        <ScrollableFacet
          items={facetsQuery.data?.aesthetics ?? []}
          selected={aesthetics}
          onToggle={(v) => toggleIn("aesthetic", v)}
        />
      </FacetGroup>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:border-foreground"
        >
          {t("catalog.reset")} ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pb-20 pt-20 md:pt-32 md:pb-20">
        <div className="mx-auto max-w-[1400px] px-4 md:px-10">
          <div className="mb-6 md:mb-10">
            <p className="eyebrow text-muted-foreground">{t("catalog.title")}</p>
            <h1 className="mt-2 font-serif text-2xl leading-tight sm:text-3xl md:mt-3 md:text-6xl">
              {categoryLabel ?? t("catalog.all")}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {total > 0 ? `${total} ${t("catalog.modelsSuffix")}` : productsQuery.isLoading ? t("catalog.loading") : t("catalog.empty")}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <select
                value={sort ?? ""}
                onChange={(e) =>
                  navigate({
                    search: (prev: CatalogSearch) => ({
                      ...prev,
                      sort: (e.target.value as CatalogSearch["sort"]) || undefined,
                      page: 1,
                    }),
                  })
                }
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.14em] md:flex-none"
              >
                <option value="">{t("catalog.sort.random")}</option>
                <option value="name">{t("catalog.sort.name")}</option>
                <option value="price-asc">{t("catalog.sort.priceAsc")}</option>
                <option value="price-desc">{t("catalog.sort.priceDesc")}</option>
              </select>
              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.14em] md:flex-none lg:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> {t("catalog.filters")}
                {activeCount > 0 && <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">{activeCount}</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">{filters}</aside>

            <section className="light-section rounded-sm p-4 md:p-8">
              {productsQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse bg-secondary" />
                  ))}
                </div>
              ) : productsQuery.data?.items.length ? (
                <>
                  <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                    {productsQuery.data.items.map((p) => (
                      <ProductCard key={p.sku} p={p as unknown as ProductCardType} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-14 flex items-center justify-center gap-2 text-sm">
                      <button
                        disabled={page <= 1}
                        onClick={() =>
                          navigate({
                            search: (prev: CatalogSearch) => ({ ...prev, page: page - 1 }),
                          })
                        }
                        className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] disabled:opacity-30"
                      >
                        {t("catalog.prev")}
                      </button>
                      <span className="px-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {page} / {totalPages}
                      </span>
                      <button
                        disabled={page >= totalPages}
                        onClick={() =>
                          navigate({
                            search: (prev: CatalogSearch) => ({ ...prev, page: page + 1 }),
                          })
                        }
                        className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] disabled:opacity-30"
                      >
                        {t("catalog.next")}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("catalog.nothing")}</p>
              )}
            </section>
          </div>
        </div>
      </main>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-6 shadow-2xl animate-in slide-in-from-bottom">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">{t("catalog.filters")}</h2>
              <button onClick={() => setMobileOpen(false)} className="p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filters}
            <button
              onClick={() => setMobileOpen(false)}
              className="mt-6 w-full rounded-full bg-foreground py-3 text-xs uppercase tracking-[0.2em] text-background"
            >
              {t("catalog.showCount")} {total} {t("catalog.itemsSuffix")}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

const THEME_LABELS: Record<string, string> = {
  dg_sicily: "Sicily Is My Love",
  dg_blu_mediterraneo: "Blu Mediterraneo",
  dg_divina_cucina: "Divina Cucina",
  porsche_green: "Porsche Shade Green",
  porsche_white: "Porsche Shade White",
  porsche_917: "Porsche 917",
};

function FacetGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between text-left"
      >
        <span className="eyebrow text-muted-foreground">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="space-y-1.5">{children}</div>}
    </div>
  );
}

function FilterPill({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1 text-[11px] text-foreground hover:bg-foreground/10"
    >
      <span>{children}</span>
      <X className="h-3 w-3" />
    </button>
  );
}

function ScrollableFacet({
  items,
  selected,
  onToggle,
}: {
  items: Array<{ value: string; count: number }>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const shown = expanded ? items : items.slice(0, 8);
  return (
    <div className="space-y-1.5">
      {shown.map((item) => (
        <label key={item.value} className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(item.value)}
            onChange={() => onToggle(item.value)}
            className="h-3.5 w-3.5 accent-foreground"
          />
          <span className="flex-1">{item.value}</span>
          <span className="text-[11px] text-muted-foreground">{item.count}</span>
        </label>
      ))}
      {items.length > 8 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
        >
          {expanded ? t("product.specs.hide") : `+ ${items.length - 8}`}
        </button>
      )}
    </div>
  );
}

// keep slugify import used
export const _slug = slugify;