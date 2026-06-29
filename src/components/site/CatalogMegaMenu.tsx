import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  buildCatalogNavFromCategories,
  navItemLabel,
  NAV_LARGE_FAMILIES,
  NAV_SMALL_FAMILIES,
  parseCatalogNav,
  type CatalogNavColumn,
  type CatalogNavItem,
} from "@/lib/catalog-nav";
import { fetchCategoriesScoped } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function NavLink({ item, onClick }: { item: CatalogNavItem; onClick?: () => void }) {
  const { lang, t } = useI18n();
  const label = navItemLabel(item, lang, t);
  if (item.to === "/#collections") {
    return (
      <a href="/#collections" onClick={onClick} className="block text-sm text-foreground/70 transition hover:text-foreground">
        {label}
      </a>
    );
  }
  if (item.to === "/sale") {
    return (
      <Link to="/sale" onClick={onClick} className="block text-sm text-foreground/70 transition hover:text-foreground">
        {label}
      </Link>
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

function useCatalogNavColumns() {
  const largeQ = useQuery({
    queryKey: ["nav-categories", "large"],
    queryFn: () => fetchCategoriesScoped({ families: NAV_LARGE_FAMILIES }),
    staleTime: 5 * 60_000,
  });
  const smallQ = useQuery({
    queryKey: ["nav-categories", "small"],
    queryFn: () => fetchCategoriesScoped({ families: NAV_SMALL_FAMILIES }),
    staleTime: 5 * 60_000,
  });
  const customQ = useQuery({
    queryKey: ["site-content", "catalog-nav"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "catalog-nav").maybeSingle();
      return parseCatalogNav((data?.value ?? {}) as Record<string, Partial<Record<"ru" | "en" | "hy", string>>>);
    },
    staleTime: 120_000,
  });

  const dynamic =
    largeQ.data && smallQ.data ? buildCatalogNavFromCategories(largeQ.data, smallQ.data) : null;
  return customQ.data ?? dynamic ?? buildCatalogNavFromCategories(largeQ.data ?? [], smallQ.data ?? []);
}

function NavColumns({ columns, onNavigate }: { columns: CatalogNavColumn[]; onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
      {columns.map((col) => (
        <div key={col.id} className="min-w-0">
          <p className="eyebrow mb-2 text-muted-foreground">{t(col.titleKey)}</p>
          <ul className="max-h-[min(50vh,320px)] space-y-1.5 overflow-y-auto pr-1">
            {col.items.map((item) => (
              <li key={item.id}>
                <NavLink item={item} onClick={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function CatalogMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const columns = useCatalogNavColumns();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) setOpen(true);
      }}
      onMouseLeave={() => {
        if (window.matchMedia("(hover: hover)").matches) setOpen(false);
      }}
    >
      <button
        type="button"
        className={cn(
          "smeg-underline inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.18em] text-foreground/80 hover:text-foreground",
          open && "text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {t("nav.catalog")}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 w-[min(100vw-1.5rem,920px)] pt-2 md:pt-3">
          <div className="max-h-[min(85vh,520px)] overflow-y-auto rounded-sm border border-border bg-background/98 p-4 shadow-xl backdrop-blur-xl md:p-6">
            <Link
              to="/catalog"
              search={{}}
              onClick={close}
              className="mb-4 block font-serif text-base text-foreground hover:opacity-80 md:text-lg"
            >
              {t("nav.catalog.allProducts")} →
            </Link>
            <NavColumns columns={columns} onNavigate={close} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile / tablet accordion for catalog links */
export function CatalogMobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const columns = useCatalogNavColumns();

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between py-3 font-serif text-[clamp(1.75rem,8vw,2.25rem)] uppercase leading-tight tracking-[0.06em] text-foreground"
      >
        {t("nav.catalog")}
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="max-h-[55vh] space-y-5 overflow-y-auto border-l border-border pl-4 pb-4">
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
