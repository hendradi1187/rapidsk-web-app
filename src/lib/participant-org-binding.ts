const CACHE_TTL_MS = 30 * 60 * 1000;

type BindingRecord = {
  organizationId: string | null;
  updatedAt: number;
};

const participantBindingStore = new Map<string, BindingRecord>();

export const getParticipantOrganizationBindingKey = (participantId: string) =>
  `participant_org_binding:${participantId}`;

const isCacheStale = (participantId: string): boolean => {
  const record = participantBindingStore.get(participantId);
  if (!record) return true;
  return Date.now() - record.updatedAt > CACHE_TTL_MS;
};

export const getStoredParticipantOrganizationId = (
  participantId: string,
): string | null => {
  if (!participantId) return null;
  return participantBindingStore.get(participantId)?.organizationId ?? null;
};

export const setStoredParticipantOrganizationId = (
  participantId: string,
  organizationId: string | null,
): void => {
  if (!participantId) return;
  if (organizationId) {
    participantBindingStore.set(participantId, {
      organizationId,
      updatedAt: Date.now(),
    });
    return;
  }
  participantBindingStore.delete(participantId);
};

// WAJIB dipanggil saat logout — tanpa ini, binding organisasi participant yang salah
// (mis. ke-cache ke organisasi lain) akan nempel di tab browser yang sama untuk akun
// berikutnya yang login, walau participant_id-nya beda. Cache ini in-memory per tab,
// jadi hanya reset kalau tab di-reload penuh atau fungsi ini dipanggil eksplisit.
export const clearParticipantOrgBindingCache = (): void => {
  participantBindingStore.clear();
};

export interface ApiClientLike {
  get: (path: string, params?: Record<string, unknown>) => Promise<unknown>;
}

interface OrgItem {
  organization_id?: string;
  id?: string;
  participant_id?: string;
  participants?: string[];
}

const fetchOrgIdFromBE = async (
  participantId: string,
  apiClient: ApiClientLike,
): Promise<string | null> => {
  try {
    const res = await apiClient.get('/governance/organizations/', { limit: 200 });
    const items: OrgItem[] = (res as any)?.data?.data ?? (res as any)?.data ?? [];
    if (!Array.isArray(items) || items.length === 0) return null;

    const directMatch = items.find(
      (item) => item.participant_id === participantId,
    );
    if (directMatch) {
      return directMatch.organization_id ?? directMatch.id ?? null;
    }

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

export const getParticipantOrgBinding = async (
  participantId: string,
  apiClient?: ApiClientLike,
): Promise<string | null> => {
  if (!participantId) return null;

  const cached = getStoredParticipantOrganizationId(participantId);
  if (cached && !isCacheStale(participantId)) {
    return cached;
  }

  if (!apiClient) return cached;

  const fresh = await fetchOrgIdFromBE(participantId, apiClient);
  if (fresh) {
    setStoredParticipantOrganizationId(participantId, fresh);
  }
  return fresh ?? cached;
};
