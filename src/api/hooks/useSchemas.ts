import { useQuery } from "@tanstack/react-query";
import { schemasApi } from "../services/schemas";

export const schemaKeys = {
  all: ["schemas"] as const,
  list: () => [...schemaKeys.all, "list"] as const,
};

export function useSchemas() {
  return useQuery({
    queryKey: schemaKeys.list(),
    queryFn: () => schemasApi.list(),
  });
}
