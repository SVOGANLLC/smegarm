import { useRef, useState } from "react";
import { ExternalLink, Upload } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n, getI18nDefaults, type Lang } from "@/lib/i18n";
import { uploadAdminImage } from "@/lib/admin-upload";
import {
  DEFAULT_HOC_HERO_IMAGE,
  parseHouseOfCoffeeMedia,
  setHouseOfCoffeeConfig,
} from "@/lib/house-of-coffee-config";
import { HOUSE_OF_COFFEE_SPOTLIGHT } from "@/lib/house-of-coffee";
import { toast } from "sonner";

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

const LANGS: Lang[] = ["ru", "en", "hy"];
const LANG_LABELS: Record<Lang, string> = { ru: "RU", en: "EN", hy: "HY" };

type TextField = { i18nKey: string; labelKey: string; multiline?: boolean };

const TEXT_SECTIONS: { titleKey: string; fields: TextField[] }[] = [
  {
    titleKey: "admin.hoc.section.hero",
    fields: [
      { i18nKey: "hoc.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "hoc.title", labelKey: "admin.content.field.title", multiline: true },
      { i18nKey: "hoc.lead", labelKey: "admin.content.field.subtitle", multiline: true },
    ],
  },
  {
    titleKey: "admin.hoc.section.spotlight",
    fields: [
      { i18nKey: "hoc.spotlight.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "hoc.spotlight.title", labelKey: "admin.content.field.title", multiline: true },
      { i18nKey: "hoc.spotlight.body", labelKey: "admin.content.field.body", multiline: true },
      { i18nKey: "hoc.cta.catalog", labelKey: "admin.content.field.cta" },
    ],
  },
  {
    titleKey: "admin.hoc.section.grid",
    fields: [
      { i18nKey: "hoc.grid.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "hoc.grid.title", labelKey: "admin.content.field.title", multiline: true },
      { i18nKey: "hoc.cta.seeAll", labelKey: "admin.hoc.field.seeAll" },
      { i18nKey: "hoc.link.manualEspresso", labelKey: "admin.hoc.link.manualEspresso" },
      { i18nKey: "hoc.link.automatic", labelKey: "admin.hoc.link.automatic" },
      { i18nKey: "hoc.link.dripFilter", labelKey: "admin.hoc.link.dripFilter" },
      { i18nKey: "hoc.link.grinder", labelKey: "admin.hoc.link.grinder" },
      { i18nKey: "hoc.link.builtin", labelKey: "admin.hoc.link.builtin" },
      { i18nKey: "hoc.link.milkFrother", labelKey: "admin.hoc.link.milkFrother" },
      { i18nKey: "hoc.link.manualGrinder", labelKey: "admin.hoc.link.manualGrinder" },
      { i18nKey: "hoc.link.allEspresso", labelKey: "admin.hoc.link.allEspresso" },
    ],
  },
  {
    titleKey: "admin.hoc.section.builtin",
    fields: [
      { i18nKey: "hoc.builtin.eyebrow", labelKey: "admin.content.field.eyebrow" },
      { i18nKey: "hoc.builtin.title", labelKey: "admin.content.field.title", multiline: true },
      { i18nKey: "hoc.builtin.body", labelKey: "admin.content.field.body", multiline: true },
      { i18nKey: "hoc.cta.builtin", labelKey: "admin.content.field.cta" },
    ],
  },
];

function ImageField({
  label,
  hint,
  spec,
  url,
  onUpload,
  uploading,
}: {
  label: string;
  hint?: string;
  spec?: string;
  url: string;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-sm border border-border bg-background p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="aspect-[16/9] w-full max-w-xs overflow-hidden rounded-sm border border-border bg-secondary/30 sm:w-48">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">—</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {spec && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/90">{spec}</p>}
          <input
            ref={ref}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => ref.current?.click()}
            className="mt-3 inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.16em] hover:bg-secondary disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "…" : t("admin.hoc.upload")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HouseOfCoffeeEditor({
  value,
  onChange,
  onPersist,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
  onPersist: (next: BlockValue) => Promise<void>;
}) {
  const { t } = useI18n();
  const defaults = getI18nDefaults();
  const media = parseHouseOfCoffeeMedia(value);
  const [uploading, setUploading] = useState<string | null>(null);

  const updateField = (i18nKey: string, lang: Lang, text: string) => {
    const next = { ...value };
    const fieldVal = { ...(next[i18nKey] ?? {}) };
    fieldVal[lang] = text;
    next[i18nKey] = fieldVal;
    onChange(next);
  };

  const upload = async (key: string, storagePath: string, file: File) => {
    setUploading(key);
    try {
      const url = await uploadAdminImage(storagePath, file, t);
      const next = setHouseOfCoffeeConfig(value, key, url);
      onChange(next);
      await onPersist(next);
      toast.success(t("admin.hoc.imageSaved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.error"));
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-secondary/20 p-4">
        <div>
          <p className="font-medium">{t("admin.hoc.previewTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("admin.hoc.previewDesc")}</p>
        </div>
        <Link
          to="/house-of-coffee"
          target="_blank"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-foreground/70 hover:text-foreground"
        >
          {t("admin.hoc.openPage")}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section>
        <h3 className="font-serif text-xl">{t("admin.hoc.section.media")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.hoc.section.mediaDesc")}</p>
        <div className="mt-4 space-y-4">
          <ImageField
            label={t("admin.hoc.field.heroImage")}
            hint={t("admin.hoc.field.heroImageHint")}
            spec={t("admin.hoc.spec.hero")}
            url={media.heroImage || DEFAULT_HOC_HERO_IMAGE}
            uploading={uploading === "config.heroImage"}
            onUpload={(f) => upload("config.heroImage", "brand/house-of-coffee/hero-banner", f)}
          />
          <ImageField
            label={t("admin.hoc.field.bannerImage")}
            hint={t("admin.hoc.field.bannerImageHint")}
            spec={t("admin.hoc.spec.banner")}
            url={media.bannerImage}
            uploading={uploading === "config.bannerImage"}
            onUpload={(f) => upload("config.bannerImage", "brand/house-of-coffee/banner-after-video", f)}
          />
          <label className="block rounded-sm border border-border bg-background p-4">
            <span className="text-sm font-medium">{t("admin.hoc.field.youtube")}</span>
            <p className="mt-1 text-xs text-muted-foreground">{t("admin.hoc.field.youtubeHint")}</p>
            <input
              value={media.youtubeId}
              onChange={(e) => onChange(setHouseOfCoffeeConfig(value, "config.youtubeId", e.target.value.trim()))}
              placeholder="1jxQfFTH6-U"
              className="mt-3 w-full max-w-md rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
            />
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block rounded-sm border border-border bg-background p-4">
              <span className="text-sm font-medium">{t("admin.hoc.field.spotlightSku")}</span>
              <input
                value={media.spotlightSku}
                onChange={(e) =>
                  onChange(setHouseOfCoffeeConfig(value, "config.spotlightSku", e.target.value.toUpperCase()))
                }
                className="mt-3 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
              />
            </label>
            <ImageField
              label={t("admin.hoc.field.spotlightImage")}
              spec={t("admin.hoc.spec.spotlight")}
              url={media.spotlightImage}
              uploading={uploading === "config.spotlightImage"}
              onUpload={(f) => upload("config.spotlightImage", "brand/house-of-coffee/spotlight", f)}
            />
          </div>
          <ImageField
            label={t("admin.hoc.field.builtinImage")}
            spec={t("admin.hoc.spec.builtin")}
            url={media.builtinImage}
            uploading={uploading === "config.builtinImage"}
            onUpload={(f) => upload("config.builtinImage", "brand/house-of-coffee/builtin", f)}
          />
        </div>
      </section>

      {TEXT_SECTIONS.map((section) => (
        <section key={section.titleKey} className="rounded-sm border border-border p-5">
          <h3 className="font-serif text-xl">{t(section.titleKey)}</h3>
          <div className="mt-5 space-y-5">
            {section.fields.map((f) => (
              <div key={f.i18nKey} className="rounded-sm bg-secondary/30 p-4">
                <p className="text-sm font-medium">{t(f.labelKey)}</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {LANGS.map((lang) => (
                    <label key={lang} className="block">
                      <span className="eyebrow mb-1 block text-muted-foreground">{LANG_LABELS[lang]}</span>
                      <textarea
                        rows={f.multiline ? 3 : 2}
                        value={value[f.i18nKey]?.[lang] ?? ""}
                        placeholder={defaults[lang][f.i18nKey] ?? ""}
                        onChange={(e) => updateField(f.i18nKey, lang, e.target.value)}
                        className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
