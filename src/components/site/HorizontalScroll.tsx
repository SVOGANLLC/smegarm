import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Native-feeling horizontal snap scroll for mobile product rows. */
export function HorizontalScroll({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-x-auto overflow-y-visible overscroll-x-contain px-4 pb-1 snap-x snap-mandatory scrollbar-none md:overflow-visible md:px-0 md:pb-0 md:snap-none",
        className,
      )}
    >
      <div className={cn("flex gap-3 md:contents", innerClassName)}>{children}</div>
    </div>
  );
}

export function HorizontalScrollItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[min(78vw,280px)] shrink-0 snap-start md:w-auto md:max-w-none md:shrink",
        className,
      )}
    >
      {children}
    </div>
  );
}
