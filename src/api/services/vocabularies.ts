/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";
import type { VocabularyListResponse, VocabularyTerm } from "../types/vocabularies";

// GX-Space: /data-catalog/{domainId}/vocabularies (+ /{id}/terms)
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export const vocabulariesApi = {
  list: async (domainId: string): Promise<VocabularyListResponse> => {
    if (!domainId) return [] as unknown as VocabularyListResponse;
    const res = await apiClient.get(`/data-catalog/${domainId}/vocabularies`);
    return unwrap(res).map((v: any) => ({
      vocabulary_id: v.id,
      name: v.name,
      description: v.description,
      version: v.version,
      status: v.status,
    })) as unknown as VocabularyListResponse;
  },

  terms: async (domainId: string, vocabularyId: string): Promise<VocabularyTerm[]> => {
    const res = await apiClient.get(`/data-catalog/${domainId}/vocabularies/${vocabularyId}/terms`);
    return unwrap(res).map((t: any) => ({
      id: t.id,
      term: t.term,
      datatype: t.datatype,
      unit: t.unit,
      description: t.description,
    }));
  },
};
