// ============ ORGANIZATION ============
// Based on rapiDSK Enterprise OpenAPI spec /organizations

export interface Organization {
  organization_id: string;
  organization_name: string;
  organization_type?: string;
}

export interface OrganizationCreateRequest {
  organization_name: string;
  organization_type?: string;
}

export type OrganizationListResponse = Organization[];

// ============ POLICY ============
// Based on rapiDSK Enterprise OpenAPI spec /governance/policies

export interface Policy {
  policy_id: string;
  policy_name: string;
  classification: string;        // free string per spec; Q-I (public/internal/restricted/etc.)
}

export type PolicyListResponse = Policy[];
