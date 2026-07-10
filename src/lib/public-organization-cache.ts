export interface PublicOrganizationCacheItem {
  id: string | null;
  name: string;
}

let publicOrganizationsCache: PublicOrganizationCacheItem[] = [];

const normalizeName = (value: string | null | undefined) =>
  String(value ?? "").trim();

export const getPublicOrganizationsCache = (): PublicOrganizationCacheItem[] =>
  publicOrganizationsCache.slice();

export const setPublicOrganizationsCache = (
  organizations: PublicOrganizationCacheItem[],
): void => {
  const merged = new Map<string, PublicOrganizationCacheItem>();

  organizations.forEach((organization) => {
    const name = normalizeName(organization.name);
    const id = organization.id ? String(organization.id).trim() : null;
    const key = id ?? name.toLowerCase();
    if (!key || !name) return;

    merged.set(key, {
      id,
      name,
    });
  });

  publicOrganizationsCache = Array.from(merged.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};

export const clearPublicOrganizationsCache = (): void => {
  publicOrganizationsCache = [];
};
