import { PaginatedResponse } from "./common";

// ============ COMPLIANCE FRAMEWORK ============
// Based on UI data from Compliance.tsx

export type FrameworkStatus = "compliant" | "review" | "non_compliant" | "pending";
export type FindingSeverity = "high" | "medium" | "low" | "critical";
export type FindingStatus = "open" | "in_progress" | "resolved" | "closed";

export interface ComplianceFramework {
  id: number;
  name: string;
  description: string;
  status: FrameworkStatus;
  score: number;
  lastAudit: string;
  nextAudit: string;
  findings: number;
  controls: number;
  // Extended fields
  version?: string;
  category?: string;
  owner?: string;
  domain_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ComplianceFrameworkCreateRequest {
  name: string;
  description: string;
  version?: string;
  category?: string;
  owner?: string;
  controls?: number;
}

export interface ComplianceFrameworkUpdateRequest {
  name?: string | null;
  description?: string | null;
  status?: FrameworkStatus | null;
  score?: number | null;
  lastAudit?: string | null;
  nextAudit?: string | null;
  findings?: number | null;
  controls?: number | null;
}

export type ComplianceFrameworkListResponse = PaginatedResponse<ComplianceFramework>;
export type ComplianceFrameworkResponse = ComplianceFramework;

// ============ COMPLIANCE FINDING ============

export interface ComplianceFinding {
  id: number;
  title: string;
  framework: string;
  severity: FindingSeverity;
  status: FindingStatus;
  dueDate: string;
  // Extended fields
  description?: string;
  remediation?: string;
  assignee?: string;
  frameworkId?: number;
  controlId?: string;
  evidence?: string;
  domain_id?: string;
  created_at?: string;
  updated_at?: string;
  resolved_at?: string;
}

export interface ComplianceFindingCreateRequest {
  title: string;
  framework: string;
  severity: FindingSeverity;
  dueDate: string;
  description?: string;
  remediation?: string;
  assignee?: string;
  frameworkId?: number;
  controlId?: string;
}

export interface ComplianceFindingUpdateRequest {
  title?: string | null;
  severity?: FindingSeverity | null;
  status?: FindingStatus | null;
  dueDate?: string | null;
  description?: string | null;
  remediation?: string | null;
  assignee?: string | null;
}

export type ComplianceFindingListResponse = PaginatedResponse<ComplianceFinding>;
export type ComplianceFindingResponse = ComplianceFinding;

// ============ COMPLIANCE STATS ============

export interface ComplianceStats {
  compliant: number;
  underReview: number;
  openFindings: number;
  nextAudit: string;
}
