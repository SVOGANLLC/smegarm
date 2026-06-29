import { Link } from "@tanstack/react-router";
import { colourLabel } from "@/lib/colour-i18n";
import { useI18n, pickLocalized } from "@/lib/i18n";
import type { Variant } from "@/lib/products";

const MAX_VISIBLE = 6;

export function CardColorSwatches({
  variants,
  currentSku,
  swatchHex,
}: {
  variants: Variant[];
  currentSku: string;
  swatchHex: (canonicalColour: string) => string;
}) {
  const { lang } = useI18n();
  if (variants.length <= 1) return null;

  const visible = variants.slice(0, MAX_VISIBLE);
  const extra = variants.length - visible.length;

  const labelFor = (v: Variant) =>
    pickLocalized(v as unknown as Record<string, unknown>, "colour", lang) ||
    colourLabel(v.colour_en ?? v.colour ?? "", lang);

  const swatchStyle = (v: Variant) => {
    const canonical = v.colour_en ?? v.colour ?? "";
    if (canonical === "Decorated / Special" && v.main_image) {
      return {
        backgroundImage: `url(${v.main_image})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
      };
    }
    return { background: swatchHex(canonical) };
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {visible.map((v) => {
        const isCurrent = v.sku === currentSku;
        const title = labelFor(v);
        const base =
          "h-5 w-5 shrink-0 overflow-hidden rounded-full border border-border transition md:h-6 md:w-6";
        if (isCurrent) {
          return (
            <span
              key={v.sku}
              aria-current
              title={title}
              className={`${base} ring-2 ring-foreground ring-offset-1 ring-offset-background`}
              style={swatchStyle(v)}
            />
          );
        }
        return (
          <Link
            key={v.sku}
            to="/product/$sku"
            params={{ sku: v.sku }}
            title={title}
            onClick={(e) => e.stopPropagation()}
            className={`${base} hover:ring-2 hover:ring-foreground/60 hover:ring-offset-1 hover:ring-offset-background`}
            style={swatchStyle(v)}
          />
        );
      })}
      {extra > 0 && (
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}
