export interface MonitoringConfig {
  enableAuditLog: boolean;
  retentionPeriod: number;
  alertEmail: string;
  complianceFrameworks: string[];
  enableRealTimeAlerts: boolean;
}

export type MonitoringConfigCreateRequest = MonitoringConfig;
export type MonitoringConfigUpdateRequest = Partial<MonitoringConfig>;
