import { PaginatedResponse } from "./common";

export interface MonitoringConfig {
  enableAuditLog: boolean;
  retentionPeriod: number;
  alertEmail: string;
  complianceFrameworks: string[];
  enableRealTimeAlerts: boolean;
}

export type MonitoringConfigCreateRequest = MonitoringConfig;
export type MonitoringConfigUpdateRequest = Partial<MonitoringConfig>;

export type MonitoringCompliance = "ISO 27001" | "SKK MIGAS" | "COBIT" | "ITIL 4";

export interface MonitoringLog {
  enabled: boolean;
  retention: number;
}

export interface MonitoringNotification {
  email: string;
  realtime: boolean;
}

export interface Monitoring {
  id: string;
  domain_id: string;
  participant_id: string;
  log: MonitoringLog;
  compliance: MonitoringCompliance[];
  notification: MonitoringNotification;
  created_at: string;
  updated_at: string;
}

export interface MonitoringCreateRequest {
  participant_id: string;
  log: MonitoringLog;
  compliance: MonitoringCompliance[];
  notification: MonitoringNotification;
}

export type MonitoringUpdateRequest = MonitoringCreateRequest;
export type MonitoringListResponse = PaginatedResponse<Monitoring>;
export type MonitoringResponse = Monitoring;
