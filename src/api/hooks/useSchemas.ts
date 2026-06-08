import { useQuery } from "@tanstack/react-query";
import { schemasApi } from "../services/schemas";
import { useDomain } from "@/context/DomainContext";

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
