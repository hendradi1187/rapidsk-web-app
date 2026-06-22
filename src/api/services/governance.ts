/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";
import type {
  ConnectionPoolCreateRequest,
  ConnectionPoolItem,
  ConnectionPoolUpdateRequest,
  OrganizationDomain,
  OrganizationDomainCreateRequest,
  OrganizationDomainUpdateRequest,
  Organization,
  OrganizationCreateRequest,
  OrganizationListResponse,
  OrganizationUpdateRequest,
  Policy,
  PolicyCreateRequest,
  PolicyListResponse,
  PolicyUpdateRequest,
} from "../types/governance";

// GX-Space: /governance/organizations/ , /governance/organizations/{orgId}/domains
// Envelope: { data: [...], total, ... }

const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export const organizationsApi = {
  list: async (): Promise<OrganizationListResponse> => {
    const res = await apiClient.get("/governance/organizations/");
    return unwrap(res).map((o: any) => ({
      organization_id: o.id,
      organization_name: o.name,
      organization_type: o.organization_type,
      description: o.description ?? undefined,
    })) as unknown as OrganizationListResponse;
  },

  listDomains: async (orgId: string): Promise<OrganizationDomain[]> => {
    const res = await apiClient.get(`/governance/organizations/${orgId}/domains`);
    return unwrap(res).map((d: any) => ({
      domain_id: d.id,
      domain_name: d.name,
      code: d.code,
      status: d.status,
      description: d.description ?? undefined,
    }));
  },

  create: async (data: OrganizationCreateRequest): Promise<Organization> => {
    const res = await apiClient.post("/governance/organizations/", {
      name: data.organization_name.trim(),
      code: data.code?.trim(),
      description: data.description?.trim(),
    });
    return res.data as Organization;
  },

  update: async (id: string, data: OrganizationUpdateRequest): Promise<Organization> => {
    const res = await apiClient.patch(`/governance/organizations/${id}`, data);
    return res.data as Organization;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/governance/organizations/${id}`);
  },

  // Buat governance domain di bawah organisasi. code 2–20, description ≥10.
  createDomain: async (
    orgId: string,
    data: OrganizationDomainCreateRequest,
  ): Promise<OrganizationDomain> => {
    const res = await apiClient.post(`/governance/organizations/${orgId}/domains`, data);
    const d = res.data as any;
    return {
      domain_id: d.id,
      domain_name: d.name,
      code: d.code,
      status: d.status,
      description: d.description ?? undefined,
    };
  },

  updateDomain: async (
    orgId: string,
    domainId: string,
    data: OrganizationDomainUpdateRequest,
  ): Promise<OrganizationDomain> => {
    const res = await apiClient.patch(`/governance/organizations/${orgId}/domains/${domainId}`, data);
    const d = res.data as any;
    return {
      domain_id: d.id,
      domain_name: d.name,
      code: d.code,
      status: d.status,
      description: d.description ?? undefined,
    };
  },

  removeDomain: async (orgId: string, domainId: string): Promise<void> => {
    await apiClient.delete(`/governance/organizations/${orgId}/domains/${domainId}`);
  },
};

// Infer key domain dari nama policy (mis. "Wilayah Kerja (PSC Area) — ACCESS L1").
const DOMAIN_KEYWORDS: Array<[string, string]> = [
  ["wilayah kerja", "wilayah_kerja"],
  ["sumur", "sumur"],
  ["well", "sumur"],
  ["lapangan", "lapangan"],
  ["field", "lapangan"],
  ["fasilitas", "fasilitas"],
  ["facility", "fasilitas"],
  ["seismik", "seismik"],
  ["seismic", "seismik"],
];
const inferDomainFromName = (name: string): string | undefined => {
  const n = (name || "").toLowerCase();
  return DOMAIN_KEYWORDS.find(([kw]) => n.includes(kw))?.[1];
};
// Klasifikasi L0–L4: dari rules bila tersedia, jika tidak dari NAMA policy.
// (Respons LIST dataset-policy GX-Space TIDAK memuat rules; namanya memuat "… Lx".)
const levelFromRules = (rules: any[]): string | undefined => {
  const r = (rules || []).find((x) => String(x.left_operand).toLowerCase() === "classification");
  return r?.right_operand;
};
const levelFromName = (name: string): string | undefined => {
  const m = (name || "").match(/\b(L[0-4])\b/);
  return m ? m[1] : undefined;
};

const mapPolicy = (p: any): Policy => ({
  policy_id: p.policy_id ?? p.id,
  policy_name: p.name,
  classification: p.type,
  level: levelFromRules(p.rules ?? []) ?? levelFromName(p.name),
  domain: inferDomainFromName(p.name),
});

// Dataset-policies (domain-scoped) → tipe Policy flat + type + level + domain.
export const policiesApi = {
  list: async (domainId: string): Promise<PolicyListResponse> => {
    const res = await apiClient.get(`/policy-contract/${domainId}/dataset-policies`);
    return unwrap(res).map(mapPolicy) as unknown as PolicyListResponse;
  },

  create: async (domainId: string, body: PolicyCreateRequest): Promise<Policy> => {
    const res = await apiClient.post(`/policy-contract/${domainId}/dataset-policies`, body);
    return mapPolicy(res.data as any);
  },

  update: async (domainId: string, policyId: string, body: PolicyUpdateRequest): Promise<Policy> => {
    const res = await apiClient.patch(`/policy-contract/${domainId}/dataset-policies/${policyId}`, body);
    return mapPolicy(res.data as any);
  },

  remove: async (domainId: string, policyId: string): Promise<void> => {
    await apiClient.delete(`/policy-contract/${domainId}/dataset-policies/${policyId}`);
  },
};

export const connectionPoolsApi = {
  list: async (): Promise<ConnectionPoolItem[]> => {
    const res = await apiClient.get("/onboarding/connection-pools");
    return unwrap(res) as ConnectionPoolItem[];
  },

  create: async (body: ConnectionPoolCreateRequest): Promise<ConnectionPoolItem> => {
    const res = await apiClient.post("/onboarding/connection-pools", body);
    return res.data as ConnectionPoolItem;
  },

  update: async (id: string, body: ConnectionPoolUpdateRequest): Promise<ConnectionPoolItem> => {
    const res = await apiClient.patch(`/onboarding/connection-pools/${id}`, body);
    return res.data as ConnectionPoolItem;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/onboarding/connection-pools/${id}`);
  },
};
