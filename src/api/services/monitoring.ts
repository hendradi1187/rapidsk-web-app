import { apiClient } from "../client";
import type { MonitoringConfigCreateRequest } from "../types/monitoring";

// Backend path: /api/v1/monitoring/...
// NOTE: Config endpoint is anticipated — not yet implemented by backend (Feb 2026).
// Health check and streaming endpoints are planned but also pending.
const BASE_PATH = "/api/v1/monitoring";

const STORAGE_KEY_PREFIX = "rapidsk-monitoring-";

export const monitoringApi = {
  /**
   * Save monitoring configuration for a domain.
   * Tries backend first; falls back to localStorage if endpoint is unavailable.
   * Returns true if saved to backend, false if saved to localStorage fallback.
   */
  configure: async (
    domainId: string,
    data: MonitoringConfigCreateRequest
  ): Promise<{ savedToBackend: boolean }> => {
    try {
      await apiClient.post(`${BASE_PATH}/${domainId}/config`, data);
      // Clear localStorage fallback if backend now available
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${domainId}`);
      return { savedToBackend: true };
    } catch {
      // Backend endpoint not yet available — persist locally as fallback
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${domainId}`,
        JSON.stringify({ ...data, domainId, configuredAt: new Date().toISOString() })
      );
      return { savedToBackend: false };
    }
  },

  /**
   * Get monitoring configuration for a domain.
   * Tries backend first; falls back to localStorage.
   */
  getConfig: async (domainId: string): Promise<MonitoringConfigCreateRequest | null> => {
    try {
      const response = await apiClient.get<MonitoringConfigCreateRequest>(
        `${BASE_PATH}/${domainId}/config`
      );
      return response.data;
    } catch {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${domainId}`);
      if (stored) {
        return JSON.parse(stored) as MonitoringConfigCreateRequest;
      }
      return null;
    }
  },

  /**
   * Platform health check.
   */
  health: async (): Promise<{ status: string }> => {
    const response = await apiClient.get<{ status: string }>(`${BASE_PATH}/health`);
    return response.data;
  },
};
