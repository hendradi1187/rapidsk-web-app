/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient } from "../clients";
import type {
  ProviderCreateRequest,
  ProviderListResponse,
  ProviderUpdateRequest,
} from "../types/providers";

// GX-Space participants (KKKS & SKK Migas) → tipe Provider flat.
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];
const getHasNext = (res: any) => Boolean(res?.data?.has_next);
const getTotal = (res: any): number | null => {
  const total = res?.data?.total;
  return typeof total === "number" ? total : null;
};

const normalizeProvider = (p: any) => ({
  provider_id: p.id ?? p.provider_id,
  provider_name: p.organization_name ?? p.provider_name,
  organization_type: p.organization_type,
  address: p.address,
  status: p.status ?? "ACTIVE",
  contact_person: p.contact_person ?? undefined,
});

export const providersApi = {
  create: async (body: ProviderCreateRequest): Promise<{ id: string }> => {
    const res = await ctsClient.post("/onboarding/participants", body);
    return res.data as { id: string };
  },

  list: async (): Promise<ProviderListResponse> => {
    const limit = 100;
    let offset = 0;
    let total: number | null = null;
    const rows: any[] = [];

    do {
      const res = await ctsClient.get("/onboarding/participants", {
        params: { limit, offset },
      });
      const batch = unwrap(res);
      rows.push(...batch);
      total = getTotal(res);
      if (!getHasNext(res) || batch.length < limit) break;
      offset += limit;
    } while (total === null || offset < total);

    const merged = new Map<string, any>();
    rows.forEach((item) => {
      if (!item?.id) return;
      merged.set(item.id, item);
    });

    return Array.from(merged.values()).map(normalizeProvider) as unknown as ProviderListResponse;
  },

  getById: async (id: string): Promise<any> => {
    const res = await ctsClient.get(`/onboarding/participants/${id}`);
    return normalizeProvider(res.data);
  },

  update: async (id: string, data: ProviderUpdateRequest): Promise<any> => {
    const res = await ctsClient.patch(`/onboarding/participants/${id}`, data);
    return normalizeProvider(res.data);
  },

  remove: async (id: string): Promise<void> => {
    await ctsClient.delete(`/onboarding/participants/${id}`);
  },

  // Domains
  listDomains: async (participantId: string): Promise<any[]> => {
    const res = await ctsClient.get(`/onboarding/participants/${participantId}/domains`);
    return unwrap(res);
  },

  addDomain: async (participantId: string, body: { domain_id: string }): Promise<any> => {
    const res = await ctsClient.post(`/onboarding/participants/${participantId}/domains`, body);
    return res.data;
  },

  updateDomain: async (participantId: string, id: string, body: { domain_id: string }): Promise<any> => {
    const res = await ctsClient.patch(`/onboarding/participants/${participantId}/domains/${id}`, body);
    return res.data;
  },

  deleteDomain: async (participantId: string, id: string): Promise<void> => {
    try {
      await ctsClient.delete(`/onboarding/participants/${participantId}/domains/${id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Gagal menghapus domain participant";
      const status = err?.response?.status;
      console.error(`[DELETE] deleteDomain participantId=${participantId} id=${id} status=${status} msg=${msg}`);
      throw new Error(msg);
    }
  },

  // Adapters
  listAdapters: async (participantId: string): Promise<any[]> => {
    const res = await ctsClient.get(`/onboarding/participants/${participantId}/adapters`);
    return unwrap(res);
  },

  addAdapter: async (participantId: string, body: { domain_id: string; type: string; endpoint: Record<string, any> }): Promise<any> => {
    const res = await ctsClient.post(`/onboarding/participants/${participantId}/adapters`, body);
    return res.data;
  },

  updateAdapter: async (participantId: string, id: string, body: { domain_id: string; type: string; endpoint: Record<string, any> }): Promise<any> => {
    const res = await ctsClient.patch(`/onboarding/participants/${participantId}/adapters/${id}`, body);
    return res.data;
  },

  deleteAdapter: async (participantId: string, id: string): Promise<void> => {
    await ctsClient.delete(`/onboarding/participants/${participantId}/adapters/${id}`);
  },
};