import { PaginatedResponse } from "./common";

// ============ DATA TRANSFER ============
// Based on UI data from DataTransfer.tsx

export type TransferType = "streaming" | "batch";
export type TransferStatus = "active" | "in_progress" | "completed" | "failed" | "pending" | "paused";

export interface DataTransfer {
  id: number;
  name: string;
  from: string;
  to: string;
  type: TransferType;
  status: TransferStatus;
  progress: number;
  lastSync: string;
  records: string;
  encrypted: boolean;
  // Extended fields
  sourceDataset?: string;
  targetEndpoint?: string;
  protocol?: TransferProtocol;
  scheduleType?: ScheduleType;
  cronExpression?: string;
  bytesTransferred?: number;
  errorMessage?: string;
  domain_id?: string;
  agreement_id?: string;
  created_at?: string;
  updated_at?: string;
}

export type TransferProtocol = "HTTP" | "HTTPS" | "S3" | "FTP" | "SFTP";
export type ScheduleType = "realtime" | "scheduled" | "manual";

export interface DataTransferCreateRequest {
  name: string;
  from: string;
  to: string;
  type: TransferType;
  sourceDataset?: string;
  targetEndpoint?: string;
  protocol?: TransferProtocol;
  scheduleType?: ScheduleType;
  cronExpression?: string;
  encrypted?: boolean;
}

export interface DataTransferUpdateRequest {
  name?: string | null;
  status?: TransferStatus | null;
  protocol?: TransferProtocol | null;
  scheduleType?: ScheduleType | null;
  cronExpression?: string | null;
  encrypted?: boolean | null;
}

export interface TransferStats {
  transfersToday: string;
  dataThisMonth: string;
  activeStreams: number;
  encryptionRate: string;
}

export type DataTransferListResponse = PaginatedResponse<DataTransfer>;
export type DataTransferResponse = DataTransfer;
