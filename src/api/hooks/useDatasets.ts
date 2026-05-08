import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { datasetsApi } from "../services/data-catalog";
import type { DatasetCreateRequest } from "../types/data-catalog";

// Query keys
export const datasetKeys = {
  all: ["datasets"] as const,
  list: () => [...datasetKeys.all, "list"] as const,
  details: () => [...datasetKeys.all, "detail"] as const,
  detail: (id: string) => [...datasetKeys.details(), id] as const,
};

/**
 * Hook to fetch list of datasets.
 * Plain array response (no pagination, no domain dependency).
 */
export function useDatasets() {
  return useQuery({
    queryKey: datasetKeys.list(),
    queryFn: () => datasetsApi.list(),
  });
}

/**
 * Hook to fetch a single dataset by ID.
 */
export function useDataset(id: string | null | undefined) {
  return useQuery({
    queryKey: datasetKeys.detail(id ?? ""),
    queryFn: () => datasetsApi.getById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create a new dataset.
 */
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DatasetCreateRequest) => datasetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: datasetKeys.all });
    },
  });
}
