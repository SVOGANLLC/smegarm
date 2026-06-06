import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchColorSwatches, fetchProductVariants } from "@/lib/products";

export function ColorSwitcher({
  modelGroup,
  currentSku,
  currentColour,
}: {
  modelGroup: string | null | undefined;
  currentSku: string;
  currentColour: string | null;
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

  // unique by colour, drop ones identical to current
  const seen = new Set<string>();
  const distinct = (variants ?? []).filter((v) => {
    if (!v.colour || v.colour === currentColour) return false;
    if (seen.has(v.colour)) return false;
    seen.add(v.colour);
    return true;
  });

  if (!distinct.length) return null;

  const hexFor = (c: string) => swatches?.find((s) => s.colour === c)?.hex ?? "#d4d4d4";

  return (
    <div className="mt-6">
      <p className="eyebrow mb-3 text-muted-foreground">
        Цвет: <span className="text-foreground">{currentColour ?? "—"}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        <span
          aria-current
          className="relative h-9 w-9 rounded-full ring-2 ring-foreground ring-offset-2 ring-offset-background"
          style={{ background: currentColour ? hexFor(currentColour) : "#fff" }}
          title={currentColour ?? ""}
        />
        {distinct.map((v) => (
          <Link
            key={v.sku}
            to="/product/$sku"
            params={{ sku: v.sku }}
            title={v.colour ?? ""}
            className="h-9 w-9 rounded-full border border-border transition hover:ring-2 hover:ring-foreground hover:ring-offset-2 hover:ring-offset-background"
            style={{ background: hexFor(v.colour!) }}
          />
        ))}
      </div>
    </div>
  );
}