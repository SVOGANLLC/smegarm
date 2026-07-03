/** Client flag — trigram/synonym fallback when full-text search finds few results. */
export function isFuzzySearchEnabled(): boolean {
  return import.meta.env.VITE_FUZZY_SEARCH_ENABLED === "true";
}
