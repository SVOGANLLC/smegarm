import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "SMEG ARM Admin" },
      { name: "application-name", content: "SMEG ARM Admin" },
      { name: "apple-mobile-web-app-title", content: "SMEG Admin" },
    ],
    links: [
      { rel: "manifest", href: "/manifest-admin.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon-admin.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icon-admin-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icon-admin-512.png" },
    ],
  }),
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw redirect({ to: "/auth" });
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "manager"])
      .maybeSingle();
    if (!roleRow) throw redirect({ to: "/" });
    return { role: roleRow.role as "admin" | "manager" };
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});