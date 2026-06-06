import { motion } from "motion/react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-fridge-v2.jpg";
import { useI18n } from "@/lib/i18n";

const PALETTE = [
  { name: "Rosso", hex: "#c8102e" },
  { name: "Pastel Green", hex: "#b8d8b8" },
  { name: "Pastel Blue", hex: "#a8c5d6" },
  { name: "Cream", hex: "#f3ead5" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "Pink", hex: "#e8b8c4" },
];

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function Hero() {
  const { t } = useI18n();
  const title = t("hero.title");

  return (
    <section className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-background">
      {/* Full-bleed photo */}
      <motion.img
        src={heroImg}
        alt="Smeg FAB28 retro refrigerator in a sunlit Italian kitchen"
        width={1920}
        height={1280}
        fetchPriority="high"
        initial={{ scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.4, ease: EASE }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Soft gradients for legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/20" />

      {/* Top meta */}
      <div className="absolute inset-x-0 top-24 z-10 mx-auto flex max-w-[1480px] items-center justify-between px-6 md:top-28 md:px-10">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-foreground/50" />
          <span className="eyebrow text-foreground/70">{t("hero.eyebrow")}</span>
        </div>
        <div className="hidden items-center gap-4 text-[10px] uppercase tracking-[0.3em] text-foreground/60 md:flex">
          <span>Yerevan · Nar-Dos 2</span>
          <span className="h-1 w-1 rounded-full bg-foreground/50" />
          <span>Since 1948</span>
        </div>
      </div>

      {/* Headline block */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1480px] flex-col justify-center px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE }}
          className="flex items-center gap-3"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
          <span className="eyebrow text-foreground/70">FAB28 · Pastel Green</span>
        </motion.div>

        <h1 className="mt-6 max-w-[16ch] display-xl text-[clamp(3rem,8.5vw,8.5rem)] text-foreground">
          {title.split("\n").map((line, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.35 + i * 0.12, ease: EASE }}
              className="block"
            >
              {i === 1 ? <em className="italic text-[color:var(--brand)] not-italic [font-style:italic]">{line}</em> : line}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75 }}
          className="mt-8 max-w-md text-base leading-relaxed text-foreground/80 md:text-lg"
        >
          {t("hero.subtitle")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-10 flex flex-wrap items-center gap-5"
        >
          <Link
            to="/catalog"
            className="group inline-flex items-center gap-3 rounded-full bg-foreground px-8 py-4 text-xs uppercase tracking-[0.22em] text-background transition-transform hover:-translate-y-0.5"
          >
            {t("hero.cta")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#story" className="smeg-underline text-xs uppercase tracking-[0.22em] text-foreground/80">
            {t("hero.cta2")}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.8 }}
          className="mt-14 flex items-center gap-4"
        >
          <span className="eyebrow text-foreground/60">Palette</span>
          <div className="flex items-center gap-2.5">
            {PALETTE.map((c, i) => (
              <motion.span
                key={c.hex}
                title={c.name}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.15 + i * 0.06, duration: 0.5, ease: EASE }}
                whileHover={{ scale: 1.3 }}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-foreground/20"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="absolute inset-x-0 bottom-8 z-10 mx-auto flex max-w-[1480px] items-end justify-between gap-6 px-6 md:bottom-10 md:px-10">
        <motion.a
          href="#featured"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="group inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-foreground/70"
        >
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/40 group-hover:border-foreground"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </motion.span>
          Scroll
        </motion.a>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          className="hidden text-right md:block"
        >
          <p className="font-serif text-base italic text-foreground/85">“Bellezza, qualità, prestazioni.”</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-foreground/55">— Smeg manifesto</p>
        </motion.div>
      </div>
    </section>
  );
}