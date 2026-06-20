#!/usr/bin/env node
/**
 * Adds useI18n import + hook and replaces common Russian UI strings with t() calls.
 */
import { readFileSync, writeFileSync } from "fs";

const files = [
  "src/routes/_authenticated/admin/orders.tsx",
  "src/routes/_authenticated/admin/tools.tsx",
  "src/routes/_authenticated/admin/products.index.tsx",
  "src/routes/_authenticated/admin/products.$sku.tsx",
  "src/routes/_authenticated/admin/partners.tsx",
  "src/routes/_authenticated/admin/content.tsx",
];

const pairs = [
  ['toast.success("Сохранено")', 'toast.success(t("admin.saved"))'],
  ['toast.success("Сохранено.")', 'toast.success(t("admin.saved"))'],
  ['toast.success("Обновлено")', 'toast.success(t("admin.updated"))'],
  ['toast.success("Статус обновлён")', 'toast.success(t("admin.orders.statusUpdated"))'],
  ['toast.success("Заметки сохранены")', 'toast.success(t("admin.orders.notesSaved"))'],
  ['toast.success("Экспорт готов")', 'toast.success(t("admin.orders.exportReady"))'],
  ['toast.success("Удалена")', 'toast.success(t("admin.removed"))'],
  ['toast.success("Удалён")', 'toast.success(t("admin.removed"))'],
  ['toast.success("Коллекция создана")', 'toast.success(t("admin.collections.created"))'],
  ['toast.success("Партнёр добавлен")', 'toast.success(t("admin.partners.added"))'],
  ['toast.success("Роль обновлена")', 'toast.success(t("admin.team.roleUpdated"))'],
  ['toast.success("Перевод завершён")', 'toast.success(t("admin.tools.translateDone"))'],
  ['toast.error(e instanceof Error ? e.message : "Ошибка")', 'toast.error(e instanceof Error ? e.message : t("admin.error"))'],
  ['throw new Error("Введите название")', 'throw new Error(t("admin.enterName"))'],
  ['throw new Error("Не картинка")', 'throw new Error(t("admin.notImage"))'],
  ['throw new Error("Больше 5 МБ")', 'throw new Error(t("admin.tooLarge5mb"))'],
  ['throw new Error("Нет заказов для экспорта")', 'throw new Error(t("admin.orders.noExport"))'],
  ['"Загрузка…"', 't("admin.loading")'],
  ['>Загрузка…<', '>{t("admin.loading")}<'],
  ['"Ошибка экспорта"', 't("admin.orders.exportError")'],
  ['label: "Новый"', 'label: t("admin.orders.status.new")'],
  ['label: "В работе"', 'label: t("admin.orders.status.in_progress")'],
  ['label: "Подтверждён"', 'label: t("admin.orders.status.confirmed")'],
  ['label: "Отправлен"', 'label: t("admin.orders.status.shipped")'],
  ['label: "Выполнен"', 'label: t("admin.orders.status.done")'],
  ['label: "Отменён"', 'label: t("admin.orders.status.cancelled")'],
];

for (const rel of files) {
  let s = readFileSync(rel, "utf8");
  if (!s.includes('useI18n')) {
    s = s.replace(/^(import .+\n)+/m, (m) => m + 'import { useI18n } from "@/lib/i18n";\n');
  }
  if (!s.includes("const { t } = useI18n()")) {
    s = s.replace(/function (\w+)\(\) \{\n/, 'function $1() {\n  const { t } = useI18n();\n');
  }
  for (const [from, to] of pairs) {
    s = s.split(from).join(to);
  }
  writeFileSync(rel, s);
  console.log("patched", rel);
}
