import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchColorSwatches, fetchProductVariants } from "@/lib/products";

export function ColorSwitcher({
  modelGroup,
  currentSku,
  currentColour,
  currentImage,
}: {
  modelGroup: string | null | undefined;
  currentSku: string;
  currentColour: string | null;
  currentImage?: string | null;
}) {
  const { data: variants } = useQuery({
    queryKey: ["variants", modelGroup],
    queryFn: () => (modelGroup ? fetchProductVariants(modelGroup, currentSku) : Promise.resolve([])),
    enabled: !!modelGroup,
    staleTime: 5 * 60_000,
  });
  const { data: swatches } = useQuery({
    queryKey: ["color-swatches"],
    queryFn: fetchColorSwatches,
    staleTime: 30 * 60_000,
  });

  const isDecorated = currentColour === "Decorated / Special";
  // For prints/specials dedup by sku (each print is unique); otherwise dedup by colour name
  const seen = new Set<string>();
  const distinct = (variants ?? []).filter((v) => {
    if (v.sku === currentSku) return false;
    const key = v.colour === "Decorated / Special" || isDecorated ? v.sku : v.colour;
    if (!key) return false;
    if (!isDecorated && v.colour === currentColour) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (a.colour ?? "").localeCompare(b.colour ?? ""));

  if (!distinct.length) return null;

  const hexFor = (c: string) => swatches?.find((s) => s.colour === c)?.hex ?? "#d4d4d4";

  const swatchStyle = (v: { colour: string | null; main_image: string | null }) =>
    v.colour === "Decorated / Special" && v.main_image
      ? { backgroundImage: `url(${v.main_image})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: hexFor(v.colour ?? "") };

  const currentStyle =
    isDecorated && currentImage
      ? { backgroundImage: `url(${currentImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: currentColour ? hexFor(currentColour) : "#fff" };

  return (
    <div className="mt-6">
      <p className="eyebrow mb-3 text-muted-foreground">
        {isDecorated ? "Принт" : "Цвет"}:{" "}
        <span className="text-foreground">{currentColour ?? "—"}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <span
          aria-current
          className="relative h-9 w-9 rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-background"
          style={currentStyle}
          title={currentColour ?? ""}
        />
        {distinct.map((v) => (
          <Link
            key={v.sku}
            to="/product/$sku"
            params={{ sku: v.sku }}
            title={v.sku}
            className="h-9 w-9 overflow-hidden rounded-full border border-border bg-white transition hover:ring-2 hover:ring-foreground hover:ring-offset-2 hover:ring-offset-background"
            style={swatchStyle(v)}
          />
        ))}
      </div>
    </div>
  );
}