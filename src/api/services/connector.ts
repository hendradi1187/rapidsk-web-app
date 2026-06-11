/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";

// Connector transfer (read-only). BE: GET /connector/{domainId}/transfers → array.
export interface TransferItem {
  id: string;
  domain_id: string;
  agreement_id: string;
  dataset_id: string;
  status: string; // INITIATED | TRANSFERRING | COMPLETED | FAILED | PAUSED
  total_size?: number | null;
  transferred_size?: number;
  checksum_sha256?: string | null; // integritas data (diisi saat COMPLETED)
  record_count?: number | null; // jumlah fitur/record (best-effort)
  error_message?: string | null;
}

export type TransferMode = "direct" | "persistent";

export const transfersApi = {
  list: async (domainId: string): Promise<TransferItem[]> => {
    if (!domainId) return [];
    const res = await apiClient.get(`/connector/${domainId}/transfers`);
    const data = (res?.data?.data ?? res?.data ?? []) as any[];
    return data.map((t) => ({
      id: t.id,
      domain_id: t.domain_id,
      agreement_id: t.agreement_id,
      dataset_id: t.dataset_id,
      status: t.status,
      total_size: t.total_size,
      transferred_size: t.transferred_size,
      checksum_sha256: t.checksum_sha256,
      record_count: t.record_count,
      error_message: t.error_message,
    }));
  },

  // Mulai proses transfer: buat transfer process (INITIATED).
  initiate: async (body: {
    domain_id: string;
    agreement_id: string;
    dataset_id: string;
  }): Promise<{ transfer_process_id: string; status?: string }> => {
    const res = await apiClient.post(`/connector/initiate`, body);
    const d = res?.data ?? {};
    return {
      transfer_process_id: d.transfer_process_id ?? d.id,
      status: d.status,
    };
  },

  // Jalankan pemindahan data (direct).
  startDirect: async (transferProcessId: string): Promise<void> => {
    await apiClient.post(`/connector/transfers/direct/${transferProcessId}/start`);
  },

  // Jalankan pemindahan data (persistent).
  startPersistent: async (transferProcessId: string): Promise<void> => {
    await apiClient.post(`/connector/transfers/persistent/${transferProcessId}/start`);
  },

  // Download data persistent.
  downloadPersistent: async (
    transferProcessId: string,
  ): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get(
      `/connector/transfers/persistent/${transferProcessId}/download`,
      { responseType: "blob" },
    );
    const disposition = String(res.headers["content-disposition"] ?? "");
    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
    return {
      blob: res.data as Blob,
      filename: filenameMatch?.[1] ?? `transfer-${transferProcessId}.bin`,
    };
  },

  // Status satu transfer.
  status: async (transferProcessId: string): Promise<TransferItem> => {
    const res = await apiClient.get(`/connector/${transferProcessId}/status`);
    return res.data as TransferItem;
  },
};
