import { apiClient } from "../client";
import {
  PaginationParams,
  Participant,
  ParticipantCreateRequest,
  ParticipantUpdateRequest,
  ParticipantListResponse,
  ParticipantDomain,
  ParticipantDomainCreateRequest,
  ParticipantDomainUpdateRequest,
  ParticipantDomainListResponse,
  ConnectionPool,
  ConnectionPoolCreateRequest,
  ConnectionPoolUpdateRequest,
  ConnectionPoolListResponse,
} from "../types";

// Backend path: /api/v1/onboarding/onboarding/...
const BASE_PATH = "/api/v1/onboarding/onboarding";

// ============ PARTICIPANTS ============

export const participantsApi = {
  /**
   * List all participants
   */
  list: async (params?: PaginationParams): Promise<ParticipantListResponse> => {
    const response = await apiClient.get<ParticipantListResponse>(
      `${BASE_PATH}/participants`,
      { params }
    );
    return response.data;
  },

  /**
   * Get participant by ID
   */
  getById: async (id: string): Promise<Participant> => {
    const response = await apiClient.get<Participant>(
      `${BASE_PATH}/participants/${id}`
    );
    return response.data;
  },

  /**
   * Create a new participant
   */
  create: async (data: ParticipantCreateRequest): Promise<Participant> => {
    const response = await apiClient.post<Participant>(
      `${BASE_PATH}/participants`,
      data
    );
    return response.data;
  },

  /**
   * Update a participant
   */
  update: async (id: string, data: ParticipantUpdateRequest): Promise<Participant> => {
    const response = await apiClient.patch<Participant>(
      `${BASE_PATH}/participants/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a participant
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/participants/${id}`);
  },
};

// ============ PARTICIPANT DOMAINS ============

export const participantDomainsApi = {
  /**
   * List domains for a participant
   */
  list: async (participantId: string, params?: PaginationParams): Promise<ParticipantDomainListResponse> => {
    const response = await apiClient.get<ParticipantDomainListResponse>(
      `${BASE_PATH}/participants/${participantId}/domains`,
      { params }
    );
    return response.data;
  },

  /**
   * Get participant domain by ID
   */
  getById: async (participantId: string, domainId: string): Promise<ParticipantDomain> => {
    const response = await apiClient.get<ParticipantDomain>(
      `${BASE_PATH}/participants/${participantId}/domains/${domainId}`
    );
    return response.data;
  },

  /**
   * Create a participant domain
   */
  create: async (participantId: string, data: ParticipantDomainCreateRequest): Promise<ParticipantDomain> => {
    const response = await apiClient.post<ParticipantDomain>(
      `${BASE_PATH}/participants/${participantId}/domains`,
      data
    );
    return response.data;
  },

  /**
   * Update a participant domain
   */
  update: async (
    participantId: string,
    domainId: string,
    data: ParticipantDomainUpdateRequest
  ): Promise<ParticipantDomain> => {
    const response = await apiClient.patch<ParticipantDomain>(
      `${BASE_PATH}/participants/${participantId}/domains/${domainId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a participant domain
   */
  delete: async (participantId: string, domainId: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/participants/${participantId}/domains/${domainId}`);
  },
};

// ============ CONNECTION POOLS ============

export const connectionPoolsApi = {
  /**
   * List all connection pools
   */
  list: async (params?: PaginationParams): Promise<ConnectionPoolListResponse> => {
    const response = await apiClient.get<ConnectionPoolListResponse>(
      `${BASE_PATH}/connection-pools`,
      { params }
    );
    return response.data;
  },

  /**
   * Get connection pool by ID
   */
  getById: async (id: string): Promise<ConnectionPool> => {
    const response = await apiClient.get<ConnectionPool>(
      `${BASE_PATH}/connection-pools/${id}`
    );
    return response.data;
  },

  /**
   * Create a new connection pool
   */
  create: async (data: ConnectionPoolCreateRequest): Promise<ConnectionPool> => {
    const response = await apiClient.post<ConnectionPool>(
      `${BASE_PATH}/connection-pools`,
      data
    );
    return response.data;
  },

  /**
   * Update a connection pool
   */
  update: async (id: string, data: ConnectionPoolUpdateRequest): Promise<ConnectionPool> => {
    const response = await apiClient.patch<ConnectionPool>(
      `${BASE_PATH}/connection-pools/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a connection pool
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/connection-pools/${id}`);
  },
};
