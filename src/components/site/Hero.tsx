import { ArrowRight, ArrowDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import heroPastelBlue from "@/assets/hero/hero-pastel-blue.jpg";
import heroBlack from "@/assets/hero/hero-black.jpg";
import heroCream from "@/assets/hero/hero-cream.jpg";
import heroPastelGreen from "@/assets/hero/hero-pastel-green.jpg";
import heroPink from "@/assets/hero/hero-pink.jpg";
import heroRed from "@/assets/hero/hero-red.jpg";
import heroWhite from "@/assets/hero/hero-white.jpg";

type PaletteItem = { id: string; name: string; hex: string; src: string; ring?: string };

const PALETTE: PaletteItem[] = [
  { id: "pastel-blue", name: "Pastel Blue", hex: "#a8c5d6", src: heroPastelBlue },
  { id: "pastel-green", name: "Pastel Green", hex: "#b8d8b8", src: heroPastelGreen },
  { id: "cream", name: "Cream", hex: "#f3ead5", src: heroCream },
  { id: "pink", name: "Pink", hex: "#e8b8c4", src: heroPink },
  { id: "red", name: "Red", hex: "#c8102e", src: heroRed },
  { id: "white", name: "White", hex: "#ffffff", src: heroWhite, ring: "rgba(0,0,0,0.25)" },
  { id: "black", name: "Black", hex: "#1a1a1a", src: heroBlack },
];

export function Hero() {
  const { t } = useI18n();
  const title = t("hero.title");
  const [activeId, setActiveId] = useState<string>(PALETTE[0].id);
  const active = PALETTE.find((p) => p.id === activeId) ?? PALETTE[0];

  return (
    <section className="relative h-[100svh] min-h-[680px] w-full overflow-hidden bg-background">
      {/* Full-bleed photo stack — crossfade between colors */}
      {PALETTE.map((p, i) => (
        <img
          key={p.id}
          src={p.src}
          alt={`Smeg FAB retro refrigerator in ${p.name}`}
          width={1920}
          height={822}
          fetchPriority={i === 0 ? "high" : "low"}
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover object-[62%_center] transition-opacity duration-700 ease-out md:object-center ${
            p.id === activeId ? "opacity-100 animate-hero-zoom" : "opacity-0"
          }`}
        />
      ))}
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

        <h1 className="mt-4 max-w-[18ch] font-sans font-black uppercase text-[clamp(1.5rem,4.5vw,3.5rem)] leading-[1.05] tracking-tight text-foreground">
          {title.split("\n").map((line, i) => (
            <span
              key={i}
              className="block animate-hero-rise"
              style={{ animationDelay: `${250 + i * 120}ms` }}
            >
              {line}
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
          className="mt-10 flex animate-hero-rise flex-col gap-3 sm:flex-row sm:items-center sm:gap-5"
          style={{ animationDelay: "1050ms" }}
        >
          <div
            role="radiogroup"
            aria-label="Choose appliance color"
            className="flex items-center gap-2.5"
          >
            {PALETTE.map((c) => {
              const isActive = c.id === activeId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setActiveId(c.id)}
                  className={`relative h-6 w-6 rounded-full transition-transform duration-300 hover:scale-110 ${
                    isActive ? "scale-110" : ""
                  }`}
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: isActive
                      ? `0 0 0 2px var(--background), 0 0 0 3px ${c.ring ?? c.hex}`
                      : `inset 0 0 0 1px ${c.ring ?? "rgba(0,0,0,0.15)"}`,
                  }}
                />
              );
            })}
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