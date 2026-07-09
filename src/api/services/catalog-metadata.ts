/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient as apiClient } from "../clients";

// Sub-resource katalog data yang berbasis domain. Tiga entitas:
//  - vocabulary-terms : istilah semantik (term + datatype) milik sebuah vocabulary.
//  - metadata-schemas : aturan metadata (term wajib/opsional, tunggal/ganda).
//  - dataset-metadatas: pemetaan istilah ke dataset nyata beserta sumbernya.
const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

export type Cardinality = "SINGLE" | "MULTIPLE";

export interface VocabularyTermRow {
  id: string;
  term: string;
  datatype: string;
  unit?: string | null;
  description?: string | null;
  vocabulary_id?: string;
}

export interface MetadataSchemaRow {
  id: string;
  domain_id: string;
  schema_id: string;
  vocabulary_term_id: string;
  required: boolean;
  cardinality: Cardinality;
}

export interface DatasetMetadataRow {
  id: string;
  domain_id: string;
  dataset_id: string;
  vocabulary_term_id: string;
  source: string;
  source_ref: string;
}

export const vocabularyTermsApi = {
  list: async (domainId: string): Promise<VocabularyTermRow[]> => {
    if (!domainId) return [];
    const res = await ctsClient.get(`/data-catalog/${domainId}/vocabulary-terms`);
    return unwrap(res) as VocabularyTermRow[];
  },
  create: async (
    domainId: string,
    body: {
      term: string;
      datatype: string;
      unit?: string | null;
      description?: string | null;
      vocabulary_id: string;
    },
  ): Promise<VocabularyTermRow> => {
    const res = await ctsClient.post(`/data-catalog/${domainId}/vocabulary-terms`, body);
    return res.data as VocabularyTermRow;
  },
  update: async (
    domainId: string,
    id: string,
    body: Partial<{ term: string; datatype: string; unit: string | null; description: string | null }>,
  ): Promise<VocabularyTermRow> => {
    const res = await ctsClient.patch(`/data-catalog/${domainId}/vocabulary-terms/${id}`, body);
    return res.data as VocabularyTermRow;
  },
  remove: async (domainId: string, id: string): Promise<void> => {
    await ctsClient.delete(`/data-catalog/${domainId}/vocabulary-terms/${id}`);
  },
};

export const metadataSchemasApi = {
  list: async (domainId: string): Promise<MetadataSchemaRow[]> => {
    if (!domainId) return [];
    const res = await ctsClient.get(`/data-catalog/${domainId}/metadata-schemas`);
    return unwrap(res) as MetadataSchemaRow[];
  },
  create: async (
    domainId: string,
    body: { schema_id: string; vocabulary_term_id: string; required: boolean; cardinality: Cardinality },
  ): Promise<MetadataSchemaRow> => {
    const res = await ctsClient.post(`/data-catalog/${domainId}/metadata-schemas`, body);
    return res.data as MetadataSchemaRow;
  },
  update: async (
    domainId: string,
    id: string,
    body: Partial<{ schema_id: string; vocabulary_term_id: string; required: boolean; cardinality: Cardinality }>,
  ): Promise<MetadataSchemaRow> => {
    const res = await ctsClient.patch(`/data-catalog/${domainId}/metadata-schemas/${id}`, body);
    return res.data as MetadataSchemaRow;
  },
  remove: async (domainId: string, id: string): Promise<void> => {
    await ctsClient.delete(`/data-catalog/${domainId}/metadata-schemas/${id}`);
  },
};

export const datasetMetadatasApi = {
  list: async (domainId: string): Promise<DatasetMetadataRow[]> => {
    if (!domainId) return [];
    const res = await ctsClient.get(`/data-catalog/${domainId}/dataset-metadatas`);
    return unwrap(res) as DatasetMetadataRow[];
  },
  create: async (
    domainId: string,
    body: { dataset_id: string; vocabulary_term_id: string; source: string; source_ref: string },
  ): Promise<DatasetMetadataRow> => {
    const res = await ctsClient.post(`/data-catalog/${domainId}/dataset-metadatas`, body);
    return res.data as DatasetMetadataRow;
  },
  update: async (
    domainId: string,
    id: string,
    body: Partial<{ dataset_id: string; vocabulary_term_id: string; source: string; source_ref: string }>,
  ): Promise<DatasetMetadataRow> => {
    const res = await ctsClient.patch(`/data-catalog/${domainId}/dataset-metadatas/${id}`, body);
    return res.data as DatasetMetadataRow;
  },
  remove: async (domainId: string, id: string): Promise<void> => {
    await ctsClient.delete(`/data-catalog/${domainId}/dataset-metadatas/${id}`);
  },
};
