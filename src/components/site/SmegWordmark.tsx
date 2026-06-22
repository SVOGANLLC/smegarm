import type { ReactNode } from "react";
import smegLogoDark from "@/assets/smeg-logo.png.asset.json";
import smegLogoWhite from "@/assets/smeg-logo-white.png.asset.json";

type Variant = "dark" | "light";

const LOGO_CLASS = "inline-block h-[0.72em] w-auto shrink-0 align-baseline translate-y-[0.08em]";

/** Inline SMEG wordmark PNG wherever copy contains “Smeg” / “SMEG”. */
export function SmegWordmark({
  text,
  variant = "dark",
  className = LOGO_CLASS,
}: {
  text: string;
  variant?: Variant;
  className?: string;
}): ReactNode {
  const logoUrl = variant === "light" ? smegLogoWhite.url : smegLogoDark.url;
  const parts = text.split(/Smeg/i);
  if (parts.length === 1) return text;

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-[0.35em]">
      {parts.flatMap((part, i) => {
        const chunk = part.trim();
        if (i === 0) return chunk ? [<span key={`t-${i}`}>{chunk}</span>] : [];
        return [
          <img key={`smeg-${i}`} src={logoUrl} alt="SMEG" className={className} />,
          ...(chunk ? [<span key={`t-${i}`}>{chunk}</span>] : []),
        ];
      })}
    </span>
  );
}
