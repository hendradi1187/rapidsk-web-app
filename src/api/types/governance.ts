// ============ ORGANIZATION ============
// Based on rapiDSK Enterprise OpenAPI spec /organizations

export interface Organization {
  organization_id: string;
  organization_name: string;
  organization_type?: string;   // = code (GX-Space organization.code)
  description?: string;
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
  classification: string;        // type policy GX-Space (ACCESS/USAGE/RETENTION/SECURITY)
  level?: string;                // klasifikasi L0–L4 (dari rule "classification EQUALS Lx")
  domain?: string;               // key domain, di-infer dari nama policy
}

export type PolicyListResponse = Policy[];
