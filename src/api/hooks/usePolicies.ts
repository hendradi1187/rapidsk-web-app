import { useQuery } from "@tanstack/react-query";
import { policiesApi } from "../services/governance";
import { useDomain } from "@/context/DomainContext";

export const policyKeys = {
  all: ["policies"] as const,
  list: (domainId?: string | null) => [...policyKeys.all, "list", domainId] as const,
};

export function usePolicies() {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: policyKeys.list(domainId),
    queryFn: () => policiesApi.list(domainId!),
    enabled: !!domainId,
  });
}
