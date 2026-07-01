import type { CatalogNavGroupDef } from "@/lib/catalog-nav-groups";
import type { CatalogNavColumn } from "@/lib/catalog-nav";

/** smeg.com-style default subgroup definitions (editable in admin). */
export const DEFAULT_CATALOG_NAV_GROUPS: CatalogNavGroupDef[] = [
  {
    id: "major-cooking",
    section: "large",
    labels: { ru: "Приготовление", en: "Cooking", hy: "Խոհանոց" },
    members: [
      { type: "family", name: "Oven" },
      { type: "family", name: "Hob" },
      { type: "category", slug: "hoods" },
      { type: "family", name: "Cooker" },
      { type: "family", name: "Microwave" },
      { type: "category", slug: "countertop-ovens" },
    ],
  },
  {
    id: "major-cooling",
    section: "large",
    labels: { ru: "Холод и вино", en: "Cooling", hy: "Սառեցում" },
    members: [
      { type: "family", name: "Refrigerator" },
      { type: "family", name: "Freezers" },
      { type: "category", slug: "wine-coolers" },
      { type: "category", slug: "blast-chillers" },
    ],
  },
  {
    id: "major-clean-laundry",
    section: "large",
    labels: { ru: "Мойка и стирка", en: "Cleaning & laundry", hy: "Լվացում" },
    members: [
      { type: "family", name: "Dishwashers" },
      { type: "family", name: "Washing Machine" },
      { type: "family", name: "Washer dryer" },
      { type: "family", name: "Sink" },
      { type: "category", slug: "taps" },
    ],
  },
  {
    id: "major-built-in",
    section: "large",
    labels: { ru: "Встраиваемое", en: "Built-in", hy: "Ներկառուցվող" },
    members: [
      { type: "family", name: "Drawer" },
      { type: "family", name: "Countertop Combi Oven" },
      { type: "category", slug: "built-in-coffee-machines" },
    ],
  },
  {
    id: "breakfast",
    section: "small",
    labels: { ru: "Завтрак", en: "Breakfast", hy: "Նախաճաշ" },
    members: [
      { type: "category", slug: "kettles" },
      { type: "category", slug: "toasters" },
      { type: "family", name: "Citrus Juicer" },
    ],
  },
  {
    id: "coffee",
    section: "small",
    labels: { ru: "Кофе", en: "Coffee", hy: "Սուրճ" },
    members: [
      { type: "family", name: "Espresso Coffee Machine" },
      { type: "family", name: "Drip filter Coffee Machine" },
      { type: "family", name: "Coffee Grinder" },
      { type: "family", name: "Milk Frother" },
    ],
  },
  {
    id: "water",
    section: "small",
    labels: { ru: "Вода", en: "Water", hy: "Ջուր" },
    members: [
      { type: "family", name: "Insulated bottle" },
      { type: "family", name: "Soda Maker" },
    ],
  },
  {
    id: "food-prep",
    section: "small",
    labels: { ru: "Приготовление", en: "Food preparation", hy: "Պատրաստում" },
    members: [
      { type: "category", slug: "stand-mixers" },
      { type: "family", name: "Hand Blenders" },
      { type: "family", name: "Blenders" },
      { type: "category", slug: "food-processors" },
      { type: "family", name: "Kitchen Scales" },
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
    labels: { ru: "Готовка", en: "Cooking", hy: "Խոհարարություն" },
    members: [
      { type: "family", name: "Countertop Combi Oven" },
      { type: "category", slug: "portable-induction" },
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
