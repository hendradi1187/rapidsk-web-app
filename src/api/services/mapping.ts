import { apiClient } from "../client";
import type { MappingRequest, MappingResult } from "../types/mapping";

export const mappingApi = {
  /**
   * Auto-map source fields ke canonical fields dengan confidence score.
   */
  auto: async (data: MappingRequest): Promise<MappingResult> => {
    const response = await apiClient.post<MappingResult>("/mapping/auto", data);
    return response.data;
  },
};
