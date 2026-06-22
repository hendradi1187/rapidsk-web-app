import { apiClient } from "../client";

export type AdapterClassification = "L0" | "L1" | "L2" | "L3" | "L4";

export interface AdapterPublishRequest {
  name: string;
  schema_id: string;
  version?: string;
  level?: AdapterClassification;
  geojson?: Record<string, unknown> | null;
}

const withAdapterHeaders = (adapterBaseUrl: string) => ({
  headers: {
    "x-adapter-base-url": adapterBaseUrl,
  },
});

export const adapterRuntimeApi = {
  health: async (adapterBaseUrl: string): Promise<any> => {
    const res = await apiClient.get("/adapter-runtime/health", withAdapterHeaders(adapterBaseUrl));
    return res.data;
  },

  collections: async (adapterBaseUrl: string): Promise<any> => {
    const res = await apiClient.get("/adapter-runtime/v1/ogc/collections", withAdapterHeaders(adapterBaseUrl));
    return res.data;
  },

  providers: async (adapterBaseUrl: string): Promise<any> => {
    const res = await apiClient.get("/adapter-runtime/v1/ogc/providers", withAdapterHeaders(adapterBaseUrl));
    return res.data;
  },

  metadataAll: async (adapterBaseUrl: string): Promise<any> => {
    const res = await apiClient.get("/adapter-runtime/v1/metadata", withAdapterHeaders(adapterBaseUrl));
    return res.data;
  },

  metadataByDomain: async (adapterBaseUrl: string, domain: string): Promise<any> => {
    const res = await apiClient.get(
      `/adapter-runtime/v1/metadata/${encodeURIComponent(domain)}`,
      withAdapterHeaders(adapterBaseUrl),
    );
    return res.data;
  },

  ingestGeoJson: async (
    adapterBaseUrl: string,
    domain: string,
    payload: Record<string, unknown>,
    classification?: AdapterClassification | "",
  ): Promise<any> => {
    const res = await apiClient.post(
      `/adapter-runtime/v1/ingest/${encodeURIComponent(domain)}`,
      payload,
      {
        ...withAdapterHeaders(adapterBaseUrl),
        params: classification ? { classification } : undefined,
      },
    );
    return res.data;
  },

  ingestShapefile: async (
    adapterBaseUrl: string,
    domain: string,
    body: {
      file: File;
      fieldMap?: string;
      constants?: string;
      classification?: AdapterClassification | "";
    },
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", body.file);
    if (body.fieldMap?.trim()) formData.append("field_map", body.fieldMap.trim());
    if (body.constants?.trim()) formData.append("constants", body.constants.trim());
    if (body.classification) formData.append("classification", body.classification);

    const res = await apiClient.post(
      `/adapter-runtime/v1/ingest/${encodeURIComponent(domain)}/shapefile`,
      formData,
      {
        headers: {
          "x-adapter-base-url": adapterBaseUrl,
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return res.data;
  },

  publish: async (
    adapterBaseUrl: string,
    domain: string,
    payload: AdapterPublishRequest,
  ): Promise<any> => {
    const res = await apiClient.post(
      `/adapter-runtime/v1/publish/${encodeURIComponent(domain)}`,
      payload,
      withAdapterHeaders(adapterBaseUrl),
    );
    return res.data;
  },
};
