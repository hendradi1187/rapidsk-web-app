import { apiClient } from "../client";
import type {
  Dataset,
  DatasetCreateRequest,
  DatasetListResponse,
} from "../types/data-catalog";

// Base path "/datasets" — relative to VITE_API_BASE_URL.
//
// Per rapiDSK Enterprise spec:
//   GET  /datasets             → Dataset[]
//   POST /datasets             → Dataset (created)
//   GET  /datasets/{id}        → Dataset
//
// Tidak ada PATCH atau DELETE.

export const datasetsApi = {
  /**
   * List all datasets.
   * Plain array response, no pagination params di spec.
   */
  list: async (): Promise<DatasetListResponse> => {
    const response = await apiClient.get<DatasetListResponse>("/datasets");
    return response.data;
  },

  /**
   * Get dataset by ID.
   */
  getById: async (id: string): Promise<Dataset> => {
    const response = await apiClient.get<Dataset>(`/datasets/${id}`);
    return response.data;
  },

  /**
   * Create a new dataset.
   */
  create: async (data: DatasetCreateRequest): Promise<Dataset> => {
    const response = await apiClient.post<Dataset>("/datasets", data);
    return response.data;
  },
};
