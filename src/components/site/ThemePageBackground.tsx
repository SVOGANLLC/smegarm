import type { Theme } from "@/lib/products";
import { themePageBackgroundLayerStyle } from "@/lib/theme-background";

export function ThemePageBackground({ theme }: { theme: Theme | null | undefined }) {
  if (!theme) return null;

  const layerStyle = themePageBackgroundLayerStyle(theme);
  if (!layerStyle) return null;

  const { mode, image, ...style } = layerStyle;

  if (mode === "cover" && image) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        style={style}
      >
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover object-center"
          decoding="async"
          fetchPriority="low"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={style}
    />
  );
}
