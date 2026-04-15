import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { connectionPoolsApi } from "../services/onboarding";
import type { PaginationParams, ConnectionPoolCreateRequest, ConnectionPoolUpdateRequest } from "../types";
import { toast } from "sonner";

const CONNECTION_POOL_QUERY_KEY = "connection_pools";

export const useConnectionPools = (params: PaginationParams = {}) => {
  return useQuery({
    queryKey: [CONNECTION_POOL_QUERY_KEY, params],
    queryFn: () => connectionPoolsApi.list(params),
  });
};

export const useCreateConnectionPool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ConnectionPoolCreateRequest) => connectionPoolsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONNECTION_POOL_QUERY_KEY] });
      toast.success("Connection pool created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create connection pool", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

export const useUpdateConnectionPool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConnectionPoolUpdateRequest }) =>
      connectionPoolsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONNECTION_POOL_QUERY_KEY] });
      toast.success("Connection pool updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update connection pool", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

export const useDeleteConnectionPool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => connectionPoolsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONNECTION_POOL_QUERY_KEY] });
      toast.success("Connection pool deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete connection pool", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};
