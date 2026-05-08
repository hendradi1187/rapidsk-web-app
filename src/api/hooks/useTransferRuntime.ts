import { useQuery } from "@tanstack/react-query";
import { dataTransferRuntimeApi, transferProcessesApi } from "../services";
import type { PaginationParams } from "../types";

export const transferRuntimeKeys = {
  processes: (domainId: string, params?: PaginationParams) => ["transfer-processes", domainId, params] as const,
  process: (domainId: string, id: string) => ["transfer-process", domainId, id] as const,
  transfers: (domainId: string, transferProcessId: string, params?: PaginationParams) =>
    ["data-transfer-runtime", domainId, transferProcessId, params] as const,
};

export function useTransferProcessesHistory(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: transferRuntimeKeys.processes(domainId, params),
    queryFn: () => transferProcessesApi.history(domainId, params),
    enabled: !!domainId,
  });
}

export function useTransferProcessesActive(domainId: string, params?: PaginationParams) {
  return useQuery({
    queryKey: ["transfer-processes-active", domainId, params],
    queryFn: () => transferProcessesApi.active(domainId, params),
    enabled: !!domainId,
  });
}

export function useTransferProcess(domainId: string, id: string) {
  return useQuery({
    queryKey: transferRuntimeKeys.process(domainId, id),
    queryFn: () => transferProcessesApi.getById(domainId, id),
    enabled: !!domainId && !!id,
  });
}

export function useDataTransfersByProcess(
  domainId: string,
  transferProcessId: string,
  params?: PaginationParams
) {
  return useQuery({
    queryKey: transferRuntimeKeys.transfers(domainId, transferProcessId, params),
    queryFn: () => dataTransferRuntimeApi.listByTransferProcess(domainId, transferProcessId, params),
    enabled: !!domainId && !!transferProcessId,
  });
}
