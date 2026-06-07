import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Role = "admin" | "manager" | "user";

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // verify caller is admin
    const { data: meRole, error: meErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (meErr) throw meErr;
    if (!meRole) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersList, error: uErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (uErr) throw uErr;
    const { data: roles, error: rErr } = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (rErr) throw rErr;
    const roleMap = new Map<string, Role[]>();
    (roles ?? []).forEach((r) => {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role as Role);
      roleMap.set(r.user_id, list);
    });
    return {
      users: usersList.users.map((u) => {
        const list = roleMap.get(u.id) ?? ["user" as Role];
        const top: Role = list.includes("admin") ? "admin" : list.includes("manager") ? "manager" : "user";
        return {
          id: u.id,
          email: u.email ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          role: top,
        };
      }),
    };
  });

const setRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "manager", "user"]),
});

export const setTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setRoleSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: meRole, error: meErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (meErr) throw meErr;
    if (!meRole) throw new Error("Forbidden");
    if (data.user_id === userId && data.role !== "admin") {
      throw new Error("Нельзя снять с себя роль администратора");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // wipe non-default roles, set the new one (skip 'user' which is implicit)
    const { error: delErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .in("role", ["admin", "manager"]);
    if (delErr) throw delErr;
    if (data.role === "admin" || data.role === "manager") {
      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (insErr) throw insErr;
    }
    return { ok: true };
  });