import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { SectionHeader, Reveal } from "./Section";
import { HorizontalScroll, HorizontalScrollItem } from "./HorizontalScroll";
import { AddToCartButton } from "./AddToCartButton";
import { AvailPill } from "./AvailPill";
import { PriceBlock } from "./ProductCard";
import { fetchFeatured, type Product, type ProductCard } from "@/lib/products";
import { parseIconSkus } from "@/lib/homepage-config";
import { useSiteContentBlock } from "@/lib/site-content";
import { SmegWordmark } from "./SmegWordmark";

function FeaturedCard({ p, lang }: { p: Product; lang: "ru" | "en" | "hy" }) {
  const name = pickLocalized(p as unknown as Record<string, unknown>, "name", lang) || p.name;
  const category = pickLocalized(p as unknown as Record<string, unknown>, "category", lang) || p.category;
  const colour = pickLocalized(p as unknown as Record<string, unknown>, "colour", lang) || p.colour;

  return (
    <div className="flex h-full flex-col">
      <Link to="/product/$sku" params={{ sku: p.sku }} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-white">
          {p.main_image && (
            <img
              src={p.main_image}
              alt={name}
              loading="lazy"
              className="h-full w-full object-contain object-center transition-transform duration-[1200ms] ease-out group-active:scale-[1.02] md:group-hover:scale-[1.03]"
            />
          )}
        </div>
      </Link>
      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 md:mt-5">
        <Link to="/product/$sku" params={{ sku: p.sku }} className="block min-w-0">
          <h3 className="font-serif text-base leading-snug text-foreground line-clamp-2 break-words md:text-lg">{name}</h3>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground line-clamp-1 md:text-xs md:tracking-[0.18em]">
            {[category, colour].filter(Boolean).join(" · ")}
          </p>
        </Link>
        <AvailPill
          availability={p.availability}
          stock_qty={p.stock_qty}
          stock_reserved={p.stock_reserved}
          lead_time_days={p.lead_time_days}
        />
        <PriceBlock p={p as ProductCard} />
        <div className="mt-auto pt-2">
          <AddToCartButton
            sku={p.sku}
            name={name}
            image={p.main_image}
            price={p.price_amd ?? null}
            className="w-full justify-center py-2.5 text-[10px] tracking-[0.16em] md:py-3 md:text-xs md:tracking-[0.2em]"
          />
        </div>
      </div>
    </div>
  );
}

export function Featured() {
  const { t, lang } = useI18n();
  const renderedTitle = <SmegWordmark text={t("section.featured.title")} variant="light" />;
  const homepageConfig = useSiteContentBlock("homepage");

  const iconSkus = parseIconSkus(homepageConfig);

  const { data: products = [] } = useQuery({
    queryKey: ["featured", iconSkus],
    queryFn: () => fetchFeatured(iconSkus),
    staleTime: 5 * 60 * 1000,
  });

  const ordered = iconSkus
    .map((sku) => products.find((p) => p.sku === sku))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <section id="featured" className="site-section relative">
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end md:gap-6">
          <SectionHeader eyebrow={t("section.featured.eyebrow")} title={<>{renderedTitle}</>} />
          <Reveal>
            <Link to="/catalog" className="smeg-underline text-xs uppercase tracking-[0.18em] text-foreground/70 md:text-sm md:tracking-[0.2em]">
              {t("common.shop")} →
            </Link>
          </Reveal>
        </div>
      </div>
      <div className="light-section mt-8 py-10 md:mt-16 md:py-24">
        <div className="mx-auto max-w-[1400px] md:px-10">
          <HorizontalScroll className="md:hidden">
            {ordered.map((p, i) => (
              <HorizontalScrollItem key={p.sku}>
                <Reveal delay={i * 0.06}>
                  <FeaturedCard p={p} lang={lang} />
                </Reveal>
              </HorizontalScrollItem>
            ))}
          </HorizontalScroll>
          <div className="hidden gap-8 md:grid md:grid-cols-2 lg:grid-cols-4">
            {ordered.map((p, i) => (
              <Reveal key={p.sku} delay={i * 0.08}>
                <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="h-full">
                  <FeaturedCard p={p} lang={lang} />
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
