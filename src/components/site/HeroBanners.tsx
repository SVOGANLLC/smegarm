import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
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

/**
 * Optional promo banners directly under the home hero.
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
        <div
          className={cn(
            "grid gap-3 md:gap-4",
            items.length === 1 && "grid-cols-1",
            items.length === 2 && "grid-cols-1 md:grid-cols-2",
            items.length > 2 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          )}
        >
          {items.map((banner, i) => (
            <Reveal key={banner.id} delay={i * 0.06}>
              <BannerCard
                banner={banner}
                wide={items.length === 1}
                title={bannerTitle(banner, lang)}
                subtitle={bannerSubtitle(banner, lang)}
                ctaLabel={bannerCtaLabel(banner, lang)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function BannerCard({
  banner,
  wide,
  title,
  subtitle,
  ctaLabel,
}: {
  banner: HomeBanner;
  wide: boolean;
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
            loading="lazy"
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
