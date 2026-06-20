export const DEFAULT_ICONIC_SKUS = ["ECF03PBEU", "KLF03PKEU", "TSF02PGEU", "BLF03CREU"];

type BlockValue = Record<string, Partial<Record<"ru" | "en" | "hy", string>>>;

export function parseIconSkus(value: BlockValue | null | undefined): string[] {
  const raw =
    value?.["config.iconSkus"]?.ru?.trim() ||
    value?.["config.iconSkus"]?.en?.trim() ||
    value?.["config.iconSkus"]?.hy?.trim() ||
    "";
  if (!raw) return DEFAULT_ICONIC_SKUS;
  const list = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return list.length ? list : DEFAULT_ICONIC_SKUS;
}

export function serializeIconSkus(skus: string[]): string {
  return skus.map((s) => s.trim().toUpperCase()).filter(Boolean).join("\n");
}
