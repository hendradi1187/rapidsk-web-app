import { useQuery } from "@tanstack/react-query";
import { providersApi } from "../services/providers";

export const providerKeys = {
  all: ["providers"] as const,
  list: () => [...providerKeys.all, "list"] as const,
};

export function useProviders() {
  return useQuery({
    queryKey: providerKeys.list(),
    queryFn: () => providersApi.list(),
  });
}
