import { Link, useRouterState, useNavigate, useRouteContext } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Inbox, FileText, LogOut, Home, Layers, Wrench, ShoppingCart, Users, Bell, Menu, X, Handshake } from "lucide-react";
import { toast } from "sonner";
import { useI18n, type Lang } from "@/lib/i18n";

type NavItem = { to: string; labelKey: string; icon: typeof Home; exact?: boolean; adminOnly?: boolean };
const nav: NavItem[] = [
  { to: "/admini", labelKey: "admin.nav.overview", icon: Home, exact: true },
  { to: "/admini/orders", labelKey: "admin.nav.orders", icon: ShoppingCart },
  { to: "/admini/inquiries", labelKey: "admin.nav.inquiries", icon: Inbox },
  { to: "/admini/products", labelKey: "admin.nav.products", icon: Package, adminOnly: true },
  { to: "/admini/collections", labelKey: "admin.nav.collections", icon: Layers, adminOnly: true },
  { to: "/admini/content", labelKey: "admin.nav.content", icon: FileText, adminOnly: true },
  { to: "/admini/partners", labelKey: "admin.nav.partners", icon: Handshake, adminOnly: true },
  { to: "/admini/team", labelKey: "admin.nav.team", icon: Users, adminOnly: true },
  { to: "/admini/notifications", labelKey: "admin.nav.notifications", icon: Bell },
  { to: "/admini/tools", labelKey: "admin.nav.tools", icon: Wrench, adminOnly: true },
];

function LangSwitch() {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ["hy", "ru", "en"];
  return (
    <div className="mt-6 flex gap-1">
      {langs.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`flex-1 rounded-sm py-1.5 text-[10px] uppercase tracking-wider ${lang === l ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { t } = useI18n();
  const ctx = useRouteContext({ from: "/_authenticated/admini" }) as { role?: "admin" | "manager" };
  const role = ctx.role ?? "admin";
  const items = nav.filter((n) => !n.adminOnly || role === "admin");
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success(t("admin.nav.signedOut"));
    navigate({ to: "/auth", replace: true });
  }

  const currentLabel = items.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)));
  const currentTitle = currentLabel ? t(currentLabel.labelKey) : t("admin.nav.brand");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border"
          aria-label={t("admin.nav.menu")}
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="font-serif text-base">Smeg · {currentTitle}</span>
        <button onClick={signOut} aria-label={t("admin.nav.signOut")} className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        {open && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform border-r border-border bg-background p-6 transition-transform md:static md:z-auto md:w-auto md:max-w-none md:transform-none md:bg-secondary/30 ${
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between md:block">
            <Link to="/" className="block font-serif text-xl">
              Smeg <span className="text-muted-foreground">{t("admin.nav.brand")}</span>
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm md:hidden"
              aria-label={t("admin.nav.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="mt-10 space-y-1">
            {items.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors ${
                    active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {t(n.labelKey)}
                </Link>
              );
            })}
          </nav>
          <LangSwitch />
          <button
            onClick={signOut}
            className="mt-4 flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-foreground/60 hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> {t("admin.nav.signOut")}
          </button>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
