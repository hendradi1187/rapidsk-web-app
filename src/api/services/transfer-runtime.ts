import { AxiosError } from "axios";
import { apiClient } from "../client";
import type {
  PaginationParams,
  TransferProcess,
  TransferProcessListResponse,
  DataTransferRuntime,
  DataTransferRuntimeListResponse,
} from "../types";

const BASE_PATH = "/api/v1";

const EMPTY_TRANSFER_PROCESS_LIST: TransferProcessListResponse = {
  data: [],
  total: 0,
  limit: 0,
  offset: 0,
};

const EMPTY_DATA_TRANSFER_LIST: DataTransferRuntimeListResponse = {
  data: [],
  total: 0,
  limit: 0,
  offset: 0,
};

function isBrokenTransferHistoryRoute(error: unknown) {
  const axiosError = error as AxiosError<any>;
  const first = axiosError?.response?.data?.errors?.[0];
  return (
    axiosError?.response?.status === 422 &&
    first?.field === "transfer_process_id" &&
    typeof first?.message === "string" &&
    first.message.includes("Received: history")
  );
}

export const transferProcessesApi = {
  history: async (domainId: string, params?: PaginationParams): Promise<TransferProcessListResponse> => {
    try {
      const response = await apiClient.get<TransferProcessListResponse>(
        `${BASE_PATH}/${domainId}/transfer-processes/history`,
        { params }
      );
      return response.data;
    } catch (error) {
      if (isBrokenTransferHistoryRoute(error)) {
        return {
          ...EMPTY_TRANSFER_PROCESS_LIST,
          limit: params?.limit ?? 0,
          offset: params?.offset ?? 0,
        };
      }
      throw error;
    }
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
    try {
      const response = await apiClient.get<DataTransferRuntimeListResponse>(
        `${BASE_PATH}/${domainId}/data-transfers`,
        { params: { ...params, transfer_process_id: transferProcessId } }
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<any>;
      if (axiosError?.response?.status === 422) {
        return {
          ...EMPTY_DATA_TRANSFER_LIST,
          limit: params?.limit ?? 0,
          offset: params?.offset ?? 0,
        };
      }
      throw error;
    }
  },

  getById: async (domainId: string, id: string): Promise<DataTransferRuntime> => {
    const response = await apiClient.get<DataTransferRuntime>(
      `${BASE_PATH}/${domainId}/data-transfers/${id}`
    );
    return response.data;
  },
};
