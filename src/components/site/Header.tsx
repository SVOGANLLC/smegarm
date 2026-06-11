import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import smegLogo from "@/assets/smeg-logo.png.asset.json";
import { CartButton } from "@/components/site/CartDrawer";
import { HeaderSearch } from "@/components/site/HeaderSearch";

const langLabels: Record<Lang, string> = { ru: "RU", en: "EN", hy: "ՀՅ" };

export function Header() {
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const nav = [
    { to: "/catalog", label: t("nav.catalog"), internal: true },
    { to: "/#collections", label: t("nav.collections") },
    { to: "/#story", label: t("nav.story") },
    { to: "/#dealer", label: t("nav.dealer") },
    { to: "/#contact", label: t("nav.contact") },
  ];

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-background/85 backdrop-blur-xl border-b border-border/60"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:h-20 md:px-10">
        <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-foreground">
          <img
            src={smegLogo.url}
            alt="SMEG"
            className="block h-5 w-auto md:h-6"
          />
          <span className="hidden border-l border-border/60 pl-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:inline">
            Armenia
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {nav.map((n) =>
            n.internal ? (
              <Link
                key={n.to}
                to={n.to}
                className="smeg-underline text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground"
              >
                {n.label}
              </Link>
            ) : (
              <a
                key={n.to}
                href={n.to}
                className="smeg-underline text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground"
              >
                {n.label}
              </a>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-background/50 p-1 backdrop-blur sm:flex">
            {(Object.keys(langLabels) as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium tracking-wider transition-colors",
                  lang === l ? "bg-foreground text-background" : "text-foreground/60 hover:text-foreground",
                )}
                aria-pressed={lang === l}
              >
                {langLabels[l]}
              </button>
            ))}
          </div>
          <HeaderSearch />
          <CartButton />
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 backdrop-blur lg:hidden"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="text-[11px] font-medium uppercase tracking-wider">{menuOpen ? t("header.close") : t("header.menu")}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border/60 bg-background/95 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col px-6 py-6">
            {nav.map((n) =>
              n.internal ? (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border/40 py-4 font-serif text-2xl text-foreground"
                >
                  {n.label}
                </Link>
              ) : (
                <a
                  key={n.to}
                  href={n.to}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border/40 py-4 font-serif text-2xl text-foreground"
                >
                  {n.label}
                </a>
              ),
            )}
            <div className="mt-6 flex items-center gap-1 self-start rounded-full border border-border/70 p-1 sm:hidden">
              {(Object.keys(langLabels) as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-medium tracking-wider transition-colors",
                    lang === l ? "bg-foreground text-background" : "text-foreground/60",
                  )}
                >
                  {langLabels[l]}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </motion.header>
  );
}