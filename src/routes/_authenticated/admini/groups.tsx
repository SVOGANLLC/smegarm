import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  assignProductToVariantGroup,
  fetchAdminVariantGroups,
  removeProductFromVariantGroup,
  searchProductsForGroup,
  type AdminVariantGroup,
} from "@/lib/variant-groups";
import { useSiteContentBlock } from "@/lib/site-content";
import {
  labelForModelGroup,
  parseModelGroupLabels,
  serializeModelGroupLabels,
  upsertModelGroupLabel,
} from "@/lib/model-group-labels";
import { supabase } from "@/integrations/supabase/client";
import { assertRowUpdated } from "@/lib/supabase-assert";

export const Route = createFileRoute("/_authenticated/admini/groups")({
  validateSearch: (s: Record<string, unknown>) => ({
    key: typeof s.key === "string" ? s.key : undefined,
  }),
  component: VariantGroupsPage,
});

function VariantGroupsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { key: selectedKey } = Route.useSearch();
  const [filter, setFilter] = useState("");
  const [newKey, setNewKey] = useState("");
  const [addSku, setAddSku] = useState("");
  const [displayName, setDisplayName] = useState("");

  const groupsQ = useQuery({
    queryKey: ["admin-variant-groups"],
    queryFn: fetchAdminVariantGroups,
    staleTime: 10_000,
  });

  const categoriesBlock = useSiteContentBlock("categories");
  const labels = useMemo(() => parseModelGroupLabels(categoriesBlock ?? undefined), [categoriesBlock]);

  const selected = useMemo(
    () => groupsQ.data?.find((g) => g.key === selectedKey) ?? null,
    [groupsQ.data, selectedKey],
  );

  const openGroup = (key: string) => {
    const row = labelForModelGroup(labels, key);
    setDisplayName(row?.name_ru || row?.name_en || "");
  };

  useEffect(() => {
    if (selectedKey) openGroup(selectedKey);
  }, [selectedKey, labels]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = groupsQ.data ?? [];
    if (!q) return list;
    return list.filter(
      (g) =>
        g.key.toLowerCase().includes(q) ||
        g.members.some((m) => m.sku.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)),
    );
  }, [groupsQ.data, filter]);

  const addSearchQ = useQuery({
    queryKey: ["admin-group-add-search", addSku],
    queryFn: () => searchProductsForGroup(addSku),
    enabled: addSku.trim().length >= 2,
    staleTime: 5_000,
  });

  const assign = useMutation({
    mutationFn: ({ sku, groupKey }: { sku: string; groupKey: string }) => assignProductToVariantGroup(sku, groupKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-variant-groups"] });
      setAddSku("");
      toast.success(t("admin.groups.added"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (sku: string) => removeProductFromVariantGroup(sku),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-variant-groups"] });
      toast.success(t("admin.groups.removed"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveLabel = useMutation({
    mutationFn: async ({ key, name }: { key: string; name: string }) => {
      const next = upsertModelGroupLabel(labels, key, { name_ru: name, name_en: name, name_hy: name });
      const json = serializeModelGroupLabels(next);
      const { data: existing, error: readErr } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "categories")
        .maybeSingle();
      if (readErr) throw readErr;
      const value = {
        ...((existing?.value as Record<string, unknown>) ?? {}),
        "config.modelGroupLabels": { ru: json, en: json, hy: json },
      };
      const { data, error } = await supabase
        .from("site_content")
        .upsert({ key: "categories", value }, { onConflict: "key" })
        .select("key")
        .maybeSingle();
      if (error) throw error;
      assertRowUpdated(data, "Failed to save");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content", "categories"] });
      toast.success(t("admin.saved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (selectedKey) {
    if (groupsQ.isLoading) {
      return <div className="mx-auto max-w-lg h-24 animate-pulse rounded-xl bg-secondary" />;
    }
    if (!selected) {
      return (
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={() => navigate({ to: "/admini/groups", search: {} })}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("admin.groups.back")}
          </button>
          <p className="text-sm text-muted-foreground">{t("admin.groups.emptyGroup")}</p>
          <GroupDetailShell
            groupKey={selectedKey}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onSaveName={() => saveLabel.mutate({ key: selectedKey, name: displayName.trim() })}
            savingName={saveLabel.isPending}
            addSku={addSku}
            onAddSkuChange={setAddSku}
            addResults={addSearchQ.data ?? []}
            memberSkus={new Set()}
            onAdd={(sku) => assign.mutate({ sku, groupKey: selectedKey })}
            onRemove={(sku) => remove.mutate(sku)}
            adding={assign.isPending}
            members={[]}
            manual
          />
        </div>
      );
    }
    return (
      <GroupDetailShell
        groupKey={selected.key}
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        onSaveName={() => saveLabel.mutate({ key: selected.key, name: displayName.trim() })}
        savingName={saveLabel.isPending}
        addSku={addSku}
        onAddSkuChange={setAddSku}
        addResults={addSearchQ.data ?? []}
        memberSkus={new Set(selected.members.map((m) => m.sku))}
        onAdd={(sku) => assign.mutate({ sku, groupKey: selected.key })}
        onRemove={(sku) => remove.mutate(sku)}
        adding={assign.isPending}
        members={selected.members}
        manual={selected.manual}
        productCount={selected.product_count}
        colourCount={selected.colour_count}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-serif text-3xl">{t("admin.groups.title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("admin.groups.intro")}</p>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("admin.groups.search")}
          className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm outline-none focus:border-foreground"
        />
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const key = newKey.trim().toUpperCase();
          if (!key) return;
          openGroup(key);
          navigate({ to: "/admini/groups", search: { key } });
        }}
      >
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value.toUpperCase())}
          placeholder={t("admin.groups.newKey")}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-foreground px-4 py-3 text-xs uppercase tracking-wider text-background"
        >
          <Plus className="h-4 w-4" />
          {t("admin.groups.create")}
        </button>
      </form>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-background">
        {groupsQ.isLoading ? (
          <div className="h-24 animate-pulse bg-secondary" />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("admin.groups.empty")}</p>
        ) : (
          filtered.map((g) => (
            <Link
              key={g.key}
              to="/admini/groups"
              search={{ key: g.key }}
              onClick={() => openGroup(g.key)}
              className="flex items-center gap-3 border-b border-border px-4 py-4 transition last:border-b-0 hover:bg-secondary/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{labelForModelGroup(labels, g.key)?.name_ru || g.key}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {g.key} · {g.product_count} {t("admin.groups.items")} · {g.colour_count} {t("admin.groups.colours")}
                </p>
              </div>
              {g.manual && (
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {t("admin.groups.manual")}
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function GroupDetailShell({
  groupKey,
  displayName,
  onDisplayNameChange,
  onSaveName,
  savingName,
  addSku,
  onAddSkuChange,
  addResults,
  memberSkus,
  onAdd,
  onRemove,
  adding,
  members,
  manual,
  productCount = 0,
  colourCount = 0,
}: {
  groupKey: string;
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  onSaveName: () => void;
  savingName: boolean;
  addSku: string;
  onAddSkuChange: (v: string) => void;
  addResults: Array<{ sku: string; name: string; colour: string | null; model_group: string | null }>;
  memberSkus: Set<string>;
  onAdd: (sku: string) => void;
  onRemove: (sku: string) => void;
  adding: boolean;
  members: AdminVariantGroup["members"];
  manual: boolean;
  productCount?: number;
  colourCount?: number;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-lg">
      <button
        type="button"
        onClick={() => navigate({ to: "/admini/groups", search: {} })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("admin.groups.back")}
      </button>

      <h1 className="font-serif text-2xl">{groupKey}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {productCount} {t("admin.groups.items")} · {colourCount} {t("admin.groups.colours")}
        {manual ? ` · ${t("admin.groups.manual")}` : productCount > 0 ? ` · ${t("admin.groups.auto")}` : ""}
      </p>

      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        <label className="block text-xs text-muted-foreground">{t("admin.groups.displayName")}</label>
        <div className="mt-1 flex gap-2">
          <input
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder={groupKey}
            className="min-w-0 flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button
            type="button"
            onClick={onSaveName}
            disabled={savingName}
            className="shrink-0 rounded-sm bg-foreground px-3 py-2 text-xs uppercase tracking-wider text-background disabled:opacity-50"
          >
            {t("admin.save")}
          </button>
        </div>
      </div>

      {members.length > 0 && (
        <div className="mt-6">
          <p className="eyebrow text-muted-foreground">{t("admin.groups.members")}</p>
          <ul className="mt-2 overflow-hidden rounded-xl border border-border bg-background">
            {members.map((m) => (
              <li key={m.sku} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                {m.main_image ? (
                  <img src={m.main_image} alt="" className="h-10 w-10 shrink-0 rounded-sm object-contain bg-secondary" />
                ) : (
                  <div className="h-10 w-10 shrink-0 rounded-sm bg-secondary" />
                )}
                <div className="min-w-0 flex-1">
                  <Link to="/admini/products/$sku" params={{ sku: m.sku }} className="text-sm font-medium hover:underline">
                    {m.sku}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.colour || "—"} {!m.is_published && `· ${t("admin.groups.hidden")}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(m.sku)}
                  className="shrink-0 rounded-sm p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title={t("admin.groups.remove")}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-border bg-background p-4">
        <p className="eyebrow text-muted-foreground">{t("admin.groups.addProduct")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.groups.addHint")}</p>
        <input
          value={addSku}
          onChange={(e) => onAddSkuChange(e.target.value)}
          placeholder={t("admin.groups.addPlaceholder")}
          className="mt-2 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        {addResults.length > 0 && (
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-sm border border-border">
            {addResults
              .filter((r) => !memberSkus.has(r.sku))
              .map((r) => (
                <li key={r.sku}>
                  <button
                    type="button"
                    disabled={adding}
                    onClick={() => onAdd(r.sku)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary disabled:opacity-50"
                  >
                    <span className="font-medium">{r.sku}</span>
                    <span className="truncate text-muted-foreground">{r.colour || r.name}</span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
