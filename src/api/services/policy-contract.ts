import { apiClient } from "../client";
import {
  PaginationParams,
  DatasetPolicy,
  DatasetPolicyCreateRequest,
  DatasetPolicyUpdateRequest,
  DatasetPolicyListResponse,
  Contract,
  ContractCreateRequest,
  ContractUpdateRequest,
  ContractListResponse,
  ContractPolicy,
  ContractPolicyCreateRequest,
  ContractPolicyUpdateRequest,
  ContractPolicyListResponse,
  Agreement,
  AgreementCreateRequest,
  AgreementUpdateRequest,
  AgreementListResponse,
} from "../types";

const BASE_PATH = "/api/v1";

// ============ DATASET POLICIES ============

export const datasetPoliciesApi = {
  /**
   * List dataset policies for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<DatasetPolicyListResponse> => {
    const response = await apiClient.get<DatasetPolicyListResponse>(
      `${BASE_PATH}/${domainId}/dataset-policies`,
      { params }
    );
    return response.data;
  },

  /**
   * Get dataset policy by ID
   */
  getById: async (domainId: string, id: string): Promise<DatasetPolicy> => {
    const response = await apiClient.get<DatasetPolicy>(
      `${BASE_PATH}/${domainId}/dataset-policies/${id}`
    );
    return response.data;
  },

  /**
   * Create a new dataset policy
   */
  create: async (domainId: string, data: DatasetPolicyCreateRequest): Promise<DatasetPolicy> => {
    const response = await apiClient.post<DatasetPolicy>(
      `${BASE_PATH}/${domainId}/dataset-policies`,
      data
    );
    return response.data;
  },

  /**
   * Update a dataset policy
   */
  update: async (
    domainId: string,
    id: string,
    data: DatasetPolicyUpdateRequest
  ): Promise<DatasetPolicy> => {
    const response = await apiClient.patch<DatasetPolicy>(
      `${BASE_PATH}/${domainId}/dataset-policies/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a dataset policy
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/dataset-policies/${id}`);
  },
};

// ============ CONTRACTS ============

export const contractsApi = {
  /**
   * List contracts for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<ContractListResponse> => {
    const response = await apiClient.get<ContractListResponse>(
      `${BASE_PATH}/${domainId}/contracts`,
      { params }
    );
    return response.data;
  },

  /**
   * Get contract by ID
   */
  getById: async (domainId: string, id: string): Promise<Contract> => {
    const response = await apiClient.get<Contract>(
      `${BASE_PATH}/${domainId}/contracts/${id}`
    );
    return response.data;
  },

  /**
   * Create a new contract
   */
  create: async (domainId: string, data: ContractCreateRequest): Promise<Contract> => {
    const response = await apiClient.post<Contract>(
      `${BASE_PATH}/${domainId}/contracts`,
      data
    );
    return response.data;
  },

  /**
   * Update a contract
   */
  update: async (domainId: string, id: string, data: ContractUpdateRequest): Promise<Contract> => {
    const response = await apiClient.patch<Contract>(
      `${BASE_PATH}/${domainId}/contracts/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a contract
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/contracts/${id}`);
  },
};

// ============ CONTRACT POLICIES ============

export const contractPoliciesApi = {
  /**
   * List contract policies for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<ContractPolicyListResponse> => {
    const response = await apiClient.get<ContractPolicyListResponse>(
      `${BASE_PATH}/${domainId}/contract-policies`,
      { params }
    );
    return response.data;
  },

  /**
   * Get contract policy by ID
   */
  getById: async (domainId: string, id: string): Promise<ContractPolicy> => {
    const response = await apiClient.get<ContractPolicy>(
      `${BASE_PATH}/${domainId}/contract-policies/${id}`
    );
    return response.data;
  },

  /**
   * Create a new contract policy
   */
  create: async (domainId: string, data: ContractPolicyCreateRequest): Promise<ContractPolicy> => {
    const response = await apiClient.post<ContractPolicy>(
      `${BASE_PATH}/${domainId}/contract-policiess`, // Note: typo in the actual API endpoint
      data
    );
    return response.data;
  },

  /**
   * Update a contract policy
   */
  update: async (
    domainId: string,
    id: string,
    data: ContractPolicyUpdateRequest
  ): Promise<ContractPolicy> => {
    const response = await apiClient.patch<ContractPolicy>(
      `${BASE_PATH}/${domainId}/contract-policies/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a contract policy
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/contract-policies/${id}`);
  },
};

// ============ AGREEMENTS ============

export const agreementsApi = {
  /**
   * List agreements for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<AgreementListResponse> => {
    const response = await apiClient.get<AgreementListResponse>(
      `${BASE_PATH}/${domainId}/agreements`,
      { params }
    );
    return response.data;
  },

  /**
   * Get agreement by ID
   */
  getById: async (domainId: string, id: string): Promise<Agreement> => {
    const response = await apiClient.get<Agreement>(
      `${BASE_PATH}/${domainId}/agreements/${id}`
    );
    return response.data;
  },

  /**
   * Create a new agreement
   */
  create: async (domainId: string, data: AgreementCreateRequest): Promise<Agreement> => {
    const response = await apiClient.post<Agreement>(
      `${BASE_PATH}/${domainId}/agreements`,
      data
    );
    return response.data;
  },

  /**
   * Update an agreement
   */
  update: async (domainId: string, id: string, data: AgreementUpdateRequest): Promise<Agreement> => {
    const response = await apiClient.patch<Agreement>(
      `${BASE_PATH}/${domainId}/agreements/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an agreement
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/agreements/${id}`);
  },
};
