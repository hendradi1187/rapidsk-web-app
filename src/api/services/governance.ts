/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient as apiClient } from "../clients";
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
const getTotal = (res: any): number | null => {
  const total = res?.data?.total;
  return typeof total === "number" ? total : null;
};

const normalizeOrganization = (item: any): Organization => ({
  organization_id: item.id ?? item.organization_id,
  organization_name: item.name ?? item.organization_name,
  organization_type: item.code ?? item.organization_type,
  description: item.description ?? undefined,
});

const organizationCodeFromName = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    return words.map((word) => word[0]).join("").toUpperCase().slice(0, 20);
  }
  return words.join("").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
};

const buildOrganizationCreatePayload = (data: OrganizationCreateRequest) => {
  const organizationName = data.organization_name.trim();
  const fallbackCode = organizationCodeFromName(organizationName);
  const fallbackDescription = `Organisasi ${organizationName} di data space`;

  return {
    name: organizationName,
    code: data.code?.trim() || fallbackCode,
    description: data.description?.trim() || fallbackDescription,
  };
};

const syncPublicOrganizationsCache = async (organizations: Organization[]) => {
  if (typeof window === "undefined" || organizations.length === 0) return;

  const token = localStorage.getItem("auth_token");
  if (!token) return;

  try {
    await fetch("/admin/public-organizations/cache", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "same-origin",
      body: JSON.stringify({
        organizations: organizations.map((organization) => ({
          id: organization.organization_id,
          name: organization.organization_name,
        })),
      }),
    });
  } catch {
    // Cache wrapper boleh gagal diam-diam, jangan ganggu flow utama.
  }
};

export const organizationsApi = {
  list: async (): Promise<OrganizationListResponse> => {
    const limit = 100;
    let offset = 0;
    let total: number | null = null;
    const rows: Organization[] = [];

    do {
      const res = await apiClient.get("/governance/organizations/", {
        params: { limit, offset },
      });
      const batch = unwrap(res).map(normalizeOrganization) as Organization[];
      rows.push(...batch);
      total = getTotal(res);
      if (batch.length < limit) break;
      offset += limit;
    } while (total === null || offset < total);

    const merged = new Map<string, Organization>();
    rows.forEach((item) => {
      if (!item.organization_id) return;
      merged.set(item.organization_id, item);
    });

    const organizations = Array.from(merged.values()) as Organization[];
    void syncPublicOrganizationsCache(organizations);
    return organizations as unknown as OrganizationListResponse;
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

  listDomainsMap: async (orgIds: string[]): Promise<Record<string, OrganizationDomain[]>> => {
    const uniqueIds = Array.from(new Set(orgIds.filter(Boolean)));
    const results = await Promise.allSettled(
      uniqueIds.map(async (organizationId) => ({
        organizationId,
        domains: await organizationsApi.listDomains(organizationId),
      })),
    );

    return results.reduce<Record<string, OrganizationDomain[]>>((acc, result) => {
      if (result.status === "fulfilled") {
        acc[result.value.organizationId] = result.value.domains;
      }
      return acc;
    }, {});
  },

  create: async (data: OrganizationCreateRequest): Promise<Organization> => {
    const res = await apiClient.post("/governance/organizations/", buildOrganizationCreatePayload(data));
    return normalizeOrganization(res.data);
  },

  update: async (id: string, data: OrganizationUpdateRequest): Promise<Organization> => {
    const res = await apiClient.patch(`/governance/organizations/${id}`, data);
    return normalizeOrganization(res.data);
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
    try {
      await apiClient.delete(`/governance/organizations/${orgId}/domains/${domainId}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || 'Gagal menghapus domain organisasi';
      const status = err?.response?.status;
      console.error(`[DELETE] removeDomain org=${orgId} domain=${domainId} status=${status} msg=${msg}`);
      throw new Error(msg);
    }
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
    try {
      await apiClient.delete(`/onboarding/connection-pools/${id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.detail || err?.message || 'Gagal menghapus connection pool';
      const status = err?.response?.status;
      console.error(`[DELETE] connectionPool id=${id} status=${status} msg=${msg}`);
      throw new Error(msg);
    }
  },
  /**
   * Get connection pool scoped by domain + agreement + type.
   * BE endpoint: GET /onboarding/{domain_id}/agreements/{agreement_id}/connection-pools/{connection_type}
   * Used by TransferCenter before initiating transfer (SIT-L-004, SIT-R-002)
   */
  getByDomainAgreement: async (
    domainId: string,
    agreementId: string,
    connectionType: "CONSUMER" | "PROVIDER" = "PROVIDER",
  ): Promise<ConnectionPoolItem | null> => {
    try {
      const res = await apiClient.get(
        `/onboarding/${domainId}/agreements/${agreementId}/connection-pools/${connectionType}`,
      );
      return unwrap(res) as ConnectionPoolItem;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 404
      ) {
        return null;
      }
      throw err;
    }
  },
};
