const STORAGE_KEY = "halte_theme";
const THEMES = ["light", "dark", "system"];

export function readTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(theme, prefersDark = false) {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

export function writeTheme(theme) {
  const next = THEMES.includes(theme) ? theme : "system";
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  return next;
}

export { THEMES, STORAGE_KEY };