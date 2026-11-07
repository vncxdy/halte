const STORAGE_KEY = "halte_favorites";

export function readFavorites() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function writeFavorites(items) {
  const next = Array.isArray(items) ? items : [];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local persistence is optional; the in-memory state remains usable.
  }
  return next;
}

export function favoriteKey(item) {
  return `${item.kind || "item"}:${item.id}`;
}

export function toggleFavorite(items, item) {
  const key = favoriteKey(item);
  const exists = items.some((saved) => favoriteKey(saved) === key);
  return exists
    ? items.filter((saved) => favoriteKey(saved) !== key)
    : [...items, { ...item, key }];
}

export { STORAGE_KEY };