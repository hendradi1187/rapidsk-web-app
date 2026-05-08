import { useQuery } from "@tanstack/react-query";
import { auditApi } from "../services/audit";

export const auditKeys = {
  all: ["audit"] as const,
  list: () => [...auditKeys.all, "logs"] as const,
};

/**
 * Hook to fetch audit logs.
 * Plain array response (no pagination, no filter params di spec).
 */
export function useAuditLogs() {
  return useQuery({
    queryKey: auditKeys.list(),
    queryFn: () => auditApi.list(),
  });
}
