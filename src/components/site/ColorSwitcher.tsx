import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { colourLabel } from "@/lib/colour-i18n";
import { fetchColorSwatches, fetchProductVariants } from "@/lib/products";
import { swatchImageForProduct } from "@/lib/theme-background";
import { ColorSwatchDot } from "@/components/site/ColorSwatchDot";

export function ColorSwitcher({
  modelGroup,
  currentSku,
  currentColour,
  currentColourEn,
  currentImage,
}: {
  modelGroup: string | null | undefined;
  currentSku: string;
  currentColour: string | null;
  currentColourEn?: string | null;
  currentImage?: string | null;
}) {
  const { lang, t } = useI18n();
  const { data: variants } = useQuery({
    queryKey: ["variants", modelGroup, currentSku],
    queryFn: () => (modelGroup ? fetchProductVariants(modelGroup, currentSku) : Promise.resolve([])),
    enabled: !!modelGroup,
    staleTime: 5 * 60_000,
  });
  const { data: swatches } = useQuery({
    queryKey: ["color-swatches"],
    queryFn: fetchColorSwatches,
    staleTime: 30 * 60_000,
  });

  const canonicalEn = currentColourEn ?? currentColour ?? "";
  const isDecorated = canonicalEn === "Decorated / Special";

  const items = useMemo(() => {
    const list = variants ?? [];
    const seen = new Set<string>();
    const out: typeof list = [];
    for (const v of list) {
      const colourKey = v.colour_en ?? v.colour ?? "";
      const key = colourKey === "Decorated / Special" ? v.sku : colourKey;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
    return out.sort((a, b) => {
      const la = pickLocalized(a as unknown as Record<string, unknown>, "colour", lang) || colourLabel(a.colour_en ?? a.colour ?? "", lang);
      const lb = pickLocalized(b as unknown as Record<string, unknown>, "colour", lang) || colourLabel(b.colour_en ?? b.colour ?? "", lang);
      return la.localeCompare(lb);
    });
  }, [variants, lang]);

  if (!items.length) return null;

  const hexFor = (c: string) => swatches?.find((s) => s.colour === c)?.hex ?? "#d4d4d4";

  const labelFor = (v: { colour_en: string | null; colour: string | null; colour_hy?: string | null }) =>
    pickLocalized(v as unknown as Record<string, unknown>, "colour", lang) ||
    colourLabel(v.colour_en ?? v.colour ?? "", lang);

  const currentLabel = currentColour || colourLabel(canonicalEn, lang);

  return (
    <div className="mt-6">
      <p className="eyebrow mb-3 text-muted-foreground">
        {isDecorated ? t("product.print") : t("product.colour")}:{" "}
        <span className="text-foreground">{currentLabel}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map((v) => {
          const canonical = v.colour_en ?? v.colour ?? "";
          const isCurrent = v.sku === currentSku;
          return (
            <ColorSwatchDot
              key={v.sku}
              colourName={canonical}
              hex={hexFor(canonical)}
              size="lg"
              active={isCurrent}
              title={labelFor(v)}
              imageUrl={swatchImageForProduct(v.sku, canonical, v.main_image)}
              href={isCurrent ? undefined : { to: "/product/$sku", params: { sku: v.sku } }}
            />
          );
        })}
      </div>
    </div>
  );
}
