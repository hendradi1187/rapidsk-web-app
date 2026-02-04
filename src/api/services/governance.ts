import { apiClient } from "../client";
import {
  Organization,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
  OrganizationListResponse,
  Domain,
  DomainCreateRequest,
  DomainUpdateRequest,
  DomainListResponse,
  PaginationParams,
} from "../types";

const BASE_PATH = "/api/v1/governance";

// ============ ORGANIZATIONS ============

export const organizationsApi = {
  /**
   * List all organizations
   */
  list: async (params?: PaginationParams): Promise<OrganizationListResponse> => {
    const response = await apiClient.get<OrganizationListResponse>(
      `${BASE_PATH}/organizations/`,
      { params }
    );
    return response.data;
  },

  /**
   * Get organization by ID
   */
  getById: async (id: string): Promise<Organization> => {
    const response = await apiClient.get<Organization>(
      `${BASE_PATH}/organizations/${id}`
    );
    return response.data;
  },

  /**
   * Create a new organization
   */
  create: async (data: OrganizationCreateRequest): Promise<Organization> => {
    const response = await apiClient.post<Organization>(
      `${BASE_PATH}/organizations/`,
      data
    );
    return response.data;
  },

  /**
   * Update an organization
   */
  update: async (id: string, data: OrganizationUpdateRequest): Promise<Organization> => {
    const response = await apiClient.patch<Organization>(
      `${BASE_PATH}/organizations/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an organization
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/organizations/organizations/${id}`);
  },
};

// ============ DOMAINS ============

export const domainsApi = {
  /**
   * List all domains
   */
  list: async (params?: PaginationParams): Promise<DomainListResponse> => {
    const response = await apiClient.get<DomainListResponse>(
      `${BASE_PATH}/domains/`,
      { params }
    );
    return response.data;
  },

  /**
   * Get domain by ID
   */
  getById: async (id: string): Promise<Domain> => {
    const response = await apiClient.get<Domain>(`${BASE_PATH}/domains/${id}`);
    return response.data;
  },

  /**
   * Create a new domain
   */
  create: async (data: DomainCreateRequest): Promise<Domain> => {
    const response = await apiClient.post<Domain>(
      `${BASE_PATH}/domains/`,
      data
    );
    return response.data;
  },

  /**
   * Update a domain
   */
  update: async (id: string, data: DomainUpdateRequest): Promise<Domain> => {
    const response = await apiClient.patch<Domain>(
      `${BASE_PATH}/domains/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a domain
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/domains/domains/${id}`);
  },
};
