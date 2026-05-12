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

export interface ContractSnapshotOptions {
  authoritativeRelations?: boolean;
  authoritativeParties?: boolean;
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
  consumer_id: string;
  provider_id: string;
  name: string;
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

export function normalizeContractDatasets(value: unknown): ContractDataset[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") {
        return { dataset_id: entry, dataset_policy_id: "" };
      }
      if (typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const dataset_id =
        typeof row.dataset_id === "string"
          ? row.dataset_id
          : typeof row.id === "string"
          ? row.id
          : "";
      const dataset_policy_id =
        typeof row.dataset_policy_id === "string" ? row.dataset_policy_id : "";
      if (!dataset_id) return null;
      return { dataset_id, dataset_policy_id };
    })
    .filter((entry): entry is ContractDataset => entry !== null);
}

export function normalizeContractPolicyIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (!entry || typeof entry !== "object") return "";
      const row = entry as Record<string, unknown>;
      if (typeof row.contract_policy_id === "string") return row.contract_policy_id;
      if (typeof row.id === "string") return row.id;
      return "";
    })
    .filter(Boolean);
}

export function normalizeContractPolicyRefs(value: unknown): ContractContractPolicy[] {
  return normalizeContractPolicyIds(value).map((contract_policy_id) => ({ contract_policy_id }));
}

function hasNonEmptyRelations<T>(rows: T[] | undefined): rows is T[] {
  return Array.isArray(rows) && rows.length > 0;
}

function mergeDatasetRows(existing: ContractDataset[], incoming: ContractDataset[]): ContractDataset[] {
  if (incoming.length === 0) return existing;
  const existingPolicyMap = new Map(existing.map((d) => [d.dataset_id, d.dataset_policy_id]));
  return incoming.map((d) => ({
    dataset_id: d.dataset_id,
    // Keep cached dataset_policy_id when server returns null/empty
    dataset_policy_id: d.dataset_policy_id || existingPolicyMap.get(d.dataset_id) || "",
  }));
}

export function mergeContractSnapshot(
  existing: Partial<Contract> | null | undefined,
  incoming: Partial<Contract> | null | undefined,
  options: ContractSnapshotOptions = {}
): Contract | null {
  if (!existing && !incoming) return null;

  const base = (existing ?? {}) as Partial<Contract>;
  const next = (incoming ?? {}) as Partial<Contract>;
  const authoritativeRelations = options.authoritativeRelations ?? false;
  const authoritativeParties = options.authoritativeParties ?? false;

  const hasIncomingDatasets = Array.isArray(next.datasets);
  const hasIncomingPolicies = Array.isArray(next.contract_policies);

  const normalizedExistingDatasets = normalizeContractDatasets(base.datasets);
  const normalizedIncomingDatasets = normalizeContractDatasets(next.datasets);
  const normalizedExistingPolicies = normalizeContractPolicyRefs(base.contract_policies);
  const normalizedIncomingPolicies = normalizeContractPolicyRefs(next.contract_policies);

  const datasets = authoritativeRelations
    ? (hasIncomingDatasets ? normalizedIncomingDatasets : normalizedExistingDatasets)
    : hasIncomingDatasets
      ? mergeDatasetRows(normalizedExistingDatasets, normalizedIncomingDatasets)
      : normalizedExistingDatasets;

  const contract_policies =
    hasIncomingPolicies && (authoritativeRelations || hasNonEmptyRelations(normalizedIncomingPolicies))
      ? normalizedIncomingPolicies
      : normalizedExistingPolicies;

  const consumer_id =
    typeof next.consumer_id === "string" && (authoritativeParties || next.consumer_id)
      ? next.consumer_id
      : base.consumer_id ?? "";

  const provider_id =
    typeof next.provider_id === "string" && (authoritativeParties || next.provider_id)
      ? next.provider_id
      : base.provider_id ?? "";

  return {
    ...(base as Contract),
    ...(next as Contract),
    consumer_id,
    provider_id,
    datasets,
    contract_policies,
  };
}

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
