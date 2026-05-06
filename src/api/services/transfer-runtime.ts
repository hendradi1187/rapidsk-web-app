import { apiClient } from "../client";
import type {
  PaginationParams,
  TransferProcess,
  TransferProcessListResponse,
  DataTransferRuntime,
  DataTransferRuntimeListResponse,
} from "../types";

const BASE_PATH = "/api/v1";

export const transferProcessesApi = {
  history: async (domainId: string, params?: PaginationParams): Promise<TransferProcessListResponse> => {
    const response = await apiClient.get<TransferProcessListResponse>(
      `${BASE_PATH}/${domainId}/transfer-processes/history`,
      { params }
    );
    return response.data;
  },

  active: async (domainId: string, params?: PaginationParams): Promise<TransferProcessListResponse> => {
    const response = await apiClient.get<TransferProcessListResponse>(
      `${BASE_PATH}/${domainId}/transfer-processes/active`,
      { params }
    );
    return response.data;
  },

  getById: async (domainId: string, id: string): Promise<TransferProcess> => {
    const response = await apiClient.get<TransferProcess>(
      `${BASE_PATH}/${domainId}/transfer-processes/${id}`
    );
    return response.data;
  },
};

export const dataTransferRuntimeApi = {
  listByTransferProcess: async (
    domainId: string,
    transferProcessId: string,
    params?: PaginationParams
  ): Promise<DataTransferRuntimeListResponse> => {
    const response = await apiClient.get<DataTransferRuntimeListResponse>(
      `${BASE_PATH}/${domainId}/data-transfers`,
      { params: { ...params, transfer_process_id: transferProcessId } }
    );
    return response.data;
  },

  getById: async (domainId: string, id: string): Promise<DataTransferRuntime> => {
    const response = await apiClient.get<DataTransferRuntime>(
      `${BASE_PATH}/${domainId}/data-transfers/${id}`
    );
    return response.data;
  },
};
