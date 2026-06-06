import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/collections")({
  component: AdminCollections,
});

function slugify(s: string) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function AdminCollections() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const list = useQuery({
    queryKey: ["admin-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id,slug,name,description,cover_image,is_published,sort_weight")
        .order("sort_weight", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const slug = slugify(name);
      if (!slug) throw new Error("Введите название");
      const { error } = await supabase.from("collections").insert({ name: name.trim(), slug });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      toast.success("Коллекция создана");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("collections").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-collections"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-collections"] });
      toast.success("Удалена");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  return (
    <div>
      <h1 className="font-serif text-4xl">Коллекции</h1>
      <p className="mt-2 text-sm text-muted-foreground">Кураторские подборки товаров для главной</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) create.mutate(newName);
        }}
        className="mt-8 flex gap-3"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Название новой коллекции"
          maxLength={120}
          className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-sm bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-background disabled:opacity-50"
        >
          Создать
        </button>
      </form>

      <div className="mt-8 space-y-3">
        {list.data?.map((c) => (
          <div key={c.id} className="rounded-sm border border-border p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-2">
                <input
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value !== c.name && update.mutate({ id: c.id, patch: { name: e.target.value } })}
                  className="w-full bg-transparent font-serif text-xl outline-none"
                />
                <p className="font-mono text-xs text-muted-foreground">/{c.slug}</p>
                <textarea
                  defaultValue={c.description ?? ""}
                  placeholder="Короткое описание"
                  rows={2}
                  onBlur={(e) =>
                    (e.target.value || null) !== c.description &&
                    update.mutate({ id: c.id, patch: { description: e.target.value || null } })
                  }
                  className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
                <input
                  defaultValue={c.cover_image ?? ""}
                  placeholder="URL обложки (опционально)"
                  onBlur={(e) =>
                    (e.target.value || null) !== c.cover_image &&
                    update.mutate({ id: c.id, patch: { cover_image: e.target.value || null } })
                  }
                  className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
                />
              </div>
              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={() => update.mutate({ id: c.id, patch: { is_published: !c.is_published } })}
                  className="text-xs uppercase tracking-[0.18em] text-foreground/70 hover:text-foreground"
                  title="Видимость"
                >
                  {c.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                </button>
                <button
                  onClick={() => confirm(`Удалить "${c.name}"?`) && remove.mutate(c.id)}
                  className="text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {list.isLoading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
        {list.data && list.data.length === 0 && (
          <p className="text-sm text-muted-foreground">Пока нет коллекций.</p>
        )}
      </div>
    </div>
  );
}