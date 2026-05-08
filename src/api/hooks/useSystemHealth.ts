import { useQuery } from "@tanstack/react-query";
import { systemApi } from "../services/system";

export const systemKeys = {
  all: ["system"] as const,
  health: () => [...systemKeys.all, "health"] as const,
};

export function useSystemHealth() {
  return useQuery({
    queryKey: systemKeys.health(),
    queryFn: () => systemApi.health(),
    refetchInterval: 30_000,        // poll tiap 30 detik
    refetchIntervalInBackground: false,
  });
}
