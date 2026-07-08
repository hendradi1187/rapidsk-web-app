/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient as apiClient } from "../clients";
import type {
  SchemaCreateRequest,
  SchemaItem,
  SchemaListResponse,
  SchemaUpdateRequest,
} from "../types/schemas";

// GX-Space: /data-catalog/{domainId}/schemas
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export const schemasApi = {
  list: async (domainId: string): Promise<SchemaListResponse> => {
    if (!domainId) return [] as unknown as SchemaListResponse;
    const res = await apiClient.get(`/data-catalog/${domainId}/schemas`);
    return unwrap(res).map((s: any) => ({
      schema_id: s.schema_id ?? s.id,
      vocabulary_id: s.vocabulary_id,
      vocabulary_name: s.vocabulary_name,
      version: s.version,
      status: s.status,
    })) as unknown as SchemaListResponse;
  },

  get: async (domainId: string, id: string): Promise<SchemaItem> => {
    const res = await apiClient.get(`/data-catalog/${domainId}/schemas/${id}`);
    const s = res.data as any;
    return {
      schema_id: s.schema_id ?? s.id,
      vocabulary_id: s.vocabulary_id,
      vocabulary_name: s.vocabulary_name,
      version: s.version,
      status: s.status,
    };
  },

  create: async (domainId: string, body: SchemaCreateRequest): Promise<SchemaItem> => {
    const res = await apiClient.post(`/data-catalog/${domainId}/schemas`, body);
    const s = res.data as any;
    return {
      schema_id: s.schema_id ?? s.id,
      vocabulary_id: s.vocabulary_id,
      vocabulary_name: s.vocabulary_name,
      version: s.version,
      status: s.status,
    };
  },

  update: async (
    domainId: string,
    id: string,
    body: SchemaUpdateRequest,
  ): Promise<SchemaItem> => {
    const res = await apiClient.patch(`/data-catalog/${domainId}/schemas/${id}`, body);
    const s = res.data as any;
    return {
      schema_id: s.schema_id ?? s.id,
      vocabulary_id: s.vocabulary_id,
      vocabulary_name: s.vocabulary_name,
      version: s.version,
      status: s.status,
    };
  },

  remove: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`/data-catalog/${domainId}/schemas/${id}`);
  },
};
