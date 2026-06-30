import type { MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  GLOSS_HIGHLIGHT,
  isMatteColour,
  SWATCH_SIZE_CLASS,
  swatchBorderClass,
  type SwatchSize,
} from "@/lib/color-swatch-style";

type Props = {
  colourName: string;
  hex: string;
  size?: SwatchSize;
  active?: boolean;
  title?: string;
  imageUrl?: string | null;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  href?: { to: string; params?: Record<string, string> };
};

export function ColorSwatchDot({
  colourName,
  hex,
  size = "md",
  active,
  title,
  imageUrl,
  className,
  onClick,
  href,
}: Props) {
  const matte = isMatteColour(colourName);
  const decorated = imageUrl && colourName === "Decorated / Special";
  const border = swatchBorderClass(hex, colourName);
  const ring = active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "";

  const inner = (
    <>
      {decorated ? (
        <span
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <span className="absolute inset-0" style={{ backgroundColor: hex }} />
      )}
      {!matte && !decorated && (
        <span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: GLOSS_HIGHLIGHT }}
          aria-hidden
        />
      )}
    </>
  );

  const base = cn(
    "relative shrink-0 overflow-hidden rounded-full bg-background transition",
    SWATCH_SIZE_CLASS[size],
    border,
    ring,
    !active && "hover:ring-2 hover:ring-foreground/50 hover:ring-offset-2 hover:ring-offset-background",
    className,
  );

  if (href) {
    return (
      <Link
        to={href.to}
        params={href.params}
        title={title}
        onClick={onClick}
        className={base}
      >
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" title={title} onClick={onClick} className={base}>
        {inner}
      </button>
    );
  }

  return (
    <span title={title} className={base} aria-current={active || undefined}>
      {inner}
    </span>
  );
}
