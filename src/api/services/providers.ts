import { apiClient } from "../client";
import type { ProviderListResponse } from "../types/providers";

export const providersApi = {
  list: async (): Promise<ProviderListResponse> => {
    const response = await apiClient.get<ProviderListResponse>("/providers");
    return response.data;
  },
};
