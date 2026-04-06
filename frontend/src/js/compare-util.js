const KEY = 'luxauto_compare_ids_v1';
const MAX = 4;

export function getCompareIds() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

export function setCompareIds(ids) {
  const unique = Array.from(new Set(ids.map((x) => Number(x)).filter((n) => Number.isFinite(n)))).slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(unique));
  return unique;
}

export function isInCompare(id) {
  return getCompareIds().includes(Number(id));
}

export function toggleCompare(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return { ids: getCompareIds(), added: false, removed: false, full: false };

  const ids = getCompareIds();
  if (ids.includes(n)) {
    const next = setCompareIds(ids.filter((x) => x !== n));
    return { ids: next, added: false, removed: true, full: false };
  }

  if (ids.length >= MAX) {
    return { ids, added: false, removed: false, full: true };
  }

  const next = setCompareIds([...ids, n]);
  return { ids: next, added: true, removed: false, full: false };
}

export function clearCompare() {
  localStorage.removeItem(KEY);
}
