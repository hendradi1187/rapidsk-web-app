// src/api/services/audit-compliance.ts

import { apiClient } from "../client";
import type { PaginationParams } from "../client";
import type { PaginatedResponse } from "../types/common";

const BASE_PATH = "/api/v1/audit-compliance";

// ============ Types ============

export interface ComplianceControl {
  id: string;
  control_id: string;
  framework: string;
  name: string;
  description: string;
  version: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceControlCreateRequest {
  control_id: string;
  framework: string;
  name: string;
  description: string;
  version: string;
}

export interface ComplianceControlUpdateRequest {
  control_id?: string | null;
  framework?: string | null;
  name?: string | null;
  description?: string | null;
  version?: string | null;
  active?: boolean | null;
}

export interface ComplianceChecklist {
  id: string;
  participant_id: string;
  control_id: string;
  framework: string;
  control_name: string;
  status: string;
  evidence_ids: string[];
  notes: string | null;
  checked_at: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceChecklistCreateRequest {
  participant_id: string;
  control_id: string;
  framework: string;
  control_name: string;
  status: string;
  evidence_ids: string[];
  notes?: string | null;
  checked_at: string;
}

export interface ComplianceChecklistUpdateRequest {
  participant_id?: string | null;
  control_id?: string | null;
  framework?: string | null;
  control_name?: string | null;
  status?: string | null;
  evidence_ids?: string[] | null;
  notes?: string | null;
  checked_at?: string | null;
}

export type ComplianceControlListResponse = PaginatedResponse<ComplianceControl>;
export type ComplianceChecklistListResponse = PaginatedResponse<ComplianceChecklist>;

// ============ Services ============

export const complianceControlsApi = {
  list: async (params: PaginationParams = {}): Promise<ComplianceControlListResponse> => {
    const response = await apiClient.get<ComplianceControlListResponse>(
      `${BASE_PATH}/compliance-controls`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ComplianceControl> => {
    const response = await apiClient.get<ComplianceControl>(
      `${BASE_PATH}/compliance-controls/${id}`
    );
    return response.data;
  },

  create: async (data: ComplianceControlCreateRequest): Promise<ComplianceControl> => {
    const response = await apiClient.post<ComplianceControl>(
      `${BASE_PATH}/compliance-controls`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: ComplianceControlUpdateRequest): Promise<ComplianceControl> => {
    const response = await apiClient.patch<ComplianceControl>(
      `${BASE_PATH}/compliance-controls/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/compliance-controls/${id}`);
  },
};

export const complianceChecklistsApi = {
  list: async (params: PaginationParams = {}): Promise<ComplianceChecklistListResponse> => {
    const response = await apiClient.get<ComplianceChecklistListResponse>(
      `${BASE_PATH}/compliance-checklists`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ComplianceChecklist> => {
    const response = await apiClient.get<ComplianceChecklist>(
      `${BASE_PATH}/compliance-checklists/${id}`
    );
    return response.data;
  },

  create: async (data: ComplianceChecklistCreateRequest): Promise<ComplianceChecklist> => {
    const response = await apiClient.post<ComplianceChecklist>(
      `${BASE_PATH}/compliance-checklists`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: ComplianceChecklistUpdateRequest): Promise<ComplianceChecklist> => {
    const response = await apiClient.patch<ComplianceChecklist>(
      `${BASE_PATH}/compliance-checklists/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/compliance-checklists/${id}`);
  },
};

// Combined convenience export
export const auditComplianceService = {
  controls: complianceControlsApi,
  checklists: complianceChecklistsApi,
};
