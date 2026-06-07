import { Link, useRouterState, useNavigate, useRouteContext } from "@tanstack/react-router";
import { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Inbox, FileText, LogOut, Home, Layers, Wrench, ShoppingCart, Users, Bell } from "lucide-react";
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

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Вы вышли");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="border-r border-border bg-secondary/30 p-6">
          <Link to="/" className="block font-serif text-xl">
            Smeg <span className="text-muted-foreground">Admin</span>
          </Link>
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
        <main className="p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}