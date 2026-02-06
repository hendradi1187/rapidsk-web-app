import { PaginatedResponse } from "./common";

// ============ ORGANIZATION ============
// Based on OpenAPI spec /api/v1/governance/organizations

export interface Organization {
  id: string; // UUID
  name: string;
  code: string;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationCreateRequest {
  name: string; // 3-255 chars
  code: string; // 2-20 chars, unique
  description: string; // min 10 chars
}

export interface OrganizationUpdateRequest {
  name?: string | null; // 3-255 chars
  description?: string | null; // min 10 chars
}

export type OrganizationListResponse = PaginatedResponse<Organization>;
export type OrganizationResponse = Organization;

// ============ DOMAIN ============
// Based on OpenAPI spec /api/v1/governance/domains

export type DomainStatus = "ACTIVE" | "INACTIVE";

export interface Domain {
  id: string; // UUID
  organization_id: string; // UUID
  name: string;
  code: string;
  description: string;
  status: DomainStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DomainCreateRequest {
  organization_id: string; // UUID
  name: string; // 3-255 chars
  code: string; // 2-20 chars
  description: string; // min 10 chars
  status?: DomainStatus | null;
}

export interface DomainUpdateRequest {
  name?: string | null;
  description?: string | null;
}

export type DomainListResponse = PaginatedResponse<Domain>;
export type DomainResponse = Domain;
