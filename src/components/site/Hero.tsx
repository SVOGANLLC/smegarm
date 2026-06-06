import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ArrowDown } from "lucide-react";
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-fridge.jpg";
import { useI18n } from "@/lib/i18n";

const PALETTE = [
  { name: "Rosso", hex: "#c8102e" },
  { name: "Pastel Blue", hex: "#a8c5d6" },
  { name: "Cream", hex: "#f3ead5" },
  { name: "Black", hex: "#1a1a1a" },
  { name: "Pink", hex: "#e8b8c4" },
  { name: "Olive", hex: "#7a8763" },
];

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function Hero() {
  const { t } = useI18n();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-12%"]);
  const title = t("hero.title");

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden bg-background pt-24 md:pt-28"
    >
      {/* Top meta row */}
      <div className="relative z-20 mx-auto flex max-w-[1480px] items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-3">
          <span className="h-px w-10 bg-foreground/40" />
          <span className="eyebrow text-foreground/60">{t("hero.eyebrow")}</span>
        </div>
        <div className="hidden items-center gap-6 text-[10px] uppercase tracking-[0.3em] text-foreground/50 md:flex">
          <span>Yerevan · Nar-Dos 2</span>
          <span className="h-1 w-1 rounded-full bg-foreground/40" />
          <span>Since 1948</span>
        </div>
      </div>

      <div className="relative mx-auto grid max-w-[1480px] grid-cols-1 gap-10 px-6 pt-10 pb-16 md:grid-cols-12 md:gap-6 md:px-10 md:pt-16 md:pb-24 lg:pt-20">
        {/* Text column */}
        <motion.div style={{ y: textY }} className="relative z-10 md:col-span-7 lg:col-span-6">
          <h1 className="display-xl text-[clamp(3rem,9.5vw,9rem)] text-foreground">
            {title.split("\n").map((line, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 40, clipPath: "inset(100% 0 0 0)" }}
                animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0 0 0)" }}
                transition={{ duration: 1.1, delay: 0.15 + i * 0.12, ease: EASE }}
                className="block"
              >
                {i === 1 ? (
                  <span className="italic text-[color:var(--brand)]">{line}</span>
                ) : (
                  line
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.7 }}
            className="mt-8 max-w-md text-base leading-relaxed text-foreground/70 md:text-lg"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.85 }}
            className="mt-10 flex flex-wrap items-center gap-5"
          >
            <Link
              to="/catalog"
              className="group inline-flex items-center gap-3 rounded-full bg-foreground px-8 py-4 text-xs uppercase tracking-[0.22em] text-background transition-transform hover:-translate-y-0.5"
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#story"
              className="smeg-underline text-xs uppercase tracking-[0.22em] text-foreground/80"
            >
              {t("hero.cta2")}
            </a>
          </motion.div>

          {/* Palette row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="mt-14 flex items-center gap-5"
          >
            <span className="eyebrow text-foreground/50">Palette</span>
            <div className="flex items-center gap-2.5">
              {PALETTE.map((c, i) => (
                <motion.span
                  key={c.hex}
                  title={c.name}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.2 + i * 0.06, duration: 0.5, ease: EASE }}
                  whileHover={{ scale: 1.25 }}
                  className="h-3.5 w-3.5 rounded-full ring-1 ring-foreground/15"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Image column */}
        <div className="relative md:col-span-5 lg:col-span-6">
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.6, ease: EASE }}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-sm md:aspect-[3/4]"
          >
            {/* Red accent block behind image */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 1.1, delay: 0.3, ease: EASE }}
              style={{ originY: 0 }}
              className="absolute -left-4 top-8 bottom-12 w-2/3 origin-top bg-[color:var(--brand)] md:-left-8"
              aria-hidden
            />
            <motion.img
              src={heroImg}
              alt="Smeg FAB28 retro refrigerator"
              width={1200}
              height={1600}
              style={{ y: imgY }}
              className="relative h-full w-full scale-110 object-cover"
              fetchPriority="high"
            />
          </motion.div>

          {/* Rotating year stamp */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 1, ease: EASE }}
            className="absolute -left-6 -top-6 hidden md:block"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
              className="relative h-28 w-28 lg:h-32 lg:w-32"
            >
              <svg viewBox="0 0 200 200" className="h-full w-full">
                <defs>
                  <path
                    id="circle"
                    d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0"
                  />
                </defs>
                <text className="fill-foreground text-[18px] uppercase tracking-[0.28em]" style={{ fontFamily: "var(--font-sans)" }}>
                  <textPath href="#circle">
                    Made in Italy · Since 1948 ·
                  </textPath>
                </text>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-2xl italic text-foreground">smeg</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating product card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.1, ease: EASE }}
            className="absolute -bottom-6 -right-2 z-10 hidden w-56 rounded-sm border border-border bg-card/95 p-4 backdrop-blur md:block lg:-right-6 lg:w-64"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="eyebrow text-foreground/50">FAB28 · Icon</p>
                <p className="mt-1 font-serif text-lg leading-tight">Refrigerator</p>
              </div>
              <span className="rounded-full bg-[color:var(--brand)] px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white">
                50's
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5">
                {["#c8102e", "#1a1a1a", "#f3ead5", "#a8c5d6"].map((h) => (
                  <span key={h} className="h-2.5 w-2.5 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: h }} />
                ))}
              </div>
              <Link to="/catalog" className="text-[10px] uppercase tracking-[0.2em] smeg-underline">
                View →
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom row: scroll indicator + tagline */}
      <div className="relative z-10 mx-auto flex max-w-[1480px] items-end justify-between gap-6 px-6 pb-10 md:px-10 md:pb-14">
        <motion.a
          href="#featured"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="group inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-foreground/60"
        >
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/30 group-hover:border-foreground/80"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </motion.span>
          Scroll
        </motion.a>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="hidden max-w-xs text-right text-[10px] uppercase tracking-[0.3em] text-foreground/50 md:block"
        >
          <span className="font-serif text-base italic normal-case tracking-normal text-foreground/80">
            “Bellezza, qualità, prestazioni.”
          </span>
          <p className="mt-1">— Smeg manifesto</p>
        </motion.div>
      </div>

      {/* Decorative giant outlined word */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center overflow-hidden">
        <motion.span
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 0.06, y: 0 }}
          transition={{ duration: 1.8, delay: 0.4, ease: EASE }}
          className="select-none font-serif italic leading-none text-foreground"
          style={{ fontSize: "clamp(8rem, 22vw, 22rem)" }}
        >
          smeg
        </motion.span>
      </div>
    </section>
  );
}