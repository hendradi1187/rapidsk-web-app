import { apiClient } from "../client";
import type { AuditLogListResponse } from "../types/audit";

// Base path "/audit" — relative to VITE_API_BASE_URL (http://localhost:8000/api/v1).
//
// Per rapiDSK Enterprise spec:
//   GET /audit/logs   → AuditLog[]
//
// Spec tidak include filter/pagination params; backend mungkin extend.

export const auditApi = {
  /**
   * List audit logs.
   * Plain array response per spec.
   */
  list: async (): Promise<AuditLogListResponse> => {
    const response = await apiClient.get<AuditLogListResponse>("/audit/logs");
    return response.data;
  },
};
