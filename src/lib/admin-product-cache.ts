import type { QueryClient } from "@tanstack/react-query";

/** Invalidate storefront + admin caches after a product row changes. */
export function invalidateProductQueries(qc: QueryClient, sku: string) {
  qc.invalidateQueries({ queryKey: ["admin-product", sku] });
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
