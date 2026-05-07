// src/api/services/connector-runtime.ts
// Communication Channels + Transfer Process mutation + Data Transfer mutation.
// Backend tag: "Connector - Communication Channel", "Connector - Transfer Process",
// "Connector - Data Transfer".

import { apiClient } from "../client";
import type { PaginationParams } from "../client";

const BASE = "/api/v1";

// ============ COMMUNICATION CHANNEL ============

export interface CommunicationChannel {
  id: string;
  domain_id: string;
  transfer_process_id?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export const channelsApi = {
  create: async (domainId: string, data: Record<string, any>): Promise<CommunicationChannel> => {
    const res = await apiClient.post<CommunicationChannel>(`${BASE}/${domainId}/channels`, data);
    return res.data;
  },
  activate: async (domainId: string, channelId: string): Promise<CommunicationChannel> => {
    const res = await apiClient.put<CommunicationChannel>(`${BASE}/${domainId}/channels/${channelId}/activate`, {});
    return res.data;
  },
  close: async (domainId: string, channelId: string): Promise<CommunicationChannel> => {
    const res = await apiClient.put<CommunicationChannel>(`${BASE}/${domainId}/channels/${channelId}/close`, {});
    return res.data;
  },
  getById: async (domainId: string, channelId: string): Promise<CommunicationChannel> => {
    const res = await apiClient.get<CommunicationChannel>(`${BASE}/${domainId}/channels/${channelId}`);
    return res.data;
  },
  listByTransferProcess: async (domainId: string, transferProcessId: string, params?: PaginationParams): Promise<{ data: CommunicationChannel[] }> => {
    const res = await apiClient.get<{ data: CommunicationChannel[] }>(
      `${BASE}/${domainId}/channels/by-transfer-process/${transferProcessId}`,
      { params }
    );
    return res.data;
  },
};

// ============ TRANSFER PROCESS MUTATIONS ============

export const transferProcessMutationsApi = {
  initiate: async (domainId: string, data: Record<string, any>) => {
    const res = await apiClient.post(`${BASE}/${domainId}/transfer-processes`, data);
    return res.data;
  },
  negotiate: async (domainId: string, transferProcessId: string, data: Record<string, any> = {}) => {
    const res = await apiClient.put(`${BASE}/${domainId}/transfer-processes/${transferProcessId}/negotiate`, data);
    return res.data;
  },
  execute: async (domainId: string, transferProcessId: string, data: Record<string, any> = {}) => {
    const res = await apiClient.put(`${BASE}/${domainId}/transfer-processes/${transferProcessId}/execute`, data);
    return res.data;
  },
  complete: async (domainId: string, transferProcessId: string, data: Record<string, any> = {}) => {
    const res = await apiClient.put(`${BASE}/${domainId}/transfer-processes/${transferProcessId}/complete`, data);
    return res.data;
  },
  fail: async (domainId: string, transferProcessId: string, data: Record<string, any> = {}) => {
    const res = await apiClient.put(`${BASE}/${domainId}/transfer-processes/${transferProcessId}/fail`, data);
    return res.data;
  },
};

// ============ DATA TRANSFER MUTATIONS ============

export const dataTransferMutationsApi = {
  start: async (domainId: string, dataTransferId: string, data: Record<string, any> = {}) => {
    const res = await apiClient.put(`${BASE}/${domainId}/data-transfers/${dataTransferId}/start`, data);
    return res.data;
  },
  complete: async (domainId: string, dataTransferId: string, data: Record<string, any> = {}) => {
    const res = await apiClient.put(`${BASE}/${domainId}/data-transfers/${dataTransferId}/complete`, data);
    return res.data;
  },
  fail: async (domainId: string, dataTransferId: string, data: Record<string, any> = {}) => {
    const res = await apiClient.put(`${BASE}/${domainId}/data-transfers/${dataTransferId}/fail`, data);
    return res.data;
  },
};
