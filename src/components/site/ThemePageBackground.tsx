import type { Theme } from "@/lib/products";
import { themePageBackgroundLayerStyle, themeRepeatCssClass } from "@/lib/theme-background";

export function ThemePageBackground({ theme }: { theme: Theme | null | undefined }) {
  if (!theme) return null;

  const layerStyle = themePageBackgroundLayerStyle(theme);
  if (!layerStyle) return null;

  const { mode, image, themeKey, ...style } = layerStyle;

  if (mode === "cover" && image) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden [transform:translateZ(0)]"
        style={style}
      >
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover object-center"
          decoding="async"
          fetchPriority="low"
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
