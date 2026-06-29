import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { parseCatalogNav, type CatalogNavColumn, type CatalogNavItem } from "@/lib/catalog-nav";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function NavLink({ item, onClick }: { item: CatalogNavItem; onClick?: () => void }) {
  const { t } = useI18n();
  const label = t(item.labelKey);
  if (item.to === "/#collections") {
    return (
      <a href="/#collections" onClick={onClick} className="block text-sm text-foreground/70 transition hover:text-foreground">
        {label}
      </a>
    );
  }
  return (
    <Link
      to={item.to}
      search={item.search}
      onClick={onClick}
      className="block text-sm text-foreground/70 transition hover:text-foreground"
    >
      {label}
    </Link>
  );
}

export function CatalogMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const navQuery = useQuery({
    queryKey: ["site-content", "catalog-nav"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "catalog-nav").maybeSingle();
      return parseCatalogNav((data?.value ?? {}) as Record<string, Partial<Record<"ru" | "en" | "hy", string>>>);
    },
    staleTime: 120_000,
    initialData: parseCatalogNav(undefined),
  });

  const columns = navQuery.data ?? parseCatalogNav(undefined);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={rootRef} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={cn(
          "smeg-underline inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground",
          open && "text-foreground",
        )}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {t("nav.catalog")}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 w-[min(100vw-2rem,720px)] pt-3">
          <div className="rounded-sm border border-border bg-background/95 p-6 shadow-xl backdrop-blur-xl">
            <Link
              to="/catalog"
              search={{}}
              onClick={close}
              className="mb-5 block font-serif text-lg text-foreground hover:opacity-80"
            >
              {t("nav.catalog.allProducts")} →
            </Link>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              {columns.map((col: CatalogNavColumn) => (
                <div key={col.id}>
                  <p className="eyebrow mb-3 text-muted-foreground">{t(col.titleKey)}</p>
                  <ul className="space-y-2">
                    {col.items.map((item) => (
                      <li key={item.id}>
                        <NavLink item={item} onClick={close} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile accordion section for catalog links */
export function CatalogMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const navQuery = useQuery({
    queryKey: ["site-content", "catalog-nav"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "catalog-nav").maybeSingle();
      return parseCatalogNav((data?.value ?? {}) as Record<string, Partial<Record<"ru" | "en" | "hy", string>>>);
    },
    staleTime: 120_000,
    initialData: parseCatalogNav(undefined),
  });
  const columns = navQuery.data ?? parseCatalogNav(undefined);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between py-3 font-serif text-[clamp(1.75rem,8vw,2.25rem)] uppercase leading-tight tracking-[0.06em] text-foreground"
      >
        {t("nav.catalog")}
        <ChevronDown className={cn("h-5 w-5 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="space-y-6 border-l border-border pl-4 pb-4">
          <Link
            to="/catalog"
            search={{}}
            onClick={onNavigate}
            className="block text-sm font-medium uppercase tracking-[0.14em] text-foreground"
          >
            {t("nav.catalog.allProducts")}
          </Link>
          {columns.map((col) => (
            <div key={col.id}>
              <p className="eyebrow mb-2 text-muted-foreground">{t(col.titleKey)}</p>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item.id}>
                    <NavLink item={item} onClick={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
