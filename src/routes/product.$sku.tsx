import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { fetchProductBySku } from "@/lib/products";
import { useState } from "react";

export const Route = createFileRoute("/product/$sku")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData({
      queryKey: ["product", params.sku],
      queryFn: () => fetchProductBySku(params.sku),
    });
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData?.product
      ? [
          { title: `${loaderData.product.name} (${loaderData.product.sku}) — Smeg Armenia` },
          {
            name: "description",
            content: (loaderData.product.description ?? loaderData.product.name).slice(0, 160),
          },
          { property: "og:title", content: loaderData.product.name },
          {
            property: "og:description",
            content: (loaderData.product.description ?? "").slice(0, 200),
          },
          ...(loaderData.product.main_image
            ? [
                { property: "og:image", content: loaderData.product.main_image },
                { name: "twitter:image", content: loaderData.product.main_image },
              ]
            : []),
        ]
      : [{ title: "Smeg Armenia" }],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-serif text-2xl">Не удалось загрузить товар</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Link to="/catalog" className="mt-4 inline-block underline">
          К каталогу
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-serif text-2xl">Товар не найден</h1>
        <Link to="/catalog" className="mt-4 inline-block underline">
          К каталогу
        </Link>
      </div>
    </div>
  ),
  component: ProductPage,
});

function ProductPage() {
  const { sku } = Route.useParams();
  const { data: product } = useSuspenseQuery({
    queryKey: ["product", sku],
    queryFn: () => fetchProductBySku(sku),
  });
  const gallery = product?.images?.length ? product.images : product?.main_image ? [product.main_image] : [];
  const [active, setActive] = useState(0);
  if (!product) return null;
  const specEntries = Object.entries(product.specs ?? {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <nav className="mb-8 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Link to="/catalog" className="hover:text-foreground">
              Каталог
            </Link>
            {product.category && (
              <>
                <span>/</span>
                <span>{product.category}</span>
              </>
            )}
          </nav>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="relative aspect-square overflow-hidden rounded-sm bg-secondary">
                {gallery[active] ? (
                  <img
                    src={gallery[active]}
                    alt={product.name}
                    className="h-full w-full object-contain p-10"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    нет фото
                  </div>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="mt-4 grid grid-cols-6 gap-2">
                  {gallery.slice(0, 12).map((src, i) => (
                    <button
                      key={src + i}
                      onClick={() => setActive(i)}
                      className={`aspect-square overflow-hidden rounded-sm border bg-secondary transition ${
                        active === i ? "border-foreground" : "border-transparent hover:border-border"
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-contain p-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="eyebrow text-muted-foreground">{product.category}</p>
              <h1 className="mt-3 font-serif text-3xl md:text-5xl leading-tight">
                {product.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">Артикул: {product.sku}</p>

              {product.description && (
                <p
                  className="mt-6 text-base leading-relaxed text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              )}

              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                {product.aesthetic && <Info label="Стиль" value={product.aesthetic} />}
                {product.colour && <Info label="Цвет" value={product.colour} />}
                {product.family && <Info label="Семейство" value={product.family} />}
                {product.ean && <Info label="EAN" value={product.ean} />}
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="#dealer"
                  className="rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90"
                >
                  Запросить цену
                </a>
                {product.pdf && (
                  <a
                    href={product.pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
                  >
                    PDF спецификация
                  </a>
                )}
                {product.energy_label && (
                  <a
                    href={product.energy_label}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
                  >
                    Энергоэтикетка
                  </a>
                )}
              </div>
            </div>
          </div>

          {specEntries.length > 0 && (
            <section className="mt-20">
              <h2 className="font-serif text-2xl md:text-3xl">Характеристики</h2>
              <dl className="mt-8 grid grid-cols-1 gap-x-10 gap-y-3 border-t border-border pt-6 md:grid-cols-2">
                {specEntries.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-6 border-b border-border/60 py-2 text-sm"
                  >
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right text-foreground">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}