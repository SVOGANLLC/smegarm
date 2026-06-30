import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { getAdminTheme, setAdminTheme, type AdminTheme } from "@/lib/admin-theme";

const THEMES: { id: AdminTheme; labelKey: string }[] = [
  { id: "light", labelKey: "admin.theme.light" },
  { id: "gray", labelKey: "admin.theme.gray" },
  { id: "dark", labelKey: "admin.theme.dark" },
];

export function AdminThemeSwitch() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<AdminTheme>("dark");

  useEffect(() => {
    setTheme(getAdminTheme());
  }, []);

  return (
    <div className="mt-6">
      <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("admin.theme.title")}</p>
      <div className="grid grid-cols-3 gap-1">
        {THEMES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setAdminTheme(item.id);
              setTheme(item.id);
            }}
            className={`rounded-sm border px-2 py-2 text-[10px] uppercase tracking-wider transition ${
              theme === item.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
