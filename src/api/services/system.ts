import { apiClient } from "../client";
import type { HealthStatus } from "../types/system";

export const systemApi = {
  health: async (): Promise<HealthStatus> => {
    const response = await apiClient.get<HealthStatus>("/system/health");
    return response.data;
  },
};
