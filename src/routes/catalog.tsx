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

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  colour: z.string().optional(), // csv
  family: z.string().optional(),
  aesthetic: z.string().optional(),
  flag: z.enum(["is_featured", "is_new", "is_bestseller", "is_special_offer", "sale"]).optional(),
  sort: z.enum(["name", "price-asc", "price-desc"]).optional(),
  page: z.number().int().min(1).default(1),
});
type CatalogSearch = z.infer<typeof searchSchema>;

const split = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
const join = (arr: string[]) => (arr.length ? arr.join(",") : undefined);

export const Route = createFileRoute("/catalog")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Smeg Armenia — Каталог" },
      {
        name: "description",
        content:
          "Полный каталог техники Smeg в Армении: холодильники, духовки, варочные панели, кофемашины и мелкая бытовая техника.",
      },
      { property: "og:title", content: "Каталог Smeg Armenia" },
      { property: "og:type", content: "website" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-serif text-2xl">Каталог временно недоступен</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Не найдено</div>,
  component: CatalogPage,
});

const PAGE_SIZE = 36;

function CatalogPage() {
  const search = Route.useSearch();
  const { category, q, page, flag, sort } = search;
  const colours = split(search.colour);
  const families = split(search.family);
  const aesthetics = split(search.aesthetic);
  const navigate = useNavigate({ from: Route.fullPath });
  const [mobileOpen, setMobileOpen] = useState(false);

  const catsQuery = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
  const facetsQuery = useQuery({ queryKey: ["facets"], queryFn: fetchFacets, staleTime: 10 * 60_000 });
  const swatchesQuery = useQuery({ queryKey: ["color-swatches"], queryFn: fetchColorSwatches, staleTime: 30 * 60_000 });

  const categoryName = category
    ? catsQuery.data?.find((c) => c.slug === category)?.category
    : undefined;

  const productsQuery = useQuery({
    queryKey: ["catalog", categoryName ?? null, q ?? "", colours, families, aesthetics, flag ?? "", sort ?? "", page],
    queryFn: () =>
      fetchCatalog({
        category: categoryName,
        search: q || undefined,
        colours: colours.length ? colours : undefined,
        families: families.length ? families : undefined,
        aesthetics: aesthetics.length ? aesthetics : undefined,
        flag,
        sort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: !category || !!categoryName,
  });

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleIn = (key: "colour" | "family" | "aesthetic", value: string) => {
    const current = split(search[key]);
    const next = current.includes(value) ? current.filter((x) => x !== value) : [...current, value];
    navigate({ search: (prev: CatalogSearch) => ({ ...prev, [key]: join(next), page: 1 }) });
  };

  const clearAll = () =>
    navigate({ search: { page: 1 } as CatalogSearch });

  const activeCount =
    colours.length + families.length + aesthetics.length + (flag ? 1 : 0) + (q ? 1 : 0);

  const filters = (
    <div className="space-y-7">
      <div>
        <label className="eyebrow mb-2 block text-muted-foreground">Поиск</label>
        <input
          type="search"
          defaultValue={q ?? ""}
          placeholder="Артикул или название"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = (e.target as HTMLInputElement).value.trim();
              navigate({ search: (prev: CatalogSearch) => ({ ...prev, q: v || undefined, page: 1 }) });
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
          {flag && (
            <FilterPill onClear={() => navigate({ search: (prev: CatalogSearch) => ({ ...prev, flag: undefined, page: 1 }) })}>
              {FLAG_LABELS[flag]}
            </FilterPill>
          )}
          {aesthetics.map((v) => (
            <FilterPill key={v} onClear={() => toggleIn("aesthetic", v)}>{v}</FilterPill>
          ))}
          {families.map((v) => (
            <FilterPill key={v} onClear={() => toggleIn("family", v)}>{v}</FilterPill>
          ))}
          {colours.map((v) => (
            <FilterPill key={v} onClear={() => toggleIn("colour", v)}>{v}</FilterPill>
          ))}
        </div>
      )}

      <FacetGroup label="Маркетинг">
        {(
          [
            ["is_bestseller", "Хит продаж"],
            ["is_new", "Новинки"],
            ["is_special_offer", "Спецпредложения"],
            ["sale", "Со скидкой"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() =>
              navigate({
                search: (prev: CatalogSearch) => ({ ...prev, flag: flag === k ? undefined : k, page: 1 }),
              })
            }
            className={`block w-full text-left text-sm transition ${flag === k ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </FacetGroup>

      <FacetGroup label="Категории" defaultOpen>
        <button
          onClick={() => navigate({ search: (prev: CatalogSearch) => ({ ...prev, category: undefined, page: 1 }) })}
          className={`block w-full text-left text-sm ${!category ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
        >
          Все
        </button>
        {catsQuery.data?.slice(0, 12).map((c) => (
          <button
            key={c.slug}
            onClick={() =>
              navigate({ search: (prev: CatalogSearch) => ({ ...prev, category: c.slug, page: 1 }) })
            }
            className={`flex w-full items-baseline justify-between text-left text-sm transition ${category === c.slug ? "font-medium text-foreground" : "text-foreground/60 hover:text-foreground"}`}
          >
            <span>{c.category}</span>
            <span className="text-[11px] text-muted-foreground">{c.count}</span>
          </button>
        ))}
      </FacetGroup>

      <FacetGroup label="Цвет">
        <div className="flex flex-wrap gap-2">
          {facetsQuery.data?.colours
            .filter((c) => c.value !== "Decorated / Special")
            .slice(0, 30)
            .map((c) => {
            const hex = swatchesQuery.data?.find((s) => s.colour === c.value)?.hex ?? "#d4d4d4";
            const active = colours.includes(c.value);
            return (
              <button
                key={c.value}
                title={`${c.value} (${c.count})`}
                onClick={() => toggleIn("colour", c.value)}
                className={`h-7 w-7 rounded-full border transition ${active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background border-transparent" : "border-border hover:border-foreground"}`}
                style={{ background: hex }}
              />
            );
          })}
        </div>
      </FacetGroup>

      <FacetGroup label="Эстетика">
        <ScrollableFacet
          items={facetsQuery.data?.aesthetics ?? []}
          selected={aesthetics}
          onToggle={(v) => toggleIn("aesthetic", v)}
        />
      </FacetGroup>

      <FacetGroup label="Тип техники">
        <ScrollableFacet
          items={facetsQuery.data?.families ?? []}
          selected={families}
          onToggle={(v) => toggleIn("family", v)}
        />
      </FacetGroup>

      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:border-foreground"
        >
          Сбросить ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="mb-8 md:mb-10">
            <p className="eyebrow text-muted-foreground">Каталог</p>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl md:text-6xl">
              {categoryName ?? "Вся техника Smeg"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {total > 0 ? `${total} моделей` : productsQuery.isLoading ? "Загрузка…" : "Нет результатов"}
            </p>

            <div className="mt-5 flex items-center gap-3">
              <select
                value={sort ?? "name"}
                onChange={(e) =>
                  navigate({
                    search: (prev: CatalogSearch) => ({
                      ...prev,
                      sort: (e.target.value as CatalogSearch["sort"]) ?? undefined,
                      page: 1,
                    }),
                  })
                }
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-xs uppercase tracking-[0.14em] md:flex-none"
              >
                <option value="name">По названию</option>
                <option value="price-asc">Цена ↑</option>
                <option value="price-desc">Цена ↓</option>
              </select>
              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-[0.14em] md:flex-none lg:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Фильтры
                {activeCount > 0 && <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">{activeCount}</span>}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2">{filters}</aside>

            <section>
              {productsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse bg-secondary" />
                  ))}
                </div>
              ) : productsQuery.data?.items.length ? (
                <>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                    {productsQuery.data.items.map((p) => (
                      <Link
                        key={p.sku}
                        to="/product/$sku"
                        params={{ sku: p.sku }}
                        className="group block"
                      >
                        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-secondary">
                          {p.main_image ? (
                            <img
                              src={p.main_image}
                              alt={p.name}
                              loading="lazy"
                              className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                              нет фото
                            </div>
                          )}
                        </div>
                        <div className="mt-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {p.sku}
                          </p>
                          <h3 className="mt-1 line-clamp-2 font-serif text-base leading-snug text-foreground group-hover:text-accent">
                            {p.name}
                          </h3>
                        </div>
                      </Link>
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
                        ← Назад
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
                        Дальше →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Ничего не найдено.</p>
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
              <h2 className="font-serif text-xl">Фильтры</h2>
              <button onClick={() => setMobileOpen(false)} className="p-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            {filters}
            <button
              onClick={() => setMobileOpen(false)}
              className="mt-6 w-full rounded-full bg-foreground py-3 text-xs uppercase tracking-[0.2em] text-background"
            >
              Показать {total} товаров
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

const FLAG_LABELS: Record<string, string> = {
  is_bestseller: "Хит продаж",
  is_new: "Новинки",
  is_special_offer: "Спецпредложения",
  sale: "Со скидкой",
  is_featured: "Избранное",
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
          {expanded ? "Свернуть" : `Ещё ${items.length - 8}`}
        </button>
      )}
    </div>
  );
}

// keep slugify import used
export const _slug = slugify;