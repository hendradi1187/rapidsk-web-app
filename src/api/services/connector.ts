import { apiClient } from "../client";

const BASE_PATH = "/api/v1";

// ============ CONSUMER ============

export const consumerApi = {
  /**
   * Get data by agreement (consumer side)
   */
  consume: async <T = unknown>(domainId: string, agreementId: string): Promise<T> => {
    const response = await apiClient.get<T>(
      `${BASE_PATH}/consumer/${domainId}/consume/${agreementId}`
    );
    return response.data;
  },
};

// ============ PROVIDER ============

export const providerApi = {
  /**
   * Get data by agreement (provider side)
   */
  provide: async <T = unknown>(domainId: string, agreementId: string): Promise<T> => {
    const response = await apiClient.get<T>(
      `${BASE_PATH}/provider/${domainId}/provide/${agreementId}`
    );
    return response.data;
  },
};
