import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { datasetsApi } from "../services";
import {
  DatasetCreateRequest,
  DatasetUpdateRequest,
  PaginationParams,
} from "../types";

// Query keys
export const datasetKeys = {
  all: ["datasets"] as const,
  lists: () => [...datasetKeys.all, "list"] as const,
  list: (domainId: string, params?: PaginationParams) =>
    [...datasetKeys.lists(), domainId, params] as const,
  details: () => [...datasetKeys.all, "detail"] as const,
  detail: (domainId: string, id: string) =>
    [...datasetKeys.details(), domainId, id] as const,
};

/**
 * Hook to fetch list of datasets for a domain
 */
export function useDatasets(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: datasetKeys.list(domainId, params),
    queryFn: () => datasetsApi.list(domainId, params),
    enabled: !!domainId,
  });
}

/**
 * Hook to fetch a single dataset by ID
 */
export function useDataset(domainId: string, id: string) {
  return useQuery({
    queryKey: datasetKeys.detail(domainId, id),
    queryFn: () => datasetsApi.getById(domainId, id),
    enabled: !!domainId && !!id,
  });
}

/**
 * Hook to create a new dataset
 */
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: DatasetCreateRequest }) =>
      datasetsApi.create(domainId, data),
    onSuccess: (_, { domainId }) => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    },
  });
}

/**
 * Hook to update a dataset
 */
export function useUpdateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      domainId,
      id,
      data,
    }: {
      domainId: string;
      id: string;
      data: DatasetUpdateRequest;
    }) => datasetsApi.update(domainId, id, data),
    onSuccess: (_, { domainId, id }) => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
      queryClient.invalidateQueries({ queryKey: datasetKeys.detail(domainId, id) });
    },
  });
}

/**
 * Hook to delete a dataset
 */
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      datasetsApi.delete(domainId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.lists() });
    },
  });
}
