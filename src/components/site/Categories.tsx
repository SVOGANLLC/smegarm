import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { SectionHeader, Reveal } from "./Section";
import { slugify, fetchFeatured } from "@/lib/products";
import { categoryLabel } from "@/lib/category-i18n";
import {
  cardLabel,
  parseMainCards,
  parseSmallCategories,
  type MainCategoryCard,
} from "@/lib/categories-config";
import { supabase } from "@/integrations/supabase/client";

export function Categories() {
  const { t, lang } = useI18n();

  const { data: configBlock } = useQuery({
    queryKey: ["site-content", "categories"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "categories").maybeSingle();
      return (data?.value ?? {}) as Record<string, Partial<Record<"ru" | "en" | "hy", string>>>;
    },
    staleTime: 60_000,
  });

  const main = parseMainCards(configBlock);
  const small = parseSmallCategories(configBlock);
  const coverSkus = main.map((c) => c.sku);

  const { data: covers = [] } = useQuery({
    queryKey: ["category-covers", coverSkus],
    queryFn: () => fetchFeatured(coverSkus),
    staleTime: 5 * 60 * 1000,
    enabled: coverSkus.length > 0,
  });
  const imgFor = (sku: string) => covers.find((p) => p.sku === sku)?.main_image ?? null;

  return (
    <section className="site-section">
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        <SectionHeader
          eyebrow={t("section.categories.eyebrow")}
          title={t("section.categories.title")}
          eyebrowKey="section.categories.eyebrow"
          titleKey="section.categories.title"
        />

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-16 lg:grid-cols-3 lg:gap-6">
          {main.map((c, i) => (
            <CategoryCard key={`${c.sku}-${i}`} c={c} i={i} lang={lang} t={t} img={imgFor(c.sku)} />
          ))}
        </div>

        <Reveal>
          <div className="mt-10 md:mt-14">
            <p data-ck="section.categories.small" className="eyebrow mb-4 text-muted-foreground">
              {t("section.categories.small")}
            </p>
            <div className="flex flex-wrap gap-2">
              {small.map((s) => (
                <Link
                  key={s}
                  to="/catalog"
                  search={{ category: slugify(s), page: 1 } as never}
                  className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground/80 transition-all hover:border-foreground hover:text-foreground md:px-5"
                >
                  {categoryLabel(s, lang)}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CategoryCard({
  c,
  i,
  lang,
  t,
  img,
}: {
  c: MainCategoryCard;
  i: number;
  lang: "ru" | "en" | "hy";
  t: (k: string) => string;
  img: string | null;
}) {
  const title = cardLabel(c, lang, t);
  return (
    <Reveal delay={i * 0.08} className={i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}>
      <motion.div whileHover="hover" className="group relative block aspect-[4/5] overflow-hidden rounded-sm bg-secondary sm:aspect-[3/4]">
        <Link
          to="/catalog"
          search={{ category: slugify(c.categoryKey), page: 1 } as never}
          className="block h-full w-full"
        >
          {img && (
            <motion.img
              src={img}
              alt={title}
              loading="lazy"
              variants={{ hover: { scale: 1.06 } }}
              transition={{ duration: 1.2, ease: [0.2, 0.7, 0.2, 1] }}
              className="h-full w-full object-contain p-6 md:p-8"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5 text-background md:p-7">
            <h3 className="font-serif text-xl leading-tight md:text-2xl">{title}</h3>
            <span className="opacity-80 transition-transform group-hover:translate-x-1">→</span>
          </div>
        </Link>
      </motion.div>
    </Reveal>
  );
}
