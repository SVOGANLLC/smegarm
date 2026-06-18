import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useI18n, pickLocalized } from "@/lib/i18n";
import { colourLabel } from "@/lib/colour-i18n";
import { fetchColorSwatches, fetchProductVariants } from "@/lib/products";

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
    queryKey: ["variants", modelGroup],
    queryFn: () => (modelGroup ? fetchProductVariants(modelGroup) : Promise.resolve([])),
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

  const swatchStyle = (v: { colour_en: string | null; colour: string | null; main_image: string | null }) =>
    (v.colour_en ?? v.colour) === "Decorated / Special" && v.main_image
      ? { backgroundImage: `url(${v.main_image})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: hexFor(v.colour_en ?? v.colour ?? "") };

  const currentStyle =
    isDecorated && currentImage
      ? { backgroundImage: `url(${currentImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: canonicalEn ? hexFor(canonicalEn) : "#fff" };

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
          const isCurrent = v.sku === currentSku;
          const title = labelFor(v);
          if (isCurrent) {
            return (
              <span
                key={v.sku}
                aria-current
                className="relative h-9 w-9 rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-background"
                style={currentStyle}
                title={title}
              />
            );
          }
          return (
            <Link
              key={v.sku}
              to="/product/$sku"
              params={{ sku: v.sku }}
              title={title}
              className="h-9 w-9 overflow-hidden rounded-full border border-border bg-white transition hover:ring-2 hover:ring-foreground hover:ring-offset-2 hover:ring-offset-background"
              style={swatchStyle(v)}
            />
          );
        })}
      </div>
    </div>
  );
}
