import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { SectionHeader, Reveal } from "./Section";
import { slugify, fetchFeatured } from "@/lib/products";

// Real Smeg products used as category covers (50's Style icons)
const COVER_SKUS = ["FAB10HLRD6", "SF6905P1", "PV395LN"];
const main = [
  { sku: "FAB10HLRD6", key: "Refrigerators", i18n: "section.categories.refrigerators" },
  { sku: "SF6905P1", key: "Oven", i18n: "section.categories.ovens" },
  { sku: "PV395LN", key: "Hobs", i18n: "section.categories.hobs" },
];

const small = [
  "Kettles",
  "Toasters",
  "Espresso coffee machines",
  "Blenders",
  "Stand mixers",
  "Citrus juicers",
  "Hand blenders",
];

export function Categories() {
  const { t } = useI18n();
  const { data: covers = [] } = useQuery({
    queryKey: ["category-covers", COVER_SKUS],
    queryFn: () => fetchFeatured(COVER_SKUS),
    staleTime: 5 * 60 * 1000,
  });
  const imgFor = (sku: string) => covers.find((p) => p.sku === sku)?.main_image ?? null;

  return (
    <section className="py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <SectionHeader eyebrow={t("section.categories.eyebrow")} title={t("section.categories.title")} />

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {main.map((c, i) => (
            <Reveal key={c.key} delay={i * 0.08}>
              <motion.div
                whileHover="hover"
                className="group relative block aspect-[3/4] overflow-hidden rounded-sm bg-secondary"
              >
              <Link to="/catalog" search={{ category: slugify(c.key), page: 1 } as never} className="block h-full w-full">
                {imgFor(c.sku) && (
                  <motion.img
                    src={imgFor(c.sku)!}
                    alt={t(c.i18n)}
                    loading="lazy"
                    variants={{ hover: { scale: 1.06 } }}
                    transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
                    className="h-full w-full object-contain p-8"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-transparent to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-background md:p-8">
                  <div>
                    <h3 className="mt-2 font-serif text-2xl md:text-3xl">{t(c.i18n)}</h3>
                  </div>
                  <span className="opacity-80 transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
              </motion.div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-16 flex flex-wrap items-center gap-3">
            <span className="eyebrow mr-4 text-muted-foreground">{t("section.categories.small")}</span>
            {small.map((s) => (
              <Link
                key={s}
                to="/catalog"
                search={{ category: slugify(s), page: 1 } as never}
                className="rounded-full border border-border bg-background px-5 py-2 text-sm text-foreground/80 transition-all hover:border-foreground hover:text-foreground"
              >
                {s}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}