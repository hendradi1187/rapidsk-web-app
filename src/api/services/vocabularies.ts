/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";
import type {
  Vocabulary,
  VocabularyCreateRequest,
  VocabularyListResponse,
  VocabularyTerm,
  VocabularyUpdateRequest,
} from "../types/vocabularies";

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

  get: async (domainId: string, vocabularyId: string): Promise<Vocabulary> => {
    const res = await apiClient.get(`/data-catalog/${domainId}/vocabularies/${vocabularyId}`);
    const v = res.data as any;
    return {
      vocabulary_id: v.id,
      name: v.name,
      description: v.description,
      version: v.version,
      status: v.status,
    };
  },

  create: async (domainId: string, body: VocabularyCreateRequest): Promise<Vocabulary> => {
    const res = await apiClient.post(`/data-catalog/${domainId}/vocabularies`, body);
    const v = res.data as any;
    return {
      vocabulary_id: v.id,
      name: v.name,
      description: v.description,
      version: v.version,
      status: v.status,
    };
  },

  update: async (
    domainId: string,
    vocabularyId: string,
    body: VocabularyUpdateRequest,
  ): Promise<Vocabulary> => {
    const res = await apiClient.patch(`/data-catalog/${domainId}/vocabularies/${vocabularyId}`, body);
    const v = res.data as any;
    return {
      vocabulary_id: v.id,
      name: v.name,
      description: v.description,
      version: v.version,
      status: v.status,
    };
  },

  remove: async (domainId: string, vocabularyId: string): Promise<void> => {
    await apiClient.delete(`/data-catalog/${domainId}/vocabularies/${vocabularyId}`);
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
