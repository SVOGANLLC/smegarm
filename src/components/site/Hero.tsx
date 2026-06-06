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

export function Hero() {
  const { t } = useI18n();
  const title = t("hero.title");

  return (
    <section className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-background">
      {/* Full-bleed photo */}
      <img
        src={heroImg}
        alt="Smeg FAB28 retro refrigerator in a sunlit Italian kitchen"
        width={1920}
        height={1280}
        fetchPriority="high"
        className="absolute inset-0 h-full w-full animate-hero-zoom object-cover object-[70%_center] md:object-center"
      />
      {/* Soft gradients for legibility — heavier on mobile to keep text readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/40 to-background/85 md:hidden" />
      <div className="absolute inset-0 hidden bg-gradient-to-r from-background/95 via-background/55 to-transparent md:block" />
      <div className="absolute inset-0 hidden bg-gradient-to-t from-background/40 via-transparent to-background/20 md:block" />

      {/* Headline block */}
      <div className="relative z-10 mx-auto flex h-full max-w-[1480px] flex-col justify-center px-5 pt-24 pb-24 md:px-10 md:pt-32 md:pb-36">
        <div className="flex items-center gap-3 animate-hero-rise" style={{ animationDelay: "100ms" }}>
          <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--brand)]" />
          <span className="eyebrow text-foreground/70">{t("hero.eyebrow")}</span>
        </div>

        <h1 className="mt-4 max-w-[14ch] display-xl text-[clamp(2.25rem,7.5vw,7.5rem)] text-foreground">
          {title.split("\n").map((line, i) => (
            <span
              key={i}
              className="block animate-hero-rise"
              style={{ animationDelay: `${250 + i * 120}ms` }}
            >
              {i === 1 ? <em className="italic text-[color:var(--brand)]">{line}</em> : line}
            </span>
          ))}
        </h1>

        <p
          className="mt-6 max-w-md animate-hero-rise text-base leading-relaxed text-foreground/80 md:text-lg"
          style={{ animationDelay: "700ms" }}
        >
          {t("hero.subtitle")}
        </p>

        <div
          className="mt-8 flex animate-hero-rise flex-wrap items-center gap-4 md:gap-5"
          style={{ animationDelay: "850ms" }}
        >
          <Link
            to="/catalog"
            className="group inline-flex items-center gap-3 rounded-full bg-foreground px-6 py-3.5 text-[11px] uppercase tracking-[0.22em] text-background transition-transform hover:-translate-y-0.5 md:px-8 md:py-4 md:text-xs"
          >
            {t("hero.cta")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <a href="#story" className="smeg-underline text-xs uppercase tracking-[0.22em] text-foreground/80">
            {t("hero.cta2")}
          </a>
        </div>

        <div
          className="mt-10 flex animate-hero-rise items-center gap-4"
          style={{ animationDelay: "1050ms" }}
        >
          <span className="eyebrow text-foreground/60">Palette</span>
          <div className="flex items-center gap-2.5">
            {PALETTE.map((c) => (
              <span
                key={c.hex}
                title={c.name}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-foreground/20 transition-transform hover:scale-125"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="absolute inset-x-0 bottom-8 z-10 mx-auto flex max-w-[1480px] items-end justify-between gap-6 px-6 md:bottom-10 md:px-10">
        <a
          href="#featured"
          className="group inline-flex animate-hero-rise items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-foreground/70"
          style={{ animationDelay: "1250ms" }}
        >
          <span className="inline-flex h-9 w-9 animate-hero-bounce items-center justify-center rounded-full border border-foreground/40 group-hover:border-foreground">
            <ArrowDown className="h-3.5 w-3.5" />
          </span>
          Scroll
        </a>

        <div className="hidden animate-hero-rise text-right md:block" style={{ animationDelay: "1250ms" }}>
          <p className="font-serif text-base italic text-foreground/85">“Bellezza, qualità, prestazioni.”</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-foreground/55">— Smeg manifesto</p>
        </div>
      </div>
    </section>
  );
}