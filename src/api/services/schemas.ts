import { apiClient } from "../client";
import type { SchemaListResponse } from "../types/schemas";

export const schemasApi = {
  list: async (): Promise<SchemaListResponse> => {
    const response = await apiClient.get<SchemaListResponse>("/schemas");
    return response.data;
  },
};
