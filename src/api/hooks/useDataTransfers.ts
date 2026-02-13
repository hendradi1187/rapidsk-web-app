import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dataTransfersApi } from "../services";
import {
  DataTransferCreateRequest,
  DataTransferUpdateRequest,
  PaginationParams,
} from "../types";

// Query keys
export const dataTransferKeys = {
  all: ["dataTransfers"] as const,
  lists: () => [...dataTransferKeys.all, "list"] as const,
  list: (domainId: string, params?: PaginationParams) =>
    [...dataTransferKeys.lists(), domainId, params] as const,
  details: () => [...dataTransferKeys.all, "detail"] as const,
  detail: (domainId: string, id: string) =>
    [...dataTransferKeys.details(), domainId, id] as const,
  stats: () => [...dataTransferKeys.all, "stats"] as const,
};

/**
 * Hook to fetch list of data transfers for a domain
 */
export function useDataTransfers(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: dataTransferKeys.list(domainId, params),
    queryFn: () => dataTransfersApi.list(domainId, params),
    enabled: !!domainId,
  });
}

/**
 * Hook to fetch a single data transfer by ID
 */
export function useDataTransfer(domainId: string, id: string) {
  return useQuery({
    queryKey: dataTransferKeys.detail(domainId, id),
    queryFn: () => dataTransfersApi.getById(domainId, id),
    enabled: !!domainId && !!id,
  });
}

/**
 * Hook to create a new data transfer
 */
export function useCreateDataTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: DataTransferCreateRequest }) =>
      dataTransfersApi.create(domainId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataTransferKeys.lists() });
    },
  });
}

/**
 * Hook to update a data transfer
 */
export function useUpdateDataTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: DataTransferUpdateRequest;
    }) => dataTransfersApi.update(domainId, id, data),
    onSuccess: (_, { domainId, id }) => {
      queryClient.invalidateQueries({ queryKey: dataTransferKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dataTransferKeys.detail(domainId, id) });
    },
  });
}

/**
 * Hook to delete a data transfer
 */
export function useDeleteDataTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      dataTransfersApi.delete(domainId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataTransferKeys.lists() });
    },
  });
}
