import { apiClient } from "../client";
import type {
  Organization,
  OrganizationCreateRequest,
  OrganizationListResponse,
  PolicyListResponse,
} from "../types/governance";

// rapiDSK Enterprise:
//   GET  /organizations           → Organization[]
//   POST /organizations           → Organization
//   GET  /governance/policies     → Policy[]

export const organizationsApi = {
  list: async (): Promise<OrganizationListResponse> => {
    const response = await apiClient.get<OrganizationListResponse>("/organizations");
    return response.data;
  },

  create: async (data: OrganizationCreateRequest): Promise<Organization> => {
    const response = await apiClient.post<Organization>("/organizations", data);
    return response.data;
  },
};

export const policiesApi = {
  list: async (): Promise<PolicyListResponse> => {
    const response = await apiClient.get<PolicyListResponse>("/governance/policies");
    return response.data;
  },
};
