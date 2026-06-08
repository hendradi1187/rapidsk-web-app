import { useQuery } from "@tanstack/react-query";
import { transfersApi } from "../services/connector";
import { useDomain } from "@/context/DomainContext";

export const transferKeys = {
  all: ["transfers"] as const,
  list: (domainId?: string | null) => [...transferKeys.all, "list", domainId] as const,
};

/** Daftar transfer process di domain aktif (untuk status "Terkirim" di matrix). */
export function useTransfers() {
  const { domainId } = useDomain();
  return useQuery({
    queryKey: transferKeys.list(domainId),
    queryFn: () => transfersApi.list(domainId!),
    enabled: !!domainId,
  });
}
