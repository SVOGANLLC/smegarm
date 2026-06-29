import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { fetchColorSwatches, fetchVariantsByModelGroups, type ProductCard } from "@/lib/products";
import { parseCatalogGroupConfig } from "@/lib/catalog-group-config";
import { supabase } from "@/integrations/supabase/client";
import {
  countActiveSpecFilters,
  fetchSpecFacets,
  parseSpecSearchParam,
  serializeSpecSearchParam,
  type SpecFilters,
} from "@/lib/spec-filters";
import {
  filterListingProducts,
  groupListingProducts,
  tallyListingFacet,
  type ListingDisplayItem,
} from "@/lib/product-listing";
import { SpecFiltersPanel } from "@/components/site/SpecFiltersPanel";
import { ProductGrid } from "@/components/site/ProductCard";
import { colourLabel as colourI18n } from "@/lib/colour-i18n";

export type ListingSearch = {
  colour?: string;
  aesthetic?: string;
  spec?: string;
  inStock?: boolean;
};

type Props = {
  products: ProductCard[];
  search: ListingSearch;
  onSearchChange: (next: ListingSearch) => void;
  groupByColor?: boolean;
};

const split = (v?: string) => (v ? v.split(",").filter(Boolean) : []);

export function ProductListingShell({ products, search, onSearchChange, groupByColor = true }: Props) {
  const { lang, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const colours = split(search.colour);
  const aesthetics = split(search.aesthetic);
  const specFilters = parseSpecSearchParam(search.spec);
  const inStock = search.inStock ?? false;

  const groupConfigQuery = useQuery({
    queryKey: ["site-content", "categories-grouping"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "categories").maybeSingle();
      return parseCatalogGroupConfig((data?.value ?? {}) as Record<string, Partial<Record<"ru" | "en" | "hy", string>>>);
    },
    staleTime: 60_000,
  });
  const doGroup = groupByColor && (groupConfigQuery.data?.enabled ?? true);

  const allSkus = useMemo(() => products.map((p) => p.sku), [products]);

  const filteredQuery = useQuery({
    queryKey: ["listing-filtered", allSkus, colours, aesthetics, inStock, search.spec ?? ""],
    queryFn: () =>
      filterListingProducts(products, {
        colours: colours.length ? colours : undefined,
        aesthetics: aesthetics.length ? aesthetics : undefined,
        inStock,
        specFilters,
      }),
    enabled: products.length > 0,
  });

  const filtered = filteredQuery.data ?? [];

  const variantsQuery = useQuery({
    queryKey: ["listing-variants", filtered.map((p) => p.sku), doGroup],
    queryFn: async () => {
      if (!doGroup) return new Map<string, import("@/lib/products").Variant[]>();
      const groups = [...new Set(filtered.map((p) => p.model_group).filter(Boolean) as string[])];
      return fetchVariantsByModelGroups(groups);
    },
    enabled: doGroup && filtered.length > 0,
  });

  const displayItems: ListingDisplayItem[] = useMemo(() => {
    if (!doGroup) return filtered;
    return groupListingProducts(filtered, variantsQuery.data ?? new Map());
  }, [filtered, doGroup, variantsQuery.data]);

  const specFacetsQuery = useQuery({
    queryKey: ["spec-facets-listing", allSkus, colours, aesthetics, inStock, search.spec ?? ""],
    queryFn: () =>
      fetchSpecFacets({
        skus: allSkus,
        colours: colours.length ? colours : undefined,
        aesthetics: aesthetics.length ? aesthetics : undefined,
        inStock,
        active: specFilters,
      }),
    enabled: allSkus.length > 0,
    staleTime: 60_000,
  });

  const swatchesQuery = useQuery({ queryKey: ["color-swatches"], queryFn: fetchColorSwatches, staleTime: 30 * 60_000 });
  const colourFacets = useMemo(() => tallyListingFacet(products, "colour"), [products]);
  const aestheticFacets = useMemo(() => tallyListingFacet(products, "aesthetic"), [products]);

  const swatchHex = (canonical: string) => swatchesQuery.data?.find((s) => s.colour === canonical)?.hex ?? "#d4d4d4";

  const colourLabel = (value: string) => {
    const row = products.find((p) => p.colour === value);
    const canonical = row?.colour_en ?? value;
    if (lang === "hy" && row?.colour_hy) return row.colour_hy;
    if (lang === "en" && row?.colour_en) return row.colour_en;
    return colourI18n(canonical, lang);
  };

  const activeCount =
    colours.length + aesthetics.length + (inStock ? 1 : 0) + countActiveSpecFilters(specFilters);

  const setSpecFilters = (next: SpecFilters) => {
    onSearchChange({ ...search, spec: serializeSpecSearchParam(next) });
  };

  const toggleList = (key: "colour" | "aesthetic", value: string) => {
    const current = split(search[key]);
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    onSearchChange({ ...search, [key]: next.length ? next.join(",") : undefined });
  };

  const clearAll = () => onSearchChange({});

  const filters = (
    <div className="space-y-7">
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="w-full rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:border-foreground"
        >
          {t("catalog.reset")} ({activeCount})
        </button>
      )}

      <div>
        <p className="eyebrow mb-3 text-muted-foreground">{t("facet.marketing")}</p>
        <button
          type="button"
          onClick={() => onSearchChange({ ...search, inStock: inStock ? undefined : true })}
          className={`block w-full text-left text-sm ${inStock ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
        >
          {t("avail.inStock")}
        </button>
      </div>

      {colourFacets.length > 0 && (
        <div>
          <p className="eyebrow mb-3 text-muted-foreground">{t("facet.colour")}</p>
          <div className="flex flex-wrap gap-2">
            {colourFacets.slice(0, 24).map((c) => {
              const row = products.find((p) => p.colour === c.value);
              const hex = swatchHex(row?.colour_en ?? c.value);
              const active = colours.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  title={`${colourLabel(c.value)} (${c.count})`}
                  onClick={() => toggleList("colour", c.value)}
                  className={`h-7 w-7 rounded-full border transition ${active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background border-transparent" : "border-border hover:border-foreground"}`}
                  style={{ background: hex }}
                />
              );
            })}
          </div>
        </div>
      )}

      {aestheticFacets.length > 0 && (
        <div>
          <p className="eyebrow mb-3 text-muted-foreground">{t("facet.aesthetic")}</p>
          <div className="space-y-1.5">
            {aestheticFacets.map((item) => (
              <label key={item.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={aesthetics.includes(item.value)}
                  onChange={() => toggleList("aesthetic", item.value)}
                  className="h-3.5 w-3.5 accent-foreground"
                />
                <span className="flex-1">{item.value}</span>
                <span className="text-[11px] text-muted-foreground">{item.count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <SpecFiltersPanel
        facets={specFacetsQuery.data ?? []}
        active={specFilters}
        onToggleEnum={(slug, value) => {
          const current = [...((specFilters[slug] as string[] | undefined) ?? [])];
          const nextVals = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
          const next = { ...specFilters };
          if (nextVals.length) next[slug] = nextVals;
          else delete next[slug];
          setSpecFilters(next);
        }}
        onSetRange={(slug, min, max) => {
          const next = { ...specFilters };
          if (min == null && max == null) delete next[slug];
          else next[slug] = { min, max };
          setSpecFilters(next);
        }}
        onClearField={(slug) => {
          const next = { ...specFilters };
          delete next[slug];
          setSpecFilters(next);
        }}
      />
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex items-center gap-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.14em]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> {t("catalog.filters")}
          {activeCount > 0 && <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">{activeCount}</span>}
        </button>
        <span className="text-xs text-muted-foreground">
          {displayItems.length} {t("catalog.modelsSuffix")}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">
          {filters}
        </aside>
        <section>
          {filteredQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">{t("catalog.loading")}</p>
          ) : displayItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("catalog.nothing")}</p>
          ) : (
            <ProductGrid items={displayItems} swatchHex={doGroup ? swatchHex : undefined} />
          )}
        </section>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">{t("catalog.filters")}</h2>
              <button type="button" onClick={() => setMobileOpen(false)} className="p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filters}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="mt-6 w-full rounded-full bg-foreground py-3 text-xs uppercase tracking-[0.2em] text-background"
            >
              {t("catalog.showCount")} {displayItems.length}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
