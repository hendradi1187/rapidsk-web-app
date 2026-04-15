import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agreementsApi } from "../services/policy-contract";
import type { PaginationParams, AgreementCreateRequest, AgreementUpdateRequest } from "../types";
import { toast } from "sonner";

const AGREEMENT_QUERY_KEY = "agreements";

export const useAgreements = (domainId: string, params: PaginationParams = {}) => {
  return useQuery({
    queryKey: [AGREEMENT_QUERY_KEY, domainId, params],
    queryFn: () => agreementsApi.list(domainId, params),
    enabled: !!domainId,
  });
};

export const useAgreement = (domainId: string, id: string | null) => {
  return useQuery({
    queryKey: [AGREEMENT_QUERY_KEY, domainId, id],
    queryFn: () => agreementsApi.getById(domainId, id!),
    enabled: !!domainId && !!id,
  });
};

export const useCreateAgreement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, data }: { domainId: string; data: AgreementCreateRequest }) =>
      agreementsApi.create(domainId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [AGREEMENT_QUERY_KEY, variables.domainId] });
      toast.success("Agreement created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create agreement", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

export const useUpdateAgreement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, id, data }: { domainId: string; id: string; data: AgreementUpdateRequest }) =>
      agreementsApi.update(domainId, id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [AGREEMENT_QUERY_KEY, variables.domainId] });
      toast.success("Agreement updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update agreement", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

export const useDeleteAgreement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ domainId, id }: { domainId: string; id: string }) =>
      agreementsApi.delete(domainId, id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [AGREEMENT_QUERY_KEY, variables.domainId] });
      toast.success("Agreement deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete agreement", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};
