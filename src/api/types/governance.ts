import { PaginatedResponse } from "./common";

// ============ ORGANIZATION ============
// Based on UI data from Organizations.tsx

export type OrganizationType = "KKKS" | "Regulator" | "ServiceProvider";
export type OrganizationRole = "Provider" | "Consumer";
export type OrganizationStatus = "active" | "pending" | "inactive";

export interface Organization {
  id: number;
  name: string;
  type: OrganizationType;
  role: OrganizationRole;
  units: string[];
  datasets: number;
  contracts: number;
  status: OrganizationStatus;
  avatar: string;
  // API fields
  code?: string;
  description?: string;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrganizationCreateRequest {
  name: string;
  code: string;
  type: OrganizationType;
  role: OrganizationRole;
  description?: string;
  units?: string[];
}

export interface OrganizationUpdateRequest {
  name?: string | null;
  description?: string | null;
  type?: OrganizationType | null;
  role?: OrganizationRole | null;
  units?: string[] | null;
  status?: OrganizationStatus | null;
}

export type OrganizationListResponse = PaginatedResponse<Organization>;
export type OrganizationResponse = Organization;

// ============ DOMAIN ============

export type DomainStatus = "ACTIVE" | "INACTIVE";

export interface Domain {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  description: string;
  status: DomainStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainCreateRequest {
  organization_id: string;
  name: string;
  code: string;
  description: string;
  status?: DomainStatus | null;
}

export interface DomainUpdateRequest {
  name?: string | null;
  description?: string | null;
}

export type DomainListResponse = PaginatedResponse<Domain>;
export type DomainResponse = Domain;
