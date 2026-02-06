import { apiClient } from "../client";
import {
  PaginationParams,
  DataTransfer,
  DataTransferCreateRequest,
  DataTransferUpdateRequest,
  DataTransferListResponse,
} from "../types";

const BASE_PATH = "/api/v1";

// ============ DATA TRANSFERS ============

export const dataTransfersApi = {
  /**
   * List data transfers for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<DataTransferListResponse> => {
    const response = await apiClient.get<DataTransferListResponse>(
      `${BASE_PATH}/${domainId}/data-transfers`,
      { params }
    );
    return response.data;
  },

  /**
   * Get data transfer by ID
   */
  getById: async (domainId: string, id: string): Promise<DataTransfer> => {
    const response = await apiClient.get<DataTransfer>(
      `${BASE_PATH}/${domainId}/data-transfers/${id}`
    );
    return response.data;
  },

  /**
   * Create a new data transfer
   */
  create: async (domainId: string, data: DataTransferCreateRequest): Promise<DataTransfer> => {
    const response = await apiClient.post<DataTransfer>(
      `${BASE_PATH}/${domainId}/data-transfers`,
      data
    );
    return response.data;
  },

  /**
   * Update a data transfer
   */
  update: async (domainId: string, id: string, data: DataTransferUpdateRequest): Promise<DataTransfer> => {
    const response = await apiClient.patch<DataTransfer>(
      `${BASE_PATH}/${domainId}/data-transfers/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a data transfer
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/data-transfers/${id}`);
  },
};
