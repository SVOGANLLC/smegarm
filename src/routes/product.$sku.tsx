import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { fetchProductBySku, fetchTheme, slugify } from "@/lib/products";
import { ProductImageZoom } from "@/components/site/ProductImageZoom";
import { ColorSwitcher } from "@/components/site/ColorSwitcher";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { useState } from "react";
import { useI18n, pickLocalized, pickLocalizedSpecs } from "@/lib/i18n";

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
  errorComponent: ({ error }) => <ProductErrorView message={error.message} />,
  notFoundComponent: () => <ProductNotFoundView />,
  component: ProductPage,
});

function ProductErrorView({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-serif text-2xl">{t("product.loadError")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link to="/catalog" className="mt-4 inline-block underline">{t("product.toCatalog")}</Link>
      </div>
    </div>
  );
}

function ProductNotFoundView() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <h1 className="font-serif text-2xl">{t("product.notFound")}</h1>
        <Link to="/catalog" className="mt-4 inline-block underline">{t("product.toCatalog")}</Link>
      </div>
    </div>
  );
}

function ProductPage() {
  const { sku } = Route.useParams();
  const { lang, t } = useI18n();
  const { data: product } = useSuspenseQuery({
    queryKey: ["product", sku],
    queryFn: () => fetchProductBySku(sku),
  });
  const { data: theme } = useSuspenseQuery({
    queryKey: ["theme", product?.theme_key ?? null],
    queryFn: () => (product?.theme_key ? fetchTheme(product.theme_key) : Promise.resolve(null)),
  });
  const gallery = product?.images?.length ? product.images : product?.main_image ? [product.main_image] : [];
  const [active, setActive] = useState(0);
  if (!product) return null;
  const name = pickLocalized(product as unknown as Record<string, unknown>, "name", lang);
  const description = pickLocalized(product as unknown as Record<string, unknown>, "description", lang);
  const category = pickLocalized(product as unknown as Record<string, unknown>, "category", lang);
  const colour = pickLocalized(product as unknown as Record<string, unknown>, "colour", lang);
  const themeName = pickLocalized(theme as unknown as Record<string, unknown> | null, "name", lang);
  const specEntries = Object.entries(pickLocalizedSpecs(product as unknown as Record<string, unknown>, lang));

  const themeStyle: React.CSSProperties = theme
    ? {
        backgroundColor: theme.background_color ?? undefined,
        backgroundImage: theme.background_image ? `url(${theme.background_image})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : {};

  return (
    <div className="min-h-screen text-foreground transition-colors duration-700" style={themeStyle}>
      <Header />
      <main className="pt-32 pb-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          {theme && product.theme_key && (
            <Link
              to="/catalog"
              search={{ theme: product.theme_key, page: 1 }}
              className="eyebrow mb-6 inline-block rounded-full bg-background/85 backdrop-blur-sm px-4 py-1.5 text-foreground shadow-sm transition hover:bg-background"
              style={theme.accent_color ? { color: theme.accent_color } : undefined}
            >
              ✦ {themeName || theme.name} →
            </Link>
          )}
          <nav
            className={`mb-8 flex items-center gap-2 text-xs uppercase tracking-[0.18em] ${theme ? "text-foreground/80 [text-shadow:0_1px_2px_rgba(255,255,255,0.6)]" : "text-muted-foreground"}`}
          >
            <Link to="/catalog" className="hover:text-foreground">
              {t("catalog.title")}
            </Link>
            {product.category && (
              <>
                <span>/</span>
                <Link
                  to="/catalog"
                  search={{ category: slugify(product.category), page: 1 }}
                  className="hover:text-foreground"
                >
                  {category || product.category}
                </Link>
              </>
            )}
          </nav>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              {gallery[active] ? (
                <ProductImageZoom src={gallery[active]} alt={name || product.name} />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-sm bg-secondary text-sm text-muted-foreground">
                  {t("product.noPhoto")}
                </div>
              )}
              {gallery.length > 1 && (
                <div className="mt-4 grid grid-cols-6 gap-2">
                  {gallery.slice(0, 12).map((src, i) => (
                    <button
                      key={src + i}
                      onClick={() => setActive(i)}
                      className={`aspect-square overflow-hidden rounded-sm border bg-white transition ${
                        active === i ? "border-foreground" : "border-transparent hover:border-border"
                      }`}
                    >
                      <img src={src} alt="" className="h-full w-full object-contain p-2" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={theme ? "rounded-lg bg-background/92 backdrop-blur-sm p-6 md:p-8 shadow-xl" : ""}>
              {product.category && (
                <Link
                  to="/catalog"
                  search={{ category: slugify(product.category), page: 1 }}
                  className="eyebrow text-muted-foreground transition hover:text-foreground"
                >
                  {category || product.category}
                </Link>
              )}
              <h1 className="mt-3 font-serif text-3xl md:text-5xl leading-tight">
                {name || product.name}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">{t("product.sku")}: {product.sku}</p>

              <ColorSwitcher
                modelGroup={product.model_group ?? null}
                currentSku={product.sku}
                currentColour={product.colour}
                currentImage={product.main_image}
              />

              {description && (
                <p
                  className="mt-6 text-base leading-relaxed text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}

              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                {product.aesthetic && (
                  <InfoLink
                    label={t("product.style")}
                    value={product.aesthetic}
                    to="/catalog"
                    search={{ aesthetic: product.aesthetic, page: 1 }}
                  />
                )}
                {product.colour && product.colour !== "Decorated / Special" && (
                  <InfoLink
                    label={t("product.colour")}
                    value={colour || product.colour}
                    to="/catalog"
                    search={{ colour: product.colour, page: 1 }}
                  />
                )}
                {product.colour === "Decorated / Special" && <Info label={t("product.colour")} value={colour || product.colour} />}
                {product.family && (
                  <InfoLink
                    label={t("product.family")}
                    value={product.family}
                    to="/catalog"
                    search={{ family: product.family, page: 1 }}
                  />
                )}
                {product.ean && <Info label={t("product.ean")} value={product.ean} />}
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                {(product as unknown as { price_amd?: number | null }).price_amd != null && (
                  <p className="w-full font-serif text-3xl">
                    {(product as unknown as { price_amd: number }).price_amd.toLocaleString("ru-RU")} ֏
                  </p>
                )}
                <AvailabilityBadge product={product} />
                <AddToCartButton
                  sku={product.sku}
                  name={name || product.name}
                  image={product.main_image}
                  price={(product as unknown as { price_amd?: number | null }).price_amd ?? null}
                />
                <a
                  href="#dealer"
                  className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
                >
                  {t("product.requestPrice")}
                </a>
                {product.pdf && (
                  <a
                    href={product.pdf}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
                  >
                    {t("product.pdf")}
                  </a>
                )}
                {product.energy_label && (
                  <a
                    href={product.energy_label}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-border px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-foreground"
                  >
                    {t("product.energy")}
                  </a>
                )}
              </div>
            </div>
          </div>

          {specEntries.length > 0 && (
            <section className={`mt-16 ${theme ? "rounded-lg bg-background/92 backdrop-blur-sm p-6 md:p-8 shadow-xl" : ""}`}>
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-6 list-none border-b border-border pb-4">
                  <h2 className="font-serif text-2xl md:text-3xl">{t("product.specs")}</h2>
                  <span className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground transition group-open:text-foreground">
                    <span className="group-open:hidden">{t("product.specs.show")} ({specEntries.length})</span>
                    <span className="hidden group-open:inline">{t("product.specs.hide")}</span>
                    <svg className="h-4 w-4 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 8l5 5 5-5" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <dl className="mt-6 grid grid-cols-1 gap-x-10 gap-y-1 md:grid-cols-2 animate-in fade-in duration-300">
                  {specEntries.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-6 border-b border-border/60 py-2.5 text-sm"
                    >
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="text-right text-foreground">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
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

function InfoLink({
  label,
  value,
  to,
  search,
}: {
  label: string;
  value: string;
  to: string;
  search: Record<string, unknown>;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        <Link
          to={to}
          search={search as never}
          className="text-foreground underline-offset-4 hover:underline"
        >
          {value}
        </Link>
      </dd>
    </div>
  );
}

function AvailabilityBadge({
  product,
}: {
  product: { availability?: string | null; stock_qty?: number | null; stock_reserved?: number | null; lead_time_days?: number | null };
}) {
  const { t } = useI18n();
  const avail = product.availability ?? "on_request";
  const qty = Math.max(0, (product.stock_qty ?? 0) - (product.stock_reserved ?? 0));
  if (avail === "in_stock") {
    return (
      <span className="inline-flex w-full items-center gap-2 text-sm text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-600" />
        {t("avail.inStock")}{qty > 0 ? ` · ${qty} ${t("avail.unit")}` : ""}
      </span>
    );
  }
  if (avail === "pre_order") {
    return (
      <span className="inline-flex w-full items-center gap-2 text-sm text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        {t("avail.preOrder")}{product.lead_time_days ? ` · ${t("avail.delivery")} ~${product.lead_time_days} ${t("avail.days")}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex w-full items-center gap-2 text-sm text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
      {t("avail.onRequest")}
    </span>
  );
}