import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2, Upload, ArrowUp, ArrowDown } from "lucide-react";
import { uploadAdminImage } from "@/lib/admin-upload";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admini/partners")({
  component: AdminPartners,
});

type Partner = {
  id: string;
  name: string;
  name_en: string | null;
  name_hy: string | null;
  description: string | null;
  description_en: string | null;
  description_hy: string | null;
  logo_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_published: boolean;
};

function AdminPartners() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const list = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error(t("admin.enterName"));
      const next = (list.data?.length ?? 0) * 10;
      const { error } = await supabase.from("partners").insert({ name: trimmed, sort_order: next });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success(t("admin.partners.added"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Partner> }) => {
      const { error } = await supabase.from("partners").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-partners"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
      toast.success(t("admin.removed"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const move = (p: Partner, dir: -1 | 1) => {
    const items = list.data ?? [];
    const idx = items.findIndex((i) => i.id === p.id);
    const swap = items[idx + dir];
    if (!swap) return;
    update.mutate({ id: p.id, patch: { sort_order: swap.sort_order } });
    update.mutate({ id: swap.id, patch: { sort_order: p.sort_order } });
  };

  return (
    <div>
      <h1 className="font-serif text-4xl">{t("admin.partners.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("admin.partners.desc")}
      </p>

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
          placeholder={t("admin.partners.newPlaceholder")}
          maxLength={120}
          className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-sm bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-background disabled:opacity-50"
        >
          {t("admin.add")}
        </button>
      </form>

      <div className="mt-8 space-y-4">
        {list.data?.map((p, i) => (
          <PartnerRow
            key={p.id}
            p={p}
            isFirst={i === 0}
            isLast={i === (list.data?.length ?? 0) - 1}
            onUpdate={(patch) => update.mutate({ id: p.id, patch })}
            onRemove={() => confirm(t("admin.deleteConfirm", { name: p.name })) && remove.mutate(p.id)}
            onMoveUp={() => move(p, -1)}
            onMoveDown={() => move(p, 1)}
          />
        ))}
        {list.isLoading && <p className="text-sm text-muted-foreground">{t("admin.loading")}</p>}
        {list.data && list.data.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("admin.partners.empty")}</p>
        )}
      </div>
    </div>
  );
}

function PartnerRow({
  p,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  p: Partner;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (patch: Partial<Partner>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadAdminImage(`partners/${p.id}`, file, t);
      onUpdate({ logo_url: url });
      toast.success(t("admin.partners.logoUploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-sm border border-border p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex w-full flex-col items-center gap-2 md:w-48">
          <div className="flex h-28 w-full items-center justify-center rounded-sm border border-dashed border-border bg-secondary/30">
            {p.logo_url ? (
              <img
                src={p.logo_url}
                alt={p.name}
                key={p.logo_url}
                className="max-h-24 max-w-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">{t("admin.partners.noLogo")}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-sm border border-dashed border-border px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            {uploading ? t("admin.loading") : p.logo_url ? t("admin.partners.replace") : t("admin.partners.upload")}
          </button>
          {p.logo_url && (
            <button
              onClick={() => onUpdate({ logo_url: null })}
              className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-rose-600"
            >
              {t("admin.partners.removeLogo")}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Field label={t("admin.partners.nameRu")}>
              <input
                defaultValue={p.name}
                onBlur={(e) => e.target.value !== p.name && onUpdate({ name: e.target.value })}
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.partners.nameEn")}>
              <input
                defaultValue={p.name_en ?? ""}
                onBlur={(e) =>
                  (e.target.value || null) !== p.name_en && onUpdate({ name_en: e.target.value || null })
                }
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.partners.nameHy")}>
              <input
                defaultValue={p.name_hy ?? ""}
                onBlur={(e) =>
                  (e.target.value || null) !== p.name_hy && onUpdate({ name_hy: e.target.value || null })
                }
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Field label={t("admin.partners.descRu")}>
              <textarea
                rows={3}
                defaultValue={p.description ?? ""}
                onBlur={(e) =>
                  (e.target.value || null) !== p.description &&
                  onUpdate({ description: e.target.value || null })
                }
                className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.partners.descEn")}>
              <textarea
                rows={3}
                defaultValue={p.description_en ?? ""}
                onBlur={(e) =>
                  (e.target.value || null) !== p.description_en &&
                  onUpdate({ description_en: e.target.value || null })
                }
                className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
            <Field label={t("admin.partners.descHy")}>
              <textarea
                rows={3}
                defaultValue={p.description_hy ?? ""}
                onBlur={(e) =>
                  (e.target.value || null) !== p.description_hy &&
                  onUpdate({ description_hy: e.target.value || null })
                }
                className="w-full resize-none rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </Field>
          </div>
          <Field label={t("admin.partners.linkOptional")}>
            <input
              defaultValue={p.link_url ?? ""}
              placeholder="https://example.com"
              onBlur={(e) =>
                (e.target.value || null) !== p.link_url && onUpdate({ link_url: e.target.value || null })
              }
              className="w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
            />
          </Field>
        </div>

        <div className="flex flex-row items-start gap-2 md:flex-col md:items-end">
          <button
            onClick={() => onUpdate({ is_published: !p.is_published })}
            className="text-foreground/70 hover:text-foreground"
            title={t("admin.visibility")}
          >
            {p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
          </button>
          <button onClick={onMoveUp} disabled={isFirst} className="text-foreground/70 hover:text-foreground disabled:opacity-30">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="text-foreground/70 hover:text-foreground disabled:opacity-30">
            <ArrowDown className="h-4 w-4" />
          </button>
          <button onClick={onRemove} className="text-rose-600 hover:text-rose-700">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
