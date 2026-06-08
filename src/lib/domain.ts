// Active governance domain_id — disetel oleh DomainContext setelah login,
// dibaca oleh service domain-scoped GX-Space.
const KEY = "active_domain_id";
let activeDomainId: string | null = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;

export const getActiveDomainId = (): string | null => activeDomainId;

export const setActiveDomainId = (id: string | null): void => {
  activeDomainId = id;
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};
