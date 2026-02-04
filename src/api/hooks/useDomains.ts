import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { domainsApi } from "../services";
import {
  DomainCreateRequest,
  DomainUpdateRequest,
  PaginationParams,
} from "../types";

// Query keys
export const domainKeys = {
  all: ["domains"] as const,
  lists: () => [...domainKeys.all, "list"] as const,
  list: (params?: PaginationParams) => [...domainKeys.lists(), params] as const,
  details: () => [...domainKeys.all, "detail"] as const,
  detail: (id: string) => [...domainKeys.details(), id] as const,
};

/**
 * Hook to fetch list of domains
 */
export function useDomains(params?: PaginationParams) {
  return useQuery({
    queryKey: domainKeys.list(params),
    queryFn: () => domainsApi.list(params),
  });
}

/**
 * Hook to fetch a single domain by ID
 */
export function useDomain(id: string) {
  return useQuery({
    queryKey: domainKeys.detail(id),
    queryFn: () => domainsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a new domain
 */
export function useCreateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DomainCreateRequest) => domainsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
    },
  });
}

/**
 * Hook to update a domain
 */
export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DomainUpdateRequest }) =>
      domainsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
      queryClient.invalidateQueries({ queryKey: domainKeys.detail(id) });
    },
  });
}

/**
 * Hook to delete a domain
 */
export function useDeleteDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => domainsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: domainKeys.lists() });
    },
  });
}
