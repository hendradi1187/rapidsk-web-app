import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractsApi, contractPoliciesApi, agreementsApi } from "../services";
import {
  ContractCreateRequest,
  ContractUpdateRequest,
  ContractPolicyCreateRequest,
  ContractPolicyUpdateRequest,
  AgreementCreateRequest,
  AgreementUpdateRequest,
  PaginationParams,
} from "../types";

// ============ CONTRACT KEYS ============

export const contractKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractKeys.all, "list"] as const,
  list: (domainId: string, params?: PaginationParams) =>
    [...contractKeys.lists(), domainId, params] as const,
  details: () => [...contractKeys.all, "detail"] as const,
  detail: (domainId: string, id: string) =>
    [...contractKeys.details(), domainId, id] as const,
};

export const contractPolicyKeys = {
  all: ["contractPolicies"] as const,
  lists: () => [...contractPolicyKeys.all, "list"] as const,
  list: (domainId: string, params?: PaginationParams) =>
    [...contractPolicyKeys.lists(), domainId, params] as const,
  details: () => [...contractPolicyKeys.all, "detail"] as const,
  detail: (domainId: string, id: string) =>
    [...contractPolicyKeys.details(), domainId, id] as const,
};

export const agreementKeys = {
  all: ["agreements"] as const,
  lists: () => [...agreementKeys.all, "list"] as const,
  list: (domainId: string, params?: PaginationParams) =>
    [...agreementKeys.lists(), domainId, params] as const,
  details: () => [...agreementKeys.all, "detail"] as const,
  detail: (domainId: string, id: string) =>
    [...agreementKeys.details(), domainId, id] as const,
};

// ============ CONTRACT HOOKS ============

export function useContracts(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: contractKeys.list(domainId, params),
    queryFn: () => contractsApi.list(domainId, params),
    enabled: !!domainId,
  });
}

export function useContract(domainId: string, id: string) {
  return useQuery({
    queryKey: contractKeys.detail(domainId, id),
    queryFn: () => contractsApi.getById(domainId, id),
    enabled: !!domainId && !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: ContractCreateRequest }) =>
      contractsApi.create(domainId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: ContractUpdateRequest;
    }) => contractsApi.update(domainId, id, data),
    onSuccess: (_, { domainId, id }) => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractKeys.detail(domainId, id) });
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      contractsApi.delete(domainId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

// ============ CONTRACT POLICY HOOKS ============

export function useContractPolicies(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: contractPolicyKeys.list(domainId, params),
    queryFn: () => contractPoliciesApi.list(domainId, params),
    enabled: !!domainId,
  });
}

export function useContractPolicy(domainId: string, id: string) {
  return useQuery({
    queryKey: contractPolicyKeys.detail(domainId, id),
    queryFn: () => contractPoliciesApi.getById(domainId, id),
    enabled: !!domainId && !!id,
  });
}

export function useCreateContractPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: ContractPolicyCreateRequest }) =>
      contractPoliciesApi.create(domainId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractPolicyKeys.lists() });
    },
  });
}

export function useUpdateContractPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: ContractPolicyUpdateRequest;
    }) => contractPoliciesApi.update(domainId, id, data),
    onSuccess: (_, { domainId, id }) => {
      queryClient.invalidateQueries({ queryKey: contractPolicyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contractPolicyKeys.detail(domainId, id) });
    },
  });
}

export function useDeleteContractPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      contractPoliciesApi.delete(domainId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractPolicyKeys.lists() });
    },
  });
}

// ============ AGREEMENT HOOKS ============

export function useAgreements(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: agreementKeys.list(domainId, params),
    queryFn: () => agreementsApi.list(domainId, params),
    enabled: !!domainId,
  });
}

export function useAgreement(domainId: string, id: string) {
  return useQuery({
    queryKey: agreementKeys.detail(domainId, id),
    queryFn: () => agreementsApi.getById(domainId, id),
    enabled: !!domainId && !!id,
  });
}

export function useCreateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: AgreementCreateRequest }) =>
      agreementsApi.create(domainId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
    },
  });
}

export function useUpdateAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: AgreementUpdateRequest;
    }) => agreementsApi.update(domainId, id, data),
    onSuccess: (_, { domainId, id }) => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
      queryClient.invalidateQueries({ queryKey: agreementKeys.detail(domainId, id) });
    },
  });
}

export function useDeleteAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      agreementsApi.delete(domainId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agreementKeys.lists() });
    },
  });
}
