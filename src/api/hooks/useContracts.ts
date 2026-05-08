import { QueryClient, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractsApi, contractPoliciesApi, agreementsApi, datasetPoliciesApi } from "../services";
import {
  Contract,
  ContractCreateRequest,
  ContractUpdateRequest,
  ContractPolicyCreateRequest,
  ContractPolicyUpdateRequest,
  AgreementCreateRequest,
  AgreementUpdateRequest,
  DatasetPolicyCreateRequest,
  DatasetPolicyUpdateRequest,
  PaginationParams,
  mergeContractSnapshot,
} from "../types";

export const datasetPolicyKeys = {
  all: ["datasetPolicies"] as const,
  lists: () => [...datasetPolicyKeys.all, "list"] as const,
  list: (domainId: string, params?: PaginationParams) =>
    [...datasetPolicyKeys.lists(), domainId, params] as const,
};

export function useDatasetPolicies(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: datasetPolicyKeys.list(domainId, params),
    queryFn: () => datasetPoliciesApi.list(domainId, params),
    enabled: !!domainId,
  });
}

export function useCreateDatasetPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: DatasetPolicyCreateRequest }) =>
      datasetPoliciesApi.create(domainId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetPolicyKeys.lists() });
    },
  });
}

export function useUpdateDatasetPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: DatasetPolicyUpdateRequest;
    }) => datasetPoliciesApi.update(domainId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetPolicyKeys.lists() });
    },
  });
}

export function useDeleteDatasetPolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      datasetPoliciesApi.delete(domainId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetPolicyKeys.lists() });
    },
  });
}

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

function mergeContractIntoListCache(
  old: any,
  contract: Partial<Contract> | null | undefined,
  options?: { prepend?: boolean; authoritativeRelations?: boolean; authoritativeParties?: boolean }
) {
  if (!old || !contract?.id) return old;
  const prepend = options?.prepend ?? false;
  const rows = Array.isArray(old.data) ? old.data : [];
  const foundIndex = rows.findIndex((row: any) => row?.id === contract.id);

  if (foundIndex === -1) {
    if (!prepend) return old;
    const merged = mergeContractSnapshot(null, contract, options);
    if (!merged) return old;
    return {
      ...old,
      data: [merged, ...rows],
      total: typeof old.total === "number" ? old.total + 1 : old.total,
    };
  }

  return {
    ...old,
    data: rows.map((row: any, index: number) =>
      index === foundIndex ? mergeContractSnapshot(row, contract, options) ?? row : row
    ),
  };
}

export function seedContractSnapshot(
  queryClient: QueryClient,
  domainId: string,
  contract: Partial<Contract> | null | undefined,
  options?: { prepend?: boolean; authoritativeRelations?: boolean; authoritativeParties?: boolean }
) {
  if (!contract?.id) return null;
  const existingDetail = queryClient.getQueryData<Contract>(contractKeys.detail(domainId, contract.id));
  const merged = mergeContractSnapshot(existingDetail, contract, options);
  if (!merged) return null;

  queryClient.setQueryData(contractKeys.detail(domainId, contract.id), merged);
  queryClient.setQueriesData(
    { queryKey: contractKeys.lists() },
    (old: any) => mergeContractIntoListCache(old, merged, options)
  );

  return merged;
}

export async function hydrateContractSnapshot(
  queryClient: QueryClient,
  domainId: string,
  contract: Partial<Contract>,
  fetchDetail?: boolean
) {
  let merged = mergeContractSnapshot(
    queryClient.getQueryData<Contract>(contractKeys.detail(domainId, contract.id ?? "")),
    contract
  );

  const listCaches = queryClient.getQueriesData<any>({ queryKey: contractKeys.lists() });
  for (const [, cacheData] of listCaches) {
    const found = cacheData?.data?.find((row: any) => row?.id === contract.id);
    if (found) {
      merged = mergeContractSnapshot(merged, found);
    }
  }

  if (fetchDetail && contract.id) {
    const detail = await contractsApi.getById(domainId, contract.id);
    merged = mergeContractSnapshot(merged, detail);
  }

  if (!merged) return null;
  return seedContractSnapshot(queryClient, domainId, merged) ?? merged;
}

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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: contractKeys.list(domainId, params),
    queryFn: async () => {
      const fresh = await contractsApi.list(domainId, params);
      if (!fresh?.data) return fresh;
      return {
        ...fresh,
        data: fresh.data.map((c) => {
          const merged = seedContractSnapshot(queryClient, domainId, c);
          return merged ?? c;
        }),
      };
    },
    enabled: !!domainId,
  });
}

export function useContract(domainId: string, id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: contractKeys.detail(domainId, id),
    queryFn: async () => {
      const detail = await contractsApi.getById(domainId, id);
      return seedContractSnapshot(queryClient, domainId, detail) ?? detail;
    },
    enabled: !!domainId && !!id,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ domainId, data }: { domainId: string; data: ContractCreateRequest }) => {
      const created = await contractsApi.create(domainId, data);
      return mergeContractSnapshot(data as Partial<Contract>, created, {
        authoritativeRelations: true,
        authoritativeParties: true,
      }) ?? created;
    },
    onSuccess: (created, { domainId }) => {
      seedContractSnapshot(queryClient, domainId, created, {
        prepend: true,
        authoritativeRelations: true,
        authoritativeParties: true,
      });
      queryClient.invalidateQueries({ queryKey: contractKeys.lists() });
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: ContractUpdateRequest;
    }) => {
      const updated = await contractsApi.update(domainId, id, data);
      return (
        mergeContractSnapshot({ id, ...data } as Partial<Contract>, { id, ...updated }, {
          authoritativeRelations: true,
          authoritativeParties: true,
        }) ?? updated
      );
    },
    onSuccess: (updated, { domainId }) => {
      seedContractSnapshot(queryClient, domainId, updated, {
        authoritativeRelations: true,
        authoritativeParties: true,
      });
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
