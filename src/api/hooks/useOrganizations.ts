import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi } from "../services/governance";
import type { OrganizationCreateRequest } from "../types/governance";

// Query keys
export const organizationKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationKeys.all, "list"] as const,
};

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
