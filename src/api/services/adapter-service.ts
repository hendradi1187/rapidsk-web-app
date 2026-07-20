import { ADAPTER } from "../endpoints";
import { getServiceToken } from "@/lib/service-tokens";
const ADAPTER_PROXY_BASE = "/adapter-service/api/v1"; // keep for fetch() calls below — path handled by nginx proxy

export type AdapterProvider = "geoserver" | "arcgis";
export type AdapterAuthType =
  | "none"
  | "basic"
  | "api_key"
  | "bearer"
  | "oauth2_client_credentials"
  | "arcgis_token";
export type AdapterClassification = "L0" | "L1" | "L2" | "L3" | "L4";
export type AdapterDomainCode = "WK" | "FLD" | "SEI" | "WLL" | "FP";

export interface RemoteSourceConnectionPayload {
  name: string;
  provider: AdapterProvider;
  auth_type: AdapterAuthType;
  base_url: string;
  credential?: Record<string, unknown>;
}

export interface RemoteSourceConnection extends RemoteSourceConnectionPayload {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface IngestionTaskBasePayload {
  domain_id: string;
  domain_name: string;
  domain_code: AdapterDomainCode;
  classification?: AdapterClassification | "";
}

export interface GeoJsonIngestionPayload extends IngestionTaskBasePayload {
  geojson_body: Record<string, unknown>;
}

export interface GeoServerIngestionPayload extends IngestionTaskBasePayload {
  connection_id: string;
  layer_name: string;
  cql_filter?: string | null;
  srs_name?: string | null;
}

export interface ArcGisIngestionPayload extends IngestionTaskBasePayload {
  connection_id: string;
  layer_id: number;
  layer_name: string;
  where?: string;
  out_fields?: string;
  return_geometry?: boolean;
  out_sr?: number;
}

export interface ShapefileIngestionPayload extends IngestionTaskBasePayload {
  file: File;
  field_map?: string;
}

export interface AdapterIngestionTask {
  id: string;
  status?: string;
  classification?: string;
  error_log?: string | Record<string, unknown> | null;
  updated_at?: string;
  created_at?: string;
  domain_code?: string;
  domain_name?: string;
  source_type?: string;
  provider?: string;
  [key: string]: unknown;
}

const getAuthHeader = async () => {
  try {
    const token = await getServiceToken("ALL");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
};

const parseJsonSafe = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const unwrapList = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const maybeArray = (payload as { items?: unknown; data?: unknown; results?: unknown }).items
      ?? (payload as { items?: unknown; data?: unknown; results?: unknown }).data
      ?? (payload as { items?: unknown; data?: unknown; results?: unknown }).results;
    if (Array.isArray(maybeArray)) return maybeArray as T[];
  }
  return [];
};

// Ekstrak pesan error dari payload adapter. FastAPI adapter memakai bermacam field
// (`detail`, `error`, `message`, dan kadang nested `errors.message`). Ambil yang paling
// informatif supaya mapping di api-error.ts (mis. "Invalid or missing input parameters")
// tetap kena, bukan tertelan pesan generik "Adapter request failed".
export const extractAdapterErrorMessage = (payload: unknown, status: number): string => {
  const pickString = (value: unknown): string | null =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const direct =
      pickString(record.detail) ??
      pickString(record.error) ??
      pickString(record.message);
    if (direct) return direct;
    // Nested umum: { errors: { message | detail } } atau { detail: { message } }.
    const nested = [record.errors, record.detail].find(
      (item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item),
    );
    if (nested) {
      const nestedMsg = pickString(nested.message) ?? pickString(nested.detail) ?? pickString(nested.error);
      if (nestedMsg) return nestedMsg;
    }
  } else {
    const plain = pickString(payload);
    if (plain) return plain;
  }

  return `Adapter request failed (${status})`;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${ADAPTER_PROXY_BASE}${path}`, {
    ...init,
    headers: {
      ...authHeader,
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(extractAdapterErrorMessage(payload, response.status));
  }

  return payload as T;
};

export const adapterServiceApi = {
  listConnections: async (): Promise<RemoteSourceConnection[]> => {
    const payload = await request<unknown>("/remote-sources/connections/");
    return unwrapList<RemoteSourceConnection>(payload);
  },

  createConnection: async (body: RemoteSourceConnectionPayload): Promise<RemoteSourceConnection> =>
    request<RemoteSourceConnection>("/remote-sources/connections/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  updateConnection: async (id: string, body: Partial<RemoteSourceConnectionPayload>): Promise<RemoteSourceConnection> =>
    request<RemoteSourceConnection>(`/remote-sources/connections/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  // Konvensi REST adapter: DELETE /remote-sources/connections/{id}. Bila runtime belum
  // punya endpoint ini (404/405), request() akan melempar pesan adapter apa adanya —
  // caller di UI menerjemahkannya menjadi "endpoint hapus belum tersedia di adapter".
  deleteConnection: async (id: string): Promise<void> => {
    await request<unknown>(`/remote-sources/connections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  listLayers: async (provider: AdapterProvider, connectionId: string): Promise<unknown> => {
    const path = provider === "arcgis"
      ? ADAPTER.ARCGIS_LAYERS(connectionId)
      : ADAPTER.GEOSERVER_LAYERS(connectionId);
    return request<unknown>(path);
  },

  describeGeoServerLayer: async (connectionId: string, layerName: string): Promise<unknown> =>
    request<unknown>(`/remote-sources/geoserver/${encodeURIComponent(connectionId)}/describe?layer_name=${encodeURIComponent(layerName)}`),

  previewGeoServerLayer: async (connectionId: string, layerName: string): Promise<unknown> =>
    request<unknown>(`/remote-sources/geoserver/${encodeURIComponent(connectionId)}/preview?layer_name=${encodeURIComponent(layerName)}`),

  describeArcGisLayer: async (connectionId: string, layerId: number): Promise<unknown> =>
    request<unknown>(`/remote-sources/arcgis/${encodeURIComponent(connectionId)}/describe?layer_id=${layerId}`),

  previewArcGisLayer: async (connectionId: string, layerId: number): Promise<unknown> =>
    request<unknown>(`/remote-sources/arcgis/${encodeURIComponent(connectionId)}/preview?layer_id=${layerId}`),

  previewArcGisLayerGeoJson: async (connectionId: string, layerId: number): Promise<unknown> =>
    request<unknown>(`/remote-sources/arcgis/${encodeURIComponent(connectionId)}/preview-geojson?layer_id=${layerId}`),

  ingestGeoJson: async (body: GeoJsonIngestionPayload): Promise<AdapterIngestionTask> =>
    request<AdapterIngestionTask>("/data-ingestion/geojson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  ingestShapefile: async (body: ShapefileIngestionPayload): Promise<AdapterIngestionTask> => {
    const formData = new FormData();
    formData.append("domain_id", body.domain_id);
    formData.append("domain_name", body.domain_name);
    formData.append("domain_code", body.domain_code);
    formData.append("file", body.file);
    if (body.classification) formData.append("classification", body.classification);
    if (body.field_map?.trim()) formData.append("field_map", body.field_map.trim());

    return request<AdapterIngestionTask>("/data-ingestion/shapefile", {
      method: "POST",
      body: formData,
    });
  },

  ingestGeoServer: async (body: GeoServerIngestionPayload): Promise<AdapterIngestionTask> =>
    request<AdapterIngestionTask>("/data-ingestion/geoserver", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  ingestArcGis: async (body: ArcGisIngestionPayload): Promise<AdapterIngestionTask> =>
    request<AdapterIngestionTask>("/data-ingestion/arcgis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  // BE default limit=5 (terverifikasi live) — tanpa limit eksplisit, riwayat & provenance
  // cuma lihat 5 task terakhir dan task sukses lama "hilang". Minta 100 sekaligus.
  listTasks: async (): Promise<AdapterIngestionTask[]> => {
    const payload = await request<unknown>("/data-ingestion/?limit=100");
    return unwrapList<AdapterIngestionTask>(payload);
  },

  getTask: async (id: string): Promise<AdapterIngestionTask> =>
    request<AdapterIngestionTask>(`/data-ingestion/${encodeURIComponent(id)}`),

  listCollections: async (): Promise<unknown> =>
    request<unknown>(ADAPTER.OGC_COLLECTIONS),

  listItems: async (domainCode: AdapterDomainCode, params?: { limit?: number; offset?: number }): Promise<unknown> => {
    const search = new URLSearchParams();
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    if (typeof params?.offset === "number") search.set("offset", String(params.offset));
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request<unknown>(`${ADAPTER.OGC_ITEMS(domainCode)}${suffix}`);
  },
};