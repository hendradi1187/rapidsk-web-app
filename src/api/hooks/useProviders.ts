import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { providersApi } from "../services/providers";
import type { ProviderCreateRequest, ProviderUpdateRequest } from "../types/providers";

export const providerKeys = {
  all: ["providers"] as const,
  list: () => [...providerKeys.all, "list"] as const,
  detail: (id: string) => [...providerKeys.all, "detail", id] as const,
  domains: (id: string) => [...providerKeys.all, "detail", id, "domains"] as const,
  adapters: (id: string) => [...providerKeys.all, "detail", id, "adapters"] as const,
};

export function useProviders() {
  return useQuery({
    queryKey: providerKeys.list(),
    queryFn: () => providersApi.list(),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: providerKeys.detail(id),
    queryFn: () => providersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProviderCreateRequest) => providersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ProviderUpdateRequest }) => providersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.list() });
      queryClient.invalidateQueries({ queryKey: providerKeys.detail(variables.id) });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => providersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: providerKeys.list() });
    },
  });
}

export function useParticipantDomains(participantId: string) {
  return useQuery({
    queryKey: providerKeys.domains(participantId),
    queryFn: () => providersApi.listDomains(participantId),
    enabled: !!participantId,
  });
}

export function useAddParticipantDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, body }: { participantId: string; body: { domain_id: string } }) =>
      providersApi.addDomain(participantId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.domains(variables.participantId) });
    },
  });
}

export function useUpdateParticipantDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, id, body }: { participantId: string; id: string; body: { domain_id: string } }) =>
      providersApi.updateDomain(participantId, id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.domains(variables.participantId) });
    },
  });
}

export function useDeleteParticipantDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, id }: { participantId: string; id: string }) =>
      providersApi.deleteDomain(participantId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.domains(variables.participantId) });
    },
  });
}

export function useParticipantAdapters(participantId: string) {
  return useQuery({
    queryKey: providerKeys.adapters(participantId),
    queryFn: () => providersApi.listAdapters(participantId),
    enabled: !!participantId,
  });
}

export function useAddParticipantAdapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, body }: { participantId: string; body: { domain_id: string; type: string; endpoint: Record<string, any> } }) =>
      providersApi.addAdapter(participantId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.adapters(variables.participantId) });
    },
  });
}

export function useUpdateParticipantAdapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, id, body }: { participantId: string; id: string; body: { domain_id: string; type: string; endpoint: Record<string, any> } }) =>
      providersApi.updateAdapter(participantId, id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.adapters(variables.participantId) });
    },
  });
}

export function useDeleteParticipantAdapter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ participantId, id }: { participantId: string; id: string }) =>
      providersApi.deleteAdapter(participantId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: providerKeys.adapters(variables.participantId) });
    },
  });
}
