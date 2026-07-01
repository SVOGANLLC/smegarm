import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { CatalogNavEditor } from "@/components/admin/CatalogNavEditor";
import { assertRowUpdated } from "@/lib/supabase-assert";
import { siteContentQueryKey } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/admini/menu")({
  beforeLoad: ({ context }) => {
    const role = (context as { role?: string }).role;
    if (role !== "admin") throw redirect({ to: "/admini" });
  },
  component: AdminMenuPage,
});

type BlockValue = Record<string, Partial<Record<import("@/lib/i18n").Lang, string>>>;

function AdminMenuPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["site-content", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("value").eq("key", "categories").maybeSingle();
      if (error) throw error;
      return ((data?.value as BlockValue) ?? {}) as BlockValue;
    },
  });

  const [draft, setDraft] = useState<BlockValue>({});
  const hydrated = useRef(false);
  useEffect(() => {
    if (!q.data || hydrated.current) return;
    setDraft(q.data);
    hydrated.current = true;
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (value: BlockValue) => {
      const { data: row, error } = await supabase
        .from("site_content")
        .upsert({ key: "categories", value }, { onConflict: "key" })
        .select("key")
        .maybeSingle();
      if (error) throw error;
      assertRowUpdated(row, t("admin.writeNoRow"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      qc.invalidateQueries({ queryKey: siteContentQueryKey });
      toast.success(t("admin.saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl">{t("admin.menu.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("admin.menu.intro")}</p>

      {q.isLoading ? (
        <div className="mt-8 h-40 animate-pulse rounded-xl bg-secondary" />
      ) : (
        <>
          <div className="mt-8">
            <CatalogNavEditor value={draft} onChange={setDraft} />
          </div>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => save.mutate(draft)}
            className="mt-6 w-full rounded-sm bg-foreground py-3.5 text-xs uppercase tracking-[0.18em] text-background disabled:opacity-50 sm:w-auto sm:px-10"
          >
            {save.isPending ? t("admin.loading") : t("admin.save")}
          </button>
        </>
      )}
    </div>
  );
}
