// TTL cache: 30 menit
const CACHE_TTL_MS = 30 * 60 * 1000;

const participantOrganizationBindingKey = (participantId: string) =>
  `participant_org_binding:${participantId}`;

const participantOrganizationBindingTimestampKey = (participantId: string) =>
  `participant_org_binding_ts:${participantId}`;

export const getParticipantOrganizationBindingKey = (participantId: string) =>
  participantOrganizationBindingKey(participantId);

// ── Helpers cache internal ────────────────────────────────────────────────────

const isCacheStale = (participantId: string): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const tsRaw = localStorage.getItem(
      participantOrganizationBindingTimestampKey(participantId),
    );
    if (!tsRaw) return true;
    const ts = parseInt(tsRaw, 10);
    return isNaN(ts) || Date.now() - ts > CACHE_TTL_MS;
  } catch {
    return true;
  }
};

// ── Read/write cache sinkron (tidak berubah, backward-compat) ─────────────────

export const getStoredParticipantOrganizationId = (
  participantId: string,
): string | null => {
  if (!participantId || typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(participantOrganizationBindingKey(participantId));
  } catch {
    return null;
  }
};

export const setStoredParticipantOrganizationId = (
  participantId: string,
  organizationId: string | null,
): void => {
  if (!participantId || typeof window === 'undefined') return;
  try {
    if (organizationId) {
      localStorage.setItem(
        participantOrganizationBindingKey(participantId),
        organizationId,
      );
      localStorage.setItem(
        participantOrganizationBindingTimestampKey(participantId),
        String(Date.now()),
      );
      return;
    }
    localStorage.removeItem(participantOrganizationBindingKey(participantId));
    localStorage.removeItem(
      participantOrganizationBindingTimestampKey(participantId),
    );
  } catch {
    // abaikan error storage
  }
};

// ── Fetch dari BE: GET /governance/organizations/ + filter by participant ─────

export interface ApiClientLike {
  get: (path: string, params?: Record<string, unknown>) => Promise<unknown>;
}

interface OrgItem {
  organization_id?: string;
  id?: string;
  participant_id?: string;
  participants?: string[];
}

/**
 * Fetch organisasi dari BE lalu temukan yang ter-binding ke participantId.
 * Mengembalikan organization_id pertama yang cocok, atau null.
 */
const fetchOrgIdFromBE = async (
  participantId: string,
  apiClient: ApiClientLike,
): Promise<string | null> => {
  try {
    const res = await apiClient.get('/governance/organizations/', { limit: 200 });
    const items: OrgItem[] = (res as any)?.data?.data ?? (res as any)?.data ?? [];
    if (!Array.isArray(items) || items.length === 0) return null;

    // Strategi 1: field participant_id langsung
    const directMatch = items.find(
      (item) => item.participant_id === participantId,
    );
    if (directMatch) {
      return directMatch.organization_id ?? directMatch.id ?? null;
    }

    // Strategi 2: field participants array
    const arrayMatch = items.find(
      (item) =>
        Array.isArray(item.participants) &&
        item.participants.includes(participantId),
    );
    if (arrayMatch) {
      return arrayMatch.organization_id ?? arrayMatch.id ?? null;
    }

    return null;
  } catch {
    return null;
  }
};

// ── Fungsi utama: cache-first, fallback async ke BE ───────────────────────────

/**
 * getParticipantOrgBinding(participantId, apiClient?)
 *
 * - Cache hit + tidak stale  → return dari localStorage
 * - Cache miss / stale       → fetch GET /governance/organizations/, simpan ke localStorage
 * - apiClient tidak disediakan dan cache miss → return null (tidak fetch)
 */
export const getParticipantOrgBinding = async (
  participantId: string,
  apiClient?: ApiClientLike,
): Promise<string | null> => {
  if (!participantId) return null;

  const cached = getStoredParticipantOrganizationId(participantId);
  if (cached && !isCacheStale(participantId)) {
    return cached;
  }

  if (!apiClient) return cached; // tidak bisa refresh tanpa client

  const fresh = await fetchOrgIdFromBE(participantId, apiClient);
  if (fresh) {
    setStoredParticipantOrganizationId(participantId, fresh);
  }
  return fresh ?? cached; // fallback ke stale jika BE tidak mengembalikan data
};
