import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { monitoringApi } from "../services";
import {
  MonitoringCreateRequest,
  MonitoringUpdateRequest,
  PaginationParams,
} from "../types";

export const monitoringKeys = {
  all: ["monitorings"] as const,
  lists: () => [...monitoringKeys.all, "list"] as const,
  list: (domainId: string, params?: PaginationParams) =>
    [...monitoringKeys.lists(), domainId, params] as const,
  details: () => [...monitoringKeys.all, "detail"] as const,
  detail: (domainId: string, id: string) =>
    [...monitoringKeys.details(), domainId, id] as const,
};

export function useMonitorings(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: monitoringKeys.list(domainId, params),
    queryFn: () => monitoringApi.list(domainId, params),
    enabled: !!domainId,
  });
}

export function useMonitoring(domainId: string, id: string) {
  return useQuery({
    queryKey: monitoringKeys.detail(domainId, id),
    queryFn: () => monitoringApi.getById(domainId, id),
    enabled: !!domainId && !!id,
  });
}

export function useCreateMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: MonitoringCreateRequest }) =>
      monitoringApi.create(domainId, data),
    onSuccess: (_, { domainId }) => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.list(domainId) });
    },
  });
}

export function useUpdateMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: MonitoringUpdateRequest;
    }) => monitoringApi.update(domainId, id, data),
    onSuccess: (_, { domainId, id }) => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.list(domainId) });
      queryClient.invalidateQueries({ queryKey: monitoringKeys.detail(domainId, id) });
    },
  });
}

export function useDeleteMonitoring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      monitoringApi.delete(domainId, id),
    onSuccess: (_, { domainId }) => {
      queryClient.invalidateQueries({ queryKey: monitoringKeys.list(domainId) });
    },
  });
}
