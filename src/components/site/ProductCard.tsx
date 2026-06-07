import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { useI18n, pickLocalized } from "@/lib/i18n";

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
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
      {list.slice(0, 3).map((b, i) => (
        <span key={i} className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] ${b.cls}`}>
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
    return <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("avail.onRequest")}</span>;
  }
  return (
    <div className="flex items-baseline gap-2">
      {price && <span className="text-base font-medium text-foreground">{price}</span>}
      {old && p.price_old && p.price_amd && p.price_old > p.price_amd && (
        <span className="text-xs text-muted-foreground line-through">{old}</span>
      )}
    </div>
  );
}

export function ProductCard({ p }: { p: ProductCardType }) {
  const { lang } = useI18n();
  const name = pickLocalized(p as unknown as Record<string, unknown>, "name", lang) || p.name;
  const category = pickLocalized(p as unknown as Record<string, unknown>, "category", lang) || p.category;
  const colour = pickLocalized(p as unknown as Record<string, unknown>, "colour", lang) || p.colour;
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 220, damping: 22 }}>
      <Link to="/product/$sku" params={{ sku: p.sku }} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-secondary">
          <Badges p={p} />
          <div className="absolute right-3 bottom-3 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <AddToCartButton
              sku={p.sku}
              name={name}
              image={p.main_image}
              price={p.price_amd}
              variant="compact"
            />
          </div>
          {p.main_image && (
            <img
              src={p.main_image}
              alt={name}
              loading="lazy"
              className="h-full w-full object-contain p-6 transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
          )}
        </div>
        <div className="mt-4 space-y-1.5">
          <h3 className="font-serif text-base text-foreground line-clamp-2">{name}</h3>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {[category, colour].filter(Boolean).join(" · ")}
          </p>
          <PriceBlock p={p} />
        </div>
      </Link>
    </motion.div>
  );
}

export function ProductGrid({ items }: { items: ProductCardType[] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-8">
      {items.map((p) => (
        <ProductCard key={p.sku} p={p} />
      ))}
    </div>
  );
}