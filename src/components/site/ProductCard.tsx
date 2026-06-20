import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { AvailPill } from "@/components/site/AvailPill";
import { useI18n, pickLocalized } from "@/lib/i18n";
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

export function PriceBlock({ p }: { p: ProductCardType }) {
  const { t } = useI18n();
  const price = formatAmd(p.price_amd);
  const old = formatAmd(p.price_old);
  if (!price && !old) {
    return <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("product.requestPrice")}</span>;
  }
  return (
    <div className="flex items-baseline gap-2">
      {price && <span className="text-sm font-medium text-foreground md:text-base">{price}</span>}
      {old && p.price_old && p.price_amd && p.price_old > p.price_amd && (
        <span className="text-xs text-muted-foreground line-through">{old}</span>
      )}
    </div>
  );
}

export function ProductCard({ p, showCart = true }: { p: ProductCardType; showCart?: boolean }) {
  const { lang } = useI18n();
  const name = pickLocalized(p as unknown as Record<string, unknown>, "name", lang) || p.name;
  const category = pickLocalized(p as unknown as Record<string, unknown>, "category", lang) || p.category;
  const colour = pickLocalized(p as unknown as Record<string, unknown>, "colour", lang) || p.colour;

  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 220, damping: 22 }} className="h-full">
      <div className="group flex h-full flex-col">
        <Link to="/product/$sku" params={{ sku: p.sku }} className="block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-white">
            <Badges p={p} />
            {p.main_image && (
              <img
                src={p.main_image}
                alt={name}
                loading="lazy"
                className="h-full w-full object-contain p-4 transition-transform duration-[1200ms] ease-out group-hover:scale-105 md:p-6"
              />
            )}
          </div>
        </Link>
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2 md:mt-4">
          <Link to="/product/$sku" params={{ sku: p.sku }} className="block min-w-0">
            <h3 className="font-serif text-sm leading-snug text-foreground line-clamp-2 break-words md:text-base">{name}</h3>
            <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground line-clamp-1 md:text-[10px] md:tracking-[0.18em]">
              {[category, colour].filter(Boolean).join(" · ")}
            </p>
          </Link>
          <AvailPill availability={p.availability} stock_qty={p.stock_qty} stock_reserved={p.stock_reserved} lead_time_days={p.lead_time_days} />
          <PriceBlock p={p} />
          {showCart && (
            <div className="mt-auto pt-2">
              <AddToCartButton
                sku={p.sku}
                name={name}
                image={p.main_image}
                price={p.price_amd}
                className="w-full justify-center py-2.5 text-[10px] tracking-[0.16em] md:py-3 md:text-xs md:tracking-[0.2em]"
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ProductGrid({ items }: { items: ProductCardType[] }) {
  if (!items.length) return null;
  return (
    <div className="light-section rounded-sm p-4 md:p-8">
      <HorizontalScroll className="md:hidden">
        {items.map((p) => (
          <HorizontalScrollItem key={p.sku}>
            <ProductCard p={p} />
          </HorizontalScrollItem>
        ))}
      </HorizontalScroll>
      <div className="hidden md:grid md:grid-cols-2 md:gap-6 lg:grid-cols-4 lg:gap-8">
        {items.map((p) => (
          <ProductCard key={p.sku} p={p} />
        ))}
      </div>
    </div>
  );
}
