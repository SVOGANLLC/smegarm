import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** High-contrast checkbox for catalog facets (works on light and dark themes). */
export function FacetCheckbox({
  checked,
  onChange,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex h-3.5 w-3.5 shrink-0", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none flex h-3.5 w-3.5 items-center justify-center rounded-[2px] border transition-colors",
          checked
            ? "border-foreground bg-foreground text-background"
            : "border-muted-foreground/55 bg-transparent",
        )}
      >
        {checked ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      </span>
    </span>
  );
}
