import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTeam, setTeamRole } from "@/lib/admin-team.functions";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Headset, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/team")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admin" });
  },
  component: TeamPage,
});

function TeamPage() {
  const fetchTeam = useServerFn(listTeam);
  const setRole = useServerFn(setTeamRole);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: () => fetchTeam(),
  });
  const mutation = useMutation({
    mutationFn: (v: { user_id: string; role: "admin" | "manager" | "user" }) => setRole({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team"] });
      toast.success("Роль обновлена");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl">Команда</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Управление ролями. Админ — полный доступ. Менеджер — только заказы и заявки.
        </p>
      </header>

      {isLoading && (
        <p className="text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Загрузка…
        </p>
      )}

      <div className="overflow-hidden rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Регистрация</th>
              <th className="px-4 py-3">Последний вход</th>
              <th className="px-4 py-3">Роль</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("ru-RU") : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("ru-RU") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center gap-2">
                    <RoleIcon role={u.role} />
                    <select
                      value={u.role}
                      disabled={mutation.isPending}
                      onChange={(e) =>
                        mutation.mutate({
                          user_id: u.id,
                          role: e.target.value as "admin" | "manager" | "user",
                        })
                      }
                      className="rounded-sm border border-border bg-background px-2 py-1 text-sm"
                    >
                      <option value="user">Пользователь</option>
                      <option value="manager">Менеджер</option>
                      <option value="admin">Админ</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleIcon({ role }: { role: "admin" | "manager" | "user" }) {
  if (role === "admin") return <ShieldCheck className="h-4 w-4 text-emerald-600" />;
  if (role === "manager") return <Headset className="h-4 w-4 text-blue-600" />;
  return <User className="h-4 w-4 text-muted-foreground" />;
}