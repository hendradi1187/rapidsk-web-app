import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { participantsApi, connectionPoolsApi } from "../services";
import {
  ParticipantCreateRequest,
  ParticipantUpdateRequest,
  ConnectionPoolCreateRequest,
  ConnectionPoolUpdateRequest,
  PaginationParams,
} from "../types";

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
