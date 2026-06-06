import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/inquiries")({
  component: InquiriesPage,
});

const STATUSES = [
  { v: "new", l: "Новая" },
  { v: "in_progress", l: "В работе" },
  { v: "done", l: "Готово" },
  { v: "spam", l: "Спам" },
];

function InquiriesPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["admin-inquiries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-inquiries"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Обновлено");
    },
  });

  return (
    <div>
      <h1 className="font-serif text-4xl">Заявки</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {list.data?.length ?? 0} обращений
      </p>

      <div className="mt-8 space-y-3">
        {list.data?.map((i) => (
          <div key={i.id} className="rounded-sm border border-border p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-serif text-lg">{i.name}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {i.phone && <span>📞 {i.phone}</span>}
                  {i.email && <span>✉ {i.email}</span>}
                  {i.product_sku && <span className="font-mono">{i.product_sku}</span>}
                  <span>{new Date(i.created_at).toLocaleString("ru-RU")}</span>
                </div>
              </div>
              <select
                value={i.status}
                onChange={(e) => update.mutate({ id: i.id, status: e.target.value })}
                className="rounded-sm border border-border bg-background px-3 py-1.5 text-xs"
              >
                {STATUSES.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.l}
                  </option>
                ))}
              </select>
            </div>
            {i.message && (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/80">{i.message}</p>
            )}
          </div>
        ))}
        {list.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Пока нет заявок.</p>
        )}
      </div>
    </div>
  );
}