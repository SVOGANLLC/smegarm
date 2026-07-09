import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductListingShell } from "@/components/site/ProductListingShell";
import { fetchCollectionWithProducts, fetchTheme } from "@/lib/products";
import { resolveCollectionBackgroundThemeKey, themeBackgroundStyle } from "@/lib/theme-background";
import { collectionBreadcrumbJsonLd, listingHeadExtras } from "@/lib/catalog-seo";
import { canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";
import { getI18nDefaults, pickLocalized, useI18n } from "@/lib/i18n";

const searchSchema = z.object({
  colour: z.string().optional(),
  aesthetic: z.string().optional(),
  spec: z.string().optional(),
  inStock: z.boolean().optional(),
  model: z.string().optional(),
  modelSkus: z.string().optional(),
});

export const Route = createFileRoute("/collection/$slug")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: async ({ params, context, location }) => {
    const data = await context.queryClient.ensureQueryData({
      queryKey: ["collection", params.slug],
      queryFn: () => fetchCollectionWithProducts(params.slug),
    });
    return { data, collectionSearch: searchSchema.parse(location.search) };
  },
  head: ({ loaderData, params }) => {
    const col = loaderData?.data?.collection;
    const search = loaderData?.collectionSearch ?? {};
    const hy = getI18nDefaults().hy;
    const name = col
      ? pickLocalized(col as unknown as Record<string, unknown>, "name", "hy") || col.name
      : params.slug;
    const desc =
      (col &&
        (pickLocalized(col as unknown as Record<string, unknown>, "description", "hy") ||
          col.description)) ||
      hy["collection.metaFallback"].replace("{name}", name);
    const basePath = `/collection/${params.slug}`;
    const extras = listingHeadExtras(basePath, search);
    return {
      meta: [
        ...seoMeta({
          title: `${name} — Smeg Armenia`,
          description: desc.slice(0, 320),
          path: basePath,
          image: col?.cover_image || undefined,
        }),
        ...(extras.meta ?? []),
      ],
      links: extras.links.length ? extras.links : [...hreflangLinks(basePath), ...canonicalLink(basePath)],
      scripts: [
        {
          type: "application/ld+json" as const,
          children: JSON.stringify(collectionBreadcrumbJsonLd(params.slug, name)),
        },
      ],
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
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
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
  const backgroundThemeKey = data
    ? resolveCollectionBackgroundThemeKey(slug, search.colour, data.products)
    : null;
  const themeQ = useQuery({
    queryKey: ["theme", backgroundThemeKey],
    queryFn: () => (backgroundThemeKey ? fetchTheme(backgroundThemeKey) : Promise.resolve(null)),
    enabled: !!backgroundThemeKey,
    staleTime: 60_000,
  });
  const themeStyle = themeBackgroundStyle(themeQ.data);
  const name = col
    ? pickLocalized(col as unknown as Record<string, unknown>, "name", lang) || col.name
    : "";
  const description = col
    ? pickLocalized(col as unknown as Record<string, unknown>, "description", lang) || col.description
    : "";

  return (
    <div className="min-h-screen text-foreground transition-colors duration-700" style={themeStyle}>
      <Header />
      <main className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        {isLoading || !data ? (
          <p className={themeQ.data ? "text-foreground/80" : "text-muted-foreground"}>{t("catalog.loading")}</p>
        ) : (
          <>
            <div className="mb-12">
              <Link
                to="/"
                className={`eyebrow hover:text-foreground ${themeQ.data ? "text-foreground/70" : "text-muted-foreground"}`}
              >
                ← {t("common.home")}
              </Link>
              <h1 className="mt-4 font-serif text-5xl md:text-6xl">{name}</h1>
              {description && (
                <p className={`mt-4 max-w-2xl ${themeQ.data ? "text-foreground/85" : "text-foreground/70"}`}>
                  {description}
                </p>
              )}
            </div>
            {data.products.length === 0 ? (
              <p className="text-muted-foreground">{t("collection.empty")}</p>
            ) : (
              <ProductListingShell
                products={data.products}
                search={search}
                onSearchChange={(next) => navigate({ search: next })}
                filtersOnPanel={!!themeQ.data}
              />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
