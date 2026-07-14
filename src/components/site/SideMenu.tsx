import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, X } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { scrollToHomeSection } from "@/lib/hash-scroll";
import { CatalogMobileNav } from "@/components/site/CatalogMegaMenu";

const langLabels: Record<Lang, string> = { ru: "RU", en: "EN", hy: "ՀՅ" };

type SideMenuProps = {
  open: boolean;
  onClose: () => void;
  /** On mobile include catalog / HoC / collections in the drawer. */
  includePrimaryNav?: boolean;
};

type MenuItem =
  | {
      id: string;
      label: string;
      to: "/news" | "/service" | "/business" | "/house-of-coffee" | "/catalog";
      kind: "route";
    }
  | { id: string; label: string; hash: string; kind: "hash" };

/** Invert tokens so nested nav (catalog accordion) stays readable on the dark panel. */
const panelVars = {
  "--background": "#0a0a0a",
  "--foreground": "#ffffff",
  "--muted-foreground": "rgba(255,255,255,0.55)",
  "--border": "rgba(255,255,255,0.18)",
  "--secondary": "rgba(255,255,255,0.08)",
} as CSSProperties;

export function SideMenu({ open, onClose, includePrimaryNav = false }: SideMenuProps) {
  const { t, lang, setLang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navCaps = (label: string) =>
    label.toLocaleUpperCase(lang === "hy" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-US");

  const items: MenuItem[] = [
    { id: "story", label: t("nav.story"), hash: "story", kind: "hash" },
    { id: "contact", label: t("nav.contact"), hash: "contact", kind: "hash" },
    { id: "news", label: t("nav.news"), to: "/news", kind: "route" },
    { id: "service", label: t("nav.service"), to: "/service", kind: "route" },
    { id: "business", label: t("nav.business"), to: "/business", kind: "route" },
  ];

  const onHashNav = (e: MouseEvent, hash: string) => {
    if (pathname === "/") {
      e.preventDefault();
      scrollToHomeSection(hash);
      onClose();
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label={t("header.close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={t("header.menu")}
            style={panelVars}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            className="fixed inset-y-0 right-0 z-[70] flex w-[min(100vw,22rem)] flex-col bg-background text-foreground shadow-2xl md:w-[min(100vw,26rem)]"
          >
            <div className="flex items-center justify-end px-5 py-4 md:px-8 md:py-6">
              <button
                type="button"
                onClick={onClose}
                aria-label={t("header.close")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-6 pb-10 md:px-10">
              {includePrimaryNav && (
                <div className="mb-8 border-b border-border pb-6 md:hidden">
                  <CatalogMobileNav onNavigate={onClose} compact />
                  <Link
                    to="/house-of-coffee"
                    onClick={onClose}
                    className="mt-2 flex items-center justify-between py-3 text-sm uppercase tracking-[0.18em] text-foreground/90 transition hover:text-foreground"
                  >
                    {navCaps(t("nav.houseOfCoffee"))}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Link
                    to="/"
                    hash="collections"
                    onClick={(e) => onHashNav(e, "collections")}
                    className="flex items-center justify-between py-3 text-sm uppercase tracking-[0.18em] text-foreground/90 transition hover:text-foreground"
                  >
                    {navCaps(t("nav.collections"))}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
              )}

              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.id}>
                    {item.kind === "route" ? (
                      <Link
                        to={item.to}
                        onClick={onClose}
                        className="flex items-center justify-between py-3.5 text-sm uppercase tracking-[0.2em] text-foreground transition hover:text-foreground/80"
                      >
                        {item.label}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ) : (
                      <Link
                        to="/"
                        hash={item.hash}
                        onClick={(e) => onHashNav(e, item.hash)}
                        className="flex items-center justify-between py-3.5 text-sm uppercase tracking-[0.2em] text-foreground transition hover:text-foreground/80"
                      >
                        {item.label}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            <div className="shrink-0 border-t border-border px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-10">
              <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {t("header.language")}
              </p>
              <div className="flex items-center gap-1 rounded-full border border-border p-1">
                {(Object.keys(langLabels) as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={cn(
                      "flex-1 rounded-full px-3 py-2 text-[11px] font-medium tracking-wider transition-colors",
                      lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                    aria-pressed={lang === l}
                  >
                    {langLabels[l]}
                  </button>
                ))}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
