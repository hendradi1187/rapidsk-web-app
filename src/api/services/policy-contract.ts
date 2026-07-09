/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient } from "../clients";

// Contract & agreement (domain-scoped) — read-only.
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export interface ContractItem {
  id: string;
  name: string;
  status: string;
  consumer_id?: string;
  provider_id?: string;
  description?: string;
  due_date?: string | null;
  created_at?: string;
}

export interface ContractDetail extends ContractItem {
  contract_policies?: any[];
  datasets?: { id?: string; dataset_id: string; dataset_policy_id: string }[];
}

export interface AgreementItem {
  id: string;
  contract_id: string;
  status: string;
  effective_from: string;
  effective_to: string;
  created_at?: string;
}

// Ambil seluruh halaman (BE max limit=100) agar matrix kepatuhan 50 KKKS lengkap.
const fetchAllContracts = async (url: string): Promise<any[]> => {
  const out: any[] = [];
  let offset = 0;
  const limit = 100;
  for (let i = 0; i < 100; i++) {
    const res = await ctsClient.get(url, { params: { limit, offset } });
    const body = res?.data;
    const rows = body?.data ?? body ?? [];
    out.push(...rows);
    if (!body?.has_next || rows.length === 0) break;
    offset += limit;
  }
  return out;
};

export const contractsApi = {
  list: async (domainId: string): Promise<ContractItem[]> => {
    if (!domainId) return [];
    const rows = await fetchAllContracts(`/policy-contract/${domainId}/contracts`);
    return rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      consumer_id: c.consumer_id,
      provider_id: c.provider_id,
      description: c.description,
      due_date: c.due_date,
      created_at: c.created_at,
    }));
  },

  get: async (domainId: string, id: string): Promise<ContractDetail> => {
    const res = await ctsClient.get(`/policy-contract/${domainId}/contracts/${id}`);
    return res.data as ContractDetail;
  },

  // Ajukan kontrak baru (consumer → provider). Lahir berstatus REQUESTED.
  create: async (
    domainId: string,
    body: {
      consumer_id: string;
      provider_id: string;
      name: string;
      description: string;
      datasets?: { dataset_id: string; dataset_policy_id?: string }[];
    },
  ): Promise<ContractDetail> => {
    const { datasets, ...rest } = body;
    const res = await ctsClient.post(`/policy-contract/${domainId}/contracts`, {
      ...rest,
      contract_policies: [],
      datasets: datasets ?? [],
    });
    return res.data as ContractDetail;
  },

  // Ubah status kontrak (REQUESTED → APPROVED → ACTIVE, atau REJECTED).
  // BE mewajibkan consumer_id, provider_id, name di body PATCH (bukan status saja).
  updateStatus: async (
    domainId: string,
    contract: { id: string; consumer_id?: string; provider_id?: string; name: string },
    status: "APPROVED" | "REJECTED" | "ACTIVE" | "CANCELLED" | "EXPIRED",
  ): Promise<ContractDetail> => {
    const res = await ctsClient.patch(
      `/policy-contract/${domainId}/contracts/${contract.id}`,
      {
        consumer_id: contract.consumer_id,
        provider_id: contract.provider_id,
        name: contract.name,
        status,
      },
    );
    return res.data as ContractDetail;
  },

  // Tautkan dataset ke kontrak (untuk syarat transfer). Pertahankan status.
  linkDataset: async (
    domainId: string,
    contract: { id: string; consumer_id?: string; provider_id?: string; name: string; status: string },
    dataset_id: string,
    dataset_policy_id: string,
  ): Promise<ContractDetail> => {
    const res = await ctsClient.patch(
      `/policy-contract/${domainId}/contracts/${contract.id}`,
      {
        consumer_id: contract.consumer_id,
        provider_id: contract.provider_id,
        name: contract.name,
        status: contract.status,
        datasets: [{ dataset_id, dataset_policy_id }],
      },
    );
    return res.data as ContractDetail;
  },

  agreements: async (domainId: string): Promise<any[]> => {
    if (!domainId) return [];
    const res = await ctsClient.get(`/policy-contract/${domainId}/agreements`);
    return unwrap(res);
  },
};

// Agreement = perjanjian formal atas sebuah contract (masa berlaku).
// BE: list pakai envelope {data,...}; filter hanya by status → filter per-contract di FE.
export const agreementsApi = {
  list: async (domainId: string): Promise<AgreementItem[]> => {
    if (!domainId) return [];
    const res = await ctsClient.get(`/policy-contract/${domainId}/agreements`);
    return unwrap(res).map((a: any) => ({
      id: a.id,
      contract_id: a.contract_id,
      status: a.status,
      effective_from: a.effective_from,
      effective_to: a.effective_to,
      created_at: a.created_at,
    }));
  },

  // Buat perjanjian (status auto APPROVED di BE). Tanggal dikirim ISO 8601.
  create: async (
    domainId: string,
    body: { contract_id: string; effective_from: string; effective_to: string },
  ): Promise<AgreementItem> => {
    const res = await ctsClient.post(
      `/policy-contract/${domainId}/agreements`,
      body,
    );
    return res.data as AgreementItem;
  },

  // Ubah status agreement (mis. → ACTIVE; syarat transfer connector).
  updateStatus: async (
    domainId: string,
    agreement: { id: string; contract_id: string },
    status: "ACTIVE" | "APPROVED" | "REJECTED",
  ): Promise<AgreementItem> => {
    const res = await ctsClient.patch(
      `/policy-contract/${domainId}/agreements/${agreement.id}`,
      { contract_id: agreement.contract_id, status },
    );
    return res.data as AgreementItem;
  },
};

// Contract-policy: kebijakan tingkat kontrak (klasifikasi data + masa berlaku),
// terpisah dari dataset-policy. Domain-scoped, CRUD penuh.
export interface ContractPolicyItem {
  id: string;
  domain_id: string;
  name: string;
  data_clasification: string;
  description?: string | null;
  effective_from: string;
  effective_to: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContractPolicyInput {
  name: string;
  data_clasification: string;
  effective_from: string;
  effective_to: string;
  description?: string | null;
}

export const contractPoliciesApi = {
  list: async (domainId: string): Promise<ContractPolicyItem[]> => {
    if (!domainId) return [];
    const rows = await fetchAllContracts(`/policy-contract/${domainId}/contract-policies`);
    return rows as ContractPolicyItem[];
  },
  create: async (domainId: string, body: ContractPolicyInput): Promise<ContractPolicyItem> => {
    const res = await ctsClient.post(`/policy-contract/${domainId}/contract-policies`, body);
    return res.data as ContractPolicyItem;
  },
  update: async (
    domainId: string,
    id: string,
    body: Partial<ContractPolicyInput>,
  ): Promise<ContractPolicyItem> => {
    const res = await ctsClient.patch(`/policy-contract/${domainId}/contract-policies/${id}`, body);
    return res.data as ContractPolicyItem;
  },
  remove: async (domainId: string, id: string): Promise<void> => {
    await ctsClient.delete(`/policy-contract/${domainId}/contract-policies/${id}`);
  },
};
