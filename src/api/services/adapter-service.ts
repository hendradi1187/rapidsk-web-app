import { ADAPTER } from "../endpoints";
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

const getAuthHeader = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
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

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${ADAPTER_PROXY_BASE}${path}`, {
    ...init,
    headers: {
      ...getAuthHeader(),
      ...(init?.headers ?? {}),
    },
    credentials: "same-origin",
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const message =
      (payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string" && payload.detail) ||
      (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" && payload.error) ||
      `Adapter request failed (${response.status})`;
    throw new Error(message);
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

  listLayers: async (provider: AdapterProvider, connectionId: string): Promise<unknown> =>
    request<unknown>(`/remote-sources/${provider}/${encodeURIComponent(connectionId)}/layers`),

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

  listTasks: async (): Promise<AdapterIngestionTask[]> => {
    const payload = await request<unknown>("/data-ingestion/");
    return unwrapList<AdapterIngestionTask>(payload);
  },

  getTask: async (id: string): Promise<AdapterIngestionTask> =>
    request<AdapterIngestionTask>(`/data-ingestion/${encodeURIComponent(id)}`),

  listCollections: async (): Promise<unknown> =>
    request<unknown>("/ogc/collections"),

  listItems: async (domainCode: AdapterDomainCode, params?: { limit?: number; offset?: number }): Promise<unknown> => {
    const search = new URLSearchParams();
    if (typeof params?.limit === "number") search.set("limit", String(params.limit));
    if (typeof params?.offset === "number") search.set("offset", String(params.offset));
    const suffix = search.toString() ? `?${search.toString()}` : "";
    return request<unknown>(`/ogc/collections/${encodeURIComponent(domainCode)}/items${suffix}`);
  },
};
