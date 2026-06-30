export type AdminTheme = "light" | "gray" | "dark";

const STORAGE_KEY = "smeg-admin-theme";

export function getAdminTheme(): AdminTheme {
  if (typeof window === "undefined") return "dark";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "gray" || raw === "dark") return raw;
  return "dark";
}

export function setAdminTheme(theme: AdminTheme) {
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent("admin-theme-change", { detail: theme }));
}

export function initAdminTheme() {
  const theme = getAdminTheme();
  window.dispatchEvent(new CustomEvent("admin-theme-change", { detail: theme }));
}
