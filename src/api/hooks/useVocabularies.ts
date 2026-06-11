import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vocabulariesApi } from "../services/vocabularies";
import { useDomain } from "@/context/DomainContext";
import type { VocabularyCreateRequest, VocabularyUpdateRequest } from "../types/vocabularies";

export const vocabularyKeys = {
  all: ["vocabularies"] as const,
  list: (domainId?: string | null) => [...vocabularyKeys.all, "list", domainId] as const,
};

export function useVocabularies() {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: vocabularyKeys.list(domainId),
    queryFn: () => vocabulariesApi.list(domainId!),
    enabled: !!domainId,
  });
}

export function useCreateVocabulary() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VocabularyCreateRequest) => vocabulariesApi.create(domainId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vocabularyKeys.all });
    },
  });
}

export function useUpdateVocabulary() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: VocabularyUpdateRequest }) =>
      vocabulariesApi.update(domainId!, vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vocabularyKeys.all });
    },
  });
}

export function useDeleteVocabulary() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vocabulariesApi.remove(domainId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: vocabularyKeys.all });
    },
  });
}
