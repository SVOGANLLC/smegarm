import type { CatalogNavGroupDef } from "@/lib/catalog-nav-groups";
import type { CatalogNavColumn } from "@/lib/catalog-nav";

/**
 * Default подборки — members use category slugs from DB (`category_en` → slugify)
 * so products without `family` still match. Use `family` only for subsets inside a broader category.
 */
export const DEFAULT_CATALOG_NAV_GROUPS: CatalogNavGroupDef[] = [
  {
    id: "major-cooking",
    section: "large",
    labels: { ru: "Духовки и варка", en: "Cooking", hy: "Խոհանոց" },
    members: [
      { type: "category", slug: "ovens" },
      { type: "category", slug: "hobs" },
      { type: "category", slug: "hoods" },
      { type: "category", slug: "cookers" },
      { type: "category", slug: "microwave-ovens" },
      { type: "category", slug: "tabletop-ovens" },
    ],
  },
  {
    id: "major-cooling",
    section: "large",
    labels: { ru: "Холод и вино", en: "Cooling", hy: "Սառեցում" },
    members: [
      { type: "category", slug: "refrigerators" },
      { type: "category", slug: "freezers" },
      { type: "category", slug: "wine-coolers" },
      { type: "category", slug: "blast-chillers" },
    ],
  },
  {
    id: "major-clean-laundry",
    section: "large",
    labels: { ru: "Мойка и стирка", en: "Cleaning & laundry", hy: "Լվացում" },
    members: [
      { type: "category", slug: "dishwashers" },
      { type: "category", slug: "washing-machine" },
      { type: "category", slug: "washer-dryer" },
      { type: "category", slug: "tumble-dryer" },
      { type: "category", slug: "sinks" },
      { type: "category", slug: "taps" },
    ],
  },
  {
    id: "major-built-in",
    section: "large",
    labels: { ru: "Встраиваемое", en: "Built-in", hy: "Ներկառուցվող" },
    members: [{ type: "category", slug: "built-in-drawers" }],
  },
  {
    id: "breakfast",
    section: "small",
    labels: { ru: "Завтрак", en: "Breakfast", hy: "Նախաճաշ" },
    members: [
      { type: "category", slug: "kettles" },
      { type: "category", slug: "toasters" },
      { type: "category", slug: "citrus-juicers" },
    ],
  },
  {
    id: "coffee",
    section: "small",
    labels: { ru: "Кофе", en: "Coffee", hy: "Սուրճ" },
    members: [
      { type: "category", slug: "espresso-coffee-machines" },
      { type: "category", slug: "coffee-grinders" },
      { type: "category", slug: "milk-frothers" },
    ],
  },
  {
    id: "water",
    section: "small",
    labels: { ru: "Вода", en: "Water", hy: "Ջուր" },
    members: [
      { type: "category", slug: "water-bottles" },
      { type: "category", slug: "soda-makers" },
    ],
  },
  {
    id: "food-prep",
    section: "small",
    labels: { ru: "Миксеры и блендеры", en: "Food preparation", hy: "Պատրաստում" },
    members: [
      { type: "category", slug: "stand-mixers" },
      { type: "category", slug: "hand-blenders" },
      { type: "category", slug: "blenders" },
      { type: "category", slug: "hand-mixers" },
      { type: "category", slug: "kitchen-scales" },
    ],
  },
  {
    id: "kitchenware",
    section: "small",
    labels: { ru: "Посуда", en: "Kitchenware", hy: "Խոսում" },
    members: [
      { type: "category", slug: "cookware" },
      { type: "category", slug: "knife-sets" },
    ],
  },
  {
    id: "cooking-small",
    section: "small",
    labels: { ru: "Настольная готовка", en: "Countertop cooking", hy: "Խոհարարություն" },
    members: [
      { type: "category", slug: "tabletop-ovens" },
      { type: "family", name: "Portable cookers" },
      { type: "category", slug: "electric-barbecues" },
    ],
  },
];

export function buildDefaultNavColumns(groups: CatalogNavGroupDef[]): CatalogNavColumn[] {
  const largeGroups = groups.filter((g) => g.section === "large");
  const smallGroups = groups.filter((g) => g.section === "small");

  return [
    {
      id: "large",
      titleKey: "catalog.section.large",
      groups: largeGroups.map((g) => ({
        id: g.id,
        labels: g.labels,
        items: [],
      })),
      items: [{ id: "large-all", labelKey: "nav.catalog.allLarge", to: "/catalog", search: { section: "large" } }],
    },
    {
      id: "small",
      titleKey: "catalog.section.small",
      groups: smallGroups.map((g) => ({
        id: g.id,
        labels: g.labels,
        items: [],
      })),
      items: [{ id: "small-all", labelKey: "nav.catalog.allSmall", to: "/catalog", search: { section: "small" } }],
    },
    {
      id: "more",
      titleKey: "nav.catalog.more",
      items: [
        { id: "accessories", labelKey: "catalog.section.accessories", to: "/catalog", search: { section: "accessories" } },
        { id: "sale", labelKey: "nav.catalog.sale", to: "/sale" },
        { id: "collections", labelKey: "nav.collections", to: "/#collections" },
      ],
    },
  ];
}
