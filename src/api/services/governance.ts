/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";
import type {
  Organization,
  OrganizationCreateRequest,
  OrganizationListResponse,
  PolicyListResponse,
} from "../types/governance";

// GX-Space: /governance/organizations/ , /governance/organizations/{orgId}/domains
// Envelope: { data: [...], total, ... }

const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export interface DomainItem {
  domain_id: string;
  domain_name: string;
  code?: string;
  status?: string;
}

export const organizationsApi = {
  list: async (): Promise<OrganizationListResponse> => {
    const res = await apiClient.get("/governance/organizations/");
    return unwrap(res).map((o: any) => ({
      organization_id: o.id,
      organization_name: o.name,
      organization_type: o.code,
      description: o.description ?? undefined,
    })) as unknown as OrganizationListResponse;
  },

  listDomains: async (orgId: string): Promise<DomainItem[]> => {
    const res = await apiClient.get(`/governance/organizations/${orgId}/domains`);
    return unwrap(res).map((d: any) => ({
      domain_id: d.id,
      domain_name: d.name,
      code: d.code,
      status: d.status,
    }));
  },

  create: async (data: OrganizationCreateRequest): Promise<Organization> => {
    const name = data.organization_name.trim();
    // code: backend mensyaratkan 2–20 char. Ambil dari type bila ada, jika
    // tidak dari nama; bersihkan jadi alnum uppercase, jamin minimal 2 char.
    const rawCode = (data.organization_type || name)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const code = (rawCode.slice(0, 20) || "ORG").padEnd(2, "X");
    // description: backend mensyaratkan minLength 10. Form tidak punya field
    // deskripsi, jadi auto-generate dari nama agar lolos validasi.
    const description = name.length >= 10 ? name : `Organisasi ${name}`;
    const res = await apiClient.post("/governance/organizations/", {
      name,
      code,
      description,
    });
    return res.data as Organization;
  },

  // Buat governance domain di bawah organisasi. code 2–20, description ≥10.
  createDomain: async (
    orgId: string,
    data: { name: string; code: string; description: string },
  ): Promise<DomainItem> => {
    const res = await apiClient.post(`/governance/organizations/${orgId}/domains`, data);
    const d = res.data as any;
    return { domain_id: d.id, domain_name: d.name, code: d.code, status: d.status };
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

// Dataset-policies (domain-scoped) → tipe Policy flat + type + level + domain.
export const policiesApi = {
  list: async (domainId: string): Promise<PolicyListResponse> => {
    const res = await apiClient.get(`/policy-contract/${domainId}/dataset-policies`);
    return unwrap(res).map((p: any) => ({
      policy_id: p.id,
      policy_name: p.name,
      classification: p.type,
      type: p.type,
      level: levelFromRules(p.rules) ?? levelFromName(p.name),
      domain: inferDomainFromName(p.name),
    })) as unknown as PolicyListResponse;
  },
};
