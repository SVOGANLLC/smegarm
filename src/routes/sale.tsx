import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductListingShell } from "@/components/site/ProductListingShell";
import { CARD_COLS, type ProductCard as ProductCardType } from "@/lib/products";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import { listingHeadExtras } from "@/lib/catalog-seo";
import { breadcrumbJsonLd, canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

const hyMeta = getI18nDefaults().hy;

const searchSchema = z.object({
  colour: z.string().optional(),
  aesthetic: z.string().optional(),
  spec: z.string().optional(),
  inStock: z.boolean().optional(),
  model: z.string().optional(),
  modelSkus: z.string().optional(),
});

export const Route = createFileRoute("/sale")({
  validateSearch: (s) => searchSchema.parse(s),
  loader: ({ location }) => ({ saleSearch: searchSchema.parse(location.search) }),
  head: ({ loaderData }) => {
    const search = loaderData?.saleSearch ?? {};
    const extras = listingHeadExtras("/sale", search);
    const hy = getI18nDefaults().hy;
    return {
      meta: [
        ...seoMeta({
          title: hyMeta["sale.metaTitle"],
          description: hyMeta["sale.metaDesc"],
          path: "/sale",
          keywords: "Smeg sale Armenia, SMEG discount, special offers Yerevan",
          locale: "hy_AM",
        }),
        ...(extras.meta ?? []),
      ],
      links: extras.links.length ? extras.links : [...hreflangLinks("/sale"), ...canonicalLink("/sale")],
      scripts: [
        {
          type: "application/ld+json" as const,
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Smeg Armenia", path: "/" },
              { name: hy["catalog.title"] ?? "Catalogue", path: "/catalog" },
              { name: hy["sale.title"] ?? "Sale", path: "/sale" },
            ]),
          ),
        },
      ],
    };
  },
  component: Sale,
});

function Sale() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["sale-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CARD_COLS)
        .eq("is_published", true)
        .or("is_special_offer.eq.true,discount_percent.gt.0")
        .order("discount_percent", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as ProductCardType[];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pb-20 pt-24 md:pt-32">
        <div className="mx-auto max-w-[1400px] px-4 md:px-10">
          <p className="eyebrow text-muted-foreground">{t("sale.title")}</p>
          <h1 className="mt-2 font-serif text-3xl md:text-5xl">{t("sale.title")}</h1>
          {isLoading ? (
            <p className="mt-8 text-sm text-muted-foreground">{t("catalog.loading")}</p>
          ) : items.length === 0 ? (
            <p className="mt-8 text-muted-foreground">{t("sale.empty")}</p>
          ) : (
            <div className="mt-10">
              <ProductListingShell
                products={items}
                search={search}
                onSearchChange={(next) => navigate({ search: next })}
              />
            </div>
          )}
          <Link to="/catalog" className="mt-10 inline-block smeg-underline text-sm uppercase tracking-[0.18em]">
            {t("sale.allCatalog")}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
