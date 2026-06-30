import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminCheckbox({
  checked,
  onChange,
  label,
  className,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  className?: string;
  description?: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-sm text-sm transition-colors",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-2 transition-colors",
          checked
            ? "border-foreground bg-foreground text-background shadow-sm"
            : "border-muted-foreground/70 bg-background",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn(checked ? "text-foreground" : "text-foreground/80")}>{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}
