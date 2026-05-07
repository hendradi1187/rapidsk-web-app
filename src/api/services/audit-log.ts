// src/api/services/audit-log.ts
// Backend tag: "Audit Compliance - Audit Logs". Read-only by design (append-only).

import { apiClient } from "../client";
import type { PaginationParams } from "../client";
import type { PaginatedResponse } from "../types/common";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor_id: string;
  action_type: string;
  resource_id: string;
  status: string;
  [key: string]: any;
}

export type AuditLogListResponse = PaginatedResponse<AuditLogEntry>;

const BASE = "/api/v1/audit-compliance";

export const auditLogsApi = {
  list: async (params?: PaginationParams): Promise<AuditLogListResponse> => {
    const res = await apiClient.get<AuditLogListResponse>(`${BASE}/audit-logs`, { params });
    return res.data;
  },
  getById: async (id: string): Promise<AuditLogEntry> => {
    const res = await apiClient.get<AuditLogEntry>(`${BASE}/audit-logs/${id}`);
    return res.data;
  },
};
