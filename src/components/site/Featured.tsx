import { motion } from "motion/react";
import coffee from "@/assets/product-coffee.jpg";
import kettle from "@/assets/product-kettle.jpg";
import toaster from "@/assets/product-toaster.jpg";
import mixer from "@/assets/product-mixer.jpg";
import { useI18n } from "@/lib/i18n";
import { SectionHeader, Reveal } from "./Section";

const products = [
  { img: coffee, name: "ECF02 Espresso", tag: "Coffee · Pink" },
  { img: kettle, name: "KLF05 Kettle", tag: "Kettle · Cream" },
  { img: toaster, name: "TSF02 Toaster", tag: "Toaster · Mint" },
  { img: mixer, name: "SMF13 Stand Mixer", tag: "Mixer · Coral" },
];

export function Featured() {
  const { t } = useI18n();
  return (
    <section id="catalog" className="relative py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader eyebrow={t("section.featured.eyebrow")} title={t("section.featured.title")} />
          <Reveal>
            <a href="#catalog" className="smeg-underline text-sm uppercase tracking-[0.2em] text-foreground/70">
              {t("common.shop")} →
            </a>
          </Reveal>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {products.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <motion.a
                href="#"
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="group block"
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-secondary">
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    width={1024}
                    height={1280}
                    className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg text-foreground">{p.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {p.tag}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-foreground/60 transition-colors group-hover:text-accent">
                    →
                  </span>
                </div>
              </motion.a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}