/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient } from "../client";

// Modul kepatuhan (audit-compliance). Dua entitas:
//  - Control  : definisi kontrol/kendali dari sebuah framework (mis. ISO, SPBE).
//  - Checklist: bukti pemenuhan satu control oleh satu participant.
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export interface ComplianceControl {
  id: string;
  control_id: string;
  framework: string;
  name: string;
  description: string;
  version: string;
  active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceControlInput {
  control_id: string;
  framework: string;
  name: string;
  description: string;
  version: string;
}

export interface ComplianceChecklist {
  id: string;
  participant_id: string;
  control_id: string;
  framework: string;
  control_name: string;
  status: string;
  evidence_ids: string[];
  notes?: string | null;
  checked_at: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceChecklistInput {
  participant_id: string;
  control_id: string;
  framework: string;
  control_name: string;
  status: string;
  evidence_ids: string[];
  notes?: string | null;
  checked_at: string;
}

export const complianceControlsApi = {
  list: async (): Promise<ComplianceControl[]> => {
    const res = await ctsClient.get("/audit-compliance/compliance-controls");
    return unwrap(res) as ComplianceControl[];
  },
  create: async (body: ComplianceControlInput): Promise<ComplianceControl> => {
    const res = await ctsClient.post("/audit-compliance/compliance-controls", body);
    return res.data as ComplianceControl;
  },
  update: async (
    id: string,
    body: Partial<ComplianceControlInput & { active: boolean }>,
  ): Promise<ComplianceControl> => {
    const res = await ctsClient.patch(`/audit-compliance/compliance-controls/${id}`, body);
    return res.data as ComplianceControl;
  },
  remove: async (id: string): Promise<void> => {
    await ctsClient.delete(`/audit-compliance/compliance-controls/${id}`);
  },
};

export const complianceChecklistsApi = {
  list: async (): Promise<ComplianceChecklist[]> => {
    const res = await ctsClient.get("/audit-compliance/compliance-checklists");
    return unwrap(res) as ComplianceChecklist[];
  },
  create: async (body: ComplianceChecklistInput): Promise<ComplianceChecklist> => {
    const res = await ctsClient.post("/audit-compliance/compliance-checklists", body);
    return res.data as ComplianceChecklist;
  },
  update: async (
    id: string,
    body: Partial<ComplianceChecklistInput>,
  ): Promise<ComplianceChecklist> => {
    const res = await ctsClient.patch(`/audit-compliance/compliance-checklists/${id}`, body);
    return res.data as ComplianceChecklist;
  },
  remove: async (id: string): Promise<void> => {
    await ctsClient.delete(`/audit-compliance/compliance-checklists/${id}`);
  },
};
