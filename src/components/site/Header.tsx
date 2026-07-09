import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { scrollToHomeSection } from "@/lib/hash-scroll";
import smegLogo from "@/assets/smeg-logo.svg.asset.json";
import { CartButton } from "@/components/site/CartDrawer";
import { HeaderSearch } from "@/components/site/HeaderSearch";
import { CatalogMegaMenu } from "@/components/site/CatalogMegaMenu";
import { SideMenu } from "@/components/site/SideMenu";

const langLabels: Record<Lang, string> = { ru: "RU", en: "EN", hy: "ՀՅ" };

export function Header({ solid = false }: { solid?: boolean }) {
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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const primaryNav = [
    { to: "/house-of-coffee" as const, label: t("nav.houseOfCoffee"), internal: true as const },
    { to: "/#collections", label: t("nav.collections"), hash: "collections" },
  ];

  const onHashNav = (e: MouseEvent, hash: string) => {
    if (pathname === "/") {
      e.preventDefault();
      scrollToHomeSection(hash);
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
          scrolled || menuOpen || solid
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

          <nav className="hidden items-center gap-7 md:flex md:gap-9">
            <CatalogMegaMenu />
            {primaryNav.map((n) =>
              n.internal ? (
                <Link
                  key={n.to}
                  to={n.to}
                  className="smeg-underline text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground"
                >
                  {n.label}
                </Link>
              ) : (
                <Link
                  key={n.to}
                  to="/"
                  hash={n.hash}
                  onClick={(e) => n.hash && onHashNav(e, n.hash)}
                  className="smeg-underline text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground"
                >
                  {n.label}
                </Link>
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/80 backdrop-blur"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </motion.header>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} includePrimaryNav />
    </>
  );
}
