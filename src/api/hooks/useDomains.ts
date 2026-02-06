import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { domainsApi, organizationsApi } from "../services";
import {
  DomainCreateRequest,
  DomainUpdateRequest,
  DomainListResponse,
  PaginationParams,
} from "../types";

// Query keys
export const domainKeys = {
  all: ["domains"] as const,
  lists: () => [...domainKeys.all, "list"] as const,
  list: (organizationId: string, params?: PaginationParams) =>
    [...domainKeys.lists(), organizationId, params] as const,
  details: () => [...domainKeys.all, "detail"] as const,
  detail: (organizationId: string, id: string) =>
    [...domainKeys.details(), organizationId, id] as const,
};

/**
 * Hook to fetch list of domains for an organization
 */
export function useDomains(organizationId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: domainKeys.list(organizationId, params),
    queryFn: () => domainsApi.list(organizationId, params),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch a single domain by ID
 */
export function useDomain(organizationId: string, id: string) {
  return useQuery({
    queryKey: domainKeys.detail(organizationId, id),
    queryFn: () => domainsApi.getById(organizationId, id),
    enabled: !!organizationId && !!id,
  });
}

/**
 * Hook to create a new domain under an organization
 */
export function useCreateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      data,
    }: {
      organizationId: string;
      data: Omit<DomainCreateRequest, "organization_id">;
    }) => domainsApi.create(organizationId, data),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: domainKeys.list(organizationId),
      });
    },
  });
}

/**
 * Hook to update a domain
 */
export function useUpdateDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      id,
      data,
    }: {
      organizationId: string;
      id: string;
      data: DomainUpdateRequest;
    }) => domainsApi.update(organizationId, id, data),
    onSuccess: (_, { organizationId, id }) => {
      queryClient.invalidateQueries({
        queryKey: domainKeys.list(organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: domainKeys.detail(organizationId, id),
      });
    },
  });
}

/**
 * Hook to delete a domain
 */
export function useDeleteDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      organizationId,
      id,
    }: {
      organizationId: string;
      id: string;
    }) => domainsApi.delete(organizationId, id),
    onSuccess: (_, { organizationId }) => {
      queryClient.invalidateQueries({
        queryKey: domainKeys.list(organizationId),
      });
    },
  });
}

/**
 * Hook to fetch domains across all organizations
 * Fetches all orgs first, then fetches domains for each org
 */
export function useAllDomains(params?: PaginationParams) {
  return useQuery({
    queryKey: [...domainKeys.all, "all-orgs", params],
    queryFn: async (): Promise<DomainListResponse> => {
      // Fetch all organizations first
      const orgsResponse = await organizationsApi.list({ limit: 100 });
      const organizations = orgsResponse.data || [];

      if (organizations.length === 0) {
        return { data: [], total: 0, limit: params?.limit || 20, offset: params?.offset || 0 };
      }

      // Fetch domains for each organization in parallel
      const domainPromises = organizations.map((org) =>
        domainsApi.list(org.id, { limit: 100 }).catch(() => ({ data: [], total: 0 }))
      );
      const domainResults = await Promise.all(domainPromises);

      // Combine all domains
      const allDomains = domainResults.flatMap((result) => result.data || []);
      const totalDomains = domainResults.reduce((sum, result) => sum + (result.total || 0), 0);

      // Apply pagination if needed
      const offset = params?.offset || 0;
      const limit = params?.limit || 20;
      const paginatedDomains = allDomains.slice(offset, offset + limit);

      return {
        data: paginatedDomains,
        total: totalDomains,
        limit,
        offset,
      };
    },
  });
}
