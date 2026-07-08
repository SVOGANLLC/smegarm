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

function HeroImages({ activeId }: { activeId: string }) {
  return PALETTE.map((p, i) => (
    <img
      key={p.id}
      src={p.src}
      alt={`Smeg FAB retro refrigerator in ${p.name}`}
      width={1920}
      height={822}
      fetchPriority={i === 0 ? "high" : "low"}
      loading={i === 0 ? "eager" : "lazy"}
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
        p.id === activeId ? "opacity-100 animate-hero-zoom" : "opacity-0"
      } object-[70%_center] md:object-center`}
    />
  ));
}

function ColorSwatches({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="eyebrow mb-3 text-[10px] tracking-[0.2em] text-muted-foreground">{t("hero.colours")}</p>
      <div
        role="radiogroup"
        aria-label={t("hero.colours")}
        className="flex flex-wrap items-center gap-3 py-1 md:flex-nowrap md:gap-2.5 md:py-0"
      >
        {PALETTE.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={c.name}
              onClick={() => onSelect(c.id)}
              className={`relative h-9 w-9 shrink-0 rounded-full transition-transform duration-300 md:h-7 md:w-7 ${
                isActive ? "scale-105 ring-2 ring-foreground ring-offset-2 ring-offset-background md:scale-110" : ""
              }`}
              style={{
                backgroundColor: c.hex,
                boxShadow: !isActive ? `0px 0px 0px 1px ${c.ring ?? "rgba(250, 250, 250, 0.18)"}` : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function Hero() {
  const { t } = useI18n();
  const title = t("hero.title");
  const [activeId, setActiveId] = useState<string>(PALETTE[0].id);

  const titleLines = title.split("\n");

  const headline = (
    <h1
      data-ck="hero.title"
      className="font-sans font-medium uppercase leading-[1.12] tracking-[0.04em] text-foreground md:max-w-[20ch] md:text-[clamp(1.5rem,4.5vw,3.5rem)] md:leading-[1.1] md:tracking-[0.06em]"
    >
      {titleLines.map((line, i) => (
        <span key={i} className="block text-[clamp(1.5rem,8.5vw,2rem)] md:animate-hero-rise md:text-inherit" style={{ animationDelay: `${250 + i * 120}ms` }}>
          {line}
        </span>
      ))}
    </h1>
  );

  const ctas = (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 md:gap-5">
      <Link
        to="/catalog"
        data-ck="hero.cta"
        className="group flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-[11px] uppercase tracking-[0.18em] text-background sm:w-auto md:tracking-[0.22em] md:px-8 md:py-4 md:text-xs"
      >
        {t("hero.cta")}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
      <a
        href="#story"
        data-ck="hero.cta2"
        className="smeg-underline text-center text-xs uppercase tracking-[0.18em] text-foreground/80 sm:text-left md:tracking-[0.22em]"
      >
        {t("hero.cta2")}
      </a>
    </div>
  );

  return (
    <>
      {/* Mobile: image on top, content in solid panel — not a shrunk desktop overlay */}
      <section className="md:hidden">
        <div className="relative h-[46svh] min-h-[280px] max-h-[420px] overflow-hidden bg-secondary">
          <HeroImages activeId={activeId} />
        </div>
        <div className="relative z-10 -mt-5 rounded-t-[1.25rem] bg-background px-4 pb-8 pt-7">
          <div className="flex items-center gap-2">
            <span data-ck="hero.eyebrow" className="eyebrow text-foreground/70">
              {t("hero.eyebrow")}
            </span>
          </div>
          <div className="mt-3">{headline}</div>
          <div className="mt-5">
            <ColorSwatches activeId={activeId} onSelect={setActiveId} />
          </div>
          <p data-ck="hero.subtitle" className="mt-5 text-[15px] leading-relaxed text-foreground/75">
            {t("hero.subtitle")}
          </p>
          <div className="mt-6">{ctas}</div>
          <a
            href="#featured"
            data-ck="hero.scroll"
            className="mt-8 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            {t("hero.scroll")}
          </a>
        </div>
      </section>

      {/* Desktop: full-bleed cinematic hero */}
      <section className="relative hidden min-h-[100svh] w-full overflow-hidden bg-background md:block">
        <HeroImages activeId={activeId} />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-background/20" />

        <div className="relative z-10 mx-auto flex h-full max-w-[1480px] flex-col justify-center px-10 pb-36 pt-32">
          <div className="flex items-center gap-3 animate-hero-rise" style={{ animationDelay: "100ms" }}>
            <span data-ck="hero.eyebrow" className="eyebrow text-foreground/70">
              {t("hero.eyebrow")}
            </span>
          </div>
          <div className="mt-4 animate-hero-rise">{headline}</div>
          <p
            data-ck="hero.subtitle"
            className="mt-6 max-w-md animate-hero-rise text-lg leading-relaxed text-foreground/80"
            style={{ animationDelay: "700ms" }}
          >
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 animate-hero-rise" style={{ animationDelay: "850ms" }}>
            {ctas}
          </div>
          <div className="mt-10 animate-hero-rise" style={{ animationDelay: "1050ms" }}>
            <ColorSwatches activeId={activeId} onSelect={setActiveId} />
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-10 z-10 mx-auto flex max-w-[1480px] items-end justify-between gap-6 px-10">
          <a
            href="#featured"
            data-ck="hero.scroll"
            className="group inline-flex animate-hero-rise items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-foreground/70"
            style={{ animationDelay: "1250ms" }}
          >
            <span className="inline-flex h-9 w-9 animate-hero-bounce items-center justify-center rounded-full border border-foreground/40 group-hover:border-foreground">
              <ArrowDown className="h-3.5 w-3.5" />
            </span>
            {t("hero.scroll")}
          </a>
          <div className="animate-hero-rise text-right" style={{ animationDelay: "1250ms" }}>
            <p data-ck="hero.quote" className="font-serif text-base italic text-foreground/85">
              {t("hero.quote")}
            </p>
            <p data-ck="hero.quoteCaption" className="mt-1 text-[10px] uppercase tracking-[0.3em] text-foreground/55">
              {t("hero.quoteCaption")}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
