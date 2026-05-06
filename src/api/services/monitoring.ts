import { apiClient } from "../client";
import type { PaginationParams } from "../types/common";
import type {
  Monitoring,
  MonitoringConfigCreateRequest,
  MonitoringCreateRequest,
  MonitoringListResponse,
  MonitoringUpdateRequest,
} from "../types/monitoring";

const LIVE_BASE_PATH = "/api/v1/onboarding";
const LEGACY_BASE_PATH = "/api/v1/monitoring";
const STORAGE_KEY_PREFIX = "rapidsk-monitoring-";

export const monitoringApi = {
  /**
   * Existing onboarding wizard config fallback.
   * This remains non-v2 and intentionally uses the old anticipated endpoint.
   */
  configure: async (
    domainId: string,
    data: MonitoringConfigCreateRequest
  ): Promise<{ savedToBackend: boolean }> => {
    try {
      await apiClient.post(`${LEGACY_BASE_PATH}/${domainId}/config`, data);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${domainId}`);
      return { savedToBackend: true };
    } catch {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${domainId}`,
        JSON.stringify({ ...data, domainId, configuredAt: new Date().toISOString() })
      );
      return { savedToBackend: false };
    }
  },

  getConfig: async (domainId: string): Promise<MonitoringConfigCreateRequest | null> => {
    try {
      const response = await apiClient.get<MonitoringConfigCreateRequest>(
        `${LEGACY_BASE_PATH}/${domainId}/config`
      );
      return response.data;
    } catch {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${domainId}`);
      return stored ? (JSON.parse(stored) as MonitoringConfigCreateRequest) : null;
    }
  },

  health: async (): Promise<{ status: string }> => {
    const response = await apiClient.get<{ status: string }>(`${LEGACY_BASE_PATH}/health`);
    return response.data;
  },

  /**
   * Live backend path for sequence-based v2 monitoring:
   * /api/v1/onboarding/{domain_id}/monitorings
   */
  list: async (domainId: string, params?: PaginationParams): Promise<MonitoringListResponse> => {
    const response = await apiClient.get<MonitoringListResponse>(
      `${LIVE_BASE_PATH}/${domainId}/monitorings`,
      { params }
    );
    return response.data;
  },

  getById: async (domainId: string, id: string): Promise<Monitoring> => {
    const response = await apiClient.get<Monitoring>(
      `${LIVE_BASE_PATH}/${domainId}/monitorings/${id}`
    );
    return response.data;
  },

  create: async (domainId: string, data: MonitoringCreateRequest): Promise<Monitoring> => {
    const response = await apiClient.post<Monitoring>(
      `${LIVE_BASE_PATH}/${domainId}/monitorings`,
      data
    );
    return response.data;
  },

  update: async (
    domainId: string,
    id: string,
    data: MonitoringUpdateRequest
  ): Promise<Monitoring> => {
    const response = await apiClient.patch<Monitoring>(
      `${LIVE_BASE_PATH}/${domainId}/monitorings/${id}`,
      data
    );
    return response.data;
  },

  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${LIVE_BASE_PATH}/${domainId}/monitorings/${id}`);
  },
};
