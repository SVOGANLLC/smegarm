import type { QueryClient } from "@tanstack/react-query";

/** Invalidate list + storefront caches (keep admin-product detail cache as set by save). */
export function invalidateProductListCaches(qc: QueryClient, sku: string) {
  qc.invalidateQueries({ queryKey: ["admin-products"] });
  qc.invalidateQueries({ queryKey: ["admin-today"] });
  qc.invalidateQueries({ queryKey: ["product", sku] });
  qc.invalidateQueries({ queryKey: ["catalog"] });
  qc.invalidateQueries({ queryKey: ["listing-variants"] });
  qc.invalidateQueries({ queryKey: ["model-color-products"] });
  qc.invalidateQueries({ queryKey: ["product-collection-meta", sku] });
  qc.invalidateQueries({ queryKey: ["product-collections", sku] });
  qc.invalidateQueries({ queryKey: ["admin-variant-groups"] });
}

/** Invalidate everything including the admin product detail query. */
export function invalidateProductQueries(qc: QueryClient, sku: string) {
  qc.invalidateQueries({ queryKey: ["admin-product", sku] });
  invalidateProductListCaches(qc, sku);
}
