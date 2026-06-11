import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { connectionPoolsApi } from "../services/governance";
import type {
  ConnectionPoolCreateRequest,
  ConnectionPoolUpdateRequest,
} from "../types/governance";

export const connectionPoolKeys = {
  all: ["connection-pools"] as const,
  list: () => [...connectionPoolKeys.all, "list"] as const,
};

export function useConnectionPools() {
  return useQuery({
    queryKey: connectionPoolKeys.list(),
    queryFn: () => connectionPoolsApi.list(),
  });
}

export function useCreateConnectionPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConnectionPoolCreateRequest) => connectionPoolsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connectionPoolKeys.all });
    },
  });
}

export function useUpdateConnectionPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: ConnectionPoolUpdateRequest }) =>
      connectionPoolsApi.update(vars.id, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connectionPoolKeys.all });
    },
  });
}

export function useDeleteConnectionPool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => connectionPoolsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: connectionPoolKeys.all });
    },
  });
}
