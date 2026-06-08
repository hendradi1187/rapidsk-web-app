import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { datasetsApi } from "../services/data-catalog";
import type { DatasetCreateRequest } from "../types/data-catalog";
import { useDomain } from "@/context/DomainContext";

export const datasetKeys = {
  all: ["datasets"] as const,
  list: (domainId?: string | null) => [...datasetKeys.all, "list", domainId] as const,
  details: () => [...datasetKeys.all, "detail"] as const,
  detail: (id: string) => [...datasetKeys.details(), id] as const,
};

/** List datasets (domain-scoped GX-Space). */
export function useDatasets() {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: datasetKeys.list(domainId),
    queryFn: () => datasetsApi.list(domainId!),
    enabled: !!domainId,
  });
}

/** Single dataset by ID. */
export function useDataset(id: string | null | undefined) {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: datasetKeys.detail(id ?? ""),
    queryFn: () => datasetsApi.getById(domainId!, id!),
    enabled: !!id && !!domainId,
  });
}

/** Create dataset (read-only iteration: dinonaktifkan). */
export function useCreateDataset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DatasetCreateRequest) => datasetsApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: datasetKeys.all }),
  });
}

/** Publish dataset (KKKS provider) → GX-Space POST datasets (status PUBLISHED). */
export function usePublishDataset() {
  const { domainId } = useDomain();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      provider_id: string;
      schema_id: string;
      name: string;
      version: string;
      domainKey: string;
      url: string;
      protocol: string;
      classification: string;
    }) => datasetsApi.publish(domainId!, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: datasetKeys.all }),
  });
}
