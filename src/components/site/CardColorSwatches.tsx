import { Link } from "@tanstack/react-router";
import { colourLabel } from "@/lib/colour-i18n";
import { useI18n, pickLocalized } from "@/lib/i18n";
import type { Variant } from "@/lib/products";
import { ColorSwatchDot } from "@/components/site/ColorSwatchDot";

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

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {visible.map((v) => {
        const canonical = v.colour_en ?? v.colour ?? "";
        const isCurrent = v.sku === currentSku;
        const title = labelFor(v);
        const hex = swatchHex(canonical);
        const common = {
          colourName: canonical,
          hex,
          size: "sm" as const,
          active: isCurrent,
          title,
          imageUrl: canonical === "Decorated / Special" ? v.main_image : null,
        };
        if (isCurrent) {
          return <ColorSwatchDot key={v.sku} {...common} />;
        }
        return (
          <ColorSwatchDot
            key={v.sku}
            {...common}
            href={{ to: "/product/$sku", params: { sku: v.sku } }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}
      {extra > 0 && (
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}
