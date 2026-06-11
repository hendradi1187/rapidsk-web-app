import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { schemasApi } from "../services/schemas";
import { useDomain } from "@/context/DomainContext";
import type { SchemaCreateRequest, SchemaUpdateRequest } from "../types/schemas";

export const schemaKeys = {
  all: ["schemas"] as const,
  list: (domainId?: string | null) => [...schemaKeys.all, "list", domainId] as const,
};

export function useSchemas() {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: schemaKeys.list(domainId),
    queryFn: () => schemasApi.list(domainId!),
    enabled: !!domainId,
  });
}

export function useCreateSchema() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SchemaCreateRequest) => schemasApi.create(domainId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schemaKeys.all });
    },
  });
}

export function useUpdateSchema() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: SchemaUpdateRequest }) =>
      schemasApi.update(domainId!, vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schemaKeys.all });
    },
  });
}

export function useDeleteSchema() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => schemasApi.remove(domainId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schemaKeys.all });
    },
  });
}
