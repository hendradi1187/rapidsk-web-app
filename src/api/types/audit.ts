// ============ AUDIT LOG ============
// Based on rapiDSK Enterprise OpenAPI spec /audit/logs
//
// Spec sangat minim — hanya 4 field. Backend mungkin extend di masa depan
// dengan target/purpose/ip_address/session_id/details. Frontend siap menerima
// extra field opsional (lihat Q-E, Q-F di plan doc).

export interface AuditLog {
  audit_id: string;
  action: string;             // Free string per spec; kemungkinan enum di backend (Q-E)
  performed_by: string;
  timestamp: string;          // ISO 8601 date-time

  // Reserved untuk future extension oleh backend (Q-F):
  target?: string;
  purpose?: string;
  status?: string;
  ip_address?: string;
  session_id?: string;
  details?: string;
}

/**
 * `GET /audit/logs` returns plain `AuditLog[]` (no pagination wrapper di spec).
 */
export type AuditLogListResponse = AuditLog[];
