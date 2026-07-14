import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  buildCatalogMegaMenuNav,
  categorySlugsFromGroups,
  getEffectiveNavGroups,
  parseCatalogNav,
  type CatalogNavColumn,
  type CatalogNavItem,
  navItemLabel,
} from "@/lib/catalog-nav";
import { fetchCategories } from "@/lib/products";
import { useSiteContentBlock } from "@/lib/site-content";
import { cn } from "@/lib/utils";

function NavLink({ item, onClick }: { item: CatalogNavItem; onClick?: () => void }) {
  const { lang, t } = useI18n();
  const label = navItemLabel(item, lang, t);
  if (item.to === "/#collections") {
    return (
      <Link
        to="/"
        hash="collections"
        onClick={onClick}
        className="block text-sm text-foreground/70 transition hover:text-foreground"
      >
        {label}
      </Link>
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

function useCatalogNavColumns(): CatalogNavColumn[] {
  const allCatsQ = useQuery({
    queryKey: ["nav-categories", "all"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
  const categoriesBlock = useSiteContentBlock("categories");
  const customNavBlock = useSiteContentBlock("catalog-nav");
  const customNav = useMemo(() => (customNavBlock ? parseCatalogNav(customNavBlock) : undefined), [customNavBlock]);

  const groupDefs = useMemo(() => getEffectiveNavGroups(categoriesBlock ?? undefined), [categoriesBlock]);

  return useMemo(() => {
    if (customNav) return customNav;
    const all = allCatsQ.data ?? [];
    const largeSlugSet = new Set(categorySlugsFromGroups(groupDefs, "large"));
    const smallSlugSet = new Set(categorySlugsFromGroups(groupDefs, "small"));
    const large = all.filter((c) => largeSlugSet.has(c.slug));
    const small = all.filter((c) => smallSlugSet.has(c.slug));
    return buildCatalogMegaMenuNav(groupDefs, large, small);
  }, [customNav, groupDefs, allCatsQ.data]);
}

function CategoryColumn({ col, onNavigate }: { col: CatalogNavColumn; onNavigate?: () => void }) {
  const { t } = useI18n();
  const mainItems = col.items.filter((i) => !i.labelKey?.startsWith("nav.catalog.all"));
  const footerItems = col.items.filter((i) => i.labelKey?.startsWith("nav.catalog.all"));

  return (
    <div className="flex min-w-0 flex-col">
      <p className="mb-3 text-xs font-medium text-muted-foreground">{t(col.titleKey)}</p>
      <ul className="max-h-[min(52vh,380px)] space-y-1.5 overflow-y-auto pr-1">
        {mainItems.map((item) => (
          <li key={item.id}>
            <NavLink item={item} onClick={onNavigate} />
          </li>
        ))}
      </ul>
      {footerItems.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3">
          {footerItems.map((item) => (
            <li key={item.id}>
              <NavLink item={item} onClick={onNavigate} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CollectionsColumn({ col, onNavigate }: { col: CatalogNavColumn; onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 flex-col md:min-w-[9.5rem] lg:min-w-[10.5rem]">
      <p className="mb-3 text-xs font-medium text-muted-foreground">{t(col.titleKey)}</p>
      <ul className="max-h-[min(52vh,380px)] space-y-2 overflow-y-auto pr-1">
        {col.items.map((item) => (
          <li key={item.id}>
            <NavLink item={item} onClick={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NavColumns({ columns, onNavigate }: { columns: CatalogNavColumn[]; onNavigate?: () => void }) {
  const { t } = useI18n();
  const collections = columns.find((c) => c.id === "collections");
  const large = columns.find((c) => c.id === "large");
  const small = columns.find((c) => c.id === "small");
  const more = columns.find((c) => c.id === "more");

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {collections && <CollectionsColumn col={collections} onNavigate={onNavigate} />}
      {large && <CategoryColumn col={large} onNavigate={onNavigate} />}
      {small && <CategoryColumn col={small} onNavigate={onNavigate} />}
      {more && (
        <div>
          <p className="mb-3 text-xs font-medium text-muted-foreground">{t(more.titleKey)}</p>
          <ul className="space-y-2">
            {more.items.map((item) => (
              <li key={item.id}>
                <NavLink item={item} onClick={onNavigate} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CatalogMegaMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const columns = useCatalogNavColumns();
  const catalogTrigger =
    lang === "hy" ? t("nav.catalog").toLocaleUpperCase("hy-AM") : t("nav.catalog").toLocaleUpperCase("en-US");

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
        {catalogTrigger}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 w-[min(100vw-1.5rem,960px)] pt-2 md:pt-3">
          <div className="overflow-hidden rounded-sm border border-border bg-background/98 shadow-xl backdrop-blur-xl">
            <div className="border-b border-border/60 px-4 py-3 md:px-6">
              <Link
                to="/catalog"
                search={{}}
                onClick={close}
                className="font-serif text-base text-foreground hover:opacity-80 md:text-lg"
              >
                {t("nav.catalog.allProducts")} →
              </Link>
            </div>
            <div className="max-h-[min(85vh,520px)] overflow-y-auto p-4 md:p-6">
              <NavColumns columns={columns} onNavigate={close} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mobile / tablet accordion for catalog links */
export function CatalogMobileNav({
  onNavigate,
  compact = false,
}: {
  onNavigate?: () => void;
  /** Smaller uppercase style for the right-side drawer */
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const columns = useCatalogNavColumns();
  const collections = columns.find((c) => c.id === "collections");
  const large = columns.find((c) => c.id === "large");
  const small = columns.find((c) => c.id === "small");
  const more = columns.find((c) => c.id === "more");

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={cn(
          "flex w-full items-center justify-between py-3 text-foreground",
          compact
            ? "text-sm tracking-[0.04em]"
            : "font-serif text-[clamp(1.75rem,8vw,2.25rem)] leading-tight tracking-[0.06em]",
        )}
      >
        {t("nav.catalog")}
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="max-h-[55vh] space-y-6 overflow-y-auto border-l border-border pl-4 pb-4">
          <Link
            to="/catalog"
            search={{}}
            onClick={onNavigate}
            className="block text-sm font-medium text-foreground"
          >
            {t("nav.catalog.allProducts")}
          </Link>
          {collections && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t(collections.titleKey)}</p>
              <ul className="space-y-2">
                {collections.items.map((item) => (
                  <li key={item.id}>
                    <NavLink item={item} onClick={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {large && <CategoryColumn col={large} onNavigate={onNavigate} />}
          {small && <CategoryColumn col={small} onNavigate={onNavigate} />}
          {more && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">{t(more.titleKey)}</p>
              <ul className="space-y-2">
                {more.items.map((item) => (
                  <li key={item.id}>
                    <NavLink item={item} onClick={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
