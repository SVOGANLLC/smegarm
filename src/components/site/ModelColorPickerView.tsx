import { useI18n, pickLocalized } from "@/lib/i18n";
import { ProductCard } from "@/components/site/ProductCard";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { resolveModelGroupLabel, type ModelGroupLabel } from "@/lib/model-group-labels";
import { ArrowLeft, X } from "lucide-react";

type Props = {
  products: ProductCardType[];
  onBack: () => void;
  onResetFilters?: () => void;
  modelGroupLabels?: ModelGroupLabel[];
};

export function ModelColorPickerView({ products, onBack, onResetFilters, modelGroupLabels }: Props) {
  const { lang, t } = useI18n();
  const first = products[0];
  const custom = first
    ? resolveModelGroupLabel(modelGroupLabels ?? [], lang, first.model_group, first.sku)
    : {};
  const modelName =
    custom.name ||
    (first ? pickLocalized(first as unknown as Record<string, unknown>, "name", lang) || first.name : "");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("catalog.backToModels")}
        </button>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground transition hover:border-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            {t("catalog.reset")}
          </button>
        )}
      </div>
      <div className="mb-8">
        <p className="eyebrow text-muted-foreground">{t("product.chooseColor")}</p>
        {modelName && <h2 className="mt-2 font-serif text-2xl md:text-3xl">{modelName}</h2>}
        <p className="mt-2 text-sm text-muted-foreground">
          {products.length} {t("catalog.colorVariantsSuffix")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-y-8 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.sku} p={p} />
        ))}
      </div>
    </div>
  );
}
