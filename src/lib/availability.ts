const DEFAULT_LEAD_DAYS = 7;

export type AvailFields = {
  availability?: string | null;
  stock_qty?: number | null;
  stock_reserved?: number | null;
  lead_time_days?: number | null;
};

export function availableQty(product: AvailFields) {
  return Math.max(0, (product.stock_qty ?? 0) - (product.stock_reserved ?? 0));
}

export function isProductInStock(product: AvailFields) {
  if (availableQty(product) > 0) return true;
  return product.availability === "in_stock";
}

export function deliveryLeadDays(product: AvailFields) {
  const d = product.lead_time_days;
  if (d != null && d > 0) return d;
  return DEFAULT_LEAD_DAYS;
}
