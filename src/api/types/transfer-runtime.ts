import { PaginatedResponse } from "./common";

export interface TransferProcess {
  id: string;
  domain_id: string;
  state: string;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataTransferRuntime {
  id: string;
  transfer_process_id: string;
  data_asset_id: string;
  chunk_sequence: number;
  total_chunks: number;
  chunk_size: number;
  data_hash: string;
  state: string;
  transferred_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransferProcessListResponse extends PaginatedResponse<TransferProcess> {}

export interface DataTransferRuntimeListResponse extends PaginatedResponse<DataTransferRuntime> {}
