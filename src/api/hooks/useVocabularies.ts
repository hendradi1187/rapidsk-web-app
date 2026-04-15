import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vocabulariesApi } from "../services/data-catalog";
import type { PaginationParams, VocabularyCreateRequest, VocabularyUpdateRequest } from "../types";
import { toast } from "sonner";

const VOCABULARY_QUERY_KEY = "vocabularies";

export const useVocabularies = (domainId: string, params: PaginationParams = {}) => {
  return useQuery({
    queryKey: [VOCABULARY_QUERY_KEY, domainId, params],
    queryFn: () => vocabulariesApi.list(domainId, params),
    enabled: !!domainId,
  });
};

export const useCreateVocabulary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: VocabularyCreateRequest }) =>
      vocabulariesApi.create(domainId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [VOCABULARY_QUERY_KEY, variables.domainId] });
      toast.success("Vocabulary created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create vocabulary", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

export const useUpdateVocabulary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, id, data }: { domainId: string; id: string; data: VocabularyUpdateRequest }) =>
      vocabulariesApi.update(domainId, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [VOCABULARY_QUERY_KEY, variables.domainId] });
      toast.success("Vocabulary updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update vocabulary", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

export const useDeleteVocabulary = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      vocabulariesApi.delete(domainId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [VOCABULARY_QUERY_KEY, variables.domainId] });
      toast.success("Vocabulary deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete vocabulary", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};
