import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agreementsApi } from "../services/policy-contract";
import { useDomain } from "@/context/DomainContext";

export const agreementKeys = {
  all: ["agreements"] as const,
  list: (domainId?: string | null) => [...agreementKeys.all, "list", domainId] as const,
};

/** Daftar semua agreement di domain aktif (filter per-contract dilakukan di komponen). */
export function useAgreements() {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: agreementKeys.list(domainId),
    queryFn: () => agreementsApi.list(domainId!),
    enabled: !!domainId,
  });
}

/** Buat perjanjian formal untuk sebuah contract. */
export function useCreateAgreement() {
  const { domainId } = useDomain();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      contract_id: string;
      effective_from: string;
      effective_to: string;
    }) => agreementsApi.create(domainId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agreementKeys.all });
    },
  });
}
