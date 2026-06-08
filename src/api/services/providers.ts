/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";
import type { ProviderListResponse } from "../types/providers";

// GX-Space participants (KKKS & SKK Migas) → tipe Provider flat.
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export const providersApi = {
  list: async (): Promise<ProviderListResponse> => {
    const res = await apiClient.get("/onboarding/participants");
    return unwrap(res).map((p: any) => ({
      provider_id: p.id,
      provider_name: p.organization_name,
      organization_type: p.organization_type,
      address: p.address,
      status: p.status ?? "ACTIVE",
    })) as unknown as ProviderListResponse;
  },

  getById: async (id: string): Promise<any> => {
    const res = await apiClient.get(`/onboarding/participants/${id}`);
    return res.data;
  },
};
