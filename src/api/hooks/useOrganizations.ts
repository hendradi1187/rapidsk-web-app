import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "../services/governance";
import type {
  OrganizationCreateRequest,
  OrganizationDomainCreateRequest,
  OrganizationDomainUpdateRequest,
  OrganizationUpdateRequest,
} from "../types/governance";

// Query keys
export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
  domains: (orgId?: string | null) =>
    [...organizationKeys.all, "domains", orgId] as const,
};

/**
 * Hook to fetch governance domains belonging to an organization.
 * GX-Space: GET /governance/organizations/{orgId}/domains
 */
export function useOrganizationDomains(orgId?: string | null) {
  return useQuery({
    queryKey: organizationKeys.domains(orgId),
    queryFn: () => organizationsApi.listDomains(orgId!),
    enabled: !!orgId,
  });
}

/**
 * Hook to fetch list of organizations.
 * rapiDSK Enterprise spec: plain array response, no pagination params.
 */
export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: () => organizationsApi.list(),
  });
}

/**
 * Domain milik SEMUA organisasi, digabung jadi satu list dengan label org.
 * Binding participant↔domain (`/onboarding/participants/{id}/domains`) tidak
 * peduli domain itu milik organisasi mana — jadi picker-nya juga tidak boleh
 * dibatasi ke satu organisasi (butuh ini untuk consumer lintas-KKKS seperti
 * SKK Migas yang mengikat domain milik organisasi provider lain).
 */
export function useAllOrganizationDomains() {
  const orgsQuery = useOrganizations();
  const orgIds = (orgsQuery.data ?? []).map((o: any) => o.organization_id).filter(Boolean);

  const domainsQuery = useQuery({
    queryKey: [...organizationKeys.all, "domains", "all", orgIds.slice().sort().join(",")],
    queryFn: () => organizationsApi.listDomainsMap(orgIds),
    enabled: orgIds.length > 0,
  });

  const orgNameById = new Map(
    (orgsQuery.data ?? []).map((o: any) => [o.organization_id, o.organization_name]),
  );

  const flat = Object.entries(domainsQuery.data ?? {}).flatMap(([organizationId, domains]) =>
    (domains ?? []).map((d) => ({
      ...d,
      organization_id: organizationId,
      organization_name: orgNameById.get(organizationId) ?? organizationId,
    })),
  );

  return {
    data: flat,
    isLoading: orgsQuery.isLoading || domainsQuery.isLoading,
  };
}

/**
 * Hook to create a new organization.
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrganizationCreateRequest) => organizationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrganizationUpdateRequest }) => 
      organizationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
}

export function useCreateOrganizationDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgId,
      data,
    }: {
      orgId: string;
      data: OrganizationDomainCreateRequest;
    }) => organizationsApi.createDomain(orgId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains(variables.orgId) });
    },
  });
}

export function useUpdateOrganizationDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgId,
      domainId,
      data,
    }: {
      orgId: string;
      domainId: string;
      data: OrganizationDomainUpdateRequest;
    }) => organizationsApi.updateDomain(orgId, domainId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains(variables.orgId) });
    },
  });
}

export function useDeleteOrganizationDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, domainId }: { orgId: string; domainId: string }) =>
      organizationsApi.removeDomain(orgId, domainId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains(variables.orgId) });
    },
  });
}
