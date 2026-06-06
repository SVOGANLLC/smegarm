import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
});

const BLOCKS = [
  { key: "hero", label: "Hero (главный экран)", fields: ["eyebrow", "title", "subtitle", "cta", "cta2"] },
  { key: "dealer", label: "Дилер / Showroom", fields: ["title", "body", "address", "phone"] },
  { key: "story", label: "История бренда", fields: ["title", "body"] },
];

function ContentPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*");
      if (error) throw error;
      const map: Record<string, Record<string, string>> = {};
      (data ?? []).forEach((r) => (map[r.key] = (r.value as Record<string, string>) ?? {}));
      return map;
    },
  });

  const [state, setState] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    if (q.data) setState(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Record<string, string> }) => {
      const { error } = await supabase
        .from("site_content")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success("Сохранено");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  return (
    <div>
      <h1 className="font-serif text-4xl">Контент сайта</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Тексты разделов главной страницы. Оставьте поле пустым, чтобы использовать значение по умолчанию.
      </p>

      <div className="mt-10 space-y-8">
        {BLOCKS.map((b) => {
          const v = state[b.key] ?? {};
          return (
            <div key={b.key} className="rounded-sm border border-border p-6">
              <h2 className="font-serif text-2xl">{b.label}</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {b.fields.map((f) => (
                  <label key={f} className="block">
                    <span className="eyebrow mb-1 block text-muted-foreground">{f}</span>
                    <textarea
                      rows={2}
                      value={v[f] ?? ""}
                      maxLength={2000}
                      onChange={(e) =>
                        setState({ ...state, [b.key]: { ...v, [f]: e.target.value } })
                      }
                      className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                  </label>
                ))}
              </div>
              <button
                onClick={() => save.mutate({ key: b.key, value: v })}
                className="mt-4 rounded-sm bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90"
              >
                Сохранить блок
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}