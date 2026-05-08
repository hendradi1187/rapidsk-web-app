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
      // Backend caps limit at 100 — paginate through all orgs.
      const PAGE = 100;
      const organizations: Array<{ id: string; name?: string; code?: string }> = [];
      const orgsSeen = new Set<string>();
      let offsetOrg = 0;
      for (let i = 0; i < 50; i += 1) {
        const page = await organizationsApi.list({ limit: PAGE, offset: offsetOrg }).catch(() => ({ data: [], total: 0 }));
        const items = page.data || [];
        // Dedupe by id — backend may ignore offset and return same page.
        const fresh = items.filter((o: any) => o?.id && !orgsSeen.has(o.id));
        fresh.forEach((o: any) => orgsSeen.add(o.id));
        organizations.push(...fresh);
        // Stop if backend returned a partial page OR offset is being ignored (no new items).
        if (items.length < PAGE || fresh.length === 0) break;
        offsetOrg += PAGE;
      }

      if (organizations.length === 0) {
        return { data: [], total: 0, limit: params?.limit || 1000, offset: params?.offset || 0 };
      }

      // Fetch domains per org — also capped at 100 by backend, paginate too.
      const orgById = new Map(organizations.map((o) => [o.id, o]));
      const domainPromises = organizations.map(async (org) => {
        const all: any[] = [];
        const seen = new Set<string>();
        let off = 0;
        for (let i = 0; i < 50; i += 1) {
          const page = await domainsApi.list(org.id, { limit: PAGE, offset: off }).catch(() => ({ data: [], total: 0 }));
          const items = page.data || [];
          const fresh = items.filter((d: any) => d?.id && !seen.has(d.id));
          fresh.forEach((d: any) => seen.add(d.id));
          all.push(...fresh);
          if (items.length < PAGE || fresh.length === 0) break;
          off += PAGE;
        }
        return { data: all, total: all.length };
      });
      const domainResults = await Promise.all(domainPromises);

      // Combine all domains, dedupe across orgs, attach org_name for display.
      const seenDomain = new Set<string>();
      const allDomains: any[] = [];
      domainResults.flatMap((result) => result.data || []).forEach((d: any) => {
        if (!d?.id || seenDomain.has(d.id)) return;
        seenDomain.add(d.id);
        const org = orgById.get(d.organization_id);
        allDomains.push({ ...d, organization_name: org?.name, organization_code: org?.code });
      });
      const totalDomains = allDomains.length;

      // Default limit is now 1000 (basically "all" for typical deployments).
      // Caller can still override with smaller limit if they want.
      const offset = params?.offset || 0;
      const limit = params?.limit || 1000;
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
