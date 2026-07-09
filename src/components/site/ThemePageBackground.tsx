import type { Theme } from "@/lib/products";
import { themePageBackgroundLayerStyle, themeRepeatCssClass } from "@/lib/theme-background";

export function ThemePageBackground({ theme }: { theme: Theme | null | undefined }) {
  if (!theme) return null;

  const layerStyle = themePageBackgroundLayerStyle(theme);
  if (!layerStyle) return null;

  const { mode, image, objectPosition, themeKey, ...style } = layerStyle;

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
          className="block h-[100dvh] w-full object-cover"
          style={{ objectPosition: objectPosition ?? "center center" }}
          decoding="async"
          fetchPriority="high"
        />
      </div>
    );
  }

  if (mode === "repeat" && themeKey && style.backgroundImage) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
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
      className="pointer-events-none fixed inset-0 -z-10"
      style={style}
    />
  );
}
