import type { Theme } from "@/lib/products";
import { themePageBackgroundLayerStyle, themeRepeatCssClass } from "@/lib/theme-background";

export function ThemePageBackground({ theme }: { theme: Theme | null | undefined }) {
  if (!theme) return null;

  const layerStyle = themePageBackgroundLayerStyle(theme);
  if (!layerStyle) return null;

  const { mode, image, srcSet, objectPosition, themeKey, ...style } = layerStyle;

  if (mode === "cover" && image) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden [transform:translateZ(0)]"
        style={style}
      >
        <img
          src={image}
          srcSet={srcSet ?? undefined}
          alt=""
          className="absolute left-1/2 top-1/2 min-h-full min-w-full max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{ objectFit: "cover", objectPosition: objectPosition ?? "center center" }}
          decoding="async"
          fetchPriority="high"
          sizes="100vw"
        />
      </div>
    );
  }

  if (mode === "repeat" && themeKey && style.backgroundImage) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden [transform:translateZ(0)]"
        style={{ backgroundColor: style.backgroundColor }}
      >
        <div
          className={`absolute inset-0 ${themeRepeatCssClass(themeKey)}`}
          style={{
            backgroundImage: style.backgroundImage,
            backgroundColor: style.backgroundColor,
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 [transform:translateZ(0)]"
      style={style}
    />
  );
}
