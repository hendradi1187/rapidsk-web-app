import { apiClient } from "../client";
import type { VocabularyListResponse } from "../types/vocabularies";

export const vocabulariesApi = {
  list: async (): Promise<VocabularyListResponse> => {
    const response = await apiClient.get<VocabularyListResponse>("/vocabularies");
    return response.data;
  },
};
