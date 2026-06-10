import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { SectionHeader, Reveal } from "./Section";
import { fetchFeatured } from "@/lib/products";

// Iconic Smeg 50's-style appliances, real SKUs from catalogue
const ICONIC_SKUS = ["ECF03PBEU", "KLF03PKEU", "TSF02PGEU", "BLF03CREU"];

export function Featured() {
  const { t } = useI18n();
  const { data: products = [] } = useQuery({
    queryKey: ["featured", ICONIC_SKUS],
    queryFn: () => fetchFeatured(ICONIC_SKUS),
    staleTime: 5 * 60 * 1000,
  });

  // Preserve hard-coded ordering
  const ordered = ICONIC_SKUS
    .map((sku) => products.find((p) => p.sku === sku))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <section id="catalog" className="relative light-section py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader eyebrow={t("section.featured.eyebrow")} title={t("section.featured.title")} />
          <Reveal>
            <Link to="/catalog" className="smeg-underline text-sm uppercase tracking-[0.2em] text-foreground/70">
              {t("common.shop")} →
            </Link>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {ordered.map((p, i) => (
            <Reveal key={p.sku} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <Link to="/product/$sku" params={{ sku: p.sku }} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-white">
                    {p.main_image && (
                      <img
                        src={p.main_image}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-contain p-6 transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="mt-5 flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg text-foreground line-clamp-1">{p.name}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {[p.category, p.colour].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-foreground/60 transition-colors group-hover:text-accent">
                      →
                    </span>
                  </div>
                </Link>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}