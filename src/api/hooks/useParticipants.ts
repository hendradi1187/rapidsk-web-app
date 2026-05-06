import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { participantsApi, participantDomainsApi, connectionPoolsApi } from "../services";
import {
  ParticipantCreateRequest,
  ParticipantUpdateRequest,
  ParticipantDomainCreateRequest,
  ParticipantDomainUpdateRequest,
  ConnectionPoolCreateRequest,
  ConnectionPoolUpdateRequest,
  PaginationParams,
} from "../types";
import { useAuth } from "@/context/AuthContext";

// ============ PARTICIPANT KEYS ============

export const participantKeys = {
  all: ["participants"] as const,
  lists: () => [...participantKeys.all, "list"] as const,
  list: (params?: PaginationParams) => [...participantKeys.lists(), params] as const,
  details: () => [...participantKeys.all, "detail"] as const,
  detail: (id: string) => [...participantKeys.details(), id] as const,
};

export const connectionPoolKeys = {
  all: ["connectionPools"] as const,
  lists: () => [...connectionPoolKeys.all, "list"] as const,
  list: (params?: PaginationParams) => [...connectionPoolKeys.lists(), params] as const,
  details: () => [...connectionPoolKeys.all, "detail"] as const,
  detail: (id: string) => [...connectionPoolKeys.details(), id] as const,
};

export const participantDomainKeys = {
  all: ["participantDomains"] as const,
  lists: () => [...participantDomainKeys.all, "list"] as const,
  list: (participantId: string, params?: PaginationParams) =>
    [...participantDomainKeys.lists(), participantId, params] as const,
  details: () => [...participantDomainKeys.all, "detail"] as const,
  detail: (participantId: string, domainId: string) =>
    [...participantDomainKeys.details(), participantId, domainId] as const,
};

// ============ PARTICIPANT HOOKS ============

export function useParticipants(params?: PaginationParams) {
  return useQuery({
    queryKey: participantKeys.list(params),
    queryFn: () => participantsApi.list(params),
  });
}

export function useParticipant(id: string) {
  return useQuery({
    queryKey: participantKeys.detail(id),
    queryFn: () => participantsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ParticipantCreateRequest) => participantsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: participantKeys.lists() });
    },
  });
}

export function useUpdateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ParticipantUpdateRequest }) =>
      participantsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: participantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: participantKeys.detail(id) });
    },
  });
}

export function useDeleteParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => participantsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: participantKeys.lists() });
    },
  });
}

// ============ PARTICIPANT DOMAIN HOOKS ============

export function useParticipantDomains(participantId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: participantDomainKeys.list(participantId, params),
    queryFn: () => participantDomainsApi.list(participantId, params),
    enabled: !!participantId,
  });
}

export function useParticipantDomain(participantId: string, domainId: string) {
  return useQuery({
    queryKey: participantDomainKeys.detail(participantId, domainId),
    queryFn: () => participantDomainsApi.getById(participantId, domainId),
    enabled: !!participantId && !!domainId,
  });
}

export function useCreateParticipantDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      participantId,
      data,
    }: {
      participantId: string;
      data: ParticipantDomainCreateRequest;
    }) => participantDomainsApi.create(participantId, data),
    onSuccess: (_, { participantId }) => {
      queryClient.invalidateQueries({
        queryKey: participantDomainKeys.list(participantId),
      });
    },
  });
}

export function useUpdateParticipantDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      participantId,
      domainId,
      data,
    }: {
      participantId: string;
      domainId: string;
      data: ParticipantDomainUpdateRequest;
    }) => participantDomainsApi.update(participantId, domainId, data),
    onSuccess: (_, { participantId, domainId }) => {
      queryClient.invalidateQueries({
        queryKey: participantDomainKeys.list(participantId),
      });
      queryClient.invalidateQueries({
        queryKey: participantDomainKeys.detail(participantId, domainId),
      });
    },
  });
}

export function useDeleteParticipantDomain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ participantId, domainId }: { participantId: string; domainId: string }) =>
      participantDomainsApi.delete(participantId, domainId),
    onSuccess: (_, { participantId }) => {
      queryClient.invalidateQueries({
        queryKey: participantDomainKeys.list(participantId),
      });
    },
  });
}

// ============ CONNECTION POOL HOOKS ============

export function useConnectionPools(params?: PaginationParams) {
  return useQuery({
    queryKey: connectionPoolKeys.list(params),
    queryFn: () => connectionPoolsApi.list(params),
  });
}

export function useConnectionPool(id: string) {
  return useQuery({
    queryKey: connectionPoolKeys.detail(id),
    queryFn: () => connectionPoolsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateConnectionPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConnectionPoolCreateRequest) => connectionPoolsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionPoolKeys.lists() });
    },
  });
}

export function useUpdateConnectionPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConnectionPoolUpdateRequest }) =>
      connectionPoolsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: connectionPoolKeys.lists() });
      queryClient.invalidateQueries({ queryKey: connectionPoolKeys.detail(id) });
    },
  });
}

export function useDeleteConnectionPool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => connectionPoolsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionPoolKeys.lists() });
    },
  });
}

/**
 * Resolve the participant that best matches the authenticated session.
 *
 * @param params Pagination params for the underlying participants query
 * @param scopeOverride Force a specific participant scope. Use this when the
 *   page is provider-only (forceProvider) or consumer-only (forceConsumer)
 *   regardless of the logged-in role. Useful for SUPER_ADMIN inspecting
 *   provider/consumer pages.
 */
export function useCurrentSessionParticipant(
  params?: PaginationParams,
  scopeOverride?: "forceProvider" | "forceConsumer"
) {
  const { user, role } = useAuth();
  const query = useParticipants(params);

  const participant = useMemo(() => {
    const participants = query.data?.data ?? [];
    const scoped = participants.filter((candidate) => {
      if (scopeOverride === "forceProvider") return candidate.organization_type === "ENTERPRISE";
      if (scopeOverride === "forceConsumer") return candidate.organization_type !== "ENTERPRISE";
      if (role === "PROVIDER") return candidate.organization_type === "ENTERPRISE";
      if (role === "CONSUMER") return candidate.organization_type !== "ENTERPRISE";
      return true;
    });

    if (!scoped.length) return undefined;

    const email = user?.email?.toLowerCase();
    if (email) {
      const exact = scoped.find(
        (candidate) => candidate.contact_person?.email?.toLowerCase() === email
      );
      if (exact) return exact;
    }

    return scoped[0];
  }, [query.data?.data, role, user?.email, scopeOverride]);

  return {
    ...query,
    participant,
  };
}
