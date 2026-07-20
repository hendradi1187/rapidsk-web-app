/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient } from "../clients";
import type {
  Dataset,
  DatasetCreateRequest,
  DatasetListResponse,
  DatasetUpdateRequest,
} from "../types/data-catalog";

// GX-Space: /data-catalog/{domainId}/datasets  (envelope {data:[...]})

// L0-L4 dibawa di field description GX-Space ("... klasifikasi L3").
const levelFromDescription = (desc?: string): string | undefined => {
  const m = (desc || "").match(/klasifikasi\s+(L[0-4])/i);
  return m ? m[1].toUpperCase() : undefined;
};

const toDataset = (d: any): Dataset => {
  const tags: string[] = d.endpoint_metadata?.tags ?? [];
  const domain = tags[0] ?? undefined; // tags[0] = key domain geospasial (faithful, di-set saat publish)
  const access = d.endpoint?.access_type;
  return {
    dataset_id: d.id,
    dataset_name: d.name,
    schema_name: d.version ? `v${d.version}` : (d.schema_id ?? "-"),
    // provider_id mentah; nama organisasi di-resolve di UI via /onboarding/participants
    provider_name: d.provider_id ?? "-",
    provider_id: d.provider_id,
    classification: access === "PUBLIC" ? "public" : "restricted",
    status: String(d.status ?? "").toLowerCase(),
    domain,
    access_type: access,
    protocol: d.endpoint?.protocol,
    level: levelFromDescription(d.description),
    endpoint_url: d.endpoint?.url,
    version: d.version,
    description: d.description ?? null,
    schema_id: d.schema_id,
    domain_id: d.domain_id,
    endpoint_auth_strategy: d.endpoint?.auth_strategy ?? null,
    endpoint_tags: tags,
    endpoint_documentation_url: d.endpoint_metadata?.documentation_url ?? null,
    endpoint_data_format: d.endpoint_metadata?.data_format ?? null,
    endpoint_sla: d.endpoint_metadata?.sla ?? null,
    endpoint_runtime: d.endpoint_metadata?.runtime ?? null,
  };
};

// Ambil seluruh halaman (BE max limit=100) agar agregasi dashboard lengkap utk skala 50 KKKS.
const fetchAll = async (url: string): Promise<any[]> => {
  const out: any[] = [];
  let offset = 0;
  const limit = 100;
  for (let i = 0; i < 100; i++) {
    const res = await ctsClient.get(url, { params: { limit, offset } });
    const body = res?.data;
    // Response: {data: [...], total, has_next, has_prev} per DatasetListResponse spec
    const rows = Array.isArray(body) ? body
      : Array.isArray(body?.data) ? body.data
      : Array.isArray(body?.items) ? body.items
      : Array.isArray(body?.datasets) ? body.datasets
      : [];
    out.push(...rows);
    if (!body?.has_next || rows.length === 0) break;
    offset += limit;
  }
  return out;
};

export const datasetsApi = {
  list: async (domainId: string): Promise<DatasetListResponse> => {
    if (!domainId) return [] as unknown as DatasetListResponse;
    const rows = await fetchAll(`/data-catalog/${domainId}/datasets`);
    return rows.map(toDataset) as unknown as DatasetListResponse;
  },

  getById: async (domainId: string, id: string): Promise<Dataset> => {
    const res = await ctsClient.get(`/data-catalog/${domainId}/datasets/${id}`);
    return toDataset(res.data);
  },

  update: async (domainId: string, id: string, body: DatasetUpdateRequest): Promise<Dataset> => {
    const res = await ctsClient.patch(`/data-catalog/${domainId}/datasets/${id}`, body);
    return toDataset(res.data);
  },

  remove: async (domainId: string, id: string): Promise<void> => {
    await ctsClient.delete(`/data-catalog/${domainId}/datasets/${id}`);
  },

  // create lama (rapiDSK shape) tidak dipakai.
  create: async (_data: DatasetCreateRequest): Promise<Dataset> => {
    throw new Error("Gunakan datasetsApi.publish untuk publish dataset GX-Space");
  },

  // Publish dataset (KKKS provider). status default PUBLISHED di BE.
  publish: async (
    domainId: string,
    body: {
      provider_id: string;
      schema_id: string;
      name: string;
      version: string;
      domainKey: string;
      url: string;
      protocol: string;
      classification: string;
      access_type?: string;
      auth_strategy?: Record<string, unknown> | null;
      documentation_url?: string;
      runtime?: Record<string, unknown> | null;
    },
  ): Promise<Dataset> => {
    const isPublic = body.classification === "L0" || body.classification === "L1";
    const accessType = body.access_type ?? (isPublic ? "PUBLIC" : "PRIVATE");
    // D12: jangan hardcode metadata OGC untuk protokol lain. tags[0] tetap domainKey
    // (dipakai untuk derivasi domain), tag OGC hanya untuk OGC_API_FEATURES.
    const isOgc = String(body.protocol ?? "").toUpperCase() === "OGC_API_FEATURES";
    const tags = isOgc
      ? [body.domainKey, "EPSG:4326", "OGC API Features"]
      : [body.domainKey];
    const dataFormat = isOgc ? "application/geo+json" : "application/json";
    const payload = {
      provider_id: body.provider_id,
      schema_id: body.schema_id,
      name: body.name,
      version: body.version,
      description: `${body.name}. Klasifikasi ${body.classification}.`,
      endpoint: {
        url: body.url,
        access_type: accessType,
        protocol: body.protocol,
        auth_strategy: body.auth_strategy ?? null,
      },
      endpoint_metadata: {
        sla: "best-effort",
        tags,
        rate_limit: {},
        data_format: dataFormat,
        documentation_url: body.documentation_url ?? body.url,
        runtime: body.runtime ?? null,
      },
      metadata: [],
    };
    const res = await ctsClient.post(`/data-catalog/${domainId}/datasets`, payload);
    return toDataset(res.data);
  },
};