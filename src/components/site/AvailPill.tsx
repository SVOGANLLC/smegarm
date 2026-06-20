import { useI18n } from "@/lib/i18n";
import { deliveryLeadDays, isProductInStock, type AvailFields } from "@/lib/availability";

export function AvailPill(props: AvailFields) {
  const { t } = useI18n();

  if (isProductInStock(props)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
        {t("avail.inStock")}
      </span>
    );
  }

  const days = deliveryLeadDays(props);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-sky-900">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      {t("avail.deliveryFromDays", { n: days })}
    </span>
  );
}
