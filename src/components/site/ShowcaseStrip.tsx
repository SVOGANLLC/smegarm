import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { fetchProductsByFlag } from "@/lib/products";
import { ProductGrid } from "./ProductCard";
import { SectionHeader, Reveal } from "./Section";
import { useI18n } from "@/lib/i18n";

type Flag = "is_featured" | "is_new" | "is_bestseller" | "is_special_offer";

export function ShowcaseStrip({
  flag,
  eyebrow,
  title,
  to,
  ctaLabel,
  bg = false,
}: {
  flag: Flag;
  eyebrow: string;
  title: string;
  to?: string;
  ctaLabel?: string;
  bg?: boolean;
}) {
  const { t } = useI18n();
  const resolve = (v: string) => (v.includes(".") ? t(v) : v);
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["showcase", flag],
    queryFn: () => fetchProductsByFlag(flag, 8),
    staleTime: 5 * 60 * 1000,
  });
  if (!isLoading && !items.length) return null;
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader eyebrow={resolve(eyebrow)} title={resolve(title)} />
          {to && ctaLabel && (
            <Reveal>
              <Link to={to} className="smeg-underline text-sm uppercase tracking-[0.2em] text-foreground/70">
                {resolve(ctaLabel)} →
              </Link>
            </Reveal>
          )}
        </div>
        <div className="mt-12">
          <ProductGrid items={items} />
        </div>
      </div>
    </section>
  );
}