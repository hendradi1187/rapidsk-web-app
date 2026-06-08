import { useQuery } from "@tanstack/react-query";
import { vocabulariesApi } from "../services/vocabularies";
import { useDomain } from "@/context/DomainContext";

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
