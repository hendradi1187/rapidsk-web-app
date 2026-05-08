// src/api/hooks/useHealth.ts
// Backend health probe — polls GET /health every 30s.

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../client";

export interface HealthResponse {
  status: string;
  [key: string]: any;
}

export const useBackendHealth = () => {
  return useQuery<HealthResponse>({
    queryKey: ["backend-health"],
    queryFn: async () => {
      const res = await apiClient.get<HealthResponse>("/health");
      return res.data;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 25_000,
  });
};
