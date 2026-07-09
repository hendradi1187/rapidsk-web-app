/* eslint-disable @typescript-eslint/no-explicit-any */
import { monitoringClient as apiClient } from "../clients";

// Konfigurasi monitoring per domain × participant (onboarding/{domain_id}/monitorings).
// Mengatur logging, aturan kepatuhan, dan notifikasi untuk sebuah participant.
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export interface MonitoringLog {
  enabled: boolean;
  retention: number;
}

export interface MonitoringNotification {
  email: string;
  realtime: boolean;
}

export interface MonitoringItem {
  id: string;
  domain_id: string;
  participant_id: string;
  log: MonitoringLog;
  compliance: any[];
  notification: MonitoringNotification;
  created_at?: string;
  updated_at?: string;
}

export interface MonitoringInput {
  participant_id: string;
  log: MonitoringLog;
  compliance: any[];
  notification: MonitoringNotification;
}

export const monitoringsApi = {
  list: async (domainId: string): Promise<MonitoringItem[]> => {
    if (!domainId) return [];
    const res = await ctsClient.get(`/onboarding/${domainId}/monitorings`);
    return unwrap(res) as MonitoringItem[];
  },
  create: async (domainId: string, body: MonitoringInput): Promise<MonitoringItem> => {
    const res = await ctsClient.post(`/onboarding/${domainId}/monitorings`, body);
    return res.data as MonitoringItem;
  },
  update: async (
    domainId: string,
    id: string,
    body: Partial<MonitoringInput>,
  ): Promise<MonitoringItem> => {
    const res = await ctsClient.patch(`/onboarding/${domainId}/monitorings/${id}`, body);
    return res.data as MonitoringItem;
  },
  remove: async (domainId: string, id: string): Promise<void> => {
    await ctsClient.delete(`/onboarding/${domainId}/monitorings/${id}`);
  },
};
