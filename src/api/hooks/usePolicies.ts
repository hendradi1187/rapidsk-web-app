import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { policiesApi } from "../services/governance";
import { useDomain } from "@/context/DomainContext";
import type { PolicyCreateRequest, PolicyUpdateRequest } from "../types/governance";

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

export function useCreatePolicy() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PolicyCreateRequest) => policiesApi.create(domainId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}

export function useUpdatePolicy() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: PolicyUpdateRequest }) =>
      policiesApi.update(domainId!, vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}

export function useDeletePolicy() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policiesApi.remove(domainId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}
