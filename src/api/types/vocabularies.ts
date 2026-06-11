// GX-Space data-catalog vocabularies

export interface Vocabulary {
  vocabulary_id: string;
  name: string;
  description?: string;
  version?: string;
  status?: string;
}

export interface VocabularyTerm {
  id: string;
  term: string;
  datatype?: string;
  unit?: string | null;
  description?: string | null;
}

export interface VocabularyTermRequest {
  term: string;
  datatype: string;
  unit?: string | null;
  description?: string | null;
}

export interface VocabularyCreateRequest {
  name: string;
  version: string;
  description?: string | null;
  terms: VocabularyTermRequest[];
}

export interface VocabularyUpdateRequest {
  name?: string | null;
  version?: string | null;
  description?: string | null;
  status?: "DRAFT" | "PUBLISHED" | "DEPRECATED" | null;
}

export type VocabularyListResponse = Vocabulary[];
