// ============ ORGANIZATION ============
// Based on current GX-Space governance endpoints

export interface Organization {
  organization_id: string;
  organization_name: string;
  organization_type?: string;
  description?: string;
}

export interface OrganizationCreateRequest {
  organization_name: string;
  organization_type?: string;
  code?: string;
  description?: string;
}

export interface OrganizationUpdateRequest {
  name: string;
  description: string;
}

export type OrganizationListResponse = Organization[];

export interface OrganizationDomain {
  domain_id: string;
  domain_name: string;
  code?: string;
  status?: string;
  description?: string;
}

export interface OrganizationDomainCreateRequest {
  name: string;
  code: string;
  description: string;
}

export interface OrganizationDomainUpdateRequest {
  name: string;
  code: string;
  description: string;
}

// ============ POLICY ============

export interface PolicyRule {
  left_operand: string;
  right_operand: string;
  operator: string;
}

export interface Policy {
  policy_id: string;
  policy_name: string;
  classification: string;
  level?: string;
  domain?: string;
  version?: string;
  status?: string;
  description?: string | null;
  rules?: PolicyRule[];
}

export type PolicyListResponse = Policy[];

export interface PolicyCreateRequest {
  name: string;
  description: string;
  version: string;
  type: string;
  rules: PolicyRule[];
}

export interface PolicyUpdateRequest {
  name: string;
  version: string;
  type?: string | null;
  status?: string | null;
  description?: string | null;
  rules: PolicyRule[];
}

// ============ CONNECTION POOL ============

export interface ConnectionPoolItem {
  id: string;
  participant_id: string;
  name: string;
  type: "CONSUMER" | "PROVIDER";
  token: string;
  metadata: {
    url_consumer: string;
    url_provider: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ConnectionPoolCreateRequest {
  participant_id: string;
  name: string;
  type: "CONSUMER" | "PROVIDER";
  token: string;
  metadata: {
    url_consumer: string;
    url_provider: string;
  };
}

export interface ConnectionPoolUpdateRequest {
  name?: string | null;
  type?: "CONSUMER" | "PROVIDER" | null;
  token?: string | null;
  metadata?: {
    url_consumer: string;
    url_provider: string;
  } | null;
}
