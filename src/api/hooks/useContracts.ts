import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractsApi } from "../services/policy-contract";
import { useDomain } from "@/context/DomainContext";

export const contractKeys = {
  all: ["contracts"] as const,
  list: (domainId?: string | null) => [...contractKeys.all, "list", domainId] as const,
};

export function useContracts() {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: contractKeys.list(domainId),
    queryFn: () => contractsApi.list(domainId!),
    enabled: !!domainId,
  });
}

/** Mutasi buat kontrak baru (consumer mengajukan permintaan → REQUESTED). */
export function useCreateContract() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      consumer_id: string;
      provider_id: string;
      name: string;
      description: string;
      datasets?: { dataset_id: string; dataset_policy_id?: string }[];
    }) => contractsApi.create(domainId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

/** Mutasi edit nama/deskripsi/dataset tertaut kontrak — bisa dipakai di status apapun. */
export function useUpdateContract() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      contract: { id: string; consumer_id: string; provider_id: string };
      body: {
        name: string;
        description?: string;
        datasets?: { dataset_id: string; dataset_policy_id?: string }[];
      };
    }) => contractsApi.update(domainId!, vars.contract, vars.body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}

/** Mutasi ubah status kontrak (approve/reject/activate). Tulis nyata ke BE. */
export function useUpdateContractStatus() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: {
      contract: { id: string; consumer_id?: string; provider_id?: string; name: string };
      status: "APPROVED" | "REJECTED" | "ACTIVE";
    }) => contractsApi.updateStatus(domainId!, vars.contract, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: contractKeys.all });
    },
  });
}
