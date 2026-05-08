import { useQuery } from "@tanstack/react-query";
import { vocabulariesApi } from "../services/vocabularies";

export const vocabularyKeys = {
  all: ["vocabularies"] as const,
  list: () => [...vocabularyKeys.all, "list"] as const,
};

export function useVocabularies() {
  return useQuery({
    queryKey: vocabularyKeys.list(),
    queryFn: () => vocabulariesApi.list(),
  });
}
