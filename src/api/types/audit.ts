import { PaginatedResponse } from "./common";

// ============ AUDIT LOG ============
// Based on UI data from Audit.tsx

export type AuditAction =
  | "DATA_ACCESS"
  | "CONTRACT_SIGNED"
  | "DATASET_REGISTERED"
  | "DATA_TRANSFER"
  | "ACCESS_DENIED"
  | "POLICY_UPDATED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "CONFIG_CHANGED";

export type AuditStatus = "success" | "failed" | "warning";

export interface AuditLog {
  id: number;
  timestamp: string;
  action: AuditAction;
  actor: string;
  target: string;
  provider: string;
  purpose: string;
  status: AuditStatus;
  ipAddress: string;
  // Extended fields
  details?: Record<string, unknown>;
  userAgent?: string;
  sessionId?: string;
  domain_id?: string;
  created_at?: string;
}

export interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  action?: AuditAction;
  actor?: string;
  status?: AuditStatus;
  provider?: string;
}

export interface AuditStats {
  todayEvents: number;
  dataAccesses: number;
  transfers: number;
  deniedAttempts: number;
}

export type AuditLogListResponse = PaginatedResponse<AuditLog>;
export type AuditLogResponse = AuditLog;
