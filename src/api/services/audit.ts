/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient as apiClient } from "../clients";
import type { AuditLogListResponse } from "../types/audit";

// GX-Space audit-logs (hash-chain: prev_hash/entry_hash).
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export const auditApi = {
  list: async (): Promise<AuditLogListResponse> => {
    const res = await ctsClient.get("/audit-compliance/audit-logs");
    return unwrap(res).map((a: any) => ({
      audit_id: a.id,
      action: a.action ?? a.event_type ?? a.operation ?? a.activity ?? "—",
      session_id: a.session_id ?? a.user_id ?? a.created_by ?? "—",
      timestamp: a.created_at ?? a.timestamp ?? a.checked_at ?? null,
      prev_hash: a.prev_hash,
      entry_hash: a.entry_hash,
      ...a,
    })) as unknown as AuditLogListResponse;
  },
};
