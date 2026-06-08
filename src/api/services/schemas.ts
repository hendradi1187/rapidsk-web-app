/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";
import type { SchemaListResponse } from "../types/schemas";

// GX-Space: /data-catalog/{domainId}/schemas
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export const schemasApi = {
  list: async (domainId: string): Promise<SchemaListResponse> => {
    if (!domainId) return [] as unknown as SchemaListResponse;
    const res = await apiClient.get(`/data-catalog/${domainId}/schemas`);
    return unwrap(res).map((s: any) => ({
      schema_id: s.id,
      vocabulary_id: s.vocabulary_id,
      vocabulary_name: s.vocabulary_name,
      version: s.version,
      status: s.status,
    })) as unknown as SchemaListResponse;
  },
};
