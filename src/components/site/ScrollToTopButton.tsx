import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ArrowUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const SHOW_AFTER_PX = 320;

export function ScrollToTopButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admini") || pathname.startsWith("/admin/")) {
      setVisible(false);
      return;
    }
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("common.scrollToTop")}
      className="fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-lg backdrop-blur-sm transition-transform active:scale-95 md:bottom-[calc(1.5rem+4.5rem)] md:right-6 md:h-12 md:w-12 md:hover:scale-105"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
