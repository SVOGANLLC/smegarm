import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, ArrowRight } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import smegLogo from "@/assets/smeg-logo.svg.asset.json";
import { CartButton } from "@/components/site/CartDrawer";
import { HeaderSearch } from "@/components/site/HeaderSearch";
import { CatalogMegaMenu, CatalogMobileNav } from "@/components/site/CatalogMegaMenu";

const langLabels: Record<Lang, string> = { ru: "RU", en: "EN", hy: "ՀՅ" };

function scrollToSection(hash: string) {
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Header() {
  const { t, lang, setLang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
    { to: "/house-of-coffee", label: t("nav.houseOfCoffee"), internal: true },
    { to: "/#collections", label: t("nav.collections"), hash: "collections" },
    { to: "/#story", label: t("nav.story"), hash: "story" },
    { to: "/#contact", label: t("nav.contact"), hash: "contact" },
  ];

  const onHashNav = (e: MouseEvent, hash: string) => {
    if (pathname === "/") {
      e.preventDefault();
      scrollToSection(hash);
      setMenuOpen(false);
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled || menuOpen
            ? "bg-background/90 backdrop-blur-xl border-b border-border/60"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-2 px-4 md:h-20 md:gap-3 md:px-10">
          <Link to="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 text-foreground">
            <span
              aria-label="SMEG"
              className="block h-4 w-[84px] bg-current sm:h-5 sm:w-[100px] md:h-6 md:w-[120px]"
              style={{
                WebkitMaskImage: `url(${smegLogo.url})`,
                maskImage: `url(${smegLogo.url})`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskPosition: "left center",
                maskPosition: "left center",
              }}
            />
            <span className="hidden border-l border-border/60 pl-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground md:inline">
              Armenia
            </span>
          </Link>

          <nav className="hidden items-center gap-9 lg:flex">
            <CatalogMegaMenu />
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
                  onClick={(e) => n.hash && onHashNav(e, n.hash)}
                  className="smeg-underline text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground"
                >
                  {n.label}
                </a>
              ),
            )}
          </nav>

          <div className="flex items-center gap-1.5 md:gap-3">
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
              aria-label={menuOpen ? t("header.close") : t("header.menu")}
              aria-expanded={menuOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 backdrop-blur lg:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile: full-screen menu — not a dropdown under the header */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[45] flex flex-col bg-background lg:hidden"
          >
            <div className="h-14 shrink-0" aria-hidden />
            <nav className="flex flex-1 flex-col justify-center gap-1 px-6">
              <CatalogMobileNav onNavigate={() => setMenuOpen(false)} />
              {nav.map((n, i) =>
                n.internal ? (
                  <motion.div
                    key={n.to}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (i + 1) * 0.05 }}
                  >
                    <Link
                      to={n.to}
                      onClick={() => setMenuOpen(false)}
                      className="block py-3 font-serif text-[clamp(1.75rem,8vw,2.25rem)] uppercase leading-tight tracking-[0.06em] text-foreground"
                    >
                      {n.label}
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    key={n.to}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (i + 1) * 0.05 }}
                  >
                    <a
                      href={n.to}
                      onClick={(e) => {
                        if (n.hash) onHashNav(e, n.hash);
                        else setMenuOpen(false);
                      }}
                      className="block py-3 font-serif text-[clamp(1.75rem,8vw,2.25rem)] uppercase leading-tight tracking-[0.06em] text-foreground"
                    >
                      {n.label}
                    </a>
                  </motion.div>
                ),
              )}
            </nav>
            <div className="shrink-0 space-y-4 border-t border-border/60 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-1 rounded-full border border-border/70 p-1 sm:hidden">
                {(Object.keys(langLabels) as Lang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={cn(
                      "flex-1 rounded-full px-3 py-2 text-[11px] font-medium tracking-wider transition-colors",
                      lang === l ? "bg-foreground text-background" : "text-foreground/60",
                    )}
                  >
                    {langLabels[l]}
                  </button>
                ))}
              </div>
              <Link
                to="/catalog"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground py-3.5 text-xs uppercase tracking-[0.18em] text-background"
              >
                {t("hero.cta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
