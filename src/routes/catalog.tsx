import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  fetchCatalog,
  fetchCategories,
  fetchCategoriesScoped,
  fetchCategoriesForNavGroup,
  fetchColorSwatches,
  fetchFacets,
  fetchFacetsScoped,
  fetchFacetsForNavGroup,
  fetchProductsBySkus,
  fetchSkusForNavGroup,
  slugify,
} from "@/lib/products";
import { z } from "zod";
import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { categoryLabel as catLabel, familyLabel } from "@/lib/category-i18n";
import { parseCatalogOrder, sortCategoriesByOrder } from "@/lib/category-order";
import { parseCatalogGroupConfig, shouldGroupCatalogDisplay } from "@/lib/catalog-group-config";
import { parseModelGroupLabels, resolveModelGroupLabel } from "@/lib/model-group-labels";
import { sectionCategories, sectionFamilies, sectionTitleKey, resolveAccessoryCategoryRaw, type CatalogSection } from "@/lib/catalog-sections";
import { getEffectiveNavGroups } from "@/lib/catalog-nav";
import { resolveNavGroupFilters, navGroupLabel } from "@/lib/catalog-nav-groups";
import { useSiteContentBlock } from "@/lib/site-content";
import { ProductCard } from "@/components/site/ProductCard";
import { ModelColorPickerView } from "@/components/site/ModelColorPickerView";
import { SpecFiltersPanel } from "@/components/site/SpecFiltersPanel";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { colourLabel as colourI18n } from "@/lib/colour-i18n";
import { ColorSwatchDot } from "@/components/site/ColorSwatchDot";
import {
  countActiveSpecFilters,
  fetchSpecFacets,
  parseSpecSearchParam,
  serializeSpecSearchParam,
  type SpecFilters,
} from "@/lib/spec-filters";
import { canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

const searchSchema = z.object({
  category: z.string().optional(),
  family: z.string().optional(),
  q: z.string().optional(),
  colour: z.string().optional(), // csv
  aesthetic: z.string().optional(),
  theme: z.string().optional(),
  flag: z.enum(["is_featured", "is_new", "is_bestseller", "is_special_offer", "sale"]).optional(),
  inStock: z.boolean().optional(),
  sort: z.enum(["name", "price-asc", "price-desc"]).optional(),
  spec: z.string().optional(),
  section: z.enum(["large", "small", "accessories"]).optional(),
  navGroup: z.string().optional(),
  model: z.string().optional(),
  modelSkus: z.string().optional(),
  page: z.number().int().min(1).default(1),
});
type CatalogSearch = z.infer<typeof searchSchema>;

const split = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
const join = (arr: string[]) => (arr.length ? arr.join(",") : undefined);

/** Leave color-variant grid when any catalog filter changes. */
function withoutModelView(search: CatalogSearch): CatalogSearch {
  const { model: _m, modelSkus: _ms, ...rest } = search;
  return rest as CatalogSearch;
}

function patchCatalogSearch(prev: CatalogSearch, patch: Partial<CatalogSearch>): CatalogSearch {
  return { ...withoutModelView(prev), ...patch };
}

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

const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  oven: "ovens",
  "food-processor": "food-processors",
  "food-processors": "food-processors",
  knives: "knife-sets",
  "knife-block": "knife-sets",
};

function findCategoryBySlug(
  categories: Awaited<ReturnType<typeof fetchCategories>>,
  slug: string | undefined,
) {
  if (!slug) return undefined;
  const normalized = CATEGORY_SLUG_ALIASES[slug] ?? slug;
  return (
    categories.find((c) => c.slug === normalized) ??
    categories.find((c) => c.slug === slug) ??
    categories.find((c) => slugify(c.category) === normalized)
  );
}

function CatalogPage() {
  const search = Route.useSearch();
  const { category, family, q, page, flag, sort, theme, inStock, spec: specRaw, section, navGroup, model, modelSkus: modelSkusRaw } = search;
  const colours = split(search.colour);
  const aesthetics = split(search.aesthetic);
  const specFilters = parseSpecSearchParam(specRaw);
  const navigate = useNavigate({ from: Route.fullPath });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(() => Math.floor(Math.random() * 0xffffffff));
  const { lang, t } = useI18n();

  const modelSkuList = split(modelSkusRaw);

  const modelProductsQuery = useQuery({
    queryKey: ["model-color-products", modelSkuList.join(",")],
    queryFn: () => fetchProductsBySkus(modelSkuList),
    enabled: !!model && modelSkuList.length > 0,
    staleTime: 60_000,
  });

  const openModelColors = (item: { model_group?: string | null; variants?: import("@/lib/products").Variant[] }) => {
    const skus = item.variants?.map((v) => v.sku) ?? [];
    if (!item.model_group || skus.length < 2) return;
    navigate({
      search: (prev: CatalogSearch) => ({
        ...prev,
        model: item.model_group!,
        modelSkus: skus.join(","),
        page: 1,
      }),
    });
  };

  const backToModels = () => {
    navigate({
      search: (prev: CatalogSearch) => {
        const { model: _m, modelSkus: _ms, ...rest } = prev;
        return rest as CatalogSearch;
      },
    });
  };

  const catsQuery = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
  const categoriesBlock = useSiteContentBlock("categories");
  const navGroupDefs = useMemo(() => getEffectiveNavGroups(categoriesBlock ?? undefined), [categoriesBlock]);
  const catalogOrder = useMemo(() => parseCatalogOrder(categoriesBlock ?? {}), [categoriesBlock]);
  const grouping = useMemo(
    () => ({
      config: parseCatalogGroupConfig(categoriesBlock),
      modelGroupLabels: parseModelGroupLabels(categoriesBlock),
    }),
    [categoriesBlock],
  );
  const facetsQuery = useQuery({ queryKey: ["facets"], queryFn: fetchFacets, staleTime: 10 * 60_000 });
  const swatchesQuery = useQuery({ queryKey: ["color-swatches"], queryFn: fetchColorSwatches, staleTime: 30 * 60_000 });

  const currentCat = findCategoryBySlug(catsQuery.data ?? [], category);
  const categoryRawList = currentCat?.raw;
  const categoryLabel = currentCat
    ? catLabel(currentCat.category, lang, {
        hy: currentCat.category_hy,
        en: currentCat.category_en ?? currentCat.category,
        ru: currentCat.category_ru,
      })
    : undefined;

  const familyTitle = family ? familyLabel(family, lang) : undefined;

  const navGroupDef = navGroup ? navGroupDefs.find((g) => g.id === navGroup) : undefined;
  const navGroupTitle = navGroupDef ? navGroupLabel(navGroupDef, lang) : undefined;

  /** Nav-group OR filter applies only for «вся группа» links — not when a category/family is picked. */
  const navGroupOnly = !!navGroup && !category && !family;

  const sortedCategories = sortCategoriesByOrder(catsQuery.data ?? [], catalogOrder);

  const sectionFamilyList = sectionFamilies(section);
  const accessoryRaw =
    section === "accessories" && catsQuery.data?.length
      ? resolveAccessoryCategoryRaw(catsQuery.data)
      : undefined;
  const sectionCategoryList = accessoryRaw?.length
    ? accessoryRaw
    : sectionCategories(section);
  const navGroupFilters = useMemo(() => {
    if (!navGroupOnly || !catsQuery.data) return null;
    return resolveNavGroupFilters(navGroup, navGroupDefs, catsQuery.data);
  }, [navGroupOnly, navGroup, navGroupDefs, catsQuery.data]);

  const effectiveFamilies = family
    ? [family]
    : category
      ? undefined
      : navGroupFilters?.families.length
        ? navGroupFilters.families
        : sectionFamilyList;
  const effectiveCategoryIn =
    categoryRawList ??
    (navGroupFilters?.categoryIn.length ? navGroupFilters.categoryIn : undefined) ??
    (sectionCategoryList?.length && !category ? sectionCategoryList : undefined);

  const catalogScoped = !!(navGroupFilters || section || (effectiveFamilies?.length && !navGroupFilters) || (effectiveCategoryIn?.length && !navGroupFilters));

  const scopedCatsQuery = useQuery({
    queryKey: ["catalog-categories-scoped", section ?? "", navGroup ?? "", effectiveFamilies ?? null, effectiveCategoryIn ?? null, inStock ?? false],
    queryFn: () =>
      navGroupFilters
        ? fetchCategoriesForNavGroup(navGroupFilters, { inStock })
        : fetchCategoriesScoped({
            families: effectiveFamilies,
            categoryIn: effectiveCategoryIn,
            inStock,
          }),
    enabled: catalogScoped,
    staleTime: 5 * 60_000,
  });

  const sidebarCategories = sortCategoriesByOrder(
    catalogScoped ? (scopedCatsQuery.data ?? []) : sortedCategories,
    catalogOrder,
  );

  const scopedFacetsQuery = useQuery({
    queryKey: ["facets-scoped", section ?? "", navGroup ?? "", effectiveFamilies ?? null, effectiveCategoryIn ?? null, inStock ?? false],
    queryFn: () =>
      navGroupFilters
        ? fetchFacetsForNavGroup(navGroupFilters, { inStock })
        : fetchFacetsScoped({
            families: effectiveFamilies,
            categoryIn: effectiveCategoryIn,
            inStock,
          }),
    enabled: catalogScoped,
    staleTime: 60_000,
  });

  const activeFacets = catalogScoped ? scopedFacetsQuery.data : facetsQuery.data;

  const groupByColor = shouldGroupCatalogDisplay(
    grouping.config,
    {
      categorySlug: category,
      section: (section ?? navGroupDef?.section) as CatalogSection | undefined,
    },
    {
      colours,
      aesthetics,
      search: q,
      hasSpecFilters: countActiveSpecFilters(specFilters) > 0,
      flag,
      inStock,
      theme,
    },
  );
  const modelGroupLabels = grouping.modelGroupLabels;
  const hideSpecFilters = !!model;

  // colour value (canonical) → localized label for current lang
  const colourLabel = (value: string) => {
    const f = activeFacets?.colours.find((c) => c.value === value);
    const canonical = f?.value_en ?? value;
    if (lang === "hy") return f?.label_hy || colourI18n(canonical, lang);
    if (lang === "en") return f?.label_en || colourI18n(canonical, lang);
    return colourI18n(canonical, lang);
  };

  const specFacetsQuery = useQuery({
    queryKey: [
      "spec-facets",
      navGroup ?? "",
      effectiveCategoryIn ?? null,
      effectiveFamilies ?? null,
      colours,
      aesthetics,
      inStock ?? false,
      specRaw ?? "",
    ],
    queryFn: async () => {
      if (navGroupFilters) {
        const skus = await fetchSkusForNavGroup(navGroupFilters);
        return fetchSpecFacets({
          skus,
          colours: colours.length ? colours : undefined,
          aesthetics: aesthetics.length ? aesthetics : undefined,
          inStock,
          active: specFilters,
        });
      }
      return fetchSpecFacets({
        categories: effectiveCategoryIn,
        families: effectiveFamilies,
        colours: colours.length ? colours : undefined,
        aesthetics: aesthetics.length ? aesthetics : undefined,
        inStock,
        active: specFilters,
      });
    },
    staleTime: 60_000,
  });

  const productsQuery = useQuery({
    queryKey: ["catalog", currentCat?.slug ?? null, family ?? "", section ?? "", navGroup ?? "", groupByColor, q ?? "", colours, aesthetics, theme ?? "", flag ?? "", inStock ?? false, sort ?? "", specRaw ?? "", page, shuffleKey],
    queryFn: () =>
      fetchCatalog({
        categoryIn: effectiveCategoryIn,
        families: effectiveFamilies,
        search: q || undefined,
        colours: colours.length ? colours : undefined,
        aesthetics: aesthetics.length ? aesthetics : undefined,
        theme: theme || undefined,
        flag,
        inStock,
        specFilters,
        groupByColor,
        sort,
        shuffleSeed: sort ? undefined : shuffleKey,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        skuIn: navGroupFilters?.skus.length ? navGroupFilters.skus : undefined,
        navGroupFilters: navGroupFilters ?? undefined,
      }),
    enabled: !category || !!categoryRawList || !!navGroup || !!section || !!family || !!q,
  });

  const swatchHex = (canonical: string) =>
    swatchesQuery.data?.find((s) => s.colour === canonical)?.hex ?? "#d4d4d4";

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleIn = (key: "colour" | "aesthetic", value: string) => {
    const current = split(search[key]);
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    navigate({ search: (prev: CatalogSearch) => patchCatalogSearch(prev, { [key]: join(next), page: 1 }) });
  };

  const clearAll = () =>
    navigate({ search: { page: 1 } as CatalogSearch });

  const setSpecFilters = (next: SpecFilters) => {
    navigate({
      search: (prev: CatalogSearch) =>
        patchCatalogSearch(prev, { spec: serializeSpecSearchParam(next), page: 1 }),
    });
  };

  const toggleSpecEnum = (slug: string, value: string) => {
    const current = [...((specFilters[slug] as string[] | undefined) ?? [])];
    const nextVals = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    const next = { ...specFilters };
    if (nextVals.length) next[slug] = nextVals;
    else delete next[slug];
    setSpecFilters(next);
  };

  const setSpecRange = (slug: string, min?: number, max?: number) => {
    const next = { ...specFilters };
    if (min == null && max == null) delete next[slug];
    else next[slug] = { min, max };
    setSpecFilters(next);
  };

  const clearSpecField = (slug: string) => {
    const next = { ...specFilters };
    delete next[slug];
    setSpecFilters(next);
  };

  const activeCount =
    colours.length +
    aesthetics.length +
    (flag ? 1 : 0) +
    (inStock ? 1 : 0) +
    (q ? 1 : 0) +
    (theme ? 1 : 0) +
    (family ? 1 : 0) +
    (section ? 1 : 0) +
    countActiveSpecFilters(specFilters);

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
                search: (prev: CatalogSearch) =>
                  patchCatalogSearch(prev, { q: v || undefined, category: undefined, page: 1 }),
              });
            }
          }}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => patchCatalogSearch(prev, { q: undefined, page: 1 }) })}>
              «{q}»
            </FilterPill>
          )}
          {theme && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => patchCatalogSearch(prev, { theme: undefined, page: 1 }) })}>
              ✦ {THEME_LABELS[theme] ?? theme}
            </FilterPill>
          )}
          {flag && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => patchCatalogSearch(prev, { flag: undefined, page: 1 }) })}>
              {t(`flag.${flag}`)}
            </FilterPill>
          )}
          {inStock && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => patchCatalogSearch(prev, { inStock: undefined, page: 1 }) })}>
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
              search: (prev: CatalogSearch) => patchCatalogSearch(prev, { inStock: inStock ? undefined : true, page: 1 }),
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
                search: (prev: CatalogSearch) => patchCatalogSearch(prev, { flag: flag === k ? undefined : k, page: 1 }),
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
          onClick={() => navigate({ search: (prev: CatalogSearch) => patchCatalogSearch(prev, { category: undefined, section: undefined, navGroup: undefined, family: undefined, page: 1 }) })}
          className={`block w-full text-left text-sm ${!category && !section && !navGroup && !family ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
        >
          {t("facet.all")}
        </button>
        <div className="mb-3 mt-2 space-y-1 border-b border-border pb-3">
          {(["large", "small", "accessories"] as const).map((s) => (
            <button
              key={s}
              onClick={() =>
                navigate({
                  search: (prev: CatalogSearch) =>
                    patchCatalogSearch(prev, {
                      section: section === s ? undefined : s,
                      category: undefined,
                      navGroup: undefined,
                      family: undefined,
                      page: 1,
                    }),
                })
              }
              className={`block w-full text-left text-sm transition ${section === s ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
            >
              {t(`catalog.section.${s}`)}
            </button>
          ))}
        </div>
        {navGroupOnly && navGroupTitle && (
          <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t("catalog.sidebar.inCollection")}: {navGroupTitle}
          </p>
        )}
        {section && !navGroupOnly && (
          <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t("catalog.sidebar.inSection")}: {t(`catalog.section.${section}`)}
          </p>
        )}
        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          {sidebarCategories.map((c) => (
            <button
              key={c.slug}
              onClick={() =>
                navigate({
                  search: (prev: CatalogSearch) =>
                    patchCatalogSearch(prev, {
                      category: c.slug,
                      section: undefined,
                      navGroup: undefined,
                      family: undefined,
                      page: 1,
                    }),
                })
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
          {activeFacets?.colours
            .filter((c) => (c.value_en ?? c.value) !== "Decorated / Special")
            .slice(0, 30)
            .map((c) => {
            const hex = swatchesQuery.data?.find((s) => s.colour === (c.value_en ?? c.value))?.hex ?? "#d4d4d4";
            const active = colours.includes(c.value);
            const label = colourLabel(c.value);
            const canonical = c.value_en ?? c.value;
            return (
              <ColorSwatchDot
                key={c.value}
                colourName={canonical}
                hex={hex}
                size="md"
                active={active}
                title={`${label} (${c.count})`}
                onClick={() => toggleIn("colour", c.value)}
              />
            );
          })}
        </div>
      </FacetGroup>

      <FacetGroup label={t("facet.aesthetic")}>
        <ScrollableFacet
          items={activeFacets?.aesthetics ?? []}
          selected={aesthetics}
          onToggle={(v) => toggleIn("aesthetic", v)}
        />
      </FacetGroup>

      {!hideSpecFilters && (
        <SpecFiltersPanel
          facets={specFacetsQuery.data ?? []}
          active={specFilters}
          onToggleEnum={toggleSpecEnum}
          onSetRange={setSpecRange}
          onClearField={clearSpecField}
        />
      )}

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
              {categoryLabel ??
                familyTitle ??
                navGroupTitle ??
                (section ? t(sectionTitleKey(section as CatalogSection)!) : t("catalog.all"))}
            </h1>

            <div className="mt-5 flex items-center gap-3">
              <select
                value={sort ?? ""}
                onChange={(e) => {
                  const nextSort = (e.target.value as CatalogSearch["sort"]) || undefined;
                  if (!nextSort) setShuffleKey(Math.floor(Math.random() * 0xffffffff));
                  navigate({
                    search: (prev: CatalogSearch) => patchCatalogSearch(prev, { sort: nextSort, page: 1 }),
                  });
                }}
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.14em] md:flex-none"
              >
                <option value="">{t("catalog.sort.random")}</option>
                <option value="name">{t("catalog.sort.name")}</option>
                <option value="price-asc">{t("catalog.sort.priceAsc")}</option>
                <option value="price-desc">{t("catalog.sort.priceDesc")}</option>
              </select>
              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.14em] sm:flex-none md:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> {t("catalog.filters")}
                {activeCount > 0 && <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">{activeCount}</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-[260px_1fr]">
            <aside className="hidden md:block md:sticky md:top-28 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:pr-2">{filters}</aside>

            <section className="light-section rounded-sm p-4 md:p-8">
              {model && modelProductsQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse bg-secondary" />
                  ))}
                </div>
              ) : model && modelProductsQuery.data?.length ? (
                <ModelColorPickerView
                  products={modelProductsQuery.data}
                  onBack={backToModels}
                  onResetFilters={clearAll}
                  modelGroupLabels={modelGroupLabels}
                />
              ) : model ? (
                <div>
                  <button
                    type="button"
                    onClick={backToModels}
                    className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
                  >
                    ← {t("catalog.backToModels")}
                  </button>
                  <p className="text-sm text-muted-foreground">{t("catalog.nothing")}</p>
                </div>
              ) : productsQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse bg-secondary" />
                  ))}
                </div>
              ) : productsQuery.data?.items.length ? (
                <>
                  <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                    {productsQuery.data.items.map((p) => {
                      const item = p as unknown as ProductCardType & {
                        variants?: import("@/lib/products").Variant[];
                        variantCount?: number;
                        model_group?: string | null;
                      };
                      const count = item.variantCount ?? item.variants?.length ?? 1;
                      const isMulti = count > 1 && groupByColor;
                      const label = isMulti
                        ? resolveModelGroupLabel(modelGroupLabels, lang, item.model_group, item.sku, {
                            variants: item.variants,
                          })
                        : {};
                      return (
                      <ProductCard
                        key={p.sku}
                        p={item}
                        variants={item.variants}
                        priceFrom={p.priceFrom}
                        variantCount={item.variantCount}
                        swatchHex={groupByColor ? swatchHex : undefined}
                        displayName={label.name}
                        displayImage={label.image}
                        onChooseColor={
                          groupByColor && (item.variantCount ?? 0) > 1
                            ? () => openModelColors(item)
                            : undefined
                        }
                      />
                      );
                    })}
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
        <div className="fixed inset-0 z-50 md:hidden">
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