import { PaginatedResponse } from "./common";

// ============ CONTRACT ============
// Based on UI data from Contracts.tsx

export type ContractStatus = "REQUESTED" | "APPROVED" | "ACTIVE" | "REJECTED" | string;

export interface ContractDataset {
  dataset_id: string;
  dataset_policy_id: string;
}

export interface ContractContractPolicy {
  contract_policy_id: string;
}

export interface Contract {
  id: string;
  domain_id: string;
  consumer_id: string;
  provider_id: string;
  name: string;
  status: ContractStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
  contract_policies: ContractContractPolicy[];
  datasets: ContractDataset[];
  // Legacy-friendly fields for older pages.
  title?: string;
  provider?: string;
  consumer?: string;
}

export interface ContractCreateRequest {
  consumer_id: string;
  provider_id: string;
  name: string;
  description: string;
  contract_policies: string[];
  datasets: ContractDatasetRequest[];
}

export interface ContractUpdateRequest {
  name?: string | null;
  status?: ContractStatus | null;
  description?: string | null;
  contract_policies?: string[] | null;
  datasets?: ContractDatasetRequest[] | null;
}

export interface ContractDatasetRequest {
  dataset_id: string;
  dataset_policy_id: string;
}

export type ContractListResponse = PaginatedResponse<Contract>;
export type ContractResponse = Contract;

// ============ POLICY ============
// Based on UI data from Contracts.tsx (policies tab)

export interface Policy {
  id: number;
  name: string;
  description: string;
  datasets: number;
  active: boolean;
  // Extended fields from API
  type?: DatasetPolicyType;
  status?: DatasetPolicyStatus;
  version?: string;
  domain_id?: string;
  created_at?: string;
  updated_at?: string;
  rules?: DatasetPolicyRule[];
}

export interface PolicyCreateRequest {
  name: string;
  description: string;
  type?: string;
  version?: string;
  rules?: DatasetPolicyRuleRequest[];
}

export interface PolicyUpdateRequest {
  name?: string | null;
  description?: string | null;
  active?: boolean | null;
  type?: DatasetPolicyType | null;
  status?: DatasetPolicyStatus | null;
  version?: string | null;
  rules?: DatasetPolicyRuleRequest[];
}

export type PolicyListResponse = PaginatedResponse<Policy>;
export type PolicyResponse = Policy;

// ============ DATASET POLICY ============

export type DatasetPolicyStatus = "DRAFT" | "APPROVED" | "DEPRECATED";
export type DatasetPolicyType = "ACCESS" | "USAGE" | "RETENTION" | "SECURITY";
export type DatasetPolicyRuleOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "CONTAINS"
  | "STARTS_WITH"
  | "ENDS_WITH";

export interface DatasetPolicyRule {
  id: string;
  domain_id: string;
  dataset_policy_id: string;
  left_operand: string;
  right_operand: string;
  operator: DatasetPolicyRuleOperator;
}

export interface DatasetPolicyRuleRequest {
  left_operand: string;
  right_operand: string;
  operator: string;
}

export interface DatasetPolicy {
  id: string;
  domain_id: string;
  name: string;
  version: string;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  rules: DatasetPolicyRule[];
}

export interface DatasetPolicyCreateRequest {
  name: string;
  description?: string | null;
  version: string;
  type: string;
  rules: DatasetPolicyRuleRequest[];
}

export interface DatasetPolicyUpdateRequest {
  name: string;
  version: string;
  type?: DatasetPolicyType | null;
  status?: DatasetPolicyStatus | null;
  description?: string | null;
  rules: DatasetPolicyRuleRequest[];
}

export type DatasetPolicyListResponse = PaginatedResponse<DatasetPolicy>;
export type DatasetPolicyResponse = DatasetPolicy;

// ============ CONTRACT POLICY ============

export interface ContractPolicy {
  id: string;
  domain_id: string;
  name: string;
  data_clasification: string;
  description: string | null;
  effective_from: string;
  effective_to: string;
  created_at: string;
  updated_at: string;
}

export interface ContractPolicyCreateRequest {
  name: string;
  data_clasification: string;
  effective_from: string;
  effective_to: string;
  description?: string | null;
}

export interface ContractPolicyUpdateRequest {
  name?: string | null;
  data_clasification?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  description?: string | null;
}

export type ContractPolicyListResponse = PaginatedResponse<ContractPolicy>;
export type ContractPolicyResponse = ContractPolicy;

// ============ AGREEMENT ============

export type AgreementStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "ACTIVE";

export interface Agreement {
  id: string;
  domain_id: string;
  contract_id: string;
  status: AgreementStatus;
  effective_from: string;
  effective_to: string;
  created_at: string;
  updated_at: string;
}

export interface AgreementCreateRequest {
  contract_id: string;
  effective_from: string;
  effective_to: string;
}

export interface AgreementUpdateRequest {
  contract_id?: string | null;
  status?: AgreementStatus | null;
  effective_from?: string | null;
  effective_to?: string | null;
}

export type AgreementListResponse = PaginatedResponse<Agreement>;
export type AgreementResponse = Agreement;
