/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";
import type {
  ProviderCreateRequest,
  ProviderListResponse,
  ProviderUpdateRequest,
} from "../types/providers";

// GX-Space participants (KKKS & SKK Migas) → tipe Provider flat.
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export const providersApi = {
  create: async (body: ProviderCreateRequest): Promise<{ id: string }> => {
    const res = await apiClient.post("/onboarding/participants", body);
    return res.data as { id: string };
  },

  list: async (): Promise<ProviderListResponse> => {
    const res = await apiClient.get("/onboarding/participants");
    return unwrap(res).map((p: any) => ({
      provider_id: p.id,
      provider_name: p.organization_name,
      organization_type: p.organization_type,
      address: p.address,
      status: p.status ?? "ACTIVE",
      contact_person: p.contact_person ?? undefined,
    })) as unknown as ProviderListResponse;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/onboarding/participants/${id}`);
    return res.data;
  },

  update: async (id: string, data: ProviderUpdateRequest): Promise<any> => {
    const res = await apiClient.patch(`/onboarding/participants/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/onboarding/participants/${id}`);
  },

  // Domains
  listDomains: async (participantId: string): Promise<any[]> => {
    const res = await apiClient.get(`/onboarding/participants/${participantId}/domains`);
    return unwrap(res);
  },

  addDomain: async (participantId: string, body: { domain_id: string }): Promise<any> => {
    const res = await apiClient.post(`/onboarding/participants/${participantId}/domains`, body);
    return res.data;
  },

  updateDomain: async (participantId: string, id: string, body: { domain_id: string }): Promise<any> => {
    const res = await apiClient.patch(`/onboarding/participants/${participantId}/domains/${id}`, body);
    return res.data;
  },

  deleteDomain: async (participantId: string, id: string): Promise<void> => {
    await apiClient.delete(`/onboarding/participants/${participantId}/domains/${id}`);
  },

  // Adapters
  listAdapters: async (participantId: string): Promise<any[]> => {
    const res = await apiClient.get(`/onboarding/participants/${participantId}/adapters`);
    return unwrap(res);
  },

  addAdapter: async (participantId: string, body: { domain_id: string; type: string; endpoint: Record<string, any> }): Promise<any> => {
    const res = await apiClient.post(`/onboarding/participants/${participantId}/adapters`, body);
    return res.data;
  },

  updateAdapter: async (participantId: string, id: string, body: { domain_id: string; type: string; endpoint: Record<string, any> }): Promise<any> => {
    const res = await apiClient.patch(`/onboarding/participants/${participantId}/adapters/${id}`, body);
    return res.data;
  },

  deleteAdapter: async (participantId: string, id: string): Promise<void> => {
    await apiClient.delete(`/onboarding/participants/${participantId}/adapters/${id}`);
  },
};
