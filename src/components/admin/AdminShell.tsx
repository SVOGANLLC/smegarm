import { Link, useRouterState, useNavigate, useRouteContext } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Inbox, FileText, LogOut, Home, Layers, Wrench, ShoppingCart, Users, Bell, Menu, X } from "lucide-react";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: typeof Home; exact?: boolean; adminOnly?: boolean };
const nav: NavItem[] = [
  { to: "/admin", label: "Обзор", icon: Home, exact: true },
  { to: "/admin/orders", label: "Заказы", icon: ShoppingCart },
  { to: "/admin/inquiries", label: "Заявки", icon: Inbox },
  { to: "/admin/products", label: "Товары", icon: Package, adminOnly: true },
  { to: "/admin/collections", label: "Коллекции", icon: Layers, adminOnly: true },
  { to: "/admin/content", label: "Контент", icon: FileText, adminOnly: true },
  { to: "/admin/team", label: "Команда", icon: Users, adminOnly: true },
  { to: "/admin/notifications", label: "Уведомления", icon: Bell },
  { to: "/admin/tools", label: "Инструменты", icon: Wrench, adminOnly: true },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const ctx = useRouteContext({ from: "/_authenticated/admin" }) as { role?: "admin" | "manager" };
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
    toast.success("Вы вышли");
    navigate({ to: "/auth", replace: true });
  }

  const currentLabel = items.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? "Admin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border"
          aria-label="Меню"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="font-serif text-base">Smeg · {currentLabel}</span>
        <button onClick={signOut} aria-label="Выйти" className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        {open && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform border-r border-border bg-background p-6 transition-transform md:static md:z-auto md:w-auto md:max-w-none md:transform-none md:bg-secondary/30 ${
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between md:block">
          <Link to="/" className="block font-serif text-xl">
            Smeg <span className="text-muted-foreground">Admin</span>
          </Link>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm md:hidden"
              aria-label="Закрыть"
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
                    active
                      ? "bg-foreground text-background"
                      : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <button
            onClick={signOut}
            className="mt-10 flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm text-foreground/60 hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}