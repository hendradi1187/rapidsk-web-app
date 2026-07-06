const pickPermissionValue = (item: unknown): string | null => {
  if (typeof item === "string") {
    const value = item.trim();
    return value || null;
  }

  if (!item || typeof item !== "object") {
    return null;
  }

  const candidate = item as Record<string, unknown>;
  const rawValue =
    candidate.permission ??
    candidate.code ??
    candidate.name ??
    candidate.key ??
    candidate.slug;

  if (typeof rawValue !== "string") {
    return null;
  }

  const value = rawValue.trim();
  return value || null;
};

const unwrapPermissionRows = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidate = payload as Record<string, unknown>;
  const rows =
    candidate.permissions ??
    candidate.data ??
    candidate.items ??
    candidate.results;

  return Array.isArray(rows) ? rows : [];
};

export const normalizeEffectivePermissions = (payload: unknown): string[] => {
  const seen = new Set<string>();

  return unwrapPermissionRows(payload).reduce<string[]>((acc, item) => {
    const permission = pickPermissionValue(item);
    if (!permission || seen.has(permission)) {
      return acc;
    }

    seen.add(permission);
    acc.push(permission);
    return acc;
  }, []);
};

export const samePermissions = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((item, index) => item === rightSorted[index]);
};
