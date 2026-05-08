import { useQuery } from "@tanstack/react-query";
import { policiesApi } from "../services/governance";

export const policyKeys = {
  all: ["policies"] as const,
  list: () => [...policyKeys.all, "list"] as const,
};

export function usePolicies() {
  return useQuery({
    queryKey: policyKeys.list(),
    queryFn: () => policiesApi.list(),
  });
}
