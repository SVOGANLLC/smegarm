import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { AvailPill } from "@/components/site/AvailPill";
import { CardColorSwatches } from "@/components/site/CardColorSwatches";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { resolveModelGroupLabel } from "@/lib/model-group-labels";
import type { Variant } from "@/lib/products";
import { cn } from "@/lib/utils";
import { HorizontalScroll, HorizontalScrollItem } from "./HorizontalScroll";

function formatAmd(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("ru-RU").format(n) + " ֏";
}

export function Badges({ p }: { p: ProductCardType }) {
  const { t } = useI18n();
  const list: Array<{ label: string; cls: string }> = [];
  if (p.badge_text) list.push({ label: p.badge_text, cls: "bg-foreground text-background" });
  if (p.discount_percent > 0) list.push({ label: `−${p.discount_percent}%`, cls: "bg-accent text-accent-foreground" });
  if (p.is_bestseller) list.push({ label: t("badge.hit"), cls: "bg-rose-600 text-white" });
  if (p.is_new) list.push({ label: t("badge.new"), cls: "bg-emerald-600 text-white" });
  if (p.is_special_offer && p.discount_percent === 0) list.push({ label: t("badge.sale"), cls: "bg-amber-500 text-black" });
  if (!list.length) return null;
  return (
    <div className="absolute left-2 top-2 z-10 flex flex-col gap-1 md:left-3 md:top-3 md:gap-1.5">
      {list.slice(0, 3).map((b, i) => (
        <span key={i} className={`rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] md:px-2.5 md:py-1 md:text-[10px] md:tracking-[0.12em] ${b.cls}`}>
          {b.label}
        </span>
      ))}
    </div>
  );
}

export function PriceBlock({
  p,
  priceFrom,
  variantCount,
}: {
  p: ProductCardType;
  priceFrom?: number | null;
  variantCount?: number;
}) {
  const { t } = useI18n();
  const showFrom = (variantCount ?? 0) > 1 && priceFrom != null;
  const price = formatAmd(showFrom ? priceFrom : p.price_amd);
  const old = formatAmd(p.price_old);
  if (!price && !old) {
    return <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("product.requestPrice")}</span>;
  }
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {price && (
        <span className="text-sm font-medium text-foreground md:text-base">
          {showFrom ? `${t("product.priceFrom")} ${price}` : price}
        </span>
      )}
      {!showFrom && old && p.price_old && p.price_amd && p.price_old > p.price_amd && (
        <span className="text-xs text-muted-foreground line-through">{old}</span>
      )}
    </div>
  );
}

function CardHitArea({
  sku,
  isMultiColor,
  onChooseColor,
  className,
  children,
}: {
  sku: string;
  isMultiColor: boolean;
  onChooseColor?: () => void;
  className?: string;
  children: ReactNode;
}) {
  if (isMultiColor && onChooseColor) {
    return (
      <button
        type="button"
        onClick={onChooseColor}
        className={cn("block w-full cursor-pointer text-left", className)}
      >
        {children}
      </button>
    );
  }
  return (
    <Link to="/product/$sku" params={{ sku }} className={className}>
      {children}
    </Link>
  );
}

export function ProductCard({
  p,
  showCart = true,
  variants,
  priceFrom,
  variantCount,
  swatchHex,
  onChooseColor,
  displayName,
  displayImage,
}: {
  p: ProductCardType;
  showCart?: boolean;
  variants?: Variant[];
  priceFrom?: number | null;
  variantCount?: number;
  swatchHex?: (canonicalColour: string) => string;
  onChooseColor?: () => void;
  displayName?: string;
  displayImage?: string | null;
}) {
  const { lang, t } = useI18n();
  const name =
    displayName ||
    pickLocalized(p as unknown as Record<string, unknown>, "name", lang) ||
    p.name;
  const heroImage = displayImage ?? p.main_image;
  const category = pickLocalized(p as unknown as Record<string, unknown>, "category", lang) || p.category;
  const colour = pickLocalized(p as unknown as Record<string, unknown>, "colour", lang) || p.colour;
  const count = variantCount ?? variants?.length ?? 1;
  const isMultiColor = count > 1 && !!variants?.length;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 220, damping: 22 }} className="h-full">
      <div className="group flex h-full flex-col">
        <CardHitArea sku={p.sku} isMultiColor={isMultiColor} onChooseColor={onChooseColor} className="block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-white">
            <Badges p={p} />
            {heroImage && (
              <img
                src={heroImage}
                alt={name}
                loading="lazy"
                className="h-full w-full object-contain p-4 transition-transform duration-[1200ms] ease-out group-hover:scale-105 md:p-6"
              />
            )}
          </div>
        </CardHitArea>
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 md:mt-4">
          <CardHitArea sku={p.sku} isMultiColor={isMultiColor} onChooseColor={onChooseColor} className="block min-w-0">
            <h3 className="font-serif text-sm leading-snug text-foreground line-clamp-2 break-words md:text-base">{name}</h3>
            <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground line-clamp-1 md:text-[10px] md:tracking-[0.18em]">
              {[category, !isMultiColor && colour].filter(Boolean).join(" · ")}
            </p>
          </CardHitArea>
          {!isMultiColor && (
            <AvailPill availability={p.availability} stock_qty={p.stock_qty} stock_reserved={p.stock_reserved} lead_time_days={p.lead_time_days} />
          )}
          {isMultiColor && variants && swatchHex && (
            <CardColorSwatches variants={variants} currentSku={p.sku} swatchHex={swatchHex} />
          )}
          <CardHitArea sku={p.sku} isMultiColor={isMultiColor} onChooseColor={onChooseColor}>
            <PriceBlock p={p} priceFrom={priceFrom} variantCount={count} />
          </CardHitArea>
          {showCart && (
            <div className="mt-auto pt-2">
              {isMultiColor && onChooseColor ? (
                <button
                  type="button"
                  onClick={onChooseColor}
                  className="inline-flex w-full items-center justify-center rounded-full border border-foreground px-6 py-2.5 text-[10px] uppercase tracking-[0.16em] text-foreground transition hover:bg-foreground hover:text-background md:py-3 md:text-xs md:tracking-[0.2em]"
                >
                  {t("product.chooseColor")}
                </button>
              ) : (
                <AddToCartButton
                  sku={p.sku}
                  name={name}
                  image={p.main_image}
                  price={p.price_amd}
                  className="w-full justify-center py-2.5 text-[10px] tracking-[0.16em] md:py-3 md:text-xs md:tracking-[0.2em]"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ProductGrid({
  items,
  swatchHex,
  onChooseColor,
  modelGroupLabels,
}: {
  items: Array<ProductCardType & { variants?: import("@/lib/products").Variant[]; priceFrom?: number | null; variantCount?: number; model_group?: string | null }>;
  swatchHex?: (canonical: string) => string;
  onChooseColor?: (item: ProductCardType & { variants?: Variant[]; model_group?: string | null }) => void;
  modelGroupLabels?: import("@/lib/model-group-labels").ModelGroupLabel[];
}) {
  const { lang } = useI18n();
  if (!items.length) return null;

  const cardProps = (p: (typeof items)[number]) => {
    const count = p.variantCount ?? p.variants?.length ?? 1;
    const isMulti = count > 1 && !!p.variants?.length;
    const label = isMulti && modelGroupLabels?.length
      ? resolveModelGroupLabel(modelGroupLabels, lang, p.model_group, p.sku, { variants: p.variants })
      : {};
    return {
      displayName: label.name,
      displayImage: label.image ?? null,
    };
  };

  return (
    <div className="light-section rounded-sm p-4 md:p-8">
      <HorizontalScroll className="md:hidden">
        {items.map((p) => (
          <HorizontalScrollItem key={p.sku}>
            <ProductCard
              p={p}
              variants={p.variants}
              priceFrom={p.priceFrom}
              variantCount={p.variantCount}
              swatchHex={swatchHex}
              onChooseColor={onChooseColor ? () => onChooseColor(p) : undefined}
              {...cardProps(p)}
            />
          </HorizontalScrollItem>
        ))}
      </HorizontalScroll>
      <div className="hidden md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-8">
        {items.map((p) => (
          <ProductCard
            key={p.sku}
            p={p}
            variants={p.variants}
            priceFrom={p.priceFrom}
            variantCount={p.variantCount}
            swatchHex={swatchHex}
            onChooseColor={onChooseColor ? () => onChooseColor(p) : undefined}
            {...cardProps(p)}
          />
        ))}
      </div>
    </div>
  );
}
