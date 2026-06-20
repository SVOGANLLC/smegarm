import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductGrid } from "@/components/site/ProductCard";
import { fetchCollectionWithProducts } from "@/lib/products";import { canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";
import { getI18nDefaults, pickLocalized, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/collection/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["collection", params.slug],
      queryFn: () => fetchCollectionWithProducts(params.slug),
    });
    return { data };
  },
  head: ({ loaderData, params }) => {
    const col = loaderData?.data?.collection;
    const hy = getI18nDefaults().hy;
    const name = col
      ? pickLocalized(col as unknown as Record<string, unknown>, "name", "hy") || col.name
      : params.slug;
    const desc =
      (col &&
        (pickLocalized(col as unknown as Record<string, unknown>, "description", "hy") ||
          col.description)) ||
      hy["collection.metaFallback"].replace("{name}", name);
    return {
      meta: seoMeta({
        title: `${name} — Smeg Armenia`,
        description: desc.slice(0, 320),
        path: `/collection/${params.slug}`,
        image: col?.cover_image || undefined,
      }),
      links: [...hreflangLinks(`/collection/${params.slug}`), ...canonicalLink(`/collection/${params.slug}`)],
    };
  },
  component: CollectionPage,
  errorComponent: CollectionErrorView,
  notFoundComponent: CollectionNotFoundView,
});

function CollectionErrorView({ error }: { error: Error }) {
  const { t } = useI18n();
  return (
    <div className="p-10 text-center text-muted-foreground">{error?.message ?? t("common.error")}</div>
  );
}

function CollectionNotFoundView() {
  const { t } = useI18n();
  return (
    <div className="p-10 text-center text-muted-foreground">{t("collection.notFound")}</div>
  );
}

function CollectionPage() {
  const { slug } = Route.useParams();
  const { lang, t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["collection", slug],
    queryFn: async () => {
      const res = await fetchCollectionWithProducts(slug);
      if (!res) throw notFound();
      return res;
    },
  });

  const col = data?.collection;
  const name = col
    ? pickLocalized(col as unknown as Record<string, unknown>, "name", lang) || col.name
    : "";
  const description = col
    ? pickLocalized(col as unknown as Record<string, unknown>, "description", lang) || col.description
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        {isLoading || !data ? (
          <p className="text-muted-foreground">{t("catalog.loading")}</p>
        ) : (
          <>
            <div className="mb-12">
              <Link to="/" className="eyebrow text-muted-foreground hover:text-foreground">
                ← {t("common.home")}
              </Link>
              <h1 className="mt-4 font-serif text-5xl md:text-6xl">{name}</h1>
              {description && (
                <p className="mt-4 max-w-2xl text-foreground/70">{description}</p>
              )}
            </div>
            {data.products.length === 0 ? (
              <p className="text-muted-foreground">{t("collection.empty")}</p>
            ) : (
              <ProductGrid items={data.products} />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
