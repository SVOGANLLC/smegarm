import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  buildCatalogNavFromCategories,
  buildCatalogNavFromGroups,
  getEffectiveNavGroups,
  parseCatalogNav,
  type CatalogNavColumn,
  type CatalogNavGroup,
  type CatalogNavItem,
  navItemLabel,
} from "@/lib/catalog-nav";
import { fetchCategories, fetchCategoriesScoped } from "@/lib/products";
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
  const largeQ = useQuery({
    queryKey: ["nav-categories", "large"],
    queryFn: () =>
      fetchCategoriesScoped({
        families: [
          "Refrigerator",
          "Oven",
          "Hob",
          "Cooker",
          "Dishwashers",
          "Sink",
          "Microwave",
          "Freezers",
          "Washing Machine",
          "Washer dryer",
          "Countertop Combi Oven",
          "Hood",
          "Wine cooler",
          "Blast Chiller",
          "Taps",
          "Drawer",
          "Built-in Coffee machines",
        ],
      }),
    staleTime: 5 * 60_000,
  });
  const smallQ = useQuery({
    queryKey: ["nav-categories", "small"],
    queryFn: () =>
      fetchCategoriesScoped({
        families: [
          "Kettles",
          "Toaster",
          "Blenders",
          "Hand Blenders",
          "Espresso Coffee Machine",
          "Drip filter Coffee Machine",
          "Coffee Grinder",
          "Milk Frother",
          "Kitchen Scales",
          "Citrus Juicer",
          "Stand Mixer",
          "Food Processor",
          "Hand Mixer",
          "Cookware",
          "Insulated bottle",
        ],
      }),
    staleTime: 5 * 60_000,
  });
  const allCatsQ = useQuery({
    queryKey: ["nav-categories", "all"],
    queryFn: fetchCategories,
    staleTime: 5 * 60_000,
  });
  const customNavBlock = useSiteContentBlock("catalog-nav");
  const categoriesBlock = useSiteContentBlock("categories");
  const customNav = useMemo(() => (customNavBlock ? parseCatalogNav(customNavBlock) : undefined), [customNavBlock]);

  const groupNav = useMemo(() => {
    if (!allCatsQ.data) return null;
    const groups = getEffectiveNavGroups(categoriesBlock ?? undefined);
    return buildCatalogNavFromGroups(groups, allCatsQ.data);
  }, [allCatsQ.data, categoriesBlock]);

  const dynamic =
    largeQ.data && smallQ.data ? buildCatalogNavFromCategories(largeQ.data, smallQ.data) : null;
  return customNav ?? groupNav ?? dynamic ?? buildCatalogNavFromCategories(largeQ.data ?? [], smallQ.data ?? []);
}

function NavGroupBlock({
  group,
  lang,
  t,
  onNavigate,
}: {
  group: CatalogNavGroup;
  lang: "ru" | "en" | "hy";
  t: (k: string) => string;
  onNavigate?: () => void;
}) {
  const title = group.labels
    ? group.labels[lang] || group.labels.en || group.labels.ru || group.id
    : group.labelKey
      ? t(group.labelKey)
      : group.id;
  return (
    <div>
      <Link
        to="/catalog"
        search={{ navGroup: group.id }}
        onClick={onNavigate}
        className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground transition hover:text-foreground/80"
      >
        {title}
      </Link>
      <ul className="space-y-1 border-l border-border/60 pl-2.5">
        {group.items.map((item) => (
          <li key={item.id}>
            <NavLink item={item} onClick={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionColumn({ col, onNavigate }: { col: CatalogNavColumn; onNavigate?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-w-[9rem]">
      <p className="eyebrow mb-3 text-muted-foreground">{t(col.titleKey)}</p>
      <ul className="space-y-2">
        {col.items.map((item) => (
          <li key={item.id}>
            <NavLink item={item} onClick={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SubgroupsColumn({
  groups,
  onNavigate,
}: {
  groups: CatalogNavGroup[];
  onNavigate?: () => void;
}) {
  const { lang, t } = useI18n();
  return (
    <div className="min-w-[10rem] border-l border-border/50 pl-5 md:min-w-[11rem] md:pl-6">
      <p className="eyebrow mb-3 text-muted-foreground">{t("nav.catalog.subgroups")}</p>
      <div className="max-h-[min(50vh,360px)] space-y-4 overflow-y-auto pr-1">
        {groups.map((g) => (
          <NavGroupBlock key={g.id} group={g} lang={lang} t={t} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function FlatColumn({ col, onNavigate }: { col: CatalogNavColumn; onNavigate?: () => void }) {
  const { lang, t } = useI18n();
  return (
    <div className="min-w-0">
      <p className="eyebrow mb-2 text-muted-foreground">{t(col.titleKey)}</p>
      <div className="max-h-[min(50vh,320px)] overflow-y-auto pr-1">
        {col.groups?.length ? (
          col.groups.map((g) => <NavGroupBlock key={g.id} group={g} lang={lang} t={t} onNavigate={onNavigate} />)
        ) : (
          <ul className="space-y-1.5">
            {col.items.map((item) => (
              <li key={item.id}>
                <NavLink item={item} onClick={onNavigate} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function NavColumns({ columns, onNavigate }: { columns: CatalogNavColumn[]; onNavigate?: () => void }) {
  const { t } = useI18n();
  const large = columns.find((c) => c.id === "large");
  const small = columns.find((c) => c.id === "small");
  const more = columns.find((c) => c.id === "more");
  const splitSubgroups = !!(large?.groups?.length || small?.groups?.length);

  if (!splitSubgroups) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
        {columns.map((col) => (
          <FlatColumn key={col.id} col={col} onNavigate={onNavigate} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-0">
      {large && (
        <div className="flex shrink-0 gap-0">
          <SectionColumn col={large} onNavigate={onNavigate} />
          {large.groups?.length ? <SubgroupsColumn groups={large.groups} onNavigate={onNavigate} /> : null}
        </div>
      )}
      {small && (
        <div className="flex shrink-0 gap-0 lg:ml-8 lg:border-l lg:border-border/50 lg:pl-8">
          <SectionColumn col={small} onNavigate={onNavigate} />
          {small.groups?.length ? <SubgroupsColumn groups={small.groups} onNavigate={onNavigate} /> : null}
        </div>
      )}
      {more && (
        <div className="min-w-[8rem] lg:ml-8 lg:border-l lg:border-border/50 lg:pl-8">
          <p className="eyebrow mb-3 text-muted-foreground">{t(more.titleKey)}</p>
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
        <div className="absolute left-0 top-full z-50 w-[min(100vw-1.5rem,1080px)] pt-2 md:pt-3">
          <div className="max-h-[min(85vh,540px)] overflow-y-auto rounded-sm border border-border bg-background/98 p-4 shadow-xl backdrop-blur-xl md:p-6">
            <Link
              to="/catalog"
              search={{}}
              onClick={close}
              className="mb-5 block font-serif text-base text-foreground hover:opacity-80 md:text-lg"
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
  const { t, lang } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const columns = useCatalogNavColumns();
  const large = columns.find((c) => c.id === "large");
  const small = columns.find((c) => c.id === "small");
  const more = columns.find((c) => c.id === "more");

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
        <div className="max-h-[55vh] space-y-6 overflow-y-auto border-l border-border pl-4 pb-4">
          <Link
            to="/catalog"
            search={{}}
            onClick={onNavigate}
            className="block text-sm font-medium uppercase tracking-[0.14em] text-foreground"
          >
            {t("nav.catalog.allProducts")}
          </Link>
          {large && (
            <div>
              <p className="eyebrow mb-2 text-muted-foreground">{t(large.titleKey)}</p>
              <ul className="mb-3 space-y-2">
                {large.items.map((item) => (
                  <li key={item.id}>
                    <NavLink item={item} onClick={onNavigate} />
                  </li>
                ))}
              </ul>
              {large.groups?.length ? (
                <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-3 sm:grid-cols-2">
                  <p className="eyebrow col-span-full text-muted-foreground">{t("nav.catalog.subgroups")}</p>
                  {large.groups.map((g) => (
                    <NavGroupBlock key={g.id} group={g} lang={lang} t={t} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {small && (
            <div>
              <p className="eyebrow mb-2 text-muted-foreground">{t(small.titleKey)}</p>
              <ul className="mb-3 space-y-2">
                {small.items.map((item) => (
                  <li key={item.id}>
                    <NavLink item={item} onClick={onNavigate} />
                  </li>
                ))}
              </ul>
              {small.groups?.length ? (
                <div className="grid grid-cols-1 gap-4 border-t border-border/50 pt-3 sm:grid-cols-2">
                  <p className="eyebrow col-span-full text-muted-foreground">{t("nav.catalog.subgroups")}</p>
                  {small.groups.map((g) => (
                    <NavGroupBlock key={g.id} group={g} lang={lang} t={t} onNavigate={onNavigate} />
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {more && (
            <div>
              <p className="eyebrow mb-2 text-muted-foreground">{t(more.titleKey)}</p>
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
