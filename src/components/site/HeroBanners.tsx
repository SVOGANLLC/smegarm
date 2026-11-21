import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Reveal } from "./Section";
import {
  bannerCtaLabel,
  bannerSubtitle,
  bannerTitle,
  fetchHomeBanners,
  isBannerEmpty,
  isExternalHref,
  safeBannerHref,
  type HomeBanner,
} from "@/lib/banners";

/** Pointer travel (px) after which a click on a slide is treated as a swipe. */
const SWIPE_CLICK_TOLERANCE = 8;

/**
 * Optional promo banners directly under the home hero.
 * One banner renders as a plain card, two or more become a swipeable carousel.
 * Renders nothing at all while there are no active banners, so the home page
 * stays exactly as before until an admin adds the first one.
 */
export function HeroBanners() {
  const { lang } = useI18n();
  const bannersQ = useQuery({
    queryKey: ["home-banners"],
    queryFn: fetchHomeBanners,
    staleTime: 60_000,
  });

  const items = (bannersQ.data ?? []).filter((banner) => !isBannerEmpty(banner, lang));
  if (items.length === 0) return null;

  return (
    <section className="pt-8 md:pt-16">
      <div className="mx-auto max-w-[1400px] px-4 md:px-10">
        {items.length === 1 ? (
          <Reveal>
            <BannerCard
              banner={items[0]}
              wide
              eager
              title={bannerTitle(items[0], lang)}
              subtitle={bannerSubtitle(items[0], lang)}
              ctaLabel={bannerCtaLabel(items[0], lang)}
            />
          </Reveal>
        ) : (
          <Reveal>
            <BannerCarousel items={items} lang={lang} />
          </Reveal>
        )}
      </div>
    </section>
  );
}

function BannerCarousel({ items, lang }: { items: HomeBanner[]; lang: Lang }) {
  const { t } = useI18n();
  const reduce = useReducedMotion();

  const [viewportRef, embla] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
    duration: reduce ? 0 : 24,
  });

  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(items.length);

  useEffect(() => {
    if (!embla) return;
    const sync = () => {
      setSelected(embla.selectedScrollSnap());
      setSnapCount(embla.scrollSnapList().length);
    };
    sync();
    embla.on("select", sync).on("reInit", sync);
    return () => {
      embla.off("select", sync).off("reInit", sync);
    };
  }, [embla]);

  /** Embla does not swallow clicks after a drag, so a swipe must cancel the link. */
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
    suppressClick.current = false;
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    if (!start) return;
    if (
      Math.abs(event.clientX - start.x) > SWIPE_CLICK_TOLERANCE ||
      Math.abs(event.clientY - start.y) > SWIPE_CLICK_TOLERANCE
    ) {
      suppressClick.current = true;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handleClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!suppressClick.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick.current = false;
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        embla?.scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        embla?.scrollNext();
      }
    },
    [embla],
  );

  const arrowClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/25 text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("banners.region")}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={viewportRef}
        className="cursor-grab overflow-hidden active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClickCapture={handleClickCapture}
      >
        <div className="flex touch-pan-y">
          {items.map((banner, i) => (
            <div
              key={banner.id}
              role="group"
              aria-roledescription={t("banners.slide")}
              aria-label={t("banners.slideLabel", { index: i + 1, total: items.length })}
              className="min-w-0 shrink-0 grow-0 basis-full"
            >
              <BannerCard
                banner={banner}
                wide
                eager={i === 0}
                title={bannerTitle(banner, lang)}
                subtitle={bannerSubtitle(banner, lang)}
                ctaLabel={bannerCtaLabel(banner, lang)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-6 md:mt-4">
        <div className="flex items-center">
          {Array.from({ length: snapCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => embla?.scrollTo(i)}
              aria-label={t("banners.goTo", { index: i + 1 })}
              aria-current={selected === i ? "true" : undefined}
              className="group inline-flex h-6 w-8 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <span
                className={cn(
                  "h-px w-full transition-colors",
                  selected === i
                    ? "bg-foreground"
                    : "bg-foreground/25 group-hover:bg-foreground/60",
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => embla?.scrollPrev()}
            aria-label={t("banners.prev")}
            className={arrowClass}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => embla?.scrollNext()}
            aria-label={t("banners.next")}
            className={arrowClass}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function BannerCard({
  banner,
  wide,
  eager,
  title,
  subtitle,
  ctaLabel,
}: {
  banner: HomeBanner;
  wide: boolean;
  eager?: boolean;
  title: string;
  subtitle: string;
  ctaLabel: string;
}) {
  const href = safeBannerHref(banner.link_url);
  const image = (banner.image_url ?? "").trim();
  const hasImage = Boolean(image);

  const frameClass = cn(
    "group relative block overflow-hidden",
    hasImage ? "bg-secondary text-white" : "border border-border bg-secondary/40 text-foreground",
    wide ? "aspect-[16/10] md:aspect-[21/8]" : "aspect-[16/9] md:aspect-[16/10]",
    href &&
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
  );

  const body = (
    <>
      {hasImage ? (
        <>
          <img
            src={image}
            alt={title}
            loading={eager ? "eager" : "lazy"}
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover transition duration-[900ms] group-hover:scale-[1.03]"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent"
          />
        </>
      ) : null}
      <div className="relative z-10 flex h-full flex-col justify-end p-5 md:p-7">
        {title ? (
          <p className="max-w-[34ch] font-serif text-lg leading-snug tracking-tight md:text-2xl">
            {title}
          </p>
        ) : null}
        {subtitle ? (
          <p
            className={cn(
              "mt-2 max-w-[46ch] text-sm leading-relaxed",
              hasImage ? "text-white/85" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        ) : null}
        {href ? (
          <span
            className={cn(
              "mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em]",
              hasImage ? "text-white/85" : "text-foreground/80",
            )}
          >
            {ctaLabel ? ctaLabel : <span className="sr-only">{title || subtitle}</span>}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        ) : null}
      </div>
    </>
  );

  if (!href) return <div className={frameClass}>{body}</div>;

  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={frameClass}>
        {body}
      </a>
    );
  }

  return (
    <Link to={href} className={frameClass}>
      {body}
    </Link>
  );
}
