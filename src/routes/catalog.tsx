import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { fetchCategories, fetchProducts, slugify } from "@/lib/products";
import { z } from "zod";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).default(1),
});
type CatalogSearch = z.infer<typeof searchSchema>;

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
  const { category, q, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const catsQuery = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });

  const categoryName = category
    ? catsQuery.data?.find((c) => c.slug === category)?.category
    : undefined;

  const productsQuery = useQuery({
    queryKey: ["catalog", categoryName ?? null, q ?? "", page],
    queryFn: () =>
      fetchProducts({
        category: categoryName,
        search: q || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      }),
    enabled: !category || !!categoryName,
  });

  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-20">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <div className="mb-10">
            <p className="eyebrow text-muted-foreground">Каталог</p>
            <h1 className="mt-3 font-serif text-4xl md:text-6xl">
              {categoryName ?? "Вся техника Smeg"}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {total > 0 ? `${total} моделей` : "Загрузка…"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr]">
            <aside className="space-y-6">
              <div>
                <label className="eyebrow mb-2 block text-muted-foreground">Поиск</label>
                <input
                  type="search"
                  defaultValue={q ?? ""}
                  placeholder="Артикул или название"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const v = (e.target as HTMLInputElement).value.trim();
                      navigate({
                        search: (prev: CatalogSearch) => ({ ...prev, q: v || undefined, page: 1 }),
                      });
                    }
                  }}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
              <div>
                <p className="eyebrow mb-3 text-muted-foreground">Категории</p>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <button
                      onClick={() =>
                        navigate({ search: { page: 1, q: q || undefined } as never })
                      }
                      className={`block w-full text-left transition-colors hover:text-foreground ${
                        !category ? "font-medium text-foreground" : "text-foreground/60"
                      }`}
                    >
                      Все категории
                    </button>
                  </li>
                  {catsQuery.data?.map((c) => (
                    <li key={c.slug}>
                      <button
                        onClick={() =>
                          navigate({
                            search: { category: c.slug, page: 1, q: q || undefined } as never,
                          })
                        }
                        className={`flex w-full items-baseline justify-between gap-3 text-left transition-colors hover:text-foreground ${
                          category === c.slug
                            ? "font-medium text-foreground"
                            : "text-foreground/60"
                        }`}
                      >
                        <span>{c.category}</span>
                        <span className="text-[11px] text-muted-foreground">{c.count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <section>
              {productsQuery.isLoading ? (
                <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse bg-secondary" />
                  ))}
                </div>
              ) : productsQuery.data?.items.length ? (
                <>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
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
      <Footer />
    </div>
  );
}

// keep slugify import used
export const _slug = slugify;