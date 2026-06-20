import { useI18n } from "@/lib/i18n";
import { DEFAULT_ICONIC_SKUS, parseIconSkus, serializeIconSkus } from "@/lib/homepage-config";

type BlockValue = Record<string, Partial<Record<"ru" | "en" | "hy", string>>>;

export function HomepageProductsEditor({
  value,
  onChange,
}: {
  value: BlockValue;
  onChange: (next: BlockValue) => void;
}) {
  const { t } = useI18n();
  const skus = parseIconSkus(value);
  const text = skus.join("\n");

  const setSkus = (nextText: string) => {
    const list = nextText
      .split(/[\n,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    const serialized = serializeIconSkus(list.length ? list : DEFAULT_ICONIC_SKUS);
    const patch = { ru: serialized, en: serialized, hy: serialized };
    onChange({ ...value, "config.iconSkus": patch });
  };

  return (
    <div className="mt-6 space-y-6 rounded-sm border border-dashed border-border bg-secondary/20 p-4">
      <div>
        <h3 className="text-sm font-medium">{t("admin.content.homepage.iconsTitle")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("admin.content.homepage.iconsDesc")}</p>
        <label className="mt-4 block">
          <span className="text-xs text-muted-foreground">{t("admin.content.homepage.iconSkus")}</span>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setSkus(e.target.value)}
            placeholder={DEFAULT_ICONIC_SKUS.join("\n")}
            className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground"
          />
        </label>
      </div>

      <div className="rounded-sm border border-border bg-background p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{t("admin.content.homepage.showcaseTitle")}</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
          <li>{t("admin.content.homepage.showcaseBestsellers")}</li>
          <li>{t("admin.content.homepage.showcaseSpecial")}</li>
          <li>{t("admin.content.homepage.showcaseNew")}</li>
        </ul>
      </div>
    </div>
  );
}
