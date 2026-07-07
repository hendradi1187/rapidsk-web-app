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
  bytes_transferred?: number;
  checksum_sha256?: string | null; // integritas data (diisi saat COMPLETED)
  record_count?: number | null; // jumlah fitur/record (best-effort)
  error_message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ConnectorHeartbeatItem {
  id: string;
  connector_id?: string | null;
  participant_id?: string | null;
  client_id: string;
  service_type: string;
  status: string;
  version?: string | null;
  instance_id?: string | null;
  metadata: Record<string, unknown>;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface TransferProjectionItem {
  id: string;
  transfer_process_id: string;
  transfer_id?: string | null;
  remote_transfer_process_id?: string | null;
  role: string;
  direction: string;
  mode?: string | null;
  status?: string | null;
  participant_id?: string | null;
  connector_id?: string | null;
  agreement_id?: string | null;
  contract_id?: string | null;
  domain_id?: string | null;
  dataset_id?: string | null;
  last_event_type: string;
  last_event_payload: Record<string, unknown>;
  last_event_at: string;
  updated_from_event_id: string;
  created_at: string;
  updated_at: string;
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
      bytes_transferred: t.bytes_transferred,
      checksum_sha256: t.checksum_sha256,
      record_count: t.record_count,
      error_message: t.error_message,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));
  },

  // Mulai proses transfer: buat transfer process (INITIATED).
  initiate: async (body: {
    domain_id: string;
    agreement_id: string;
    dataset_id: string;
  }): Promise<{ transfer_process_id: string; status?: string }> => {
    const res = await apiClient.post(`/connector/consumer/initiate`, body);
    const d = res?.data ?? {};
    return {
      transfer_process_id: d.transfer_process_id ?? d.id,
      status: d.status,
    };
  },

  providerInitiate: async (body: {
    domain_id: string;
    agreement_id: string;
    dataset_id: string;
    transfer_id: string;
    consumer_transfer_process_id: string;
    consumer_tier?: string | null;
  }): Promise<{
    transfer_process_id: string;
    remote_transfer_process_id: string;
    transfer_id: string;
    status: string;
  }> => {
    const res = await apiClient.post(`/connector/provider/initiate`, body);
    return res.data;
  },

  // Jalankan pemindahan data (direct). BE butuh body: domain_id, agreement_id, dataset_id.
  startDirect: async (
    transferProcessId: string,
    body: { domain_id: string; agreement_id: string; dataset_id: string; resume_from_byte?: number },
  ): Promise<void> => {
    await apiClient.post(`/connector/consumer/direct/${transferProcessId}/start`, body);
  },

  providerStartDirect: async (
    transferProcessId: string,
    body: {
      domain_id: string;
      agreement_id: string;
      dataset_id: string;
      transfer_process_id: string;
      resume_from_byte?: number;
      transfer_mode?: "direct_stream" | "persistent";
    },
  ): Promise<void> => {
    await apiClient.post(`/connector/provider/direct/${transferProcessId}/start`, body);
  },

  providerCheck: async (
    transferProcessId: string,
    body: {
      domain_id: string;
      agreement_id: string;
      dataset_id: string;
      transfer_process_id: string;
      resume_from_byte?: number;
      transfer_mode?: "direct_stream" | "persistent";
    },
  ): Promise<Record<string, unknown>> => {
    const res = await apiClient.post(`/connector/provider/${transferProcessId}/check`, body);
    return res.data;
  },

  // Jalankan pemindahan data (persistent). BE butuh body: domain_id, agreement_id, dataset_id.
  startPersistent: async (
    transferProcessId: string,
    body: { domain_id: string; agreement_id: string; dataset_id: string; resume_from_byte?: number },
  ): Promise<void> => {
    await apiClient.post(`/connector/consumer/persistent/${transferProcessId}/start`, body);
  },

  // Download data persistent.
  downloadPersistent: async (
    transferProcessId: string,
    body: { domain_id: string; agreement_id: string; dataset_id: string },
  ): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get(
      `/connector/consumer/persistent/${transferProcessId}/download/${body.domain_id}/domain/${body.agreement_id}/agreement/${body.dataset_id}/dataset`,
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

  listHeartbeats: async (limit = 100): Promise<ConnectorHeartbeatItem[]> => {
    const res = await apiClient.get(`/cts/monitoring/connector-heartbeats`, {
      params: { limit },
    });
    return (res.data ?? []) as ConnectorHeartbeatItem[];
  },

  listTransferProjections: async (limit = 100): Promise<TransferProjectionItem[]> => {
    const res = await apiClient.get(`/cts/monitoring/transfer-projections`, {
      params: { limit },
    });
    return (res.data ?? []) as TransferProjectionItem[];
  },

  sendHeartbeat: async (body: {
    connector_id?: string | null;
    participant_id?: string | null;
    status?: string;
    version?: string | null;
    instance_id?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<{ status: string }> => {
    const res = await apiClient.post(`/connector/runtime/heartbeat/send`, body);
    return res.data;
  },

  publishTransferEvents: async (body: {
    limit?: number;
    max_retry_count?: number;
  }): Promise<{ sent: number; failed: number; pending_before: number }> => {
    const res = await apiClient.post(`/connector/runtime/transfer-events/publish`, body);
    return res.data;
  },
};
