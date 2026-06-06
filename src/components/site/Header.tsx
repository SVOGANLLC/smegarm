import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const langLabels: Record<Lang, string> = { ru: "RU", en: "EN", hy: "ՀՅ" };

export function Header() {
  const { t, lang, setLang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = [
    { to: "#catalog", label: t("nav.catalog") },
    { to: "#collections", label: t("nav.collections") },
    { to: "#story", label: t("nav.story") },
    { to: "#dealer", label: t("nav.dealer") },
    { to: "#contact", label: t("nav.contact") },
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
        <Link to="/" className="flex items-baseline gap-2 font-serif text-2xl tracking-tight text-foreground">
          <span className="font-semibold">SMEG</span>
          <span className="hidden text-xs uppercase tracking-[0.3em] text-muted-foreground md:inline">
            Armenia
          </span>
        </Link>

        <nav className="hidden items-center gap-9 lg:flex">
          {nav.map((n) => (
            <a
              key={n.to}
              href={n.to}
              className="smeg-underline text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 rounded-full border border-border/70 bg-background/50 p-1 backdrop-blur">
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
      </div>
    </motion.header>
  );
}