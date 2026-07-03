import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { assertRowUpdated } from "@/lib/supabase-assert";
import { invalidateProductListCaches } from "@/lib/admin-product-cache";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

type CollectionRef = { id: string; slug: string; name: string; name_hy: string | null };

export function ProductCollectionsEditor({ sku }: { sku: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [pickId, setPickId] = useState("");

  const linked = useQuery({
    queryKey: ["product-collections", sku],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collection_products")
        .select("collection_id, collections(id, slug, name, name_hy)")
        .eq("product_sku", sku);
      if (error) throw error;
      return (data ?? [])
        .map((row) => row.collections as CollectionRef | null)
        .filter((c): c is CollectionRef => !!c);
    },
  });

  const all = useQuery({
    queryKey: ["admin-collections-short"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, slug, name, name_hy")
        .order("name");
      if (error) throw error;
      return (data ?? []) as CollectionRef[];
    },
  });

  const linkedIds = new Set((linked.data ?? []).map((c) => c.id));
  const available = (all.data ?? []).filter((c) => !linkedIds.has(c.id));

  const invalidate = (slug?: string) => {
    invalidateProductListCaches(qc, sku);
    qc.invalidateQueries({ queryKey: ["product-collections", sku] });
    qc.invalidateQueries({ queryKey: ["admin-collection-products"] });
    qc.invalidateQueries({ queryKey: ["admin-collections"] });
    qc.invalidateQueries({ queryKey: ["collections-list"] });
    if (slug) qc.invalidateQueries({ queryKey: ["collection", slug] });
  };

  const add = useMutation({
    mutationFn: async (collectionId: string) => {
      const col = all.data?.find((c) => c.id === collectionId);
      if (!col) throw new Error(t("admin.notFound"));

      const { data, error } = await supabase
        .from("collection_products")
        .upsert(
          {
            collection_id: collectionId,
            product_sku: sku,
            sort_weight: 0,
          },
          { onConflict: "collection_id,product_sku" },
        )
        .select("collection_id")
        .maybeSingle();
      if (error) throw error;
      assertRowUpdated(data, t("admin.writeNoRow"));
      return col;
    },
    onSuccess: (col) => {
      setPickId("");
      invalidate(col.slug);
      toast.success(t("admin.collections.productAdded"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (collectionId: string) => {
      const col = linked.data?.find((c) => c.id === collectionId);
      if (!col) throw new Error(t("admin.notFound"));

      const { data, error } = await supabase
        .from("collection_products")
        .delete()
        .eq("collection_id", collectionId)
        .eq("product_sku", sku)
        .select("collection_id")
        .maybeSingle();
      if (error) throw error;
      assertRowUpdated(data, t("admin.writeNoRow"));
      return col;
    },
    onSuccess: (col) => {
      invalidate(col.slug);
      toast.success(t("admin.collections.productRemoved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  return (
    <div className="space-y-3 rounded-sm border border-border/60 bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow text-muted-foreground">{t("admin.product.collections")}</p>
        <Link
          to="/admini/collections"
          className="text-[10px] uppercase tracking-[0.16em] text-foreground/60 hover:text-foreground"
        >
          {t("admin.product.allCollections")}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">{t("admin.product.collectionsDesc")}</p>
      <p className="text-xs text-muted-foreground">{t("admin.collections.productsInstantSave")}</p>

      {linked.isLoading ? (
        <p className="text-sm text-muted-foreground">{t("admin.loading")}</p>
      ) : linked.data?.length ? (
        <ul className="space-y-1">
          {linked.data.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2 rounded-sm border border-border bg-background px-2 py-1.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{c.name_hy || c.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">/{c.slug}</span>
              <button
                type="button"
                onClick={() => remove.mutate(c.id)}
                className="text-muted-foreground hover:text-rose-600"
                aria-label={t("admin.removed")}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("admin.product.noCollections")}</p>
      )}

      <div className="flex gap-2">
        <select
          value={pickId}
          onChange={(e) => setPickId(e.target.value)}
          className="min-w-0 flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        >
          <option value="">{t("admin.product.pickCollection")}</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.slug})
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!pickId || add.isPending}
          onClick={() => pickId && add.mutate(pickId)}
          className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-3 py-2 text-xs uppercase tracking-[0.14em] hover:border-foreground disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("admin.add")}
        </button>
      </div>
    </div>
  );
}
